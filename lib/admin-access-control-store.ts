import { adminPermissionModules, adminPermissions, adminRolePresets, defaultRolePermissions, type AdminRoleKey, type PermissionRiskLevel, type RolePermissionSetting } from '@/lib/admin-permissions';
import { supabaseRest } from '@/lib/supabase-rest';

type RolePermissionRow = {
  role_key: AdminRoleKey;
  permission_key: string;
  allowed?: boolean | null;
  requires_approval?: boolean | null;
  can_bulk?: boolean | null;
};

type PermissionRow = {
  permission_key: string;
  risk_level?: PermissionRiskLevel | null;
  enabled?: boolean | null;
};

export type AccessControlTeamMember = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function fallbackRolePermissions() {
  return adminRolePresets.flatMap((role) => defaultRolePermissions(role.key));
}

function mergeRolePermissions(rows?: RolePermissionRow[] | null): RolePermissionSetting[] {
  const saved = new Map((rows || []).map((row) => [`${row.role_key}:${row.permission_key}`, row]));
  return fallbackRolePermissions().map((preset) => {
    const row = saved.get(`${preset.roleKey}:${preset.permissionKey}`);
    return row ? {
      roleKey: preset.roleKey,
      permissionKey: preset.permissionKey,
      allowed: Boolean(row.allowed),
      requiresApproval: Boolean(row.requires_approval),
      canBulk: Boolean(row.can_bulk),
    } : preset;
  });
}

function mergePermissionRisk(rows?: PermissionRow[] | null) {
  const saved = new Map((rows || []).map((row) => [row.permission_key, row]));
  return adminPermissions.map((permission) => {
    const row = saved.get(permission.key);
    return {
      ...permission,
      riskLevel: row?.risk_level || permission.riskLevel,
      enabled: row?.enabled !== false,
    };
  });
}

export async function getAccessControlSnapshot() {
  const [permissionRows, rolePermissionRows] = await Promise.all([
    supabaseRest<PermissionRow[]>('admin_permissions?select=permission_key,risk_level,enabled&limit=1000', { mode: 'service', cache: 'no-store' }).catch(() => []),
    supabaseRest<RolePermissionRow[]>('admin_role_permissions?select=role_key,permission_key,allowed,requires_approval,can_bulk&limit=5000', { mode: 'service', cache: 'no-store' }).catch(() => []),
  ]);

  return {
    roles: adminRolePresets,
    modules: adminPermissionModules,
    permissions: mergePermissionRisk(permissionRows),
    rolePermissions: mergeRolePermissions(rolePermissionRows),
  };
}

export async function listAccessControlTeam() {
  return supabaseRest<AccessControlTeamMember[]>(
    'profiles?select=id,display_name,avatar_url,role,created_at,updated_at&order=created_at.desc&limit=1000',
    { mode: 'service', cache: 'no-store' },
  ).catch(() => []);
}

export async function saveRolePermission(input: {
  roleKey: AdminRoleKey;
  permissionKey: string;
  allowed: boolean;
  requiresApproval: boolean;
  canBulk: boolean;
  riskLevel?: PermissionRiskLevel;
}) {
  const permission = adminPermissions.find((item) => item.key === input.permissionKey);
  if (!permission) throw new Error('Unknown permission');

  if (input.riskLevel) {
    await supabaseRest('admin_permissions?on_conflict=permission_key', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates',
      body: [{
        permission_key: permission.key,
        module_key: permission.module,
        display_name: permission.label,
        description: permission.description,
        risk_level: input.riskLevel,
        enabled: true,
        sort_order: permission.sortOrder,
        updated_at: new Date().toISOString(),
      }],
    });
  }

  await supabaseRest('admin_role_permissions?on_conflict=role_key,permission_key', {
    method: 'POST',
    mode: 'service',
    prefer: 'resolution=merge-duplicates',
    body: [{
      role_key: input.roleKey,
      permission_key: input.permissionKey,
      allowed: input.allowed,
      requires_approval: input.requiresApproval,
      can_bulk: input.canBulk,
      updated_at: new Date().toISOString(),
    }],
  });
}

export async function saveUserPermissionOverride(input: {
  userId: string;
  permissionKey: string;
  allowed?: boolean | null;
  requiresApproval?: boolean | null;
  canBulk?: boolean | null;
  note?: string | null;
}) {
  if (!input.userId || !input.permissionKey) throw new Error('Missing user or permission');
  await supabaseRest('admin_user_permission_overrides?on_conflict=user_id,permission_key', {
    method: 'POST',
    mode: 'service',
    prefer: 'resolution=merge-duplicates',
    body: [{
      user_id: input.userId,
      permission_key: input.permissionKey,
      allowed: input.allowed ?? null,
      requires_approval: input.requiresApproval ?? null,
      can_bulk: input.canBulk ?? null,
      note: input.note || null,
      updated_at: new Date().toISOString(),
    }],
  });
}
