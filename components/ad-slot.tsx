'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AdSlotConfig, AdSlotDefinition, AdSlotDevice } from '@/lib/ads-config';

type PublicAdsConfig = {
  enabled: boolean;
  showPlaceholders: boolean;
  contactUrl: string;
  definitions: AdSlotDefinition[];
  slots: Record<string, AdSlotConfig>;
};

type PublicAdsPayload = {
  ok?: boolean;
  config?: PublicAdsConfig;
};

type AdSlotProps = {
  code: string;
  className?: string;
  variant?: 'banner' | 'native' | 'sticky';
  onVisibilityChange?: (visible: boolean) => void;
};

const adsConfigUpdatedEvent = 'dofree-ads-config-updated';

async function loadAdsConfig() {
  return fetch(`/api/ads/config?t=${Date.now()}`, { cache: 'no-store' })
    .then((response) => response.json())
    .then((payload: PublicAdsPayload) => payload.ok ? payload.config || null : null)
    .catch(() => null);
}

function isPublicAdsConfig(value: unknown): value is PublicAdsConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<PublicAdsConfig>;
  return typeof config.enabled === 'boolean' && typeof config.showPlaceholders === 'boolean' && Array.isArray(config.definitions) && Boolean(config.slots && typeof config.slots === 'object');
}

function deviceClass(device: AdSlotDevice) {
  if (device === 'desktop') return 'hidden md:block';
  if (device === 'mobile') return 'block md:hidden';
  return '';
}

function isActiveNow(slot?: AdSlotConfig) {
  if (!slot?.enabled || slot.mode === 'off') return false;
  const now = Date.now();
  const startsAt = slot.startsAt ? new Date(slot.startsAt).getTime() : 0;
  const endsAt = slot.endsAt ? new Date(`${slot.endsAt}T23:59:59`).getTime() : 0;
  if (startsAt && Number.isFinite(startsAt) && now < startsAt) return false;
  if (endsAt && Number.isFinite(endsAt) && now > endsAt) return false;
  return true;
}

function adHeightClass(variant: AdSlotProps['variant'], definition?: AdSlotDefinition) {
  if (variant === 'sticky') return 'min-h-[58px]';
  if (variant === 'native') return 'min-h-[176px] sm:min-h-[220px] md:min-h-[280px]';
  if (definition?.size.includes('300x250')) return 'min-h-[250px]';
  return 'min-h-[86px] md:min-h-[112px]';
}

function slotPrice(slot: AdSlotConfig, definition: AdSlotDefinition, key: 'monthlyPrice' | 'weeklyPrice' | 'dailyPrice') {
  const value = slot[key];
  return typeof value === 'string' && value.trim() ? value.trim() : definition[key];
}

export function AdSlot({ code, className = '', variant = 'banner', onVisibilityChange }: AdSlotProps) {
  const [config, setConfig] = useState<PublicAdsConfig | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshConfig() {
      const nextConfig = await loadAdsConfig();
      if (active) setConfig(nextConfig);
    }

    function handleAdsConfigUpdated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (isPublicAdsConfig(detail)) {
        setConfig(detail);
        return;
      }
      void refreshConfig();
    }

    void refreshConfig();
    window.addEventListener(adsConfigUpdatedEvent, handleAdsConfigUpdated);

    return () => {
      active = false;
      window.removeEventListener(adsConfigUpdatedEvent, handleAdsConfigUpdated);
    };
  }, []);

  const definition = useMemo(() => config?.definitions.find((item) => item.code === code), [code, config?.definitions]);
  const slot = config?.slots?.[code];
  const visible = Boolean(config?.enabled && isActiveNow(slot) && (slot?.mode === 'ad' || config.showPlaceholders));
  const shouldRender = Boolean(visible && definition && slot);

  useEffect(() => {
    onVisibilityChange?.(shouldRender);
  }, [onVisibilityChange, shouldRender]);

  if (!shouldRender || !definition || !slot) return null;

  const href = slot.mode === 'ad' && slot.targetUrl ? slot.targetUrl : config?.contactUrl || '/membership';
  const isRealAd = slot.mode === 'ad' && Boolean(slot.imageUrl);
  const monthlyPrice = slotPrice(slot, definition, 'monthlyPrice');
  const content = (
    <div className={`group relative overflow-hidden rounded-[18px] border border-white/10 bg-[#12090b] text-white shadow-[0_18px_55px_rgba(0,0,0,0.34)] ${adHeightClass(variant, definition)}`}>
      {isRealAd ? <img src={slot.imageUrl} alt={slot.campaign || slot.advertiser || definition.position} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : null}
      <div className={`absolute inset-0 ${isRealAd ? 'bg-black/18' : 'bg-[radial-gradient(circle_at_18%_18%,rgba(229,9,20,0.26),transparent_18rem),linear-gradient(135deg,rgba(229,9,20,0.18),rgba(255,255,255,0.045))]'}`} />
      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-center p-3 text-center md:p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#f4c46b]">พื้นที่โฆษณา</p>
        <p className="mt-1 text-lg font-black tracking-[-0.03em] md:text-2xl">{isRealAd ? slot.campaign || slot.advertiser || definition.position : code}</p>
        <p className="mt-1 text-[11px] font-bold leading-4 text-white/72 md:text-xs">{isRealAd ? definition.position : `${definition.position} · ${definition.size}`}</p>
        {!isRealAd ? <p className="mt-2 text-[10px] font-black text-red-100/70 md:text-xs">{monthlyPrice} บาท / เดือน</p> : null}
      </div>
    </div>
  );

  return (
    <div data-ad-slot={code} className={`${deviceClass(definition.device)} ${className}`}>
      {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} aria-label={`พื้นที่โฆษณา ${code}`}>{content}</a> : content}
    </div>
  );
}

export function MobileStickyAd() {
  const pathname = usePathname();
  const [closed, setClosed] = useState(false);
  const [adVisible, setAdVisible] = useState(false);

  useEffect(() => {
    setClosed(sessionStorage.getItem('dofree_ad_sticky_closed') === '1');
  }, []);

  if (pathname?.startsWith('/search') || closed) return null;

  return (
    <div className={`fixed inset-x-3 bottom-3 z-[90] md:hidden ${adVisible ? '' : 'hidden'}`}>
      {adVisible ? (
        <button
          type="button"
          aria-label="ปิดโฆษณา"
          onClick={() => {
            sessionStorage.setItem('dofree_ad_sticky_closed', '1');
            setClosed(true);
          }}
          className="absolute -right-1 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black text-sm font-black text-white shadow-lg"
        >
          ×
        </button>
      ) : null}
      <AdSlot code="AD-MB-H02" variant="sticky" onVisibilityChange={setAdVisible} />
    </div>
  );
}
