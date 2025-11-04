import React, { useCallback, useState } from 'react';
import { UploadCloudIcon } from './icons';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const baseClasses = "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-300";
  const inactiveClasses = "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700";
  const activeClasses = "border-sky-500 bg-sky-100 dark:bg-sky-900/50";

  return (
    <div className="w-full max-w-2xl mx-auto">
        <label htmlFor="file-upload" className="w-full">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`${baseClasses} ${isDragging ? activeClasses : inactiveClasses}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <UploadCloudIcon className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'}`} />
                    <p className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-300">
                        <span className="text-sky-500">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">PDF document only</p>
                </div>
                <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
            </div>
        </label>
        <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 rounded-r-lg">
            <p className="font-bold">How it works:</p>
            <p className="text-sm">Upload a PDF template. Use the form to enter text you want to find and replace. The app will generate a new PDF with your changes while preserving the original design.</p>
        </div>
    </div>
  );
};

export default FileUploader;
