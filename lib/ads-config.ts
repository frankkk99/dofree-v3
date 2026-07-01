export type AdSlotDevice = 'desktop' | 'mobile' | 'all';
export type AdSlotMode = 'off' | 'placeholder' | 'ad';

export type AdSlotDefinition = {
  code: string;
  page: string;
  position: string;
  format: string;
  size: string;
  device: AdSlotDevice;
  monthlyPrice: string;
  weeklyPrice: string;
  dailyPrice: string;
  tier: string;
};

export type AdSlotConfig = {
  code: string;
  enabled: boolean;
  mode: AdSlotMode;
  advertiser?: string;
  campaign?: string;
  imageUrl?: string;
  targetUrl?: string;
  startsAt?: string;
  endsAt?: string;
};

export type AdsConfig = {
  enabled: boolean;
  showPlaceholders: boolean;
  contactUrl: string;
  slots: Record<string, AdSlotConfig>;
  updated_at?: string | null;
  updated_by?: string | null;
};

export const adsSettingKey = 'owner_ads_config';

export const adSlotDefinitions: AdSlotDefinition[] = [
  { code: 'AD-PC-H01', page: 'หน้าแรก PC', position: 'ใต้ Hero Banner', format: 'Leaderboard / Large Banner', size: '970x250 / 728x90', device: 'desktop', monthlyPrice: '18,000', weeklyPrice: '6,000', dailyPrice: '1,200', tier: 'Premium' },
  { code: 'AD-PC-H02', page: 'หน้าแรก PC', position: 'Native หลังการ์ดที่ 5-6', format: 'Native In-feed Card', size: '1:1.3 / 300x250', device: 'desktop', monthlyPrice: '14,000', weeklyPrice: '4,800', dailyPrice: '950', tier: 'Recommended' },
  { code: 'AD-PC-H04', page: 'หน้าแรก PC', position: 'ระหว่าง Section หลังหมวดที่ 2-3', format: 'Display Banner', size: '728x90 / 970x250', device: 'desktop', monthlyPrice: '9,000', weeklyPrice: '3,200', dailyPrice: '700', tier: 'Budget' },
  { code: 'AD-PC-CAT01', page: 'หน้าหมวด PC', position: 'ใต้หัวข้อหมวด / ก่อน Grid', format: 'Category Sponsor', size: '970x250 / 728x90', device: 'desktop', monthlyPrice: '15,000', weeklyPrice: '5,200', dailyPrice: '1,050', tier: 'Category' },
  { code: 'AD-PC-SR01', page: 'หน้าค้นหา PC', position: 'ใต้ช่องค้นหาก่อนผลลัพธ์', format: 'Search Intent Banner', size: '728x90 / Native', device: 'desktop', monthlyPrice: '12,000', weeklyPrice: '4,200', dailyPrice: '850', tier: 'Intent' },
  { code: 'AD-PC-D01', page: 'รายละเอียด PC', position: 'ใต้ข้อมูลหนัง / หลัง CTA', format: 'Banner / Native Banner', size: '728x90 / 970x250', device: 'desktop', monthlyPrice: '20,000', weeklyPrice: '7,000', dailyPrice: '1,400', tier: 'Premium' },
  { code: 'AD-PC-D02', page: 'รายละเอียด PC', position: 'Sidebar ข้างข้อมูลหนัง', format: 'Rectangle / Half Page', size: '300x250 / 300x600', device: 'desktop', monthlyPrice: '16,000', weeklyPrice: '5,500', dailyPrice: '1,100', tier: 'Recommended' },
  { code: 'AD-PC-D03', page: 'รายละเอียด PC', position: 'หลังเรื่องย่อ / ก่อนเรื่องคล้ายกัน', format: 'Native Recommendation', size: '300x250 / Card', device: 'desktop', monthlyPrice: '12,000', weeklyPrice: '4,200', dailyPrice: '850', tier: 'Recommended' },
  { code: 'AD-PC-D05', page: 'รายละเอียด PC', position: 'ใต้ Recommended Rail', format: 'Display Banner', size: '728x90', device: 'desktop', monthlyPrice: '8,000', weeklyPrice: '3,000', dailyPrice: '650', tier: 'Budget' },
  { code: 'AD-PC-P01', page: 'Player PC', position: 'ใต้ Player', format: 'Display Banner', size: '728x90 / 970x250', device: 'desktop', monthlyPrice: '25,000', weeklyPrice: '8,500', dailyPrice: '1,700', tier: 'Premium' },
  { code: 'AD-PC-P02', page: 'Player PC', position: 'Sidebar ข้าง Player', format: 'Rectangle / Skyscraper', size: '300x250 / 300x600', device: 'desktop', monthlyPrice: '22,000', weeklyPrice: '7,500', dailyPrice: '1,500', tier: 'Premium' },
  { code: 'AD-MB-H01', page: 'หน้าแรก Mobile', position: 'หลัง Hero / Search', format: 'Mobile Banner', size: '320x50 / 320x100', device: 'mobile', monthlyPrice: '10,000', weeklyPrice: '3,500', dailyPrice: '750', tier: 'Budget' },
  { code: 'AD-MB-H02', page: 'ทุกหน้า Mobile', position: 'Sticky Bottom ปิดได้', format: 'Anchor Ad', size: '320x50 / 320x100', device: 'mobile', monthlyPrice: '18,000', weeklyPrice: '6,000', dailyPrice: '1,200', tier: 'Recommended' },
  { code: 'AD-MB-H03', page: 'หน้าแรก/หมวด Mobile', position: 'Native Card หลังการ์ดที่ 6', format: 'In-feed Native', size: 'Responsive Card', device: 'mobile', monthlyPrice: '14,000', weeklyPrice: '4,800', dailyPrice: '950', tier: 'Recommended' },
  { code: 'AD-MB-H04', page: 'หน้าแรก Mobile', position: 'แทรกระหว่าง Rail หลังหมวดแรก', format: 'Mobile Banner / Native', size: '320x100', device: 'mobile', monthlyPrice: '12,000', weeklyPrice: '4,200', dailyPrice: '850', tier: 'Recommended' },
  { code: 'AD-MB-CAT01', page: 'หน้าหมวด Mobile', position: 'หลังหัวข้อหมวด', format: 'Category Sponsor', size: '320x100 / Native', device: 'mobile', monthlyPrice: '12,000', weeklyPrice: '4,200', dailyPrice: '850', tier: 'Category' },
  { code: 'AD-MB-SR01', page: 'ค้นหา Mobile', position: 'หลัง Search Box ก่อนผลลัพธ์', format: 'Mobile Intent Banner', size: '320x50 / 320x100', device: 'mobile', monthlyPrice: '9,000', weeklyPrice: '3,200', dailyPrice: '700', tier: 'Intent' },
  { code: 'AD-MB-D01', page: 'รายละเอียด Mobile', position: 'หลัง CTA / ใต้ข้อมูลหนัง', format: 'Mobile Banner', size: '320x100 / 300x250', device: 'mobile', monthlyPrice: '16,000', weeklyPrice: '5,500', dailyPrice: '1,100', tier: 'Recommended' },
  { code: 'AD-MB-D02', page: 'รายละเอียด Mobile', position: 'ก่อนเรื่องที่คล้ายกัน', format: 'Native Recommendation', size: 'Responsive Card', device: 'mobile', monthlyPrice: '12,000', weeklyPrice: '4,200', dailyPrice: '850', tier: 'Recommended' },
  { code: 'AD-MB-D03', page: 'รายละเอียด Mobile', position: 'หลัง Trailer / ก่อนรายละเอียดเพิ่ม', format: 'Mobile Rectangle', size: '300x250', device: 'mobile', monthlyPrice: '13,000', weeklyPrice: '4,500', dailyPrice: '900', tier: 'Recommended' },
  { code: 'AD-MB-P01', page: 'Player Mobile', position: 'ใต้ Player', format: 'Mobile Rectangle', size: '300x250', device: 'mobile', monthlyPrice: '20,000', weeklyPrice: '7,000', dailyPrice: '1,400', tier: 'Premium' },
  { code: 'AD-MB-P02', page: 'Player Mobile', position: 'หลังเปลี่ยน Server', format: 'Interstitial สั้น', size: 'Responsive', device: 'mobile', monthlyPrice: '18,000', weeklyPrice: '6,000', dailyPrice: '1,200', tier: 'High Impact' },
];

export function createDefaultAdsConfig(): AdsConfig {
  return {
    enabled: false,
    showPlaceholders: false,
    contactUrl: '/membership',
    slots: Object.fromEntries(adSlotDefinitions.map((slot) => [slot.code, { code: slot.code, enabled: false, mode: 'off' as const }])),
  };
}

export function normalizeAdsConfig(value: unknown): AdsConfig {
  const defaults = createDefaultAdsConfig();
  const input = value && typeof value === 'object' ? value as Partial<AdsConfig> : {};
  const inputSlots = input.slots && typeof input.slots === 'object' ? input.slots : {};

  return {
    enabled: Boolean(input.enabled),
    showPlaceholders: Boolean(input.showPlaceholders),
    contactUrl: typeof input.contactUrl === 'string' && input.contactUrl.trim() ? input.contactUrl.trim() : defaults.contactUrl,
    updated_at: input.updated_at || null,
    updated_by: input.updated_by || null,
    slots: Object.fromEntries(adSlotDefinitions.map((definition) => {
      const raw = (inputSlots as Record<string, Partial<AdSlotConfig>>)[definition.code] || {};
      const mode: AdSlotMode = raw.mode === 'ad' || raw.mode === 'placeholder' || raw.mode === 'off' ? raw.mode : 'off';
      return [definition.code, {
        code: definition.code,
        enabled: Boolean(raw.enabled),
        mode,
        advertiser: raw.advertiser || '',
        campaign: raw.campaign || '',
        imageUrl: raw.imageUrl || '',
        targetUrl: raw.targetUrl || '',
        startsAt: raw.startsAt || '',
        endsAt: raw.endsAt || '',
      }];
    })),
  };
}

export function publicAdsConfig(config: AdsConfig) {
  const normalized = normalizeAdsConfig(config);
  return {
    enabled: normalized.enabled,
    showPlaceholders: normalized.showPlaceholders,
    contactUrl: normalized.contactUrl,
    definitions: adSlotDefinitions,
    slots: normalized.slots,
  };
}
