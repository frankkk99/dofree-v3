'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminRoleLabel } from '@/lib/admin-access-control';
import { adminPermissionModules, adminRolePresets, defaultRolePermission, type AdminPermission, type AdminRoleKey, type PermissionRiskLevel, type RolePermissionSetting } from '@/lib/admin-permissions';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type TeamMember = {
  id: string;
  display_name?: string | null;
  role?: string | null;
  roleLabel?: string;
};

type PermissionsPayload = {
  ok?: boolean;
  modules?: typeof adminPermissionModules;
  permissions?: Array<AdminPermission & { enabled?: boolean }>;
  rolePermissions?: RolePermissionSetting[];
  error?: string;
};

const riskOptions: PermissionRiskLevel[] = ['low', 'medium', 'high', 'critical'];
const tabs = ['Role Presets', 'Team Members', 'Permission Matrix', 'Approval Requirement'] as const;

function settingKey(roleKey: string, permissionKey: string) {
  return `${roleKey}:${permissionKey}`;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 min-w-16 items-center justify-center rounded-full px-3 text-[10px] font-black transition ${checked ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/48 hover:bg-white/[0.14]'}`}
    >
      {label}
    </button>
  );
}

export function AdminAccessControlPanel() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Role Presets');
  const [activeRole, setActiveRole] = useState<AdminRoleKey>('owner');
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [onlyAllowed, setOnlyAllowed] = useState(false);
  const [onlyApproval, setOnlyApproval] = useState(false);
  const [permissions, setPermissions] = useState<Array<AdminPermission & { enabled?: boolean }>>([]);
  const [settings, setSettings] = useState<Record<string, RolePermissionSetting>>({});
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [permissionsResponse, teamResponse] = await Promise.all([
        fetch('/api/admin/access-control/permissions', { headers: adminSessionHeaders(), cache: 'no-store' }),
        fetch('/api/admin/access-control/team', { headers: adminSessionHeaders(), cache: 'no-store' }),
      ]);
      const permissionsPayload = (await permissionsResponse.json()) as PermissionsPayload;
      const teamPayload = (await teamResponse.json()) as { ok?: boolean; team?: TeamMember[]; error?: string };
      if (!permissionsResponse.ok || !permissionsPayload.ok) throw new Error(permissionsPayload.error || 'Cannot load permissions');
      if (!teamResponse.ok || !teamPayload.ok) throw new Error(teamPayload.error || 'Cannot load team');

      const nextPermissions = permissionsPayload.permissions || [];
      const nextSettings = new Map((permissionsPayload.rolePermissions || []).map((item) => [settingKey(item.roleKey, item.permissionKey), item]));
      setPermissions(nextPermissions);
      setSettings(Object.fromEntries(nextSettings));
      setTeam(teamPayload.team || []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Cannot load access control');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visiblePermissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return permissions.filter((permission) => {
      const current = settings[settingKey(activeRole, permission.key)] || defaultRolePermission(activeRole, permission);
      if (moduleFilter && permission.module !== moduleFilter) return false;
      if (riskFilter && permission.riskLevel !== riskFilter) return false;
      if (onlyAllowed && !current.allowed) return false;
      if (onlyApproval && !current.requiresApproval) return false;
      if (!normalizedQuery) return true;
      return [permission.key, permission.label, permission.description, permission.module].join(' ').toLowerCase().includes(normalizedQuery);
    });
  }, [activeRole, moduleFilter, onlyAllowed, onlyApproval, permissions, query, riskFilter, settings]);

  async function saveSetting(permission: AdminPermission, patch: Partial<RolePermissionSetting> & { riskLevel?: PermissionRiskLevel }) {
    const key = settingKey(activeRole, permission.key);
    const current = settings[key] || defaultRolePermission(activeRole, permission);
    const next = { ...current, ...patch };
    setSettings((value) => ({ ...value, [key]: next }));
    if (patch.riskLevel) {
      setPermissions((value) => value.map((item) => item.key === permission.key ? { ...item, riskLevel: patch.riskLevel || item.riskLevel } : item));
    }
    setSavingKey(key);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/admin/access-control/role-permissions', {
        method: 'PUT',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ ...next, riskLevel: patch.riskLevel || permission.riskLevel }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Cannot save permission');
      setNotice('Saved changes');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Cannot save permission');
    } finally {
      setSavingKey('');
    }
  }

  async function resetRolePreset() {
    setNotice('');
    const rolePermissions = permissions.map((permission) => defaultRolePermission(activeRole, permission));
    setSettings((current) => ({
      ...current,
      ...Object.fromEntries(rolePermissions.map((setting) => [settingKey(setting.roleKey, setting.permissionKey), setting])),
    }));
    for (const permission of permissions) {
      const setting = defaultRolePermission(activeRole, permission);
      await saveSetting(permission, setting);
    }
    setNotice('Role preset reset');
  }

  const activeRoleCopy = adminRolePresets.find((role) => role.key === activeRole) || adminRolePresets[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 text-white md:px-8 md:py-6">
      <section className="admin-floating-glass rounded-[28px] border border-white/10 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Owner only</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] md:text-5xl">Access Control</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/62">จัดการ Role, Permission และสิทธิ์การใช้งานระบบหลังบ้าน</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={resetRolePreset} disabled={loading || Boolean(savingKey)} className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/70 hover:bg-white/[0.14] disabled:opacity-45">Reset role preset</button>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-2xl bg-[#e50914] px-4 py-3 text-xs font-black text-white shadow-glow disabled:opacity-45">Save Changes</button>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black ${activeTab === tab ? 'bg-white text-black' : 'bg-white/[0.08] text-white/62 hover:bg-white/[0.14]'}`}>{tab}</button>
          ))}
        </div>
      </section>

      {error ? <div className="mt-4 rounded-2xl bg-[#e50914]/14 px-4 py-3 text-sm font-bold text-red-100">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-2xl bg-green-400/[0.12] px-4 py-3 text-sm font-bold text-green-100">{notice}</div> : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="admin-floating-glass rounded-[26px] border border-white/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Role Presets</p>
          <div className="mt-3 grid gap-2">
            {adminRolePresets.map((role) => (
              <button key={role.key} type="button" onClick={() => setActiveRole(role.key)} className={`rounded-2xl p-3 text-left transition ${activeRole === role.key ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.06] text-white/72 hover:bg-white/[0.1]'}`}>
                <span className="block text-sm font-black">{role.label}</span>
                <span className="mt-1 block text-xs font-semibold leading-5 opacity-70">{role.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-black/28 p-3">
            <p className="text-xs font-black text-white/82">{activeRoleCopy.label}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/46">{activeRoleCopy.description}</p>
          </div>
        </aside>

        <main className="admin-floating-glass min-w-0 rounded-[26px] border border-white/10 p-4">
          {activeTab === 'Team Members' ? (
            <div>
              <h2 className="text-xl font-black">Team Members</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {team.map((member) => (
                  <div key={member.id} className="rounded-2xl bg-white/[0.055] p-3">
                    <p className="break-words text-sm font-black text-white/90">{member.display_name || member.id}</p>
                    <p className="mt-1 text-xs font-semibold text-white/46">{getAdminRoleLabel(member.role)} · {member.role || 'guest'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา permission" className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/28 px-4 text-sm font-bold text-white outline-none placeholder:text-white/34" />
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black px-3 text-xs font-black text-white">
                  <option value="">All modules</option>
                  {adminPermissionModules.map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}
                </select>
                <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black px-3 text-xs font-black text-white">
                  <option value="">All risk</option>
                  {riskOptions.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                </select>
                <Toggle checked={onlyAllowed} onChange={setOnlyAllowed} label="Allowed" />
                <Toggle checked={onlyApproval} onChange={setOnlyApproval} label="Approval" />
              </div>

              <div className="mt-4 grid gap-2">
                {loading ? <p className="rounded-2xl bg-white/[0.055] p-4 text-sm font-bold text-white/50">Loading access control...</p> : null}
                {!loading && visiblePermissions.map((permission) => {
                  const current = settings[settingKey(activeRole, permission.key)] || defaultRolePermission(activeRole, permission);
                  const key = settingKey(activeRole, permission.key);
                  return (
                    <article key={permission.key} className="rounded-2xl bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-white/90">{permission.label}</p>
                          <p className="mt-1 break-words text-[11px] font-mono text-white/36">{permission.key}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{permission.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Toggle checked={current.allowed} onChange={(allowed) => void saveSetting(permission, { allowed })} label="Allowed" />
                          <Toggle checked={current.requiresApproval} onChange={(requiresApproval) => void saveSetting(permission, { requiresApproval })} label="Approval" />
                          <Toggle checked={current.canBulk} onChange={(canBulk) => void saveSetting(permission, { canBulk })} label="Can Bulk" />
                          <select value={permission.riskLevel} onChange={(event) => void saveSetting(permission, { riskLevel: event.target.value as PermissionRiskLevel })} className="h-8 rounded-full border border-white/10 bg-black px-3 text-[10px] font-black text-white">
                            {riskOptions.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                          </select>
                        </div>
                      </div>
                      {savingKey === key ? <p className="mt-2 text-[11px] font-bold text-white/38">Saving...</p> : null}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
