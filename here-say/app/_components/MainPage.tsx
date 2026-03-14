'use client';

import { useState, useEffect, useRef } from 'react';
import { useKioskSettings } from '@/src/hooks/useKioskSettings';
import { useAudioRecorder } from '@/src/hooks/useAudioRecorder';
import { useVoiceRecords } from '@/src/hooks/useVoiceRecords';
import { uploadAudioAndSaveRecord } from '@/src/lib/uploadAudio';
import type { KioskSettings } from '@/src/types';
import { Timestamp } from 'firebase/firestore';

// ─── アップロード状態の型 ────────────────────────────────────────────
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

// ─── 経過時間フォーマット（例: 63 → "1:03"） ─────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Firestore Timestamp を相対時間表示に変換 ─────────────────────────
function formatRelativeTime(timestamp: Timestamp | null): string {
  if (!timestamp) return '投稿中...';
  const date = timestamp.toDate();
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'たった今';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
  return `${Math.floor(diffSec / 86400)}日前`;
}

// ─── 設定パネル（モーダル） ──────────────────────────────────────────
function SettingsModal({
  currentSettings,
  onSave,
  onClose,
}: {
  currentSettings: KioskSettings;
  onSave: (s: KioskSettings) => void;
  onClose: () => void;
}) {
  const [placeName, setPlaceName] = useState(currentSettings.placeName);
  const [latitude, setLatitude] = useState(String(currentSettings.latitude));
  const [longitude, setLongitude] = useState(String(currentSettings.longitude));
  const [validationError, setValidationError] = useState('');

  const handleSave = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!placeName.trim()) {
      setValidationError('場所名を入力してください。');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setValidationError('緯度は -90 〜 90 の数値を入力してください。');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setValidationError('経度は -180 〜 180 の数値を入力してください。');
      return;
    }
    onSave({ placeName: placeName.trim(), latitude: lat, longitude: lng });
    onClose();
  };

  return (
    // オーバーレイ背景
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          ⚙️ 設置場所の設定
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              場所名
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="例: 浅草寺"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                緯度
              </label>
              <input
                type="number"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="例: 35.7148"
                step="any"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                経度
              </label>
              <input
                type="number"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="例: 139.7967"
                step="any"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-sm text-red-500">{validationError}</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-base font-medium text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-amber-500 py-3 text-base font-bold text-white hover:bg-amber-600 active:scale-95"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 録音ボタン ──────────────────────────────────────────────────────
function RecordButton({
  status,
  isDisabled,
  onStart,
  onStop,
}: {
  status: string;
  isDisabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const isRecording = status === 'recording';

  return (
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={isDisabled}
      className={`
        relative flex h-32 w-32 items-center justify-center rounded-full text-white shadow-lg
        transition-all duration-200 active:scale-95
        ${isDisabled ? 'cursor-not-allowed bg-gray-300' : ''}
        ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}
        ${!isRecording && !isDisabled ? 'bg-amber-500 hover:bg-amber-600' : ''}
      `}
      aria-label={isRecording ? '録音停止' : '録音開始'}
    >
      {/* 録音中の波紋アニメーション */}
      {isRecording && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
          <span className="absolute inline-flex h-[140%] w-[140%] animate-ping rounded-full bg-red-300 opacity-25 delay-150" />
        </>
      )}
      {/* アイコン */}
      <span className="relative text-5xl">
        {isRecording ? '⏹' : '🎙'}
      </span>
    </button>
  );
}

// ─── メインページ（Client Component） ───────────────────────────────
export default function MainPage() {
  const { settings, isConfigured, saveSettings } = useKioskSettings();
  const {
    status: recorderStatus,
    audioBlob,
    elapsedSeconds,
    errorMessage: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();
  const { records, isLoading: recordsLoading, error: recordsError } =
    useVoiceRecords(settings.placeName);

  const [showSettings, setShowSettings] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');

  // 録音完了時に自動アップロード
  useEffect(() => {
    if (recorderStatus !== 'stopped' || !audioBlob || !isConfigured) return;

    const upload = async () => {
      setUploadStatus('uploading');
      setUploadError('');
      try {
        await uploadAudioAndSaveRecord(audioBlob, settings);
        setUploadStatus('done');
        // 3秒後に状態をリセットして次の録音に備える
        setTimeout(() => {
          resetRecording();
          setUploadStatus('idle');
        }, 3000);
      } catch {
        setUploadStatus('error');
        setUploadError('アップロードに失敗しました。再度お試しください。');
      }
    };

    upload();
  }, [recorderStatus, audioBlob, isConfigured, settings, resetRecording]);

  // ステータスメッセージ
  const statusMessage = (() => {
    if (!isConfigured) return '管理者が場所の設定を完了するとご利用できます';
    if (recorderStatus === 'recording')
      return `録音中... ${formatTime(elapsedSeconds)} / 1:00`;
    if (recorderStatus === 'stopped' && uploadStatus === 'uploading')
      return '音声を保存中...';
    if (uploadStatus === 'done') return '投稿しました！ありがとうございます';
    if (uploadStatus === 'error') return uploadError;
    if (recorderError) return recorderError;
    return 'ボタンを押して、あなたの声を残してみよう！';
  })();

  const isRecordButtonDisabled =
    !isConfigured ||
    uploadStatus === 'uploading' ||
    uploadStatus === 'done' ||
    recorderStatus === 'error';

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 to-orange-50">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-amber-700">
            Here Say
          </h1>
          {isConfigured && (
            <p className="text-sm text-amber-600">📍 {settings.placeName}</p>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-full p-2 text-2xl text-gray-400 transition hover:bg-amber-100 hover:text-gray-600"
          aria-label="設定を開く"
        >
          ⚙️
        </button>
      </header>

      {/* 設定モーダル */}
      {showSettings && (
        <SettingsModal
          currentSettings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 録音セクション */}
      <section className="flex flex-col items-center gap-6 px-6 py-10">
        <p className="text-center text-lg font-medium text-gray-600">
          この場所の思い出を声で残そう
        </p>

        <RecordButton
          status={recorderStatus}
          isDisabled={isRecordButtonDisabled}
          onStart={startRecording}
          onStop={stopRecording}
        />

        {/* ステータス表示 */}
        <div
          className={`
            min-h-[2rem] rounded-full px-5 py-2 text-center text-sm font-medium
            ${uploadStatus === 'done' ? 'bg-green-100 text-green-700' : ''}
            ${uploadStatus === 'error' || recorderStatus === 'error' ? 'bg-red-100 text-red-600' : ''}
            ${recorderStatus === 'recording' ? 'bg-red-50 text-red-600' : ''}
            ${uploadStatus === 'uploading' ? 'bg-amber-50 text-amber-600' : ''}
            ${uploadStatus === 'idle' && recorderStatus === 'idle' ? 'bg-white/60 text-gray-500' : ''}
          `}
        >
          {uploadStatus === 'uploading' && (
            <span className="mr-2 inline-block animate-spin">⏳</span>
          )}
          {statusMessage}
        </div>

        {/* 録音中プログレスバー */}
        {recorderStatus === 'recording' && (
          <div className="h-2 w-48 overflow-hidden rounded-full bg-red-100">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-1000"
              style={{ width: `${(elapsedSeconds / 60) * 100}%` }}
            />
          </div>
        )}
      </section>

      {/* 区切り線 */}
      <div className="mx-6 border-t border-amber-200" />

      {/* 音声一覧セクション */}
      <section className="flex-1 px-6 py-6">
        <h2 className="mb-4 text-lg font-bold text-gray-700">
          みんなの声 ({isConfigured ? settings.placeName : 'ー'})
        </h2>

        {/* 未設定 */}
        {!isConfigured && (
          <p className="text-center text-gray-400 mt-8">
            場所が設定されると、ここに音声一覧が表示されます。
          </p>
        )}

        {/* ローディング */}
        {isConfigured && recordsLoading && (
          <div className="flex justify-center py-10">
            <span className="animate-spin text-3xl">⏳</span>
          </div>
        )}

        {/* エラー */}
        {recordsError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {recordsError}
          </p>
        )}

        {/* 音声リスト */}
        {isConfigured && !recordsLoading && records.length === 0 && (
          <p className="mt-8 text-center text-gray-400">
            まだ録音がありません。最初の一声を残してみましょう！
          </p>
        )}

        <ul className="space-y-3">
          {records.map((record: import('@/src/hooks/useVoiceRecords').VoiceRecordWithId, index: number) => (
            <li
              key={record.id}
              className="flex flex-col gap-2 rounded-2xl bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-600">
                  #{index + 1}
                </span>
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(record.createdAt)}
                </span>
              </div>
              <audio
                src={record.audioUrl}
                controls
                className="w-full"
                preload="none"
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
