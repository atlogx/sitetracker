"use client";

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Composant qui rend son contenu uniquement côté client pour éviter
 * les erreurs d'hydratation SSR/CSR.
 * 
 * Utile pour les composants qui utilisent :
 * - Date.now() ou new Date()
 * - Math.random()
 * - window, localStorage, etc.
 * - Toute valeur qui peut différer entre serveur et client
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}