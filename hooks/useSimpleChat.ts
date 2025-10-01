'use client';

import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

interface UseSimpleChatOptions {
  api: string;
  body?: Record<string, unknown>;
  onResponse?: (response: Response) => Promise<unknown>;
}

interface UseSimpleChatReturn {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

/**
 * Custom hook that mimics the old @ai-sdk/react useChat API
 * Provides compatibility layer for existing code that used the older version
 */
export function useSimpleChat(options: UseSimpleChatOptions): UseSimpleChatReturn {
  const { api, body = {}, onResponse } = options;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setIsLoading(true);

    try {
      // Extract messages from body, or use empty array
      const { messages = [], ...restBody } = body as { messages?: Array<{role: string, content: string}>, [key: string]: unknown };

      // Add the new user message to the messages array
      const updatedMessages = [...messages, { role: 'user', content: userMessage }];

      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          ...restBody,
        }),
      });

      // Call the onResponse callback if provided
      if (onResponse) {
        await onResponse(response);
      }

      // Clear input after successful submission
      setInput('');

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, api, body, onResponse]);

  return {
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}
