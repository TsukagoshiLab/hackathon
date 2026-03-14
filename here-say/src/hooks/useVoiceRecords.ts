'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VoiceRecord } from '@/src/types';

/**
 * 指定した場所名の最新10件をローカルAPIから取得するフック。
 * 10秒ごとに自動ポーリングし、新しい録音が追加されると一覧が更新される。
 */
export function useVoiceRecords(placeName: string) {
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!placeName.trim()) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/recordings?placeName=${encodeURIComponent(placeName)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VoiceRecord[];
      setRecords(data);
    } catch {
      setError('音声データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [placeName]);

  useEffect(() => {
    fetchRecords();
    // 10秒ごとに再取得（リアルタイム性の代替）
    const interval = setInterval(fetchRecords, 10_000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  return { records, isLoading, error, refetch: fetchRecords };
}
