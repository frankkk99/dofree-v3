'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MediaPlaceholder } from '@/components/media-placeholder';
import { canUseNextImage } from '@/lib/image-optimizer';

type Props = {
  imageUrl?: string | null;
  title?: string;
};

export function HomeHeroMedia({ imageUrl, title }: Props) {
  const [failed, setFailed] = useState(false);
  const src = failed ? '' : imageUrl || '';
  const optimize = canUseNextImage(src);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!src) {
    return <MediaPlaceholder variant="backdrop" title="ภาพโปรโมตกำลังอัปเดต" subtitle={title ? `${title} · กำลังซิงก์ภาพล่าสุด` : 'กำลังซิงก์ภาพล่าสุดจาก TMDB'} />;
  }

  if (optimize) {
    return (
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 78vw"
        className="object-cover object-center opacity-90 transition duration-700"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className="h-full w-full object-cover object-center opacity-90 transition duration-700"
      onError={() => setFailed(true)}
    />
  );
}
