import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type AuditLog = {
  id: string;
  actor_label?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') || 30), 1), 100);

  try {
    const logs = await supabaseRest<AuditLog[]>(
      `admin_audit_logs?select=id,actor_label,action,entity_type,entity_id,after_data,created_at&order=created_at.desc&limit=${limit}`,
      { mode: 'service', cache: 'no-store' }
    );

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load audit logs' }, { status: 500 });
  }
}
