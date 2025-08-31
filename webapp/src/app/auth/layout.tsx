import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export const metadata = {
  title: 'Authentification | Tracker',
  description: 'Connexion, inscription et réinitialisation du mot de passe'
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl w-full px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">
              Tracker
            </span>
          </Link>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Authentification
          </span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4">
        {children}
      </main>
    </div>
  );
}
