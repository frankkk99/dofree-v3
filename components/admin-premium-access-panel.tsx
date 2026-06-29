'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getDefaultPremiumFreeAccessConfig,
  normalizePremiumFreeAccessConfig,
  premiumAccessFeatures,
  premiumFreeAccessStatus,
  type PremiumAccessFeature,
  type PremiumFreeAccessConfig,
} from '@/lib/premium-access-config';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Payload = {
  ok?: boolean;
  config?: PremiumFreeAccessConfig;
  error?: string;
};

const featureLabels: Record<PremiumAccessFeature, string> = {
  watch: 'รับชม',
  favorites: 'รายการโปรด',
  history: 'ดูต่อและประวัติ',
  notifications: 'แจ้งเตือนหนังใหม่',
  actorClick: 'กดภาพนักแสดง',
};

const panelButton = 'rounded-2xl px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45';

function statusLabel(config: PremiumFreeAccessConfig) {
  const status = premiumFreeAccessStatus(config);
  if (status === 'all') return 'เปิดอยู่';
  if (status === 'partial') return 'เปิดบางส่วน';
  return 'ปิดทั้งหมด';
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'ยังไม่มีข้อมูลบันทึก';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminPremiumAccessPanel() {
  const [config, setConfig] = useState<PremiumFreeAccessConfig>(() => getDefaultPremiumFreeAccessConfig());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const enabledCount = useMemo(
    () => premiumAccessFeatures.filter((feature) => config.features[feature]).length,
    [config.features],
  );

  async function loadConfig() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/premium-access', {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null) as Payload | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'โหลด Premium free access ไม่สำเร็จ');
      setConfig(normalizePremiumFreeAccessConfig(payload.config));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลด Premium free access ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/premium-access', {
        method: 'PATCH',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => null) as Payload | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'บันทึก Premium free access ไม่สำเร็จ');
      setConfig(normalizePremiumFreeAccessConfig(payload.config));
      setMessage('บันทึกการตั้งค่า Premium free access แล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึก Premium free access ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function setFeature(feature: PremiumAccessFeature, value: boolean) {
    setConfig((current) => ({
      ...current,
      features: { ...current.features, [feature]: value },
    }));
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  return (
    <section id="admin-premium-access" className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-8">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-[-0.04em] md:text-3xl">Premium Controls</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/50">Free Premium Access</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadConfig()} disabled={loading || saving} className={`${panelButton} bg-white/[0.08] text-white/72 hover:bg-white/[0.14]`}>
              รีเฟรช
            </button>
            <button type="button" onClick={() => void saveConfig()} disabled={loading || saving} className={`${panelButton} bg-[#e50914] text-white shadow-glow hover:brightness-110`}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_240px]">
          <label className="rounded-2xl border border-white/8 bg-black/35 p-3">
            <span className="text-xs font-black text-white/42">Label ที่ผู้ใช้เห็น</span>
            <input
              value={config.label}
              maxLength={80}
              onChange={(event) => setConfig((current) => ({ ...current, label: event.target.value }))}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white outline-none placeholder:text-white/32 focus:border-[#e50914]"
              placeholder="Premium ฟรีช่วงโปร"
            />
          </label>
          <div className="rounded-2xl border border-white/8 bg-black/35 p-3">
            <p className="text-xs font-black text-white/42">สถานะ</p>
            <p className="mt-2 text-2xl font-black text-white">{statusLabel(config)}</p>
            <p className="mt-1 text-xs font-bold text-white/42">{enabledCount}/{premiumAccessFeatures.length} features • {formatUpdatedAt(config.updated_at)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/35 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-base font-black text-white">เปิดให้ใช้ฟรีทั้งหมด</span>
              <span className="mt-1 block text-xs font-semibold text-white/42">ปิด toggle นี้แล้ว Free user จะกลับไป locked state ทุกฟีเจอร์</span>
            </span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))}
              className="h-6 w-6 shrink-0 accent-[#e50914]"
            />
          </label>
        </div>

        <div className={`mt-4 grid gap-2 md:grid-cols-5 ${config.enabled ? '' : 'opacity-55'}`}>
          {premiumAccessFeatures.map((feature) => (
            <label key={feature} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/35 p-3">
              <span className="text-sm font-black text-white">{featureLabels[feature]}</span>
              <span className="flex items-center gap-2 text-[11px] font-black text-white/40">
                {config.features[feature] ? 'เปิด' : 'ปิด'}
                <input
                  type="checkbox"
                  checked={config.features[feature]}
                  disabled={!config.enabled}
                  onChange={(event) => setFeature(feature, event.target.checked)}
                  className="h-5 w-5 accent-[#e50914]"
                />
              </span>
            </label>
          ))}
        </div>

        {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/72">{message}</div> : null}
      </div>
    </section>
  );
}
