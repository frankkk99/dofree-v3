import { DetailReportButton } from '@/components/detail-report-button';
import { AdSlot } from '@/components/ad-slot';
import { InlineWatchPlayer } from '@/components/inline-watch-player';
import { getPublishedSeriesEpisodes } from '@/lib/series-episodes';
import { getWatchSourceUrl, type MediaType } from '@/lib/tmdb';

type DetailInlineWatchSectionProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  fallbackImage: string;
};

function ComingSoonWatchSection({ tmdbId, mediaType, title, fallbackImage }: DetailInlineWatchSectionProps) {
  return (
    <section id="watch" className="scroll-mt-24 px-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">รับชม</p>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-black text-white/42 backdrop-blur-xl md:text-[10px]">เร็วๆ นี้</span>
      </div>
      <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] sm:rounded-[32px]">
        {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 flex h-full min-w-0 flex-col justify-end p-5 text-left sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70 sm:text-xs">รับชม</p>
          <h2 className="mt-2 max-w-full break-words text-2xl font-black leading-tight tracking-[-0.05em] text-white sm:text-3xl md:text-4xl">จะอัปเดตเร็วๆ นี้</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/75">{mediaType === 'tv' ? 'ยังไม่มีตอนที่พร้อมรับชมสำหรับซีรีส์นี้' : 'ยังไม่มีลิงก์รับชมสำหรับเรื่องนี้'}</p>
          <div className="mt-5 flex max-w-full flex-wrap gap-3">
            <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="rounded-2xl bg-black/45 px-5 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/[0.08] sm:px-6 sm:py-4">
              แจ้งลิงก์รับชม
            </DetailReportButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function DetailInlineWatchSection({ tmdbId, mediaType, title, fallbackImage }: DetailInlineWatchSectionProps) {
  const seriesEpisodes = mediaType === 'tv' ? await getPublishedSeriesEpisodes(tmdbId) : [];
  const firstEpisodeSourceUrl = seriesEpisodes[0]?.watch_url || undefined;
  const movieSourceUrl = mediaType === 'movie' ? await getWatchSourceUrl(mediaType, tmdbId) : undefined;
  const sourceUrl = mediaType === 'tv' ? firstEpisodeSourceUrl : movieSourceUrl;
  const seasonCount = new Set(seriesEpisodes.map((episode) => episode.season_number)).size;
  const episodes = seriesEpisodes
    .map((episode) => ({
      key: `${episode.season_number}-${episode.episode_number}`,
      label: `${seasonCount > 1 ? `S${episode.season_number} · ` : ''}ตอนที่ ${episode.episode_number}${episode.episode_title ? ` · ${episode.episode_title}` : ''}`,
      sourceUrl: episode.watch_url || '',
    }))
    .filter((episode) => episode.sourceUrl);

  if (!sourceUrl && episodes.length === 0) {
    return <ComingSoonWatchSection tmdbId={tmdbId} mediaType={mediaType} title={title} fallbackImage={fallbackImage} />;
  }

  return (
    <>
      <InlineWatchPlayer tmdbId={tmdbId} mediaType={mediaType} title={title} fallbackImage={fallbackImage} sourceUrl={sourceUrl} episodes={episodes} />
      <div className="mt-5 px-4 sm:px-5">
        <AdSlot code="AD-PC-P01" className="mx-auto max-w-4xl" />
        <AdSlot code="AD-MB-P01" className="mx-auto max-w-sm" />
      </div>
    </>
  );
}
