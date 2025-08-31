'use client';

import React from 'react';
import { organizationsService } from '@/lib/supabase';
import SettingsPanel from '@/components/settings/SettingsPanel';
import ThemeSettings from '@/components/settings/ThemeSettings';
import type {
  Organization,
  Administrator,
  UpsertOrganizationInput,

} from '@/types/models';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Palette, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * /settings
 * Page de configuration simplifiée pour l'organisation
 * - Modification de l'adresse de l'organisation (nom verrouillé)
 * - Gestion des administrateurs de l'organisation
 *
 * NOTE:
 *  Cette page est un composant client car le composant SettingsPanel (et les interactions) reposent sur useState.
 *  Tout le texte affiché est en français (exigence), mais les noms de variables et le schéma restent en anglais.
 */

/* -------------------------------------------------------------------------- */
/*  Lightweight Mapping Helpers (client side)                                 */
/*  (Évite de surcharger avec toute la logique domainMapping)                 */
/* -------------------------------------------------------------------------- */

function mapOrganizationRow(row: { id: string; name: string; address?: string; created_at: string; updated_at: string }, administrators: Administrator[] = []): Organization {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    administrators,
    projectCount: undefined,
    siteCount: undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Removed unused function

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Load organizations (pick the first one)
        const orgRows = await organizationsService.getAll();
        
        if (orgRows && orgRows.length > 0) {
          // TODO: Load administrators from database
          // For now, we'll use empty array until administrators table is implemented
          const administrators: Administrator[] = [];
          const org = mapOrganizationRow(orgRows[0], administrators);
          
          if (!cancelled) {
            setOrganization(org);
          }
        } else {
          if (!cancelled) {
            setOrganization(null);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Échec du chargement des données.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  /* ----------------------- Handlers pour l'organisation ----------------------- */

  async function handleUpdateOrganization(patch: Partial<UpsertOrganizationInput>) {
    if (!organization) return;
    
    try {
      // TODO: Appeler organizationsService.update(organization.id, patch)
      // Pour le moment, on met à jour localement
      setOrganization(prev => prev ? { 
        ...prev, 
        address: patch.address ?? prev.address
      } : prev);
      
      console.log('Organisation mise à jour:', patch);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'organisation:', error);
    }
  }



  /* ------------------------------- Loading / Error UI ------------------------------- */

  if (loading) {
    return (
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          <Tabs defaultValue="organization" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organisation
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Apparence
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="organization" className="space-y-6">
              <div>
                <Skeleton className="h-6 w-60 mb-2" />
                <Skeleton className="h-4 w-80 mb-6" />
                
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      <Skeleton className="h-5 w-56" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 space-y-5">
                      <Skeleton className="h-5 w-72" />
                      <div className="space-y-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="p-4 border rounded-lg space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Skeleton className="h-9 w-full" />
                              <Skeleton className="h-9 w-full" />
                              <Skeleton className="h-9 w-full" />
                              <Skeleton className="h-9 w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <Skeleton className="h-9 w-48" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-6">
              <div>
                <Skeleton className="h-6 w-80 mb-2" />
                <Skeleton className="h-4 w-96 mb-6" />
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                  
                  <Card>
                    <CardContent className="space-y-6 pt-6">
                      <div className="space-y-4">
                        <Skeleton className="h-5 w-40" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-auto p-4 border rounded-lg flex flex-col items-center space-y-2">
                              <Skeleton className="h-5 w-5" />
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
    );
  }

  if (error) {
    return (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => setRefreshIndex(i => i + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
    );
  }

  /* ----------------------------------- Main UI ----------------------------------- */

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-2">
            Configurez votre organisation et personnalisez l'apparence de l'application.
          </p>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organisation
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apparence
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="organization" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Gestion de l'organisation</h2>
              <p className="text-muted-foreground mb-6">
                Gérez les informations de votre organisation et ses administrateurs.
              </p>
              <SettingsPanel
                organization={organization}
                onUpdateOrganization={handleUpdateOrganization}
                loading={loading}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="appearance" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Personnalisation de l'interface</h2>
              <p className="text-muted-foreground mb-6">
                Configurez l'apparence et le comportement de l'interface selon vos préférences.
              </p>
              <ThemeSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}