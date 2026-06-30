'use client';

import { useState } from 'react';
import type { MediaType } from '@/lib/tmdb';

type DetailReportButtonProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  className?: string;
  children?: React.ReactNode;
};

export function DetailReportButton({ tmdbId, mediaType, title, className = '', children = 'แจ้งลิงก์เสีย' }: DetailReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);

  async function reportIssue() {
    if (loading || reported) return;
    setLoading(true);

    try {
      await fetch('/api/link-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbId,
          media_type: mediaType,
          title,
          reason: 'broken_link',
        }),
      });
    } catch {
      // Keep the UI responsive even if the report endpoint is temporarily unavailable.
    } finally {
      setReported(true);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={reportIssue}
      disabled={loading || reported}
      className={`${className} ${reported ? 'border border-green-300/20 bg-green-400/[0.1] text-green-100' : ''}`}
    >
      {reported ? 'รับรายงานแล้ว' : loading ? 'กำลังแจ้ง...' : children}
    </button>
  );
}
