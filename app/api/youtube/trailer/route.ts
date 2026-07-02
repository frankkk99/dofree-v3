import { NextResponse } from 'next/server';
import type { MediaType } from '@/lib/tmdb';

type TrailerMode = 'thai_dub' | 'thai_sub' | 'thai_first' | 'any';

type YoutubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
};

type Candidate = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt?: string;
  embedUrl: string;
  watchUrl: string;
  score: number;
  languageMatch: TrailerMode | 'fallback_any';
  query: string;
};

const blockedTerms = ['reaction', 'รีแอค', 'review', 'รีวิว', 'สปอย', 'spoiler', 'recap', 'ending', 'explained', 'full movie', 'เต็มเรื่อง', 'หนังเต็มเรื่อง'];
const officialChannels = ['major', 'sf', 'mono', 'warner', 'disney', 'netflix', 'prime video', 'sony', 'universal', 'paramount', '20th century', 'marvel', 'dreamworks', 'illumination'];

function apiKey() {
  return process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY || '';
}

function normalizeText(value?: string | null) {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniq(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function modeFromSearchParams(value: string | null): TrailerMode {
  if (value === 'thai_dub' || value === 'thai_sub' || value === 'thai_first' || value === 'any') return value;
  return 'thai_first';
}

function mediaWord(mediaType: MediaType) {
  return mediaType === 'tv' ? 'ซีรีส์' : 'หนัง';
}

function buildQueries(title: string, titleEn: string, year: string, mediaType: MediaType, mode: TrailerMode) {
  const names = uniq([title, titleEn]);
  const base = names.flatMap((name) => [
    `${name} ตัวอย่าง${mediaWord(mediaType)}`,
    `${name} official trailer`,
    year ? `${name} ${year} trailer` : `${name} trailer`,
  ]);

  if (mode === 'thai_dub') {
    return uniq([
      ...names.map((name) => `${name} ตัวอย่าง${mediaWord(mediaType)} พากย์ไทย`),
      ...names.map((name) => `${name} trailer พากย์ไทย`),
      ...names.map((name) => `${name} ตัวอย่าง ไทย`),
      ...base,
    ]).slice(0, 10);
  }

  if (mode === 'thai_sub') {
    return uniq([
      ...names.map((name) => `${name} ตัวอย่าง${mediaWord(mediaType)} ซับไทย`),
      ...names.map((name) => `${name} official trailer ซับไทย`),
      ...names.map((name) => `${name} Thai sub trailer`),
      ...base,
    ]).slice(0, 10);
  }

  if (mode === 'any') return uniq(base).slice(0, 8);

  return uniq([
    ...names.map((name) => `${name} ตัวอย่าง${mediaWord(mediaType)} ไทย`),
    ...names.map((name) => `${name} ตัวอย่าง${mediaWord(mediaType)} พากย์ไทย`),
    ...names.map((name) => `${name} ตัวอย่าง${mediaWord(mediaType)} ซับไทย`),
    ...base,
  ]).slice(0, 10);
}

function scoreCandidate(item: YoutubeSearchItem, query: string, mode: TrailerMode) {
  const title = item.snippet?.title || '';
  const description = item.snippet?.description || '';
  const channelTitle = item.snippet?.channelTitle || '';
  const combined = normalizeText(`${title} ${description} ${channelTitle}`);
  let score = 0;

  if (combined.includes('ตัวอย่างหนัง') || combined.includes('ตัวอย่างซีรีส์')) score += 35;
  if (combined.includes('official trailer')) score += 30;
  if (combined.includes('trailer')) score += 20;
  if (combined.includes('พากย์ไทย')) score += mode === 'thai_dub' ? 60 : 28;
  if (combined.includes('ซับไทย') || combined.includes('thai sub') || combined.includes('thai subtitle')) score += mode === 'thai_sub' ? 60 : 24;
  if (combined.includes('ไทย')) score += 14;
  if (officialChannels.some((term) => combined.includes(term))) score += 18;
  if (query.includes('พากย์ไทย') && combined.includes('พากย์ไทย')) score += 22;
  if (query.includes('ซับไทย') && (combined.includes('ซับไทย') || combined.includes('thai sub'))) score += 22;
  if (blockedTerms.some((term) => combined.includes(term))) score -= 80;

  return score;
}

async function searchYoutube(query: string, mode: TrailerMode) {
  const key = apiKey();
  if (!key) return [] as Candidate[];

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '8',
    q: query,
    regionCode: 'TH',
    relevanceLanguage: 'th',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'moderate',
    key,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) return [] as Candidate[];

  const payload = await response.json().catch(() => null) as { items?: YoutubeSearchItem[] } | null;
  return (payload?.items || [])
    .map((item) => {
      const videoId = item.id?.videoId || '';
      const score = scoreCandidate(item, query, mode);
      const text = normalizeText(`${item.snippet?.title} ${item.snippet?.description}`);
      const languageMatch: Candidate['languageMatch'] = text.includes('พากย์ไทย') ? 'thai_dub' : text.includes('ซับไทย') || text.includes('thai sub') ? 'thai_sub' : 'fallback_any';
      return videoId ? {
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        channelTitle: item.snippet?.channelTitle || '',
        publishedAt: item.snippet?.publishedAt,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&playsinline=1`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        score,
        languageMatch,
        query,
      } : null;
    })
    .filter(Boolean) as Candidate[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get('title')?.trim() || '';
  const titleEn = url.searchParams.get('titleEn')?.trim() || '';
  const year = url.searchParams.get('year')?.trim() || '';
  const mediaType = (url.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie') as MediaType;
  const mode = modeFromSearchParams(url.searchParams.get('mode'));

  if (!title && !titleEn) return NextResponse.json({ ok: false, error: 'Missing title' }, { status: 400 });
  if (!apiKey()) return NextResponse.json({ ok: true, missingApiKey: true, recommended: null, candidates: [] });

  const queries = buildQueries(title, titleEn, year, mediaType, mode);
  const grouped = await Promise.all(queries.map((query) => searchYoutube(query, mode).catch(() => [] as Candidate[])));
  const seen = new Set<string>();
  const candidates = grouped
    .flat()
    .filter((item) => {
      if (seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const preferred = candidates.find((item) => mode === 'thai_dub' ? item.languageMatch === 'thai_dub' : mode === 'thai_sub' ? item.languageMatch === 'thai_sub' : item.languageMatch !== 'fallback_any');
  const fallbackAny = candidates.find((item) => item.score > -50) || null;
  const recommended = preferred || fallbackAny;

  return NextResponse.json({ ok: true, mode, recommended, candidates, fallbackUsed: Boolean(recommended && recommended.languageMatch === 'fallback_any') });
}
