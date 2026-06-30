'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MovieItem } from '@/lib/tmdb';
import { DetailWindow } from '@/components/window-system';

type Props = {
  item: MovieItem;
  recommendations: MovieItem[];
  onClose: () => void;
  onSelect: (item: MovieItem) => void;
  initialTab?: 'recommend' | 'watch';
};

export function PortalDetailWindow(props: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <DetailWindow {...props} />
    </div>,
    document.body,
  );
}
