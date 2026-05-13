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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pdf|docx|doc)$/i)) {
        setError('Only PDF and DOCX files are supported.');
        return;
      }
      setError('');
      setIsUploading(true);
      setProgress(`Uploading "${file.name}"…`);

      try {
        setProgress(`Extracting text and creating embeddings…`);
        const result = await uploadDocument(file);
        setProgress(`✓ ${result.chunk_count} chunks indexed`);
        onUploadComplete(result);
        setTimeout(() => setProgress(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Upload failed.');
        setProgress('');
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`
        relative rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer overflow-hidden group
        ${isDragging 
          ? 'border-violet-500 bg-violet-500/10 scale-[1.02] shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
          : 'border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/30'
        }
        ${isUploading ? 'pointer-events-none opacity-80' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-radial from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Dashed border overlay */}
      <div className={`absolute inset-0 border-2 border-dashed rounded-2xl pointer-events-none transition-colors duration-300 ${isDragging ? 'border-violet-500/50' : 'border-zinc-800 group-hover:border-violet-500/30'}`} />
      <input
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={onFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center gap-4 relative z-0">
        <div className={`w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner transition-transform duration-500 ${isDragging ? 'scale-110 shadow-violet-500/20 border-violet-500/30' : ''}`}>
          {isUploading ? '⚙️' : '📄'}
        </div>
        <div>
          <p className="text-zinc-200 font-semibold text-sm tracking-wide">
            {isUploading ? 'Processing Document...' : 'Upload Document'}
          </p>
          <p className="text-zinc-500 text-xs mt-1.5 font-medium">Drag & drop or click to browse</p>
          <p className="text-zinc-600 text-[10px] mt-1 font-semibold uppercase tracking-widest">PDF, DOCX up to 50MB</p>
        </div>

        {progress && (
          <div className="flex items-center gap-2.5 mt-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-xl text-violet-400 text-xs font-medium shadow-lg w-full justify-center">
            {isUploading && (
              <div className="w-3.5 h-3.5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            )}
            {progress}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl w-full">{error}</p>
        )}
      </div>
    </div>
  );
};
