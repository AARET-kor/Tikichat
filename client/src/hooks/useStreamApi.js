import { useState, useCallback } from 'react';

/**
 * SSE 스트리밍 POST 요청을 처리하는 훅
 */
export function useStreamApi() {
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * @param {string} url
   * @param {object} body
   * @param {{
   *   onChunk?: (text: string, fullText: string) => void,
   *   onDone?: (fullText: string) => void,
   *   onError?: (err: Error) => void,
   *   onPhase?: (phase: string) => void,
   *   signal?: AbortSignal,
   * }} options
   */
  const streamPost = useCallback(async (url, body, {
    onChunk, onDone, onError, onPhase, signal
  } = {}) => {
    setIsStreaming(true);
    let result = '';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onDone?.(result);
            setIsStreaming(false);
            return result;
          }
          try {
            const parsed = JSON.parse(data);
            // Phase events (routing / generating)
            if (parsed.phase) {
              onPhase?.(parsed.phase);
              continue;
            }
            // Text delta
            const text = parsed.delta?.text || '';
            if (text) {
              result += text;
              onChunk?.(text, result);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // 사용자가 취소함 — 지금까지 수신된 텍스트로 완료 처리
        onDone?.(result);
      } else {
        console.error('Stream error:', err);
        onError?.(err);
      }
    } finally {
      setIsStreaming(false);
    }

    onDone?.(result);
    return result;
  }, []);

  /**
   * 비스트리밍 POST (translate-reply 등)
   */
  const post = useCallback(async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, []);

  return { streamPost, post, isStreaming };
}
