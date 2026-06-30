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
    label: 'Owner',
    description: 'Full administrative control, including roles, permissions, security, and system settings.',
    sortOrder: 0,
  },
  {
    key: 'admin_supervisor',
    label: 'Supervisor',
    description: 'Reviews operations, approvals, reports, and selected audit activity without role or security management.',
    sortOrder: 10,
  },
  {
    key: 'admin_content',
    label: 'Content Curator',
    description: 'Creates and maintains content, episodes, categories, and draft notifications with approval boundaries.',
    sortOrder: 20,
  },
] as const;

export const adminPermissionModules: AdminPermissionModule[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Admin overview, statistics, and operational signals.' },
  { key: 'content', label: 'Content', description: 'Catalog content records and metadata editing.' },
  { key: 'watch_links', label: 'Watch Links', description: 'Watch URL, provider, and broken link controls.' },
  { key: 'episodes', label: 'Episodes', description: 'Series season and episode management.' },
  { key: 'movie_cards', label: 'Movie Cards', description: 'Card presentation, labels, and homepage candidates.' },
  { key: 'categories', label: 'Categories', description: 'Catalog and homepage category configuration.' },
  { key: 'homepage', label: 'Homepage', description: 'Homepage sections, hero, carousel, and publishing.' },
  { key: 'notifications', label: 'Notifications', description: 'Bell notifications and announcement scheduling.' },
  { key: 'users', label: 'Users', description: 'Public user records, account state, and membership visibility.' },
  { key: 'team_members', label: 'Team Members', description: 'Admin team accounts and permission overrides.' },
  { key: 'roles', label: 'Roles', description: 'Role presets and permission matrix controls.' },
  { key: 'approval_center', label: 'Approval Center', description: 'Review, approve, reject, and apply requested changes.' },
  { key: 'approval_rules', label: 'Approval Rules', description: 'Approval requirements, risk rules, and forbidden actions.' },
  { key: 'audit_log', label: 'Audit Log', description: 'Administrative activity history and rollback controls.' },
  { key: 'sync_center', label: 'Sync Center', description: 'Catalog sync jobs, previews, imports, and batch controls.' },
  { key: 'media_assets', label: 'Media Assets', description: 'Upload, assign, optimize, and maintain media files.' },
  { key: 'seo', label: 'SEO', description: 'Metadata, schema, sitemap, and indexing controls.' },
  { key: 'membership', label: 'Membership', description: 'Premium plans, grants, cancellations, and payment status.' },
  { key: 'analytics', label: 'Analytics', description: 'Traffic, search, engagement, and funnel analytics.' },
  { key: 'reports', label: 'Reports', description: 'User reports, link reports, assignment, and export.' },
  { key: 'system_settings', label: 'System Settings', description: 'Site settings, maintenance, cache, and limits.' },
  { key: 'feature_flags', label: 'Feature Flags', description: 'Runtime feature toggles and gradual exposure controls.' },
  { key: 'security', label: 'Security', description: 'Sessions, admin locks, IP allowlist, and suspicious activity.' },
  { key: 'export_backup', label: 'Export / Backup', description: 'Data exports, backups, restores, and downloads.' },
  { key: 'bulk_actions', label: 'Bulk Actions', description: 'Bulk edits, imports, exports, and moderation actions.' },
  { key: 'risk_controls', label: 'Risk Controls', description: 'Risk thresholds, owner approval, and forbidden actions.' },
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

function labelFromKey(key: string) {
  const [, action = key] = key.split('.');
  return action.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
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
    description: `${labelFromKey(key)} permission for ${adminPermissionModules.find((item) => item.key === module)?.label || module}.`,
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
