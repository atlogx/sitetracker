'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  projectsService,
  type ProjectWithRelations
} from '@/lib/supabase';
import {
  convertDatabaseToProject,
  type Project
} from '@/types/models';
import { generateSlug } from '@/lib/utils';

/**
 * Page Projets
 * - Charge la liste des projets depuis Supabase
 * - Affiche un état de chargement ou d'erreur simple
 * - Monte le composant compact ProjectListCompact (Approche 1)
 * - Pas de JSX orphelin / ancien tableau
 * - Couleurs neutres : les couleurs critiques restent limitées (rouge / amber / vert) déjà gérées dans ProjectListCompact
 */

// Suppression des données de démonstration : toutes les données proviennent désormais de Supabase.

// Import dynamique du composant compact (code splitting)
const ProjectListCompact = React.lazy(
  () => import('@/components/projects/ProjectListCompact')
);

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les projets à l'initialisation
  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      const rows = await projectsService.getAll();
      const converted = rows.map((p: ProjectWithRelations) =>
        convertDatabaseToProject(p)
      );
      setProjects(converted);
    } catch (e) {
      console.error('Erreur chargement projets', e);
      setError(
        'Erreur lors du chargement des projets. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Utilisation directe des projets chargés depuis Supabase
  const combinedProjects = useMemo<Project[]>(
    () => [...projects],
    [projects]
  );

  // Affichage erreur
  if (error) {
    return (
        <div className="max-w-lg mx-auto mt-16">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-2">
                  <h2 className="font-semibold text-destructive">
                    Erreur
                  </h2>
                  <p className="text-sm text-destructive/80">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => loadProjects()}
                    className="mt-2"
                  >
                    Réessayer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    );
  }

// Chargement initial : on laisse toujours monter ProjectListCompact pour afficher ses skeletons

  return (
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Préparation de l’interface...
          </div>
        }
      >
        <ProjectListCompact
          projects={combinedProjects}
          loading={loading}
          onCreateProject={() => {
            window.location.href = '/site-tracker/projects/new';
          }}
          onOpenProject={(p) => {
            window.location.href = `/site-tracker/projects/${generateSlug(p.name)}`;
          }}
        />
      </React.Suspense>
  );
}