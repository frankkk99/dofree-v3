import type { Metadata } from 'next';
import { MovieCard } from '@/components/movie-card';
import { WatchOverviewClamp } from '@/components/watch-overview-clamp';
import { episodeWatchHref, getPublishedSeriesEpisodes, groupSeriesEpisodes } from '@/lib/series-episodes';
import { getDetailPayload, getWatchSourceUrl, type MediaType } from '@/lib/tmdb';
import { createWatchSourceToken } from '@/lib/watch-source-token';

const siteName = 'ดูดีดี';
const allowedMediaTypes = new Set(['movie', 'tv']);

type PageProps = {
  params: Promise<{ mediaType: string; id: string }>;
  searchParams?: Promise<{ season?: string; episode?: string }>;
};

function parseMediaType(value: string): MediaType {
  return allowedMediaTypes.has(value) ? (value as MediaType) : 'movie';
}

function youtubeKey(url: URL) {
  if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '');
  if (url.searchParams.get('v')) return url.searchParams.get('v') || undefined;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1];
  return undefined;
}

function toEmbedUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const key = youtubeKey(url);
      return key ? `https://www.youtube.com/embed/${key}` : raw;
    }

    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch?.[1]) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

    const driveId = url.hostname.includes('drive.google.com') ? url.searchParams.get('id') : null;
    if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;

    return raw;
  } catch {
    return raw;
  }
}

function protectedWatchUrl(sourceUrl: string | undefined, mediaType: MediaType, id: number) {
  if (!sourceUrl) return undefined;
  try {
    const token = createWatchSourceToken({ url: sourceUrl, mediaType, id });
    return `/api/watch/source?token=${encodeURIComponent(token)}`;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { mediaType, id } = await params;
  const detail = await getDetailPayload(parseMediaType(mediaType), id);

  return {
    title: `รับชม ${detail.item.title}`,
    description: detail.item.overview || `หน้ารับชม ${detail.item.title} บน${siteName}`,
    openGraph: {
      title: `รับชม ${detail.item.title} | ${siteName}`,
      description: detail.item.overview,
      images: [detail.item.backdropUrl],
      siteName,
    },
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { mediaType, id } = await params;
  const query = await searchParams;
  const detail = await getDetailPayload(parseMediaType(mediaType), id);
  const { item, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const seriesEpisodes = item.mediaType === 'tv' ? await getPublishedSeriesEpisodes(item.id) : [];
  const requestedSeason = Number(query?.season || 0);
  const requestedEpisode = Number(query?.episode || 0);
  const selectedEpisode = seriesEpisodes.find((episode) => episode.season_number === requestedSeason && episode.episode_number === requestedEpisode) || seriesEpisodes[0];
  const watchSourceUrl = selectedEpisode?.watch_url || await getWatchSourceUrl(item.mediaType, item.id);
  const sourceUrl = protectedWatchUrl(watchSourceUrl, item.mediaType, item.id) || effectiveTrailerUrl;
  const embedUrl = toEmbedUrl(sourceUrl);
  const seasons = groupSeriesEpisodes(seriesEpisodes);
  const episodeSourceLabel = selectedEpisode ? `S${selectedEpisode.season_number} E${selectedEpisode.episode_number}` : undefined;
  const sourceLabel = watchSourceUrl ? 'พร้อมรับชม' : effectiveTrailerUrl ? 'ตัวอย่าง' : 'ยังไม่มีวิดีโอ';

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-8 pt-4 md:px-6 md:pb-12">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${item.backdropUrl})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.64),#030303_82%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(229,9,20,0.20),transparent_26rem)]" />

        <div className="relative z-10 mx-auto max-w-[1600px]">
          <div className="flex min-h-[58px] items-center justify-between gap-3 md:min-h-[76px]">
            <a href={`/${item.mediaType}/${item.id}`} className="inline-flex rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-black text-red-100/75 backdrop-blur-xl transition hover:border-[#e50914]/60 hover:text-white">
              กลับหน้ารายละเอียด
            </a>
            <a href="/" className="text-[24px] font-black tracking-[-0.08em] text-[#e50914] md:text-[34px]">
              {siteName}
            </a>
          </div>

          <div className="mt-4 grid gap-5">
            <div>
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_35px_120px_rgba(0,0,0,0.86)] md:rounded-[30px]">
                <div className="relative aspect-video bg-black">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={`รับชม ${item.title}`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="no-referrer"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center px-6 text-center">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/80">No playable source</p>
                        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">ยังไม่มีลิงก์รับชม</h1>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">เรื่องนี้มีหน้ารายละเอียดแล้ว แต่ยังไม่มี watch URL หรือ trailer ที่เปิดใน player ได้</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl md:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/80">{episodeSourceLabel || sourceLabel}</p>
                <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] md:text-5xl">{item.title}</h1>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black text-white/66">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{item.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{item.year}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">★ {item.rating.toFixed(1)}</span>
                  {item.isWatchReady ? <span className="rounded-full bg-[#e50914] px-3 py-1.5 text-white">พร้อมรับชม</span> : null}
                </div>
                <WatchOverviewClamp text={item.overview} />
                {seasons.length ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/24 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">Episodes</p>
                        <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">เลือกตอนรับชม</h2>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/58">{seriesEpisodes.length} ตอน</span>
                    </div>

                    <div className="mt-4 grid gap-4">
                      {seasons.map((season) => (
                        <div key={season.seasonNumber}>
                          <p className="mb-2 text-xs font-black text-white/46">Season {season.seasonNumber}</p>
                          <div className="flex flex-wrap gap-2">
                            {season.episodes.map((episode) => {
                              const active = selectedEpisode?.season_number === episode.season_number && selectedEpisode?.episode_number === episode.episode_number;
                              return (
                                <a
                                  key={`${episode.season_number}-${episode.episode_number}`}
                                  href={episodeWatchHref(item.mediaType, item.id, episode)}
                                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/68 hover:bg-white/[0.14] hover:text-white'}`}
                                >
                                  E{episode.episode_number}{episode.episode_title ? ` · ${episode.episode_title}` : ''}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl md:p-4">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/80">Up Next</p>
              <h2 className="px-1 pt-1 text-2xl font-black tracking-[-0.05em]">แนะนำต่อ</h2>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 md:gap-4 lg:grid-cols-8 xl:grid-cols-10">
                {recommendations.slice(0, 12).map((movie, index) => (
                  <MovieCard key={`${movie.mediaType}-${movie.id}-${index}`} item={movie} grid priorityBadge={index === 0 ? 'ต่อไป' : undefined} />
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
