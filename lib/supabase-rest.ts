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

function supabaseConfig(mode: SupabaseMode) {
  const baseUrl = cleanBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getSupabaseKey(mode);

  if (!baseUrl || !key) {
    throw new Error(mode === 'service' ? 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY' : 'Missing Supabase URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return { baseUrl, key };
}

function parseContentRange(value: string | null) {
  if (!value) return 0;
  const total = value.split('/').pop();
  if (!total || total === '*') return 0;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasSupabaseRestConfig(mode: SupabaseMode = 'service') {
  return Boolean(cleanBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && getSupabaseKey(mode));
}

export async function supabaseRest<T>(path: string, options: SupabaseRestOptions = {}): Promise<T> {
  const mode = options.mode || 'service';
  const { baseUrl, key } = supabaseConfig(mode);

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

  const text = await response.text();
  if (!text.trim()) return null as T;

  return JSON.parse(text) as T;
}

export async function supabaseRestCount(path: string, options: Pick<SupabaseRestOptions, 'mode' | 'cache'> = {}) {
  const mode = options.mode || 'service';
  const { baseUrl, key } = supabaseConfig(mode);
  const separator = path.includes('?') ? '&' : '?';
  const countPath = path.includes('select=') ? path : `${path}${separator}select=*`;

  const response = await fetch(`${baseUrl}/rest/v1/${countPath}`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      accept: 'application/json',
      Prefer: 'count=exact',
      Range: '0-0',
    },
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase REST count failed with ${response.status}`);
  }

  return parseContentRange(response.headers.get('content-range'));
}
