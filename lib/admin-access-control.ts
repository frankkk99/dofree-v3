import { adminPermissions, defaultRolePermission, type AdminRoleKey } from '@/lib/admin-permissions';

type RoleSource = string | null | undefined;
type UserOrProfile = { role?: RoleSource; profile?: { role?: RoleSource } | null; user?: { role?: RoleSource } | null } | null | undefined;

const ownerRoles = new Set(['owner', 'super_admin']);
const supervisorRoles = new Set(['admin_supervisor', 'supervisor']);
const curatorRoles = new Set(['admin_content', 'content_curator', 'admin']);

export function normalizeRole(role: RoleSource): string {
  return String(role || '').trim().toLowerCase();
}

export function roleFromUserOrProfile(userOrProfile: UserOrProfile) {
  return normalizeRole(userOrProfile?.role || userOrProfile?.profile?.role || userOrProfile?.user?.role);
}

export function isOwnerRole(role: RoleSource) {
  return ownerRoles.has(normalizeRole(role));
}

export function isSupervisorRole(role: RoleSource) {
  return supervisorRoles.has(normalizeRole(role));
}

export function isContentCuratorRole(role: RoleSource) {
  return curatorRoles.has(normalizeRole(role));
}

export function isAdminRole(role: RoleSource) {
  return isOwnerRole(role) || isSupervisorRole(role) || isContentCuratorRole(role);
}

export function canonicalAdminRole(role: RoleSource): AdminRoleKey | null {
  if (isOwnerRole(role)) return 'owner';
  if (isSupervisorRole(role)) return 'admin_supervisor';
  if (isContentCuratorRole(role)) return 'admin_content';
  return null;
}

export function getAdminRoleLabel(role: RoleSource) {
  if (isOwnerRole(role)) return 'Owner';
  if (isSupervisorRole(role)) return 'Supervisor';
  if (isContentCuratorRole(role)) return 'Content Curator';
  const normalized = normalizeRole(role);
  if (normalized === 'premium' || normalized === 'premium_user') return 'Premiere';
  if (normalized === 'free_user' || normalized === 'viewer' || normalized === 'user') return 'Member';
  return 'Guest';
}

export function canManageAccessControl(userOrProfile: UserOrProfile) {
  return isOwnerRole(roleFromUserOrProfile(userOrProfile));
}

export function hasPermission(userOrProfile: UserOrProfile, permissionKey: string) {
  const roleKey = canonicalAdminRole(roleFromUserOrProfile(userOrProfile));
  const permission = adminPermissions.find((item) => item.key === permissionKey);
  if (!roleKey || !permission) return false;
  return defaultRolePermission(roleKey, permission).allowed;
}

export function requiresApproval(userOrProfile: UserOrProfile, permissionKey: string) {
  const roleKey = canonicalAdminRole(roleFromUserOrProfile(userOrProfile));
  const permission = adminPermissions.find((item) => item.key === permissionKey);
  if (!roleKey || !permission) return true;
  return defaultRolePermission(roleKey, permission).requiresApproval;
}
