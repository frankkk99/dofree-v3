import type { AdminAccess } from './admin-auth';
import { supabaseRest } from './supabase-rest';

type AuditActor = Extract<AdminAccess, { ok: true }>;

type AdminAuditInput = {
  request: Request;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  beforeData?: unknown;
  afterData?: unknown;
};

export type AdminAuditLog = {
  id: string;
  actor_id?: string | null;
  actor_label?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  before_data?: unknown;
  after_data?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

function ipAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || null;
}

function actorLabel(actor: AuditActor) {
  if (actor.mode === 'token') return 'Admin token';
  return actor.user?.email || actor.user?.phone || actor.user?.id || 'Admin session';
}

export async function recordAdminAuditLog(input: AdminAuditInput) {
  try {
    await supabaseRest<AdminAuditLog[]>('admin_audit_logs', {
      method: 'POST',
      mode: 'service',
      prefer: 'return=minimal',
      body: {
        actor_id: input.actor.mode === 'session' ? input.actor.user?.id || null : null,
        actor_label: actorLabel(input.actor),
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId == null ? null : String(input.entityId),
        before_data: input.beforeData ?? null,
        after_data: input.afterData ?? null,
        ip_address: ipAddress(input.request),
        user_agent: input.request.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.warn('admin audit log skipped', error);
  }
}

export async function listAdminAuditLogs(limit = 80) {
  const safeLimit = Math.min(Math.max(Number(limit) || 80, 1), 200);
  return supabaseRest<AdminAuditLog[]>(
    `admin_audit_logs?select=id,actor_id,actor_label,action,entity_type,entity_id,before_data,after_data,ip_address,user_agent,created_at&order=created_at.desc&limit=${safeLimit}`,
    { mode: 'service', cache: 'no-store' },
  );
}
