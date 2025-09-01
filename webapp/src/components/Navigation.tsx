"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  FolderOpen,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const navigationItems = [
  { title: 'Tableau de Bord', href: '/site-tracker', icon: Home },
  { title: 'Projets', href: '/site-tracker/projects', icon: FolderOpen },
  { title: 'Paramètres', href: '/settings', icon: Settings }
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setIsAuthed(!!data.session);
        setChecking(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthed(!!session);
      if (event === 'SIGNED_IN') {
        toast.success('Connexion établie', {
          description: 'Authentification réussie. Redirection vers votre espace.'
        });
      } else if (event === 'SIGNED_OUT') {
        toast('Déconnexion effectuée', {
          description: 'Vous avez été déconnecté. À bientôt.'
        });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Jonii</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Suivi de Chantiers</p>
              </div>
            </Link>
          </div>

            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
              {!checking && (
                isAuthed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                ) : (
                  <Link href="/auth/login">
                    <Button size="sm" variant="outline" className="ml-2 gap-2">
                      <User className="h-4 w-4" />
                      Connexion
                    </Button>
                  </Link>
                )
              )}
            </nav>

          <div className="md:hidden flex items-center gap-2">
            {!checking && (
              isAuthed ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Déconnexion</span>
                </Button>
              ) : (
                <Link href="/auth/login">
                  <Button size="sm" variant="outline" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Connexion</span>
                  </Button>
                </Link>
              )
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="relative z-50"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border bg-background">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
              {!checking && (
                isAuthed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="block mt-2"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <User className="h-4 w-4" />
                      Connexion
                    </Button>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}