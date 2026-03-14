'use client';

import { useState, useEffect, useCallback } from 'react';
import type { KioskSettings } from '@/src/types';

// localStorageのキー
const STORAGE_KEY = 'kiosk_settings';

// 設定が未登録の場合のデフォルト値（空であることを明示）
const DEFAULT_SETTINGS: KioskSettings = {
  placeName: '',
  latitude: 0,
  longitude: 0,
};

/**
 * キオスク端末の設置場所設定を localStorage で管理するカスタムフック。
 *
 * - `settings`    : 現在保存されている設定値
 * - `isConfigured`: 有効な設定が保存済みかどうか
 * - `saveSettings`: 設定を保存する関数
 * - `clearSettings`: 設定を削除する関数
 */
export function useKioskSettings() {
  const [settings, setSettings] = useState<KioskSettings>(DEFAULT_SETTINGS);

  // マウント時にlocalStorageから設定を読み込む（SSR対策でuseEffect内で実行）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isKioskSettings(parsed)) {
          setSettings(parsed);
        }
      }
    } catch {
      // JSONパース失敗時は無視してデフォルト値を使用
    }
  }, []);

  // 設定を保存する
  const saveSettings = useCallback((newSettings: KioskSettings): void => {
    const validated: KioskSettings = {
      placeName: newSettings.placeName.trim(),
      latitude: newSettings.latitude,
      longitude: newSettings.longitude,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    setSettings(validated);
  }, []);

  // 設定を削除して初期状態に戻す
  const clearSettings = useCallback((): void => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // 有効な設定が保存済みかどうか（場所名と座標が入力済み）
  const isConfigured =
    settings.placeName.trim() !== '' &&
    (settings.latitude !== 0 || settings.longitude !== 0);

  return {
    settings,
    isConfigured,
    saveSettings,
    clearSettings,
  };
}

// 型ガード：localStorageから取り出した値がKioskSettingsかを検証する
function isKioskSettings(value: unknown): value is KioskSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'placeName' in value &&
    'latitude' in value &&
    'longitude' in value &&
    typeof (value as Record<string, unknown>).placeName === 'string' &&
    typeof (value as Record<string, unknown>).latitude === 'number' &&
    typeof (value as Record<string, unknown>).longitude === 'number'
  );
}
