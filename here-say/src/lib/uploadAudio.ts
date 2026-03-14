import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from './firebase';
import type { KioskSettings } from '@/src/types';

// Firestoreのコレクション名
const COLLECTION_NAME = 'voiceRecords';

/**
 * 音声BlobをCloud Storageにアップロードし、
 * メタデータ（URL・位置情報・日時）をFirestoreに保存する。
 *
 * @param audioBlob - 録音済みの音声データ
 * @param settings  - キオスク設置場所の設定情報（localStorageから取得済みのもの）
 * @returns FirestoreドキュメントのID
 */
export async function uploadAudioAndSaveRecord(
  audioBlob: Blob,
  settings: KioskSettings
): Promise<string> {
  // --- 1. Cloud Storageへのアップロード ---
  // ファイル名は「タイムスタンプ + ランダム文字列」で衝突を回避
  const fileName = `voices/${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, audioBlob, {
    contentType: audioBlob.type || 'audio/webm',
  });

  // アップロード後にダウンロードURLを取得
  const audioUrl = await getDownloadURL(storageRef);

  // --- 2. Firestoreへのメタデータ保存 ---
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    audioUrl,
    placeName: settings.placeName,
    latitude: settings.latitude,
    longitude: settings.longitude,
    createdAt: serverTimestamp(), // サーバー側の正確な時刻を使用
  });

  return docRef.id;
}
