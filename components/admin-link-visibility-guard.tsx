'use client';

import { useEffect, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type ProfileResponse = {
  ok?: boolean;
  isAdmin?: boolean;
};

export function AdminLinkVisibilityGuard() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    let observer: MutationObserver | null = null;

    function applyVisibility(nextIsAdmin: boolean) {
      const links = Array.from(document.querySelectorAll('a[href="/admin"]')) as HTMLElement[];
      for (const link of links) {
        link.style.display = nextIsAdmin ? '' : 'none';
      }
    }

    async function checkRole() {
      const session = getStoredSession();
      const token = session?.access_token;

      if (!token) {
        if (!active) return;
        setIsAdmin(false);
        applyVisibility(false);
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json()) as ProfileResponse;
        const nextIsAdmin = Boolean(response.ok && payload.ok && payload.isAdmin);
        if (!active) return;
        setIsAdmin(nextIsAdmin);
        applyVisibility(nextIsAdmin);
      } catch {
        if (!active) return;
        setIsAdmin(false);
        applyVisibility(false);
      }
    }

    void checkRole();

    observer = new MutationObserver(() => applyVisibility(isAdmin));
    observer.observe(document.body, { childList: true, subtree: true });

    function onAuthChange() {
      void checkRole();
    }

    window.addEventListener('storage', onAuthChange);
    window.addEventListener('dofree-auth-change', onAuthChange);

    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener('storage', onAuthChange);
      window.removeEventListener('dofree-auth-change', onAuthChange);
    };
  }, [isAdmin]);

  return null;
}
