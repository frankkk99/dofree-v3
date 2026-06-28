'use client';

import { useEffect, useState } from 'react';
import {
  getDefaultPremiumFreeAccessConfig,
  normalizePremiumFreeAccessConfig,
  type PremiumAccessUserState,
  type PremiumFreeAccessConfig,
} from '@/lib/premium-access-config';
import { getStoredSession, type DofreeSession } from '@/lib/supabase-auth-browser';

type ProfilePayload = {
  ok?: boolean;
  role?: string | null;
  isAdmin?: boolean;
  isPremium?: boolean;
  hasPremiumAccess?: boolean;
};

type PremiumAccessSnapshot = {
  config: PremiumFreeAccessConfig;
  userState: PremiumAccessUserState;
};

const guestUserState: PremiumAccessUserState = {
  isSignedIn: false,
  isAdmin: false,
  isPremium: false,
  hasPremiumAccess: false,
};

let cachedConfig = getDefaultPremiumFreeAccessConfig();
let configPromise: Promise<PremiumFreeAccessConfig> | null = null;
let accountPromise: Promise<PremiumAccessUserState> | null = null;

function roleIsAdmin(role?: string | null) {
  return role === 'admin' || role === 'super_admin';
}

function fallbackUserState(session: DofreeSession | null): PremiumAccessUserState {
  const role = session?.profile?.role || session?.user?.role || '';
  const isAdmin = roleIsAdmin(role);
  const isPremium = role === 'premium' || isAdmin;
  return {
    isSignedIn: Boolean(session?.access_token),
    isAdmin,
    isPremium,
    hasPremiumAccess: isPremium,
  };
}

async function loadPremiumConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/premium-access', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Cannot load premium access config');
        cachedConfig = normalizePremiumFreeAccessConfig(payload?.config || payload);
        return cachedConfig;
      })
      .catch(() => cachedConfig);
  }
  return configPromise;
}

async function loadAccountState(session: DofreeSession | null) {
  if (!session?.access_token) {
    accountPromise = null;
    return guestUserState;
  }

  if (!accountPromise) {
    accountPromise = fetch('/api/profile/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as ProfilePayload | null;
        if (!response.ok || !payload?.ok) throw new Error(payload?.ok === false ? 'Profile unavailable' : 'Profile unavailable');
        return {
          isSignedIn: true,
          isAdmin: Boolean(payload.isAdmin),
          isPremium: Boolean(payload.isPremium),
          hasPremiumAccess: Boolean(payload.hasPremiumAccess || payload.isPremium || payload.isAdmin),
        };
      })
      .catch(() => fallbackUserState(session));
  }

  return accountPromise;
}

export function refreshPremiumAccessClientCache() {
  configPromise = null;
  accountPromise = null;
}

export function usePremiumAccessSnapshot(): PremiumAccessSnapshot {
  const [snapshot, setSnapshot] = useState<PremiumAccessSnapshot>(() => ({
    config: cachedConfig,
    userState: fallbackUserState(getStoredSession()),
  }));

  useEffect(() => {
    let active = true;

    async function sync() {
      const session = getStoredSession();
      const fallback = fallbackUserState(session);
      setSnapshot((current) => ({ ...current, userState: fallback }));
      const [config, userState] = await Promise.all([loadPremiumConfig(), loadAccountState(session)]);
      if (active) setSnapshot({ config, userState });
    }

    function resetAndSync() {
      refreshPremiumAccessClientCache();
      void sync();
    }

    void sync();
    window.addEventListener('storage', resetAndSync);
    window.addEventListener('dofree-auth-change', resetAndSync);
    return () => {
      active = false;
      window.removeEventListener('storage', resetAndSync);
      window.removeEventListener('dofree-auth-change', resetAndSync);
    };
  }, []);

  return snapshot;
}

