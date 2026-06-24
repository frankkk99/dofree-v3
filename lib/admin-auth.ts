export function requireAdminToken(request: Request) {
  const configuredToken = process.env.DOFREE_ADMIN_TOKEN?.trim();

  if (!configuredToken) {
    return {
      ok: false as const,
      status: 500,
      error: 'Missing DOFREE_ADMIN_TOKEN. Add it in Vercel Environment Variables before using admin writes.',
    };
  }

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-admin-token')?.trim();
  const suppliedToken = headerToken || bearerToken;

  if (suppliedToken !== configuredToken) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid admin token',
    };
  }

  return { ok: true as const };
}
