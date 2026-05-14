import { useState, useCallback, useEffect } from 'react';
import { getDocuments, deleteDocument as apiDeleteDocument } from '../lib/api';
import type { Document } from '../lib/api';


export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch {
      // Silently handle — documents list stays empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const addDocument = useCallback((docId: string) => {
    setActiveDocIds((prev) => [...prev, docId]);
  }, []);

  const toggleDocFilter = useCallback((docId: string) => {
    setActiveDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }, []);

  const removeDocument = useCallback(async (docId: string) => {
    try {
      await apiDeleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
      setActiveDocIds((prev) => prev.filter((id) => id !== docId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  }, []);

  return {
    documents,
    activeDocIds,
    isLoading,
    fetchDocuments,
    addDocument,
    toggleDocFilter,
    removeDocument,
  };
}
