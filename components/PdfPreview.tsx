import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  fileUrl: string | null;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ fileUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!fileUrl) return;

    const loadPdf = async () => {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        canvasRefs.current = Array(pdf.numPages).fill(null);

        // Render all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRefs.current[i - 1];
          if (canvas) {
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext).promise;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [fileUrl]);

  return (
    <div className="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-[75vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 sticky top-0 bg-white dark:bg-slate-800 p-2 z-10">Document Preview</h2>
        {isLoading && <div className="text-center p-8">Loading Preview...</div>}
        <div className="space-y-4">
            {numPages && [...Array(numPages)].map((_, index) => (
                <canvas 
                    key={index} 
                    ref={el => canvasRefs.current[index] = el}
                    className="w-full h-auto rounded-md shadow-md"
                />
            ))}
        </div>
    </div>
  );
};

export default PdfPreview;
