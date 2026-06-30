export type AdminRoleKey = 'owner' | 'admin_supervisor' | 'admin_content';
export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AdminPermissionModule = {
  key: string;
  label: string;
  description: string;
};

export type AdminPermission = {
  key: string;
  module: string;
  label: string;
  description: string;
  riskLevel: PermissionRiskLevel;
  sortOrder: number;
};

export type RolePermissionSetting = {
  roleKey: AdminRoleKey;
  permissionKey: string;
  allowed: boolean;
  requiresApproval: boolean;
  canBulk: boolean;
};

export const adminRolePresets = [
  {
    key: 'owner',
    label: 'เจ้าของระบบ',
    description: 'ควบคุมระบบหลังบ้านทั้งหมด รวมถึงบทบาท สิทธิ์ ความปลอดภัย และการตั้งค่าระบบ',
    sortOrder: 0,
  },
  {
    key: 'admin_supervisor',
    label: 'ผู้ดูแลภาพรวม',
    description: 'ตรวจงาน อนุมัติ รายงาน และดูประวัติการทำงานบางส่วน โดยไม่จัดการบทบาทหรือความปลอดภัย',
    sortOrder: 10,
  },
  {
    key: 'admin_content',
    label: 'ผู้ดูแลคอนเทนต์',
    description: 'เพิ่มและดูแลคอนเทนต์ ตอนซีรีส์ หมวดหมู่ และร่างประกาศ ภายใต้ขอบเขตที่กำหนด',
    sortOrder: 20,
  },
] as const;

export const adminPermissionModules: AdminPermissionModule[] = [
  { key: 'dashboard', label: 'แดชบอร์ด', description: 'ภาพรวมหลังบ้าน สถิติ และสัญญาณการทำงานของระบบ' },
  { key: 'content', label: 'คอนเทนต์', description: 'รายการคอนเทนต์ในแคตตาล็อกและการแก้ไขข้อมูลประกอบ' },
  { key: 'watch_links', label: 'ลิงก์รับชม', description: 'ลิงก์รับชม ผู้ให้บริการ คุณภาพ และการจัดการลิงก์เสีย' },
  { key: 'episodes', label: 'ตอนซีรีส์', description: 'จัดการซีซันและตอนของซีรีส์' },
  { key: 'movie_cards', label: 'การ์ดหนัง', description: 'การแสดงผลการ์ด ป้ายกำกับ และรายการที่มีสิทธิ์ขึ้นหน้าแรก' },
  { key: 'categories', label: 'หมวดหมู่', description: 'ตั้งค่าหมวดหมู่ของแคตตาล็อกและหน้าแรก' },
  { key: 'homepage', label: 'หน้าแรก', description: 'Section, Hero, Carousel และการเผยแพร่หน้าแรก' },
  { key: 'notifications', label: 'การแจ้งเตือน', description: 'แจ้งเตือนบนไอคอนกระดิ่งและกำหนดเวลาเผยแพร่ประกาศ' },
  { key: 'users', label: 'ผู้ใช้', description: 'ข้อมูลผู้ใช้ สถานะบัญชี และข้อมูลสมาชิก' },
  { key: 'team_members', label: 'ทีมแอดมิน', description: 'บัญชีทีมแอดมินและสิทธิ์เฉพาะรายคน' },
  { key: 'roles', label: 'บทบาท', description: 'ชุดบทบาทและตารางกำหนดสิทธิ์' },
  { key: 'approval_center', label: 'ศูนย์อนุมัติ', description: 'ตรวจ อนุมัติ ปฏิเสธ และนำการเปลี่ยนแปลงไปใช้' },
  { key: 'approval_rules', label: 'กฎการอนุมัติ', description: 'เงื่อนไขการอนุมัติ ระดับความเสี่ยง และคำสั่งที่ห้ามใช้' },
  { key: 'audit_log', label: 'ประวัติการทำงาน', description: 'ประวัติการแก้ไขของแอดมินและการย้อนกลับข้อมูล' },
  { key: 'sync_center', label: 'ศูนย์ซิงก์ข้อมูล', description: 'งานซิงก์ แสดงตัวอย่าง นำเข้า และจัดการเป็นชุด' },
  { key: 'media_assets', label: 'ไฟล์สื่อ', description: 'อัปโหลด กำหนด ปรับแต่ง และดูแลไฟล์รูปภาพ/สื่อ' },
  { key: 'seo', label: 'SEO', description: 'Metadata, Schema, Sitemap และการตั้งค่าการค้นหา' },
  { key: 'membership', label: 'สมาชิก', description: 'แพ็กเกจ Premium การให้สิทธิ์ การยกเลิก และสถานะชำระเงิน' },
  { key: 'analytics', label: 'วิเคราะห์ข้อมูล', description: 'ทราฟฟิก การค้นหา การรับชม และพฤติกรรมผู้ใช้' },
  { key: 'reports', label: 'รายงาน', description: 'รายงานจากผู้ใช้ รายงานลิงก์ การมอบหมายงาน และส่งออกข้อมูล' },
  { key: 'system_settings', label: 'ตั้งค่าระบบ', description: 'ชื่อเว็บ โหมดบำรุงรักษา Cache และข้อจำกัดการใช้งาน' },
  { key: 'feature_flags', label: 'เปิด/ปิดฟีเจอร์', description: 'สวิตช์ฟีเจอร์ที่ใช้งานจริงและการเปิดแบบค่อยเป็นค่อยไป' },
  { key: 'security', label: 'ความปลอดภัย', description: 'Session, การล็อกหลังบ้าน, IP allowlist และพฤติกรรมน่าสงสัย' },
  { key: 'export_backup', label: 'ส่งออก / สำรองข้อมูล', description: 'ส่งออก สำรอง กู้คืน และดาวน์โหลดข้อมูล' },
  { key: 'bulk_actions', label: 'ทำงานเป็นชุด', description: 'แก้ไข นำเข้า ส่งออก และจัดการหลายรายการพร้อมกัน' },
  { key: 'risk_controls', label: 'ควบคุมความเสี่ยง', description: 'ระดับความเสี่ยง การอนุมัติโดยเจ้าของ และคำสั่งต้องห้าม' },
];

const permissionGroups: Record<string, string[]> = {
  dashboard: ['dashboard.view', 'dashboard.view_stats', 'dashboard.view_watch_ready', 'dashboard.view_missing_links', 'dashboard.view_broken_links', 'dashboard.view_user_activity', 'dashboard.export_report'],
  content: ['content.view', 'content.search', 'content.create', 'content.update', 'content.update_title', 'content.update_overview', 'content.update_poster', 'content.update_backdrop', 'content.update_rating', 'content.update_year', 'content.update_release_date', 'content.update_runtime', 'content.update_language', 'content.update_country', 'content.update_genres', 'content.update_badges', 'content.update_source_bucket', 'content.update_sort_score', 'content.update_status', 'content.publish', 'content.unpublish', 'content.delete'],
  watch_links: ['watch_links.view', 'watch_links.create', 'watch_links.update', 'watch_links.delete', 'watch_links.test', 'watch_links.copy', 'watch_links.update_provider', 'watch_links.update_quality', 'watch_links.mark_broken', 'watch_links.resolve_broken', 'watch_links.publish_after_update'],
  episodes: ['episodes.view', 'episodes.create', 'episodes.bulk_create', 'episodes.update_title', 'episodes.update_season_number', 'episodes.update_episode_number', 'episodes.update_overview', 'episodes.update_watch_url', 'episodes.delete', 'episodes.enable', 'episodes.disable', 'episodes.test_url', 'episodes.reorder', 'episodes.publish', 'episodes.unpublish'],
  movie_cards: ['movie_cards.view_preview', 'movie_cards.update_title', 'movie_cards.update_badge', 'movie_cards.update_poster', 'movie_cards.update_priority_badge', 'movie_cards.update_label', 'movie_cards.reorder', 'movie_cards.pin', 'movie_cards.hide', 'movie_cards.set_featured', 'movie_cards.set_hero_candidate'],
  categories: ['categories.view', 'categories.create', 'categories.update_name', 'categories.update_slug', 'categories.update_description', 'categories.update_eyebrow', 'categories.update_seo_title', 'categories.update_seo_description', 'categories.enable', 'categories.disable', 'categories.delete', 'categories.reorder', 'categories.add_item', 'categories.remove_item', 'categories.update_filter', 'categories.update_source_bucket', 'categories.set_seo_page'],
  homepage: ['homepage.view', 'homepage.create_section', 'homepage.update_section_name', 'homepage.update_section_description', 'homepage.update_eyebrow', 'homepage.enable_section', 'homepage.disable_section', 'homepage.delete_section', 'homepage.reorder_sections', 'homepage.add_content', 'homepage.remove_content', 'homepage.pin_content', 'homepage.update_hero', 'homepage.update_carousel', 'homepage.update_cta', 'homepage.preview', 'homepage.publish', 'homepage.rollback'],
  notifications: ['notifications.view', 'notifications.create', 'notifications.update', 'notifications.disable', 'notifications.delete', 'notifications.set_publish_time', 'notifications.set_expire_time', 'notifications.pin', 'notifications.set_priority', 'notifications.set_audience', 'notifications.attach_image', 'notifications.attach_cta', 'notifications.attach_movie', 'notifications.attach_tv', 'notifications.preview', 'notifications.publish', 'notifications.view_stats'],
  users: ['users.view', 'users.search', 'users.view_profile', 'users.view_email', 'users.view_phone', 'users.view_membership', 'users.view_activity', 'users.view_favorites', 'users.view_history', 'users.update', 'users.suspend', 'users.unsuspend', 'users.delete', 'users.force_logout', 'users.update_premium', 'users.add_note', 'users.export'],
  team_members: ['team.view', 'team.create_admin', 'team.update_admin', 'team.delete_admin', 'team.suspend_admin', 'team.unsuspend_admin', 'team.update_role', 'team.update_custom_permissions', 'team.view_activity', 'team.view_requests', 'team.force_logout', 'team.reset_permissions', 'team.transfer_pending_requests'],
  roles: ['roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.duplicate', 'roles.update_permissions', 'roles.update_user_permissions', 'roles.reset_user_permissions', 'roles.lock_permissions', 'roles.enable', 'roles.disable', 'roles.set_default_admin_role', 'roles.set_default_user_role'],
  approval_center: ['approval.view_pending', 'approval.view_all', 'approval.view_own', 'approval.view_diff', 'approval.approve', 'approval.reject', 'approval.reject_with_reason', 'approval.bulk_approve', 'approval.bulk_reject', 'approval.approve_by_type', 'approval.approve_by_sender', 'approval.approve_by_module', 'approval.approve_low_risk', 'approval.view_high_risk', 'approval.cancel', 'approval.edit_before_approve', 'approval.apply_changes', 'approval.rollback'],
  approval_rules: ['approval_rules.view', 'approval_rules.create', 'approval_rules.update', 'approval_rules.delete', 'approval_rules.set_requires_approval', 'approval_rules.set_auto_approve', 'approval_rules.set_forbidden', 'approval_rules.set_risk_level'],
  audit_log: ['audit.view_all', 'audit.view_own', 'audit.view_by_module', 'audit.view_before_after', 'audit.search', 'audit.filter_by_admin', 'audit.filter_by_action', 'audit.filter_by_time', 'audit.export', 'audit.rollback', 'audit.delete'],
  sync_center: ['sync.view', 'sync.view_profiles', 'sync.create_profile', 'sync.update_profile', 'sync.delete_profile', 'sync.preview', 'sync.dry_run', 'sync.start', 'sync.cancel', 'sync.resume', 'sync.view_logs', 'sync.delete_logs', 'sync.import_catalog', 'sync.import_excel', 'sync.import_tmdb', 'sync.refresh_catalog', 'sync.clear_catalog', 'sync.overwrite_catalog', 'sync.update_batch_size', 'sync.update_filters'],
  media_assets: ['media.view', 'media.upload', 'media.upload_poster', 'media.upload_backdrop', 'media.delete', 'media.update_alt_text', 'media.rename_file', 'media.assign_to_movie', 'media.assign_to_tv', 'media.assign_to_notification', 'media.assign_to_homepage', 'media.optimize', 'media.check_broken'],
  seo: ['seo.view', 'seo.update_global_title', 'seo.update_global_description', 'seo.update_page_metadata', 'seo.update_canonical', 'seo.update_robots', 'seo.update_sitemap', 'seo.update_slug', 'seo.update_schema', 'seo.update_faq', 'seo.update_category_seo', 'seo.update_movie_seo', 'seo.update_tv_seo', 'seo.view_audit', 'seo.submit_sitemap', 'seo.toggle_indexing'],
  membership: ['membership.view_plans', 'membership.create_plan', 'membership.update_plan', 'membership.delete_plan', 'membership.enable_plan', 'membership.disable_plan', 'membership.update_price', 'membership.update_benefits', 'membership.update_page_copy', 'membership.view_premium_users', 'membership.grant_premium', 'membership.revoke_premium', 'membership.extend_premium', 'membership.view_history', 'membership.view_payment_status', 'membership.refund', 'membership.cancel_membership'],
  analytics: ['analytics.view', 'analytics.view_page_views', 'analytics.view_search_logs', 'analytics.view_watch_clicks', 'analytics.view_favorite_clicks', 'analytics.view_notification_opens', 'analytics.view_user_funnel', 'analytics.view_popular_content', 'analytics.view_broken_link_reports', 'analytics.export', 'analytics.delete'],
  reports: ['reports.view', 'reports.view_link_reports', 'reports.view_content_reports', 'reports.update_status', 'reports.assign', 'reports.update_note', 'reports.close', 'reports.delete', 'reports.export'],
  system_settings: ['settings.view', 'settings.update_site_name', 'settings.update_logo', 'settings.update_feature_flags', 'settings.update_premium_access', 'settings.update_maintenance_mode', 'settings.enable_readonly_mode', 'settings.disable_editing', 'settings.update_cache', 'settings.update_revalidate', 'settings.update_api_limits', 'settings.update_public_private_features'],
  feature_flags: ['flags.view', 'flags.toggle_search', 'flags.toggle_notifications', 'flags.toggle_favorites', 'flags.toggle_history', 'flags.toggle_actor_profile', 'flags.toggle_premium_gate', 'flags.toggle_homepage_section', 'flags.toggle_sync_center', 'flags.toggle_admin_approval', 'flags.toggle_user_registration'],
  security: ['security.view_logs', 'security.view_login_history', 'security.view_failed_logins', 'security.force_logout_all', 'security.reset_sessions', 'security.suspend_admin', 'security.update_ip_allowlist', 'security.require_2fa', 'security.update_session_timeout', 'security.view_suspicious_activity', 'security.lock_admin_panel'],
  export_backup: ['backup.export_catalog', 'backup.export_users', 'backup.export_admins', 'backup.export_audit_log', 'backup.export_notifications', 'backup.export_reports', 'backup.create_settings_backup', 'backup.restore', 'backup.download', 'backup.delete'],
  bulk_actions: ['bulk.edit_catalog', 'bulk.publish', 'bulk.unpublish', 'bulk.delete', 'bulk.update_category', 'bulk.update_watch_url', 'bulk.update_episodes', 'bulk.update_notifications', 'bulk.approve', 'bulk.reject', 'bulk.export', 'bulk.import'],
  risk_controls: ['risk.view', 'risk.update_low', 'risk.update_medium', 'risk.update_high', 'risk.update_critical', 'risk.require_owner_approval', 'risk.require_two_owner_approval', 'risk.forbid_action'],
};

const highRiskWords = ['delete', 'publish', 'unpublish', 'rollback', 'restore', 'force_logout', 'suspend', 'refund', 'cancel', 'clear', 'overwrite', 'security', 'settings', 'roles', 'team', 'backup', 'risk'];
const criticalRiskWords = ['delete', 'force_logout_all', 'restore', 'lock_admin_panel', 'require_2fa', 'transfer_pending_requests', 'set_default_admin_role', 'set_default_user_role', 'clear_catalog', 'overwrite_catalog', 'forbid_action', 'require_two_owner_approval'];

const moduleLabelByKey = Object.fromEntries(adminPermissionModules.map((module) => [module.key, module.label]));

const actionLabels: Record<string, string> = {
  add: 'เพิ่ม',
  all: 'ทั้งหมด',
  allowlist: 'รายการที่อนุญาต',
  alt: 'คำอธิบายรูป',
  apply: 'นำไปใช้',
  approve: 'อนุมัติ',
  assign: 'มอบหมาย',
  attach: 'แนบข้อมูล',
  audience: 'กลุ่มผู้ชม',
  audit: 'ตรวจสอบ',
  backup: 'สำรองข้อมูล',
  badge: 'ป้ายกำกับ',
  backdrop: 'ภาพพื้นหลัง',
  batch: 'ชุดข้อมูล',
  benefits: 'สิทธิประโยชน์',
  broken: 'ลิงก์เสีย',
  bulk: 'หลายรายการ',
  cancel: 'ยกเลิก',
  canonical: 'Canonical',
  card: 'การ์ด',
  carousel: 'Carousel',
  catalog: 'แคตตาล็อก',
  category: 'หมวดหมู่',
  check: 'ตรวจสอบ',
  clear: 'ล้างข้อมูล',
  close: 'ปิด',
  content: 'คอนเทนต์',
  copy: 'คัดลอก',
  country: 'ประเทศ',
  create: 'สร้าง',
  critical: 'วิกฤต',
  cta: 'ปุ่ม CTA',
  default: 'ค่าเริ่มต้น',
  delete: 'ลบ',
  description: 'คำอธิบาย',
  diff: 'รายละเอียดที่เปลี่ยน',
  disable: 'ปิดใช้งาน',
  download: 'ดาวน์โหลด',
  dry: 'ทดลอง',
  duplicate: 'ทำสำเนา',
  edit: 'แก้ไข',
  editing: 'การแก้ไข',
  enable: 'เปิดใช้งาน',
  expire: 'หมดอายุ',
  export: 'ส่งออก',
  failed: 'ล้มเหลว',
  faq: 'FAQ',
  favorite: 'รายการโปรด',
  featured: 'แนะนำพิเศษ',
  filter: 'ตัวกรอง',
  flags: 'ฟีเจอร์',
  force: 'บังคับ',
  funnel: 'Funnel',
  genre: 'แนว',
  genres: 'แนว',
  global: 'ทั้งเว็บ',
  grant: 'ให้สิทธิ์',
  hero: 'Hero',
  hide: 'ซ่อน',
  high: 'สูง',
  history: 'ประวัติ',
  homepage: 'หน้าแรก',
  image: 'รูปภาพ',
  import: 'นำเข้า',
  indexing: 'การจัดทำดัชนี',
  ip: 'IP',
  language: 'ภาษา',
  link: 'ลิงก์',
  links: 'ลิงก์',
  lock: 'ล็อก',
  logs: 'บันทึก',
  low: 'ต่ำ',
  maintenance: 'บำรุงรักษา',
  mark: 'ทำเครื่องหมาย',
  membership: 'สมาชิก',
  metadata: 'Metadata',
  missing: 'ที่ขาด',
  mode: 'โหมด',
  module: 'โมดูล',
  movie: 'หนัง',
  name: 'ชื่อ',
  note: 'หมายเหตุ',
  notification: 'แจ้งเตือน',
  notifications: 'แจ้งเตือน',
  opens: 'การเปิดอ่าน',
  optimize: 'ปรับแต่ง',
  own: 'ของตัวเอง',
  page: 'หน้า',
  pending: 'รอดำเนินการ',
  phone: 'เบอร์โทร',
  pin: 'ปักหมุด',
  plan: 'แพ็กเกจ',
  popular: 'ยอดนิยม',
  poster: 'โปสเตอร์',
  premium: 'Premium',
  preview: 'ตัวอย่าง',
  price: 'ราคา',
  priority: 'ความสำคัญ',
  profile: 'โปรไฟล์',
  profiles: 'โปรไฟล์',
  provider: 'ผู้ให้บริการ',
  publish: 'เผยแพร่',
  quality: 'คุณภาพ',
  read: 'อ่าน',
  readonly: 'อ่านอย่างเดียว',
  refresh: 'รีเฟรช',
  reject: 'ปฏิเสธ',
  rename: 'เปลี่ยนชื่อ',
  reorder: 'จัดลำดับ',
  report: 'รายงาน',
  reports: 'รายงาน',
  require: 'ต้องใช้',
  reset: 'รีเซ็ต',
  resolve: 'แก้ไขสถานะ',
  restore: 'กู้คืน',
  resume: 'ดำเนินต่อ',
  revoke: 'ถอนสิทธิ์',
  risk: 'ความเสี่ยง',
  robots: 'Robots',
  role: 'บทบาท',
  roles: 'บทบาท',
  rollback: 'ย้อนกลับ',
  rules: 'กฎ',
  runtime: 'ระยะเวลา',
  schema: 'Schema',
  search: 'ค้นหา',
  section: 'Section',
  security: 'ความปลอดภัย',
  sender: 'ผู้ส่ง',
  seo: 'SEO',
  session: 'Session',
  sessions: 'Session',
  settings: 'ตั้งค่า',
  sitemap: 'Sitemap',
  slug: 'Slug',
  sort: 'คะแนนจัดเรียง',
  source: 'แหล่งที่มา',
  start: 'เริ่ม',
  stats: 'สถิติ',
  status: 'สถานะ',
  submit: 'ส่ง',
  suspicious: 'น่าสงสัย',
  suspend: 'ระงับ',
  sync: 'ซิงก์',
  team: 'ทีม',
  test: 'ทดสอบ',
  thresholds: 'เกณฑ์',
  time: 'เวลา',
  timeout: 'หมดเวลา',
  title: 'ชื่อเรื่อง',
  toggle: 'เปิด/ปิด',
  transfer: 'โอน',
  tv: 'ซีรีส์',
  unpublish: 'ยกเลิกเผยแพร่',
  unsuspend: 'ยกเลิกระงับ',
  update: 'แก้ไข',
  upload: 'อัปโหลด',
  url: 'URL',
  user: 'ผู้ใช้',
  users: 'ผู้ใช้',
  view: 'ดู',
  watch: 'รับชม',
  year: 'ปี',
};

function labelFromKey(key: string) {
  const [, action = key] = key.split('.');
  return action.split('_').map((part) => actionLabels[part] || part).join(' ');
}

function riskForKey(key: string): PermissionRiskLevel {
  if (criticalRiskWords.some((word) => key.includes(word))) return 'critical';
  if (highRiskWords.some((word) => key.includes(word))) return 'high';
  if (key.includes('update') || key.includes('create') || key.includes('approve') || key.includes('export') || key.includes('bulk')) return 'medium';
  return 'low';
}

export const adminPermissions: AdminPermission[] = Object.entries(permissionGroups).flatMap(([module, keys], moduleIndex) =>
  keys.map((key, index) => ({
    key,
    module,
    label: labelFromKey(key),
    description: `สิทธิ์สำหรับ "${labelFromKey(key)}" ในหมวด ${moduleLabelByKey[module] || module}`,
    riskLevel: riskForKey(key),
    sortOrder: moduleIndex * 100 + index,
  })),
);

const supervisorModules = new Set(['dashboard', 'content', 'approval_center', 'reports', 'audit_log', 'analytics']);
const contentModules = new Set(['dashboard', 'content', 'episodes', 'categories', 'movie_cards', 'notifications', 'reports']);
const blockedCuratorWords = ['publish', 'delete', 'roles', 'users', 'security', 'settings', 'payment', 'refund', 'sync', 'backup', 'bulk_approve', 'bulk_reject'];

export function defaultRolePermission(roleKey: AdminRoleKey, permission: AdminPermission): RolePermissionSetting {
  if (roleKey === 'owner') {
    return { roleKey, permissionKey: permission.key, allowed: true, requiresApproval: false, canBulk: true };
  }

  if (roleKey === 'admin_supervisor') {
    const allowed = supervisorModules.has(permission.module) && !permission.key.includes('delete') && !permission.key.includes('roles.');
    const canApprove = permission.key.includes('approval.approve') || permission.key.includes('approval.reject');
    return {
      roleKey,
      permissionKey: permission.key,
      allowed: allowed && (permission.riskLevel !== 'critical'),
      requiresApproval: permission.riskLevel === 'high' || permission.riskLevel === 'critical',
      canBulk: canApprove && permission.riskLevel !== 'high' && permission.riskLevel !== 'critical',
    };
  }

  const blocked = blockedCuratorWords.some((word) => permission.key.includes(word));
  const allowed = contentModules.has(permission.module) && !blocked && permission.riskLevel !== 'critical';
  return {
    roleKey,
    permissionKey: permission.key,
    allowed,
    requiresApproval: allowed && (permission.riskLevel === 'medium' || permission.riskLevel === 'high'),
    canBulk: false,
  };
}

export function defaultRolePermissions(roleKey: AdminRoleKey) {
  return adminPermissions.map((permission) => defaultRolePermission(roleKey, permission));
}
