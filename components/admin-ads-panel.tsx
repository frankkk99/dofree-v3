'use client';

import { useEffect, useMemo, useState } from 'react';
import { adSlotDefinitions, createDefaultAdsConfig, normalizeAdsConfig, type AdsConfig, type AdSlotConfig, type AdSlotMode } from '@/lib/ads-config';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Payload = {
  ok?: boolean;
  config?: AdsConfig;
  error?: string;
};

const modes: { value: AdSlotMode; label: string }[] = [
  { value: 'off', label: 'ปิด' },
  { value: 'placeholder', label: 'Placeholder' },
  { value: 'ad', label: 'โฆษณาจริง' },
];

const buttonClass = 'rounded-2xl px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45';
const adsConfigUpdatedEvent = 'dofree-ads-config-updated';

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'ยังไม่เคยบันทึก';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function broadcastAdsConfig(config: AdsConfig) {
  window.dispatchEvent(new CustomEvent(adsConfigUpdatedEvent, { detail: config }));
}

export function AdminAdsPanel() {
  const [config, setConfig] = useState<AdsConfig>(() => createDefaultAdsConfig());
  const [query, setQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const visibleDefinitions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return adSlotDefinitions.filter((definition) => {
      if (deviceFilter && definition.device !== deviceFilter) return false;
      if (!keyword) return true;
      return [definition.code, definition.page, definition.position, definition.format, definition.size, definition.tier].join(' ').toLowerCase().includes(keyword);
    });
  }, [deviceFilter, query]);

  const activeCount = useMemo(() => Object.values(config.slots).filter((slot) => slot.enabled && slot.mode !== 'off').length, [config.slots]);
  const enabledWithoutActiveSlots = config.enabled && activeCount === 0;

  async function loadConfig() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/ads?t=${Date.now()}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null) as Payload | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'โหลดข้อมูลโฆษณาไม่สำเร็จ');
      setConfig(normalizeAdsConfig(payload.config));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลโฆษณาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/ads?t=${Date.now()}`, {
        method: 'PATCH',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(config),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null) as Payload | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'บันทึกข้อมูลโฆษณาไม่สำเร็จ');
      const nextConfig = normalizeAdsConfig(payload.config);
      setConfig(nextConfig);
      broadcastAdsConfig(nextConfig);
      setMessage('บันทึกการตั้งค่าโฆษณาแล้ว รีเฟรชหน้าเว็บหลักเพื่อดูผลล่าสุด');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกข้อมูลโฆษณาไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function patchSlot(code: string, patch: Partial<AdSlotConfig>) {
    setConfig((current) => ({
      ...current,
      slots: {
        ...current.slots,
        [code]: {
          ...(current.slots[code] || { code, enabled: false, mode: 'off' as const }),
          ...patch,
          code,
        },
      },
    }));
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  return (
    <section id="admin-ads-panel" className="mx-auto w-full max-w-7xl px-4 py-5 text-white md:px-8 md:py-8">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Owner Ads</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">จัดการพื้นที่โฆษณา</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/55">เปิด/ปิด placeholder, ใส่ artwork โฆษณาจริง และจัดการตำแหน่งขายแบบรายจุด</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadConfig()} disabled={loading || saving} className={`${buttonClass} bg-white/[0.08] text-white/72 hover:bg-white/[0.14]`}>รีเฟรช</button>
            <button type="button" onClick={() => void saveConfig()} disabled={loading || saving} className={`${buttonClass} bg-[#e50914] text-white shadow-glow hover:brightness-110`}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <label className="rounded-2xl border border-white/8 bg-black/35 p-3">
            <span className="text-xs font-black text-white/42">ลิงก์ติดต่อจองพื้นที่</span>
            <input value={config.contactUrl} onChange={(event) => setConfig((current) => ({ ...current, contactUrl: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white outline-none placeholder:text-white/32 focus:border-[#e50914]" placeholder="/membership หรือ https://..." />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/35 p-3">
            <span>
              <span className="block text-sm font-black">เปิดระบบ Ads</span>
              <span className="text-xs font-semibold text-white/42">{activeCount} จุดกำลังเปิด</span>
            </span>
            <input type="checkbox" checked={config.enabled} onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))} className="h-6 w-6 accent-[#e50914]" />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/35 p-3">
            <span>
              <span className="block text-sm font-black">แสดง Placeholder</span>
              <span className="text-xs font-semibold text-white/42">ใช้ขายพื้นที่ว่าง</span>
            </span>
            <input type="checkbox" checked={config.showPlaceholders} onChange={(event) => setConfig((current) => ({ ...current, showPlaceholders: event.target.checked }))} className="h-6 w-6 accent-[#e50914]" />
          </label>
        </div>

        {enabledWithoutActiveSlots ? (
          <div className="mt-4 rounded-2xl border border-[#f4c46b]/25 bg-[#f4c46b]/10 px-4 py-3 text-xs font-bold leading-5 text-[#f4c46b]">
            เปิดระบบ Ads แล้ว แต่ยังไม่มีตำแหน่งโฆษณาที่เปิดใช้งาน ให้เลือก slot อย่างน้อย 1 จุด แล้วเปลี่ยนจาก “ปิด” เป็น “Placeholder” หรือ “โฆษณาจริง”
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา code, หน้า, ตำแหน่ง" className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-white/34" />
          <select value={deviceFilter} onChange={(event) => setDeviceFilter(event.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black px-4 text-xs font-black text-white">
            <option value="">ทุกอุปกรณ์</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="mt-4 grid gap-3">
          {visibleDefinitions.map((definition) => {
            const slot = config.slots[definition.code] || { code: definition.code, enabled: false, mode: 'off' as const };
            return (
              <article key={definition.code} className="rounded-2xl border border-white/8 bg-black/35 p-3">
                <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#e50914] px-2.5 py-1 text-[10px] font-black text-white">{definition.code}</span>
                      <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-black text-white/58">{definition.device === 'desktop' ? 'desktop เท่านั้น' : definition.device === 'mobile' ? 'mobile เท่านั้น' : 'ทุกอุปกรณ์'}</span>
                      <span className="rounded-full bg-[#f4c46b]/16 px-2.5 py-1 text-[10px] font-black text-[#f4c46b]">{definition.tier}</span>
                    </div>
                    <h3 className="mt-2 text-base font-black text-white">{definition.position}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-white/50">{definition.page} · {definition.format} · {definition.size}</p>
                    <p className="mt-2 text-xs font-black text-white/70">เดือน {definition.monthlyPrice} · สัปดาห์ {definition.weeklyPrice} · วัน {definition.dailyPrice} บาท</p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                      <label className="flex items-center justify-between rounded-xl bg-white/[0.055] px-3 py-2 text-xs font-black text-white/72">
                        เปิด
                        <input type="checkbox" checked={slot.enabled} onChange={(event) => patchSlot(definition.code, { enabled: event.target.checked })} className="h-5 w-5 accent-[#e50914]" />
                      </label>
                      <select value={slot.mode} onChange={(event) => patchSlot(definition.code, { mode: event.target.value as AdSlotMode })} className="min-h-10 rounded-xl border border-white/10 bg-black px-3 text-xs font-black text-white">
                        {modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => patchSlot(definition.code, { enabled: true, mode: 'placeholder' })} className="min-h-10 rounded-xl bg-[#e50914] px-3 text-xs font-black text-white transition hover:brightness-110">เปิดเป็น Placeholder ทันที</button>
                    <input value={slot.advertiser || ''} onChange={(event) => patchSlot(definition.code, { advertiser: event.target.value })} placeholder="ชื่อลูกค้า / Advertiser" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white outline-none placeholder:text-white/32" />
                    <input value={slot.campaign || ''} onChange={(event) => patchSlot(definition.code, { campaign: event.target.value })} placeholder="ชื่อแคมเปญ" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white outline-none placeholder:text-white/32" />
                    <input value={slot.imageUrl || ''} onChange={(event) => patchSlot(definition.code, { imageUrl: event.target.value })} placeholder="Artwork URL" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white outline-none placeholder:text-white/32" />
                    <input value={slot.targetUrl || ''} onChange={(event) => patchSlot(definition.code, { targetUrl: event.target.value })} placeholder="ปลายทางเมื่อคลิก / UTM URL" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white outline-none placeholder:text-white/32" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input type="date" value={slot.startsAt || ''} onChange={(event) => patchSlot(definition.code, { startsAt: event.target.value })} className="min-h-10 rounded-xl border border-white/10 bg-black px-3 text-xs font-bold text-white outline-none" />
                      <input type="date" value={slot.endsAt || ''} onChange={(event) => patchSlot(definition.code, { endsAt: event.target.value })} className="min-h-10 rounded-xl border border-white/10 bg-black px-3 text-xs font-bold text-white outline-none" />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/72">{message}</div> : null}
        <p className="mt-4 text-[11px] font-bold text-white/38">อัปเดตล่าสุด: {formatUpdatedAt(config.updated_at)}</p>
      </div>
    </section>
  );
}
