import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Types
export type SourceCitation = {
  document_id: string;
  filename: string;
  page: number;
  chunk_index: number;
  quote: string;
  confidence: number;
};

export type ConflictInfo = {
  doc_a: string;
  doc_b: string;
  description: string;
};

export type QueryResponse = {
  answer: string;
  sources: SourceCitation[];
  conflicts: ConflictInfo[];
  confidence: number;
  query_type: string;
  conversation_id: string;
};

export type Document = {
  document_id: string;
  filename: string;
  chunk_count: number;
  uploaded_at: string;
};

export type EvalScore = {
  run_id: string;
  timestamp: string;
  answer_relevancy: number;
  faithfulness: number;
  context_precision: number;
  context_recall: number;
  question_count: number;
};


// API functions
export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const queryDocuments = async (
  question: string,
  documentIds?: string[],
  conversationId?: string
): Promise<QueryResponse> => {
  const res = await api.post('/api/query', {
    question,
    document_ids: documentIds || null,
    conversation_id: conversationId || null,
  });
  return res.data;
};

export const getDocuments = async (): Promise<Document[]> => {
  const res = await api.get('/api/documents');
  return res.data.documents;
};

export const getEvalResults = async () => {
  const res = await api.get('/api/eval/results');
  return res.data;
};

export const triggerEval = async () => {
  const res = await api.post('/api/eval/run');
  return res.data;
};

export const deleteDocument = async (documentId: string) => {
  const res = await api.delete(`/api/documents/${documentId}`);
  return res.data;
};
