'use client';

import { useState, useRef, useCallback } from 'react';

// 録音の状態を表す型
export type RecorderStatus = 'idle' | 'recording' | 'stopped' | 'error';

// フックの返り値の型
export interface UseAudioRecorderReturn {
  status: RecorderStatus;
  audioBlob: Blob | null;
  elapsedSeconds: number;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

// 最大録音時間（秒）
const MAX_RECORDING_SECONDS = 60;

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // タイマーをすべてクリアするヘルパー
  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopTimerRef.current !== null) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  // マイクストリームを解放するヘルパー
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // 録音停止処理（内部用）
  const stopRecordingInternal = useCallback(() => {
    clearTimers();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    releaseStream();
  }, [clearTimers, releaseStream]);

  // 録音開始
  const startRecording = useCallback(async () => {
    // 既に録音中なら何もしない
    if (status === 'recording') return;

    // 状態をリセット
    setAudioBlob(null);
    setErrorMessage(null);
    setElapsedSeconds(0);
    audioChunksRef.current = [];

    try {
      // マイクへのアクセス許可を要求
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // ブラウザがサポートするMIMEタイプを選択（webmを優先）
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      // 音声データが届くたびにチャンクとして蓄積
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 録音停止時にBlobを生成
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        setStatus('stopped');
      };

      recorder.onerror = () => {
        setErrorMessage('録音中にエラーが発生しました。');
        setStatus('error');
        clearTimers();
        releaseStream();
      };

      // 録音開始（250ms間隔でdataavailableを発火させる）
      recorder.start(250);
      setStatus('recording');

      // 経過時間カウンター（1秒ごとに更新）
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // 最大録音時間に達したら自動停止
      autoStopTimerRef.current = setTimeout(() => {
        stopRecordingInternal();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。'
          : 'マイクへのアクセスに失敗しました。';
      setErrorMessage(message);
      setStatus('error');
      releaseStream();
    }
  }, [status, stopRecordingInternal, clearTimers, releaseStream]);

  // 録音停止（外部公開用）
  const stopRecording = useCallback(() => {
    if (status !== 'recording') return;
    stopRecordingInternal();
  }, [status, stopRecordingInternal]);

  // 状態を初期化して次の録音に備える
  const resetRecording = useCallback(() => {
    clearTimers();
    releaseStream();
    setStatus('idle');
    setAudioBlob(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    audioChunksRef.current = [];
  }, [clearTimers, releaseStream]);

  return {
    status,
    audioBlob,
    elapsedSeconds,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
