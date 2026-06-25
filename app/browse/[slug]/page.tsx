import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MovieCard } from '@/components/movie-card';
import { browseRouteBySlug, browseRoutes } from '@/lib/browse';
import { getCatalogHomePayload } from '@/lib/catalog-home';
import { publicPageMetadata } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return browseRoutes.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = browseRouteBySlug(slug);
  if (!route) return {};

  return {
    ...publicPageMetadata({
      title: route.title,
      description: route.description,
      path: `/browse/${route.slug}`,
      keywords: route.keywords,
    }),
  };
}

export default async function BrowseSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const route = browseRouteBySlug(slug);
  if (!route) notFound();

  const home = await getCatalogHomePayload();
  const section = home.sections.find((item) => item.slug === route.slug);
  const fallbackItems = route.slug === 'watch-ready'
    ? home.sections.flatMap((item) => item.items).filter((item) => item.isWatchReady || item.watchUrl || item.status === 'published')
    : [];
  const items = section?.items?.length ? section.items : fallbackItems;

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-4 py-20 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(229,9,20,0.22),transparent_28rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <a href="/browse" className="text-sm font-black text-red-200/75 hover:text-red-100">หมวดหมู่ทั้งหมด</a>
          <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">{route.eyebrow}</p>
          <h1 className="mt-3 text-[40px] font-black tracking-[-0.07em] md:text-[72px]">{route.title}</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/52 md:text-base">{route.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-black text-white/62">
            <span className="rounded-full bg-[#e50914] px-3 py-1.5 text-white">ทั้งหมด {items.length}</span>
            {route.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-white/10 px-3 py-1.5">{keyword}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        {items.length ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 md:gap-4 lg:grid-cols-6 xl:grid-cols-7">
            {items.map((item, index) => (
              <MovieCard
                key={`${route.slug}-${item.mediaType}-${item.id}-${index}`}
                item={item}
                grid
                priority={index < 14}
                priorityBadge={index < 4 ? route.title : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6 text-sm font-bold text-white/52">
            ยังไม่มีรายการในหมวดนี้ กลับไปเลือกหมวดอื่นหรือค้นหาจากหน้าแรกได้เลย
          </div>
        )}
      </section>
    </main>
  );
}
