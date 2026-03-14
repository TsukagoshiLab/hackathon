# プロジェクト概要 (Project Context)
このプロジェクトは、観光地等に設置されたPC（キオスク端末）向けのWebアプリケーションです。
ユーザーがマイクから音声を録音し、その場所の位置情報（緯度・経度）と共に保存します。また、その場所で録音された「最新の音声データ10件」を取得・再生できる機能を提供します。
動画や画像は扱わず、**音声データのみ**に特化することで、Firebaseの無料枠内で軽量かつ安定して動作させることを目的としています。

# 技術スタック (Tech Stack)
- **Frontend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **BaaS:** Firebase (Firestore, Cloud Storage)
- **Audio API:** Web API (MediaRecorder API)

# アーキテクチャとデータフロー (Architecture & Data Flow)
1. **録音:** ブラウザ標準の `MediaRecorder` を使用して音声を録音（例: `webm` または `mp3` 形式）。
2. **保存:** - 音声ファイル本体は **Firebase Cloud Storage** にアップロード。
   - アップロード後に発行されるダウンロードURLと、位置情報（固定値またはGeolocation API）、作成日時（`createdAt`）を **Firestore** にドキュメントとして保存。
3. **取得:** Firestoreから `orderBy('createdAt', 'desc').limit(10)` のクエリを使用して、最新10件のメタデータ（音声URL含む）を取得。

# 実装ルール (Implementation Guidelines)
## 音声の取り扱い (Audio Handling)
- ストレージ節約のため、1回の録音時間には上限（例: 30秒〜1分）を設けてください。
- 録音中、録音完了、アップロード中などの状態（State）を明確に管理し、ユーザーに分かりやすいUI（プログレスバーやステータス表示）を提供してください。

## 位置情報 (Geolocation)
- キオスク端末としての利用を想定しているため、端末ごとに固定の緯度・経度を持たせる設計（環境変数や初期設定値からの読み込み）も考慮し、柔軟に対応できるようにしてください。

## Firebase & セキュリティ
- Firebaseの設定情報（`firebaseConfig`）は必ず環境変数（`.env.local`）から読み込み、コード内にハードコードしないでください。
- `any`型の使用は厳禁です。Firestoreのドキュメントデータには厳格な型（`type` または `interface`）を定義してください。

# Claude Codeへの指示 (Instructions for Claude Code)
- **ステップバイステップの実装:** 「録音機能」「Firebaseへの保存機能」「最新10件の取得機能」など、タスクを小さく分割して1つずつ実装を進めてください。
- **UIコンポーネント:** Next.jsのServer ComponentsとClient Components (`'use client'`) の境界を正しく理解し、マイク操作や状態管理が必要な部分にのみClient Componentsを使用してください。
- **言語設定:** 回答およびコード内のコメントは日本語で行ってください。