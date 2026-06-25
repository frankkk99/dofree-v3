import type { Metadata } from 'next';
import { MovieCard } from '@/components/movie-card';
import { getDetailPayload, type MediaType } from '@/lib/tmdb';

const allowedMediaTypes = new Set(['movie', 'tv']);

type PageProps = {
  params: Promise<{ mediaType: string; id: string }>;
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

function linkProps(href?: string) {
  if (!href || !/^https?:\/\//.test(href)) return {};
  return { target: '_blank', rel: 'noreferrer' };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { mediaType, id } = await params;
  const detail = await getDetailPayload(parseMediaType(mediaType), id);

  return {
    title: `รับชม ${detail.item.title}`,
    description: detail.item.overview || `หน้ารับชม ${detail.item.title} บน DOFree v3`,
    openGraph: {
      title: `รับชม ${detail.item.title} | DOFree v3`,
      description: detail.item.overview,
      images: [detail.item.backdropUrl],
    },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { mediaType, id } = await params;
  const detail = await getDetailPayload(parseMediaType(mediaType), id);
  const { item, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const sourceUrl = item.watchUrl || effectiveTrailerUrl;
  const embedUrl = toEmbedUrl(sourceUrl);
  const sourceLabel = item.watchUrl ? 'Watch Source' : effectiveTrailerUrl ? 'Trailer Preview' : 'No Source';

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
              DOFree<span className="ml-1 rounded bg-[#e50914] px-1 py-0.5 text-[9px] tracking-normal text-white md:text-[13px]">v3</span>
            </a>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_390px]">
            <div>
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_35px_120px_rgba(0,0,0,0.86)] md:rounded-[30px]">
                <div className="relative aspect-video bg-black">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={`รับชม ${item.title}`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/80">{sourceLabel}</p>
                <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] md:text-5xl">{item.title}</h1>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black text-white/66">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{item.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{item.year}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">★ {item.rating.toFixed(1)}</span>
                  {item.isWatchReady ? <span className="rounded-full bg-[#e50914] px-3 py-1.5 text-white">พร้อมรับชม</span> : null}
                </div>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-white/58 md:text-base md:leading-8">{item.overview}</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {sourceUrl ? (
                    <a {...linkProps(sourceUrl)} href={sourceUrl} className="inline-flex h-[44px] items-center rounded-xl border border-white/10 bg-white/[0.08] px-5 text-xs font-black text-white/76 transition hover:border-white/20 hover:bg-white/[0.13]">
                      เปิดลิงก์ต้นฉบับ
                    </a>
                  ) : null}
                  <a href="/watch-ready" className="inline-flex h-[44px] items-center rounded-xl border border-[#e50914]/30 bg-[#e50914]/10 px-5 text-xs font-black text-red-100 transition hover:border-[#e50914]/60 hover:bg-[#e50914]/18">
                    พร้อมรับชมทั้งหมด
                  </a>
                  <a href={`/${item.mediaType}/${item.id}`} className="inline-flex h-[44px] items-center rounded-xl border border-white/10 bg-black/30 px-5 text-xs font-black text-white/62 transition hover:bg-white/[0.08] hover:text-white">
                    รายละเอียดเรื่องนี้
                  </a>
                </div>

                <p className="mt-5 rounded-2xl border border-white/8 bg-black/28 px-4 py-3 text-[11px] font-semibold leading-5 text-white/38">
                  ใช้ player นี้สำหรับคอนเทนต์ที่มีสิทธิ์เผยแพร่เท่านั้น เช่น ไฟล์ของลูกค้า หนังสั้น คอร์ส วิดีโอองค์กร หรือสื่อที่ได้รับอนุญาต
                </p>
              </div>
            </div>

            <aside className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl md:p-4 lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/80">Up Next</p>
              <h2 className="px-1 pt-1 text-2xl font-black tracking-[-0.05em]">แนะนำต่อ</h2>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                {recommendations.slice(0, 10).map((movie, index) => (
                  <MovieCard key={`${movie.mediaType}-${movie.id}-${index}`} item={movie} compact priorityBadge={index === 0 ? 'ต่อไป' : undefined} />
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
