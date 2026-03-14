// 音声レコードの型（ローカルJSONに保存）
export interface VoiceRecord {
  id: string;
  audioUrl: string;    // /recordings/xxx.webm の相対パス
  placeName: string;   // 設置場所の名前
  latitude: number;    // 緯度
  longitude: number;   // 経度
  createdAt: string;   // ISO 8601 文字列
}

// localStorageに保存するキオスク設定の型
export interface KioskSettings {
  placeName: string;
  latitude: number;
  longitude: number;
}
