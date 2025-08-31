"use client";

// Layout protégé avec sidebar et breadcrumb
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

function getBreadcrumbFromPath(pathname: string): { items: BreadcrumbItem[] } {
  const segments = pathname.split('/').filter(Boolean);
  
  // Configuration des breadcrumbs selon les routes
  if (pathname === '/site-tracker' || pathname === '/site-tracker/') {
    return {
      items: [
        { label: 'Suivi de chantier', href: '/site-tracker' },
        { label: 'Tableau de bord', current: true }
      ]
    };
  }
  
  if (pathname.startsWith('/site-tracker/projects')) {
    const items: BreadcrumbItem[] = [
      { label: 'Suivi de chantier', href: '/site-tracker' },
      { label: 'Projets', href: '/site-tracker/projects' }
    ];
    
    // Si on est sur une page spécifique d'un projet
    if (segments.length > 2 && segments[2] !== 'projects') {
      items.push({ label: 'Détails du projet', current: true });
    } else {
      items.push({ label: 'Liste des projets', current: true });
    }
    
    return { items };
  }
  
  if (pathname === '/settings') {
    return {
      items: [
        { label: 'Paramètres', current: true }
      ]
    };
  }
  
  // Par défaut
  return {
    items: [
      { label: 'Tableau de bord', current: true }
    ]
  };
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  const goLogin = useCallback(() => {
    const next = encodeURIComponent(pathname || "/");
    router.replace(`/auth/login?next=${next}`);
  }, [pathname, router]);

  useEffect(() => {
    let active = true;

    async function check() {
      setChecking(true);
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const has = !!data.session;
      setAuthed(has);
      setChecking(false);
      if (!has) {
        goLogin();
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const loggedIn = !!session;
      setAuthed(loggedIn);
      if (!loggedIn) {
        goLogin();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [goLogin]);

  if (checking || !authed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Vérification de la session...</p>
      </div>
    );
  }

  const breadcrumb = getBreadcrumbFromPath(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumb.items.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <BreadcrumbSeparator className="mx-2" />
                    )}
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                      {item.current ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}