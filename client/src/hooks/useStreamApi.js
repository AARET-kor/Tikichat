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
    let settled = false; // onDone / onError가 이미 호출됐는지 추적

    const finish = (cb) => {
      if (settled) return;
      settled = true;
      setIsStreaming(false);
      cb();
    };

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
            finish(() => onDone?.(result));
            return result;
          }
          try {
            const parsed = JSON.parse(data);
            // 서버가 보낸 에러 이벤트
            if (parsed.error) {
              finish(() => onError?.(new Error(parsed.error)));
              return result;
            }
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
      // 스트림이 [DONE] 없이 닫힌 경우
      finish(() => onDone?.(result));
    } catch (err) {
      if (err.name === 'AbortError') {
        finish(() => onDone?.(result));
      } else {
        console.error('Stream error:', err);
        finish(() => onError?.(err));
      }
    } finally {
      // settled가 false인 경우 (예외 없이 루프 탈출) 보호
      if (!settled) {
        settled = true;
        setIsStreaming(false);
      }
    }

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
