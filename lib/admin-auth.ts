function normalizeAdminToken(value?: string | null) {
  return value?.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
}

export function requireAdminToken(request: Request) {
  const configuredToken = normalizeAdminToken(process.env.DOFREE_ADMIN_TOKEN);

  if (!configuredToken) {
    return {
      ok: false as const,
      status: 500,
      error: 'Missing DOFREE_ADMIN_TOKEN. Add it in Vercel Environment Variables before using admin writes.',
    };
  }

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-admin-token')?.trim();
  const suppliedToken = normalizeAdminToken(headerToken || bearerToken);

  if (suppliedToken !== configuredToken) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid admin token',
    };
  }

  return { ok: true as const };
}
