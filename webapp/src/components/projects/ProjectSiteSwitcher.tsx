import React, { useMemo } from 'react';
import { Plus, Pencil, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Site, SiteStatusSnapshot } from '@/types/models';
import { ProgressStatusBadge } from '@/components/progress/ProgressStatusBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * ProjectSiteSwitcher
 *
 * Minimal, focused control allowing the user to:
 *  - View current project name (left-aligned)
 *  - Switch between sites of the project
 *  - Optionally add a new site
 *  - Optionally edit the currently selected site
 *
 * NOTE:
 *  - UI text in French.
 *  - Uses shadcn/ui Select + Button instead of native elements.
 */

export interface ProjectSiteSwitcherProps {
  project: Project;
  currentSiteId?: string;
  onChangeSite: (siteId: string) => void;
  onAddSite?: () => void;
  onEditSite?: (siteId: string) => void;
  siteStatusMap?: Record<string, SiteStatusSnapshot | undefined>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export const ProjectSiteSwitcher: React.FC<ProjectSiteSwitcherProps> = ({
  project,
  currentSiteId,
  onChangeSite,
  onAddSite,
  onEditSite,
  siteStatusMap,
  loading = false,
  disabled = false,
  className,
  compact = false
}) => {
  const sites = useMemo(() => project.sites || [], [project.sites]);
  const effectiveCurrentSiteId = currentSiteId || sites[0]?.id;

  const currentSite: Site | undefined = useMemo(
    () => sites.find((s) => s.id === effectiveCurrentSiteId),
    [sites, effectiveCurrentSiteId]
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {/* Left: Project name */}
      <div className="flex min-w-0 flex-col">
        <h1
          className={cn(
            'font-semibold text-foreground',
            compact ? 'text-lg' : 'text-xl'
          )}
        >
          {project.name}
        </h1>
        {currentSite && (
          <p className="text-xs text-muted-foreground">
            Site sélectionné&nbsp;:{' '}
            <span className="font-medium text-foreground">
              {currentSite.name}
            </span>
          </p>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Site selector via shadcn Select */}
        <Select
          value={effectiveCurrentSiteId}
          onValueChange={(val) => onChangeSite(val)}
          disabled={disabled || loading || sites.length === 0}
        >
          <SelectTrigger className="w-56 h-8" aria-label="Sélection du site">
            <SelectValue placeholder="Sélectionner un site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => {
              const status = siteStatusMap?.[site.id];
              const demobilized = status?.demobilized;
              return (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                  {demobilized ? ' (Démobilisé)' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Current site status badge (if available) */}
        {currentSite && siteStatusMap?.[currentSite.id] && (
          <div className="flex items-center gap-0.5">
            <ProgressStatusBadge
              status={siteStatusMap[currentSite.id]!.latestStatus}
              compact
            />
            {siteStatusMap[currentSite.id]!.demobilized && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive border border-destructive/30">
                <XCircle className="h-3.5 w-3.5" />
                Démobilisé
              </span>
            )}
            {!siteStatusMap[currentSite.id]!.demobilized &&
              (siteStatusMap[currentSite.id]?.demobilizationStage || 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {siteStatusMap[currentSite.id]?.alertLabel || 'Alerte'}
                </span>
              )}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement
          </span>
        )}

        {/* Edit site button */}
        {onEditSite && currentSite && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onEditSite(currentSite.id)}
            disabled={disabled || loading}
            className="h-8 gap-0.5 px-2"
            aria-label="Modifier le site"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        )}

        {/* Add site */}
        {onAddSite && (
          <Button
            type="button"
            onClick={onAddSite}
            disabled={disabled || loading}
            className="h-8 gap-1 px-2"
            aria-label="Ajouter un site"
          >
            <Plus className="h-4 w-4" />
            Site
          </Button>
        )}
      </div>
    </div>
  );
};

ProjectSiteSwitcher.displayName = 'ProjectSiteSwitcher';
export default ProjectSiteSwitcher;