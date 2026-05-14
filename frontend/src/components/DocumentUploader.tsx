import React, { useCallback, useState } from 'react';
import { uploadDocument } from '../lib/api';

interface UploadedDoc {
  document_id: string;
  filename: string;
  chunk_count: number;
}

interface Props {
  onUploadComplete: (doc: UploadedDoc) => void;
}

export const DocumentUploader: React.FC<Props> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pdf|docx|doc)$/i)) {
        setError('Only PDF and DOCX files.');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setError('');
      setIsUploading(true);
      try {
        const result = await uploadDocument(file);
        onUploadComplete(result);
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const errorMsg = typeof detail === 'string' 
          ? detail 
          : Array.isArray(detail) 
            ? detail[0]?.msg 
            : 'Upload failed. Please try again.';
        setError(errorMsg);
        setTimeout(() => setError(''), 4000);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="relative">
      <label
        className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors text-sm w-full font-medium ${
          isUploading
            ? 'text-[#8e8e8e] cursor-wait'
            : 'text-[#ececec] hover:bg-[#212121]'
        }`}
      >
        {isUploading ? (
          <div className="w-4 h-4 border-2 border-[#555]/40 border-t-[#8e8e8e] rounded-full animate-spin shrink-0" />
        ) : (
          <svg className="w-4 h-4 shrink-0 text-[#8e8e8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )}
        <span>{isUploading ? 'Uploading...' : 'Upload document'}</span>
        <input
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={onFileInput}
          className="hidden"
          disabled={isUploading}
        />
      </label>
      {error && (
        <p className="text-red-400 text-xs px-3 mt-1">{error}</p>
      )}
    </div>
  );
};
