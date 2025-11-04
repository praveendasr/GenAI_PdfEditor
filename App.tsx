import React, { useState, useCallback } from 'react';
import { modifyPdf } from './services/pdfEditorService';
import FileUploader from './components/FileUploader';
import EditForm from './components/EditForm';
import PdfPreview from './components/PdfPreview';
import { FileTextIcon, Wand2Icon, CheckCircleIcon } from './components/icons';

export type Edit = { id: number; find: string; replace: string };
type AppStatus = 'idle' | 'loaded' | 'processing' | 'error' | 'done';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [edits, setEdits] = useState<Edit[]>([{ id: Date.now(), find: '', replace: '' }]);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile) return;
    setStatus('loaded');
    setError(null);
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile));
    setEdits([{ id: Date.now(), find: '', replace: '' }]);
  }, []);
  
  const handleGeneratePdf = useCallback(async () => {
    if (!file || edits.every(e => !e.find)) {
      setError("Please provide a file and at least one 'Find Text' entry.");
      return;
    }
    
    setStatus('processing');
    setError(null);

    try {
      const nonEmptyEdits = edits.filter(e => e.find.trim() !== '');
      const modifiedPdfBytes = await modifyPdf(file, nonEmptyEdits);
      
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const originalFileName = file.name.replace(/\.pdf$/i, '');
      link.download = `${originalFileName}-edited.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while editing the PDF.');
      setStatus('error');
    }
  }, [file, edits]);

  const handleReset = () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFile(null);
    setFileUrl(null);
    setEdits([{ id: Date.now(), find: '', replace: '' }]);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <header className="sticky top-0 z-20 w-full bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileTextIcon className="h-8 w-8 text-sky-500" />
            <h1 className="text-xl font-bold tracking-tight">
              PDF Text Replacer
            </h1>
          </div>
          {status !== 'idle' && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
        {status === 'idle' && <FileUploader onFileSelect={handleFileSelect} />}
        
        {status !== 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="order-2 lg:order-1">
              <EditForm edits={edits} setEdits={setEdits} />
              <div className="mt-8 flex flex-col items-center">
                 {error && (
                  <div className="w-full mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                 {status === 'done' && (
                    <div className="w-full mb-4 flex items-center justify-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg" role="alert">
                        <CheckCircleIcon className="h-5 w-5" />
                        <p className="text-sm font-medium">PDF successfully generated and downloaded!</p>
                    </div>
                )}
                <button
                  onClick={handleGeneratePdf}
                  disabled={status === 'processing'}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-lg hover:bg-sky-700 transition-all duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {status === 'processing' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Wand2Icon className="h-5 w-5" />
                      Generate Edited PDF
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:sticky top-24 self-start">
                <PdfPreview fileUrl={fileUrl} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
