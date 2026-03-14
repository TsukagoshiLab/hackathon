import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { VoiceRecord } from '@/src/types';

// メタデータを保存するJSONファイルのパス
const DATA_FILE = path.join(process.cwd(), 'data', 'recordings.json');
// 音声ファイルを保存するディレクトリ（public配下でNext.jsが静的配信する）
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'recordings');

// JSONファイルからレコード一覧を読み込む
async function readRecordings(): Promise<VoiceRecord[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as VoiceRecord[];
  } catch {
    // ファイルが存在しない場合は空配列を返す
    return [];
  }
}

// レコード一覧をJSONファイルに書き込む
async function writeRecordings(records: VoiceRecord[]): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// GET /api/recordings?placeName=xxx
// 指定した場所名の最新10件を返す
export async function GET(request: NextRequest) {
  const placeName = request.nextUrl.searchParams.get('placeName') ?? '';

  const records = await readRecordings();
  const filtered = records
    .filter((r) => r.placeName === placeName)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return NextResponse.json(filtered);
}

// POST /api/recordings
// 音声ファイル（FormData）を受け取ってローカルに保存する
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File | null;
  const placeName = (formData.get('placeName') as string | null) ?? '';
  const latitude = parseFloat((formData.get('latitude') as string) ?? '0');
  const longitude = parseFloat((formData.get('longitude') as string) ?? '0');

  if (!audioFile || !placeName) {
    return NextResponse.json(
      { error: '音声ファイルまたは場所名が不足しています。' },
      { status: 400 }
    );
  }

  // 保存先ディレクトリを作成（存在しない場合）
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // ファイル名を一意に生成して保存
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  await writeFile(filePath, buffer);

  // メタデータをJSONに追記
  const newRecord: VoiceRecord = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    audioUrl: `/recordings/${fileName}`,
    placeName,
    latitude,
    longitude,
    createdAt: new Date().toISOString(),
  };

  const records = await readRecordings();
  records.push(newRecord);
  await writeRecordings(records);

  return NextResponse.json(newRecord, { status: 201 });
}
