'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import type { VoiceRecord } from '@/src/types';

export interface VoiceRecordWithId extends VoiceRecord {
  id: string;
}

/**
 * 指定した場所名に紐づく最新10件の音声レコードをリアルタイムで取得するフック。
 * 新しいレコードが追加されると自動的に一覧が更新される。
 *
 * ⚠️ Firestoreで `placeName` + `createdAt` の複合インデックスが必要です。
 * 初回実行時にコンソールに表示されるリンクからインデックスを作成してください。
 */
export function useVoiceRecords(placeName: string) {
  const [records, setRecords] = useState<VoiceRecordWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 場所名が未設定の場合は何もしない
    if (!placeName.trim()) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, 'voiceRecords'),
      where('placeName', '==', placeName),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: VoiceRecordWithId[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as VoiceRecord),
        }));
        setRecords(data);
        setIsLoading(false);
      },
      () => {
        setError('音声データの取得に失敗しました。');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [placeName]);

  return { records, isLoading, error };
}
