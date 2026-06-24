type SupabaseMode = 'anon' | 'service';

type SupabaseRestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  mode?: SupabaseMode;
  body?: unknown;
  prefer?: string;
  cache?: RequestCache;
};

function cleanBaseUrl(value?: string) {
  return value?.trim().replace(/\/$/, '');
}

function getSupabaseKey(mode: SupabaseMode) {
  if (mode === 'service') return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

export function hasSupabaseRestConfig(mode: SupabaseMode = 'service') {
  return Boolean(cleanBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && getSupabaseKey(mode));
}

export async function supabaseRest<T>(path: string, options: SupabaseRestOptions = {}): Promise<T> {
  const mode = options.mode || 'service';
  const baseUrl = cleanBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getSupabaseKey(mode);

  if (!baseUrl || !key) {
    throw new Error(mode === 'service' ? 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY' : 'Missing Supabase URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase REST request failed with ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}
