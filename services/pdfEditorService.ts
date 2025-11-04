import type { Edit } from '../App';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

type Color = { r: number; g: number; b: number };

// Samples the average color from a specific region of a canvas.
const getAverageColorOfRegion = (imageData: ImageData, x: number, y: number, width: number, height: number): Color => {
    const data = imageData.data;
    let r = 0, g = 0, b = 0, count = 0;
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const endX = Math.ceil(x + width);
    const endY = Math.ceil(y + height);

    for (let i = startY; i < endY; i++) {
        for (let j = startX; j < endX; j++) {
            const index = (i * imageData.width + j) * 4;
            if (index >= 0 && index < data.length) {
                r += data[index];
                g += data[index + 1];
                b += data[index + 2];
                count++;
            }
        }
    }
    return count > 0 ? { r: r / count / 255, g: g / count / 255, b: b / count / 255 } : { r: 1, g: 1, b: 1 }; // Default to white
};

// Samples the text color by looking at the center of a character's box.
const getTextColor = (imageData: ImageData, x: number, y: number, width: number, height: number, bgColor: Color): Color => {
    // Sample a small area in the center of the text's bounding box.
    const sampleX = x + width / 2;
    const sampleY = y + height / 2;
    const textColorSample = getAverageColorOfRegion(imageData, sampleX - 1, sampleY - 1, 2, 2);

    // Calculate the difference between the sampled color and the background color.
    const diff =
        Math.abs(textColorSample.r - bgColor.r) +
        Math.abs(textColorSample.g - bgColor.g) +
        Math.abs(textColorSample.b - bgColor.b);

    // If the difference is significant, we've likely found the text color.
    if (diff > 0.2) {
        return textColorSample;
    }

    // FALLBACK: If the center sample is too similar to the background (e.g., a "hole" in a letter like 'o'),
    // default to a high-contrast color.
    const bgBrightness = (bgColor.r * 299 + bgColor.g * 587 + bgColor.b * 114) / 1000;
    return bgBrightness > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 }; // Black on light, White on dark
};


// Samples background color by checking small areas at the corners just outside the text's bounding box.
const getAverageBackgroundColor = (imageData: ImageData, x: number, y: number, width: number, height: number): Color => {
    const sampleSize = 4; 
    const margin = 5; 

    const points = [
        { sx: x - margin - sampleSize, sy: y - margin - sampleSize }, // Top-left
        { sx: x + width + margin, sy: y - margin - sampleSize }, // Top-right
        { sx: x - margin - sampleSize, sy: y + height + margin }, // Bottom-left
        { sx: x + width + margin, sy: y + height + margin }, // Bottom-right
    ];

    let r = 0, g = 0, b = 0, totalCount = 0;
    
    for (const point of points) {
        const color = getAverageColorOfRegion(imageData, point.sx, point.sy, sampleSize, sampleSize);
        r += color.r;
        g += color.g;
        b += color.b;
        totalCount++;
    }
    
    return totalCount > 0 ? { r: r / totalCount, g: g / totalCount, b: b / totalCount } : { r: 1, g: 1, b: 1 };
};

// Greatly enhanced font mapping to handle styles (bold, italic) and more families.
const mapFont = (fontName: string): StandardFonts => {
    const lower = fontName.toLowerCase();
    
    const isBold = lower.includes('bold') || lower.includes('black') || lower.includes('heavy');
    const isItalic = lower.includes('italic') || lower.includes('oblique');

    // Serif check
    if (lower.includes('times') || lower.includes('georgia') || lower.includes('serif')) {
        if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
        if (isBold) return StandardFonts.TimesRomanBold;
        if (isItalic) return StandardFonts.TimesRomanItalic;
        return StandardFonts.TimesRoman;
    }
    
    // Monospace check
    if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas')) {
        if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
        if (isBold) return StandardFonts.CourierBold;
        if (isItalic) return StandardFonts.CourierOblique;
        return StandardFonts.Courier;
    }
    
    // Default to Sans-Serif (Helvetica) for fonts like Arial, Verdana, etc.
    if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
    if (isBold) return StandardFonts.HelveticaBold;
    if (isItalic) return StandardFonts.HelveticaOblique;
    return StandardFonts.Helvetica;
};


export const modifyPdf = async (file: File, edits: Edit[]): Promise<Uint8Array> => {
    const existingPdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pdfjsDoc = await pdfjsLib.getDocument(existingPdfBytes.slice(0)).promise;

    for (let i = 0; i < pdfjsDoc.numPages; i++) {
        const pageNum = i + 1;
        const page = await pdfjsDoc.getPage(pageNum);
        // Use normalizeWhitespace to improve text search reliability
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        const items = textContent.items.filter(item => 'str' in item && item.str.trim().length > 0) as pdfjsLib.TextItem[];
        
        const pdfLibPage = pdfDoc.getPage(i);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;

        await page.render({ canvasContext: context, viewport }).promise;
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        const replacedItemIndices = new Set<number>();

        for (const { find, replace } of edits) {
            if (!find) continue;
            
            // Normalize find string to match textContent normalization
            const normalizedFind = find.replace(/\s+/g, ' ').trim();

            for (let startIndex = 0; startIndex < items.length; startIndex++) {
                if (replacedItemIndices.has(startIndex)) continue;

                let combinedText = '';
                const potentialMatchItems: pdfjsLib.TextItem[] = [];

                for (let lookaheadIndex = startIndex; lookaheadIndex < items.length; lookaheadIndex++) {
                    const currentItem = items[lookaheadIndex];
                    if (replacedItemIndices.has(lookaheadIndex)) break;

                    potentialMatchItems.push(currentItem);
                    if (lookaheadIndex > startIndex && !combinedText.endsWith(' ')) {
                         combinedText += ' ';
                    }
                    combinedText += currentItem.str.trim();

                    if (combinedText.includes(normalizedFind)) {
                        let charPos = 0;
                        const findStartIndex = combinedText.indexOf(normalizedFind);
                        const findEndIndex = findStartIndex + normalizedFind.length;
                        
                        const actualMatchItems: pdfjsLib.TextItem[] = [];
                        for(const item of potentialMatchItems) {
                            const itemText = item.str.trim();
                            if (!itemText) continue;
                            const itemStartPos = combinedText.indexOf(itemText, charPos);
                            const itemEndPos = itemStartPos + itemText.length;

                            if (Math.max(itemStartPos, findStartIndex) < Math.min(itemEndPos, findEndIndex)) {
                                actualMatchItems.push(item);
                            }
                            charPos = itemEndPos > charPos ? itemEndPos : charPos + 1;
                        }

                        if (actualMatchItems.length > 0) {
                             // *** CRITICAL SAFETY CHECK FOR ROTATED TEXT ***
                            const isRotated = actualMatchItems.some(item => Math.abs(item.transform[1]) > 0.01 || Math.abs(item.transform[2]) > 0.01);
                            if (isRotated) {
                                console.warn(`Skipping rotated text: "${find}"`);
                                continue; // Skip this find/replace, as it's not horizontal
                            }

                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            let totalHeight = 0;

                            for (const item of actualMatchItems) {
                                // The transform gives the baseline position. We need to calculate the bounding box.
                                const x = item.transform[4];
                                const y = item.transform[5];
                                const width = item.width;
                                const height = item.height; // This is the bounding box height of the text
                                
                                minX = Math.min(minX, x);
                                maxX = Math.max(maxX, x + width);
                                // The y is the baseline. The box extends above and below it.
                                // This is an approximation but more robust than before.
                                minY = Math.min(minY, y - height * 0.3); // Space for descenders
                                maxY = Math.max(maxY, y + height * 0.9); // Space for ascenders
                                totalHeight += height;
                            }
                            
                            const avgHeight = totalHeight / actualMatchItems.length;

                            // *** MORE PRECISE BOUNDING BOX ***
                            const boxX = minX;
                            const boxWidth = maxX - minX;
                            const boxY = minY;
                            const boxHeight = maxY - minY;

                            if (boxWidth <= 0 || boxHeight <= 0) continue;

                            const [canvasBoxX, canvasBoxBottomY] = viewport.convertToViewportPoint(boxX, boxY);
                            const [_, canvasBoxTopY_check] = viewport.convertToViewportPoint(boxX, boxY + boxHeight);
                            const canvasWidth = boxWidth * viewport.scale;
                            const canvasHeight = Math.abs(canvasBoxBottomY - canvasBoxTopY_check);
                            const canvasBoxTopY = Math.min(canvasBoxBottomY, canvasBoxTopY_check);

                            const bgColor = getAverageBackgroundColor(imageData, canvasBoxX, canvasBoxTopY, canvasWidth, canvasHeight);
                            
                            const firstChar = actualMatchItems[0];
                            const [fcCanvasX, fcCanvasBottomY] = viewport.convertToViewportPoint(firstChar.transform[4], firstChar.transform[5]);
                            const fcCanvasWidth = firstChar.width * viewport.scale;
                            const fcCanvasHeight = firstChar.height * viewport.scale;
                            const fcCanvasTopY = fcCanvasBottomY - fcCanvasHeight;
                            const textColor = getTextColor(imageData, fcCanvasX, fcCanvasTopY, fcCanvasWidth, fcCanvasHeight, bgColor);
                            
                            const font = await pdfDoc.embedFont(mapFont(firstChar.fontName));
                            
                            pdfLibPage.drawRectangle({
                                x: boxX, y: boxY, width: boxWidth, height: boxHeight,
                                color: rgb(bgColor.r, bgColor.g, bgColor.b),
                            });

                            const textHeight = avgHeight;
                            const textWidthAtSize100 = font.widthOfTextAtSize(replace, 100);
                            const fontSizeForWidth = (boxWidth / textWidthAtSize100) * 100 * 0.95; // 5% buffer
                            const fontSize = Math.min(textHeight, fontSizeForWidth);
                            
                            const baselineY = minY + (boxHeight - textHeight) / 2 + textHeight * 0.15;

                            pdfLibPage.drawText(replace, {
                                x: boxX, y: baselineY, font, size: fontSize,
                                color: rgb(textColor.r, textColor.g, textColor.b),
                            });

                            for (const item of actualMatchItems) {
                                const originalIndex = items.indexOf(item);
                                if (originalIndex !== -1) replacedItemIndices.add(originalIndex);
                            }
                            
                            startIndex = lookaheadIndex;
                            break; 
                        }
                    }
                }
            }
        }
    }
    return await pdfDoc.save();
};
