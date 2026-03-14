import { Timestamp } from 'firebase/firestore';

// Firestoreに保存する音声レコードの型
export interface VoiceRecord {
  audioUrl: string;       // Cloud StorageのダウンロードURL
  placeName: string;      // 設置場所の名前
  latitude: number;       // 緯度
  longitude: number;      // 経度
  createdAt: Timestamp;   // 投稿日時（Firestore Timestamp）
}

// localStorageに保存するキオスク設定の型
export interface KioskSettings {
  placeName: string;
  latitude: number;
  longitude: number;
}
