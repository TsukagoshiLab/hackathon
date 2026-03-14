import type { KioskSettings, VoiceRecord } from '@/src/types';

/**
 * 音声BlobをローカルAPIにアップロードし、
 * メタデータ（URL・位置情報・日時）をローカルJSONに保存する。
 *
 * @param audioBlob - 録音済みの音声データ
 * @param settings  - キオスク設置場所の設定情報
 * @returns 保存されたレコード
 */
export async function uploadAudioAndSaveRecord(
  audioBlob: Blob,
  settings: KioskSettings
): Promise<VoiceRecord> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('placeName', settings.placeName);
  formData.append('latitude', String(settings.latitude));
  formData.append('longitude', String(settings.longitude));

  const response = await fetch('/api/recordings', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? `サーバーエラー (${response.status})`);
  }

  return response.json() as Promise<VoiceRecord>;
}
