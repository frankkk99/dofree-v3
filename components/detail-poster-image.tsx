'use client';

import { useState } from 'react';

export function DetailPosterImage({ title, posterUrl, backdropUrl }: { title: string; posterUrl?: string; backdropUrl?: string }) {
  const [index, setIndex] = useState(0);
  const urls = [posterUrl, backdropUrl].filter(Boolean) as string[];
  const src = urls[index] || '';
  if (!src) return <div className="h-full w-full bg-black" />;
  return <img src={src} alt={title} className="h-full w-full object-cover" onError={() => setIndex((current) => current + 1)} />;
}
