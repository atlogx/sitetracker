'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Page racine:
 * - Si l'utilisateur est connecté -> /site-tracker
 * - Sinon -> /auth/login (avec next=/site-tracker)
 *
 * Utilise la vérification côté client pour éviter les problèmes de cookies côté serveur.
 */

export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          router.replace('/site-tracker');
        } else {
          router.replace('/auth/login?next=%2Fsite-tracker');
        }
      } catch {
        router.replace('/auth/login?next=%2Fsite-tracker');
      }
    }

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}