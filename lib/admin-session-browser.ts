import { getStoredSession } from '@/lib/supabase-auth-browser';

export function adminSessionHeaders(extra?: Record<string, string>) {
  const token = getStoredSession()?.access_token;
  if (!token) throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ดูแลระบบ');

  return {
    ...(extra || {}),
    Authorization: `Bearer ${token}`,
  };
}
