import { ImageResponse } from 'next/og';
import { seoConfig } from '@/lib/seo';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #050505 0%, #160303 48%, #050505 100%)',
          color: 'white',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: 72,
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 42,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            height: '100%',
            justifyContent: 'center',
            padding: 64,
            width: '100%',
          }}
        >
          <div style={{ color: '#ff3b45', fontSize: 34, fontWeight: 900, letterSpacing: 4 }}>
            {seoConfig.englishSiteName.toUpperCase()}
          </div>
          <div style={{ fontSize: 108, fontWeight: 900, lineHeight: 0.95 }}>{seoConfig.siteName}</div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 42, fontWeight: 700, lineHeight: 1.25 }}>
            เว็บดูหนังออนไลน์ ซีรีส์ออนไลน์ หนังใหม่ พากย์ไทย ซับไทย
          </div>
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 26, fontWeight: 700 }}>
            {seoConfig.displayDomain}
          </div>
        </div>
      </div>
    ),
    size
  );
}
