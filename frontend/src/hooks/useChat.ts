import { useState, useCallback } from 'react';
import { queryDocuments } from '../lib/api';
import type { QueryResponse } from '../lib/api';


export interface AgentStage {
  node: string;
  status: string;
  detail: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: QueryResponse;
  stages?: AgentStage[];
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | undefined>();

  const sendMessage = useCallback(
    async (question: string, documentIds?: string[]) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setCurrentStage('');

      try {
        const response = await queryDocuments(question, documentIds, conversationId);
        if (response.conversation_id) setConversationId(response.conversation_id);

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
          response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const detail = err.response?.data?.detail || err.message || 'Query failed. Check backend connection.';
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ **Error:** ${detail}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
        setCurrentStage('');
      }
    },
    [conversationId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setCurrentStage('');
  }, []);

  return { messages, isLoading, currentStage, sendMessage, clearChat };
}
