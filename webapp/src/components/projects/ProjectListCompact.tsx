'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Project } from '@/types/models';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  MoreHorizontal,
  Slash,
  Eye,
  Pencil,
  Activity,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink
} from '@/components/ui/pagination';
import {
Select,
SelectTrigger,
SelectContent,
SelectItem,
SelectValue
} from '@/components/ui/select';

/**
 * ProjectListCompact
 *
 * Approche 1 implémentée avec shadcn/ui :
 * - Liste compacte avec lignes cliquables
 * - Bande verticale de statut (dernier statut mensuel)
 * - Pastilles tendance (M-2, M-1, M)
 * - Barre micro progression cumulée
 * - KPIs compacts (sites, progression moyenne)
 * - Panneau latéral (Sheet) pour les détails rapides
 *
 * Tout le texte UI est en français.
 */

/* -------------------------------------------------------------------------- */
/*  Types locaux                                                             */
/* -------------------------------------------------------------------------- */

interface ProjectListCompactProps {
  projects: Project[];
  loading?: boolean;
  onCreateProject?: () => void;
  onOpenProject?: (project: Project) => void;
  onProjectCreated?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Types locaux et système de couleurs                                      */
/* -------------------------------------------------------------------------- */

type TrendStatus = 'good' | 'problematic' | 'critical' | 'none';

// Système de couleurs cohérent avec le thème shadcn/ui
const statusColors = {
  critical: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
    indicator: 'bg-destructive'
  },
  problematic: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500/20',
    indicator: 'bg-orange-500'
  },
  good: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/20',
    indicator: 'bg-emerald-500'
  }
} as const;

function statusToColor(status?: string): string {
  switch (status) {
    case 'good':
      return statusColors.good.indicator;
    case 'problematic':
      return statusColors.problematic.indicator;
    case 'critical':
      return statusColors.critical.indicator;
    default:
      return 'bg-muted';
  }
}

function statusToLabel(status?: TrendStatus): string {
  switch (status) {
    case 'good':
      return 'Bon';
    case 'problematic':
      return 'Problématique';
    case 'critical':
      return 'Critique';
    case 'none':
    default:
      return 'N/A';
  }
}

function getStatusTextColor(status?: string): string {
  switch (status) {
    case 'good':
      return statusColors.good.text;
    case 'problematic':
      return statusColors.problematic.text;
    case 'critical':
      return statusColors.critical.text;
    default:
      return 'text-muted-foreground';
  }
}

function projectStatusBadgeVariant(projectStatus: Project['status']) {
  switch (projectStatus) {
    case 'demobilized':
      return 'destructive';
    case 'remobilized':
      return 'secondary';
    case 'active':
    default:
      return 'default';
  }
}

/* -------------------------------------------------------------------------- */
/*  Sous‑composants inline                                                   */
/* -------------------------------------------------------------------------- */

interface MicroProgressProps {
  value?: number;
}
const MicroProgress: React.FC<MicroProgressProps> = ({ value }) => {
  const v = typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0;
  return (
    <div className="flex items-center gap-2 w-40" aria-label="Progression physique cumulée">
      <div className="relative flex-1 h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-right text-muted-foreground">
        {typeof value === 'number' ? `${Math.round(v)}%` : '--'}
      </span>
    </div>
  );
};

interface TrendDotsProps {
  current?: TrendStatus;
  minus1?: TrendStatus;
  minus2?: TrendStatus;
}
const TrendDots: React.FC<TrendDotsProps> = ({ current, minus1, minus2 }) => {
  const sizeBase = 'h-2.5 w-2.5';
  return (
    <div className="flex items-center gap-1" aria-label="Tendance 3 mois">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`${sizeBase} rounded-full ${statusToColor(minus2 as TrendStatus)}`} />
          </TooltipTrigger>
          <TooltipContent>
            <p>M-2 : {statusToLabel(minus2)}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`${sizeBase} rounded-full ${statusToColor(minus1 as TrendStatus)}`} />
          </TooltipTrigger>
          <TooltipContent>
            <p>M-1 : {statusToLabel(minus1)}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`h-3 w-3 rounded-full ring-2 ring-background ${statusToColor(
                current as TrendStatus
              )}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>M : {statusToLabel(current)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

interface InlineKPIsProps {
  totalSites: number;
  averageProgress?: number;
  criticalSites: number;
  problematicSites: number;
  goodSites: number;
}
const InlineKPIs: React.FC<InlineKPIsProps> = ({
  totalSites,
  averageProgress,
  criticalSites,
  problematicSites,
  goodSites
}) => {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <strong className="font-medium text-foreground">{totalSites}</strong>
        <span>site{totalSites > 1 ? 's' : ''}</span>
      </span>
      {typeof averageProgress === 'number' && (
        <span className="flex items-center gap-1">
          <strong className="font-medium text-foreground">
            {Math.round(averageProgress)}%
          </strong>
          <span>moyen</span>
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.critical.indicator}`} />
        {criticalSites}
      </span>
      <span className="flex items-center gap-1">
        <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.problematic.indicator}`} />
        {problematicSites}
      </span>
      <span className="flex items-center gap-1">
        <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.good.indicator}`} />
        {goodSites}
      </span>
    </div>
  );
};

interface ProjectRowProps {
  project: Project;
  selected: boolean;
  onSelect: (p: Project) => void;
  onOpen?: (p: Project) => void;
  onEdit?: (p: Project) => void;
}
const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  selected,
  onSelect,
  onOpen,
  onEdit
}) => {
  const current = (project.statusMonth as TrendStatus) || 'none';
  const minus1 = (project.statusMonthMinus1 as TrendStatus) || 'none';
  const minus2 = (project.statusMonthMinus2 as TrendStatus) || 'none';

  return (
    <div
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(project);
        if (e.key === 'o' && onOpen) onOpen(project);
      }}
      className={[
        'relative flex items-center gap-4 px-4 py-3 select-none outline-none',
        'hover:bg-accent/50 transition-colors rounded-lg border border-border bg-card',
        selected ? 'bg-accent/70' : '',
        'focus-visible:ring-2 focus-visible:ring-ring'
      ].join(' ')}
    >
      {/* Bande verticale statut */}
      <div
        className={[
          'absolute left-0 top-0 h-full w-1',
          current === 'good'
            ? statusColors.good.indicator
            : current === 'problematic'
            ? statusColors.problematic.indicator
            : current === 'critical'
            ? statusColors.critical.indicator
            : 'bg-muted'
        ].join(' ')}
        aria-hidden="true"
      />

      <div
        className="flex flex-col flex-1 min-w-0 cursor-pointer"
        onClick={() => (onOpen ? onOpen(project) : onSelect(project))}
        role="button"
        aria-label={`Ouvrir le résumé du projet ${project.name}`}
      >
        <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-sm text-foreground">
              {project.name}
            </span>
            <Badge
              variant={projectStatusBadgeVariant(project.status)}
              className="text-[10px] font-normal px-1.5 py-0.5"
            >
              {project.status === 'active'
                ? 'Actif'
                : project.status === 'demobilized'
                ? 'Démobilisé'
                : 'Remobilisé'}
            </Badge>
            {!project.isActive && project.status === 'demobilized' && (
              <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                Inactif
              </span>
            )}
        </div>
        <div className="flex items-center gap-5 mt-1 flex-wrap">
          <MicroProgress value={project.averageProgress} />
          <TrendDots current={current} minus1={minus1} minus2={minus2} />
          <InlineKPIs
            totalSites={project.totalSites}
            averageProgress={project.averageProgress ?? 0}
            criticalSites={project.criticalSites ?? 0}
            problematicSites={project.problematicSites ?? 0}
            goodSites={project.goodSites ?? 0}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Bouton d'ouverture supprimé */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
              aria-label="Actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 py-1 text-[13px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(project);
              }}
              className="flex items-center gap-1.5 py-1 text-[13px]"
            >
              <Eye className="h-4 w-4" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(project);
              }}
              className="flex items-center gap-1.5 py-1 text-[13px]"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="flex items-center gap-1.5 py-1 text-[13px] opacity-50">
              <Activity className="h-4 w-4" />
              Alerter (bientôt)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export const ProjectListCompact: React.FC<ProjectListCompactProps> = ({
  projects,
  loading = false,
  onCreateProject,
  onOpenProject,
  onProjectCreated,
  className
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'problematic' | 'good'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    organizationId: '',
    administrators: []
  });
  const [creating, setCreating] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string}>>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const allowedPerPage = useMemo<number[]>(() => [5, 10, 20, 50], []);
  // Variables dérivées UNIQUEMENT depuis l'URL (plus d'état local pour page/perPage)
  const pageParam = Number(searchParams.get('page') || '1');
  const perParam = Number(searchParams.get('perPage') || '10');
  const itemsPerPage = allowedPerPage.includes(perParam) ? perParam : 10;
  const page = pageParam > 0 ? pageParam : 1;

  // Mise à jour URL (sans ajouter d'entrée historique, pas de state local)
  const updateUrl = useCallback((nextPage: number, per: number) => {
    // On repart toujours de l'URL actuelle pour éviter la recréation de la fonction et le reset involontaire
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(nextPage));
    params.set('perPage', String(per));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);
  // Plus de synchronisation nécessaire : la page et le perPage sont dérivés directement des params.

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      // search
      if (search.trim()) {
        const term = search.toLowerCase();
        const hit =
          p.name.toLowerCase().includes(term) ||
          (p.ownerName || '').toLowerCase().includes(term) ||
          (p.organizationName || '').toLowerCase().includes(term);
        if (!hit) return false;
      }
      // statut mensuel
      if (statusFilter !== 'all') {
        if (p.statusMonth !== statusFilter) return false;
      }
      // actif / inactif (basé sur isActive)
      if (activityFilter === 'active' && !p.isActive) return false;
      if (activityFilter === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [projects, search, statusFilter, activityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = page > totalPages ? totalPages : page;
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedProjects = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Reset page to 1 uniquement quand les filtres OU le page size changent (pas lors d'un simple changement de page)
    React.useEffect(() => {
      updateUrl(1, itemsPerPage);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, activityFilter, itemsPerPage]);

  const aggregated = useMemo(() => {
    const totalSites = projects.reduce((s, p) => s + p.totalSites, 0);
    const crit = projects.reduce((s, p) => s + (p.criticalSites ?? 0), 0);
    const prob = projects.reduce((s, p) => s + (p.problematicSites ?? 0), 0);
    const bon = projects.reduce((s, p) => s + (p.goodSites ?? 0), 0);
    return { totalSites, crit, prob, bon };
  }, [projects]);

  // Sélection simple (redirigée via onOpen). Ne pas ouvrir le dialog ici.
  const handleSelect = useCallback((p: Project) => {
    setSelectedProject(p);
  }, []);

  const handleOpen = useCallback(
    (p: Project) => {
      onOpenProject?.(p);
    },
    [onOpenProject]
  );

  const handleEdit = useCallback(
    (p: Project) => {
      // S'assurer qu'il y a au moins un administrateur par défaut
      const projectWithAdmins = {
        ...p,
        administrators: p.administrators && p.administrators.length > 0
          ? p.administrators
          : [
              { id: '', name: '', email: '', phone: '', position: 'Directeur de projet', role: 'project-level' as const, organizationId: '', createdAt: '', updatedAt: '' }
            ]
      };
      setSelectedProject(projectWithAdmins);
      setDetailOpen(true);
    },
    []
  );

  const handleCreateProject = useCallback(async () => {
    // Charger les organisations disponibles
    try {
      setLoadingOrganizations(true);
      const response = await fetch('/api/organization');
      if (response.ok) {
        const result = await response.json();
        const orgs = Array.isArray(result.data) ? result.data : [result.data];
        setOrganizations(orgs);
        
        // Pré-sélectionner la première organisation disponible
        setNewProject({
          name: '',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: '',
          organizationId: orgs.length > 0 ? orgs[0].id : '',
          administrators: []
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des organisations:', error);
      setOrganizations([]);
      setNewProject({
        name: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        organizationId: '',
        administrators: []
      });
    } finally {
      setLoadingOrganizations(false);
    }

    setCreateOpen(true);
  }, []);

  return (
    <div className={['flex flex-col gap-6 pt-2', className].join(' ')}>
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Ligne 1 : Titre + bouton création */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight py-1">Projets</h1>
          <div className="flex-1" />
          {onCreateProject && (
            <Button
              size="sm"
              onClick={handleCreateProject}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Button>
          )}
        </div>
        {/* Ligne 2 : Recherche + filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[360px] max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full h-9"
              aria-label="Recherche"
            />
          </div>

            <div className="flex items-center gap-1">
              <FilterPill
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                label="Tous statuts"
              />
              <FilterPill
                active={statusFilter === 'critical'}
                onClick={() => setStatusFilter('critical')}
                colorClass={statusColors.critical.indicator}
                label="Critiques"
              />
              <FilterPill
                active={statusFilter === 'problematic'}
                onClick={() => setStatusFilter('problematic')}
                colorClass={statusColors.problematic.indicator}
                label="Problématiques"
              />
              <FilterPill
                active={statusFilter === 'good'}
                onClick={() => setStatusFilter('good')}
                colorClass={statusColors.good.indicator}
                label="Bons"
              />
            </div>

            <div className="flex items-center gap-1 ml-2">
              <FilterPill
                active={activityFilter === 'all'}
                onClick={() => setActivityFilter('all')}
                label="Actifs & inactifs"
              />
              <FilterPill
                active={activityFilter === 'active'}
                onClick={() => setActivityFilter('active')}
                label="Actifs"
              />
              <FilterPill
                active={activityFilter === 'inactive'}
                onClick={() => setActivityFilter('inactive')}
                label="Inactifs"
              />
            </div>

            <div className="flex-1" />

        </div>

        {/* Barre empilée + stats compacts */}
        <div className="space-y-2">
          {loading ? (
            <>
              <div className="h-4 w-full bg-accent/40 animate-pulse rounded-md border border-border" />
              <div className="flex gap-6 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-accent/40 animate-pulse" />
                    <div className="h-4 w-20 bg-accent/30 animate-pulse rounded-md" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded border border-border bg-muted">
                {(() => {
                  const { totalSites, crit, prob, bon } = aggregated;
                  const total = totalSites || 1;
                  const segments = [
                    { key: 'crit', value: crit, className: statusColors.critical.indicator },
                    { key: 'prob', value: prob, className: statusColors.problematic.indicator },
                    { key: 'bon', value: bon, className: statusColors.good.indicator }
                  ].filter((s) => s.value > 0);
                  if (segments.length === 0) {
                    return (
                      <div className="w-full flex items-center justify-center text-[10px] text-muted-foreground">
                        Aucun site
                      </div>
                    );
                  }
                  return segments.map((s) => {
                    const pct = (s.value / total) * 100;
                    return (
                      <div
                        key={s.key}
                        className={`${s.className} h-full transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${s.value} (${Math.round(pct)}%)`}
                      />
                    );
                  });
                })()}
              </div>
              <div className="flex gap-5 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.critical.indicator}`} />
                  Critiques: {aggregated.crit}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.problematic.indicator}`} />
                  Problématiques: {aggregated.prob}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-sm ${statusColors.good.indicator}`} />
                  Bons: {aggregated.bon}
                </span>
                <span className="flex items-center gap-1">
                  Total sites: {aggregated.totalSites}
                </span>
                <span className="flex items-center gap-1">
                  Projets: {projects.length}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Liste */}
      <div role="list" className="space-y-2">
          {loading ? (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              {Array.from({ length: Math.min(5, itemsPerPage) }).map((_, i) => (
                <div
                  key={i}
                  className="relative flex items-center gap-5 px-5 py-4 rounded-lg border border-border bg-card"
                >
                  <div className="absolute left-0 top-0 h-full w-1.5 bg-accent/40 rounded-l" />
                  <div className="flex flex-col flex-1 min-w-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-5 w-48 bg-accent/50 animate-pulse rounded-md" />
                      <div className="h-5 w-12 bg-accent/40 animate-pulse rounded-md" />
                      <div className="h-5 w-16 bg-accent/30 animate-pulse rounded-md" />
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="h-3 w-40 bg-accent/40 animate-pulse rounded-md" />
                      <div className="h-3 w-40 bg-accent/40 animate-pulse rounded-md" />
                      <div className="flex items-center gap-2">
                        {[0,1,2].map(d => (
                          <div key={d} className="size-3 rounded-full bg-accent/40 animate-pulse" />
                        ))}
                      </div>
                      <div className="flex items-center gap-5 text-[10px]">
                        <div className="h-4 w-16 bg-accent/30 animate-pulse rounded-md" />
                        <div className="h-4 w-12 bg-accent/30 animate-pulse rounded-md" />
                        <div className="h-4 w-12 bg-accent/30 animate-pulse rounded-md" />
                        <div className="h-4 w-12 bg-accent/30 animate-pulse rounded-md" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-accent/40 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Slash className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Aucun projet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {search || statusFilter !== 'all' || activityFilter !== 'all'
                  ? 'Aucun résultat ne correspond à vos filtres actuels.'
                  : 'Commencez par créer votre premier projet.'}
              </p>
              {onCreateProject && !search && statusFilter === 'all' && activityFilter === 'all' && (
                <Button size="sm" className="mt-1" onClick={handleCreateProject}>
                  <Plus className="h-4 w-4 mr-1" />
                  Créer un projet
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in duration-500">
              {paginatedProjects.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  selected={selectedProject?.id === p.id && detailOpen}
                  onSelect={handleSelect}
                  onOpen={handleOpen}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

      {/* Pagination et informations */}
      {filtered.length > 0 && (
        <div className="flex items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {filtered.length === 0 ? 0 : startIndex + 1} à {Math.min(startIndex + itemsPerPage, filtered.length)} sur {filtered.length} projet{filtered.length > 1 ? 's' : ''}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Par page:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => {
                  const per = Number(v);
                  updateUrl(1, per);
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-[90px]">
                  <SelectValue placeholder={`${itemsPerPage} / page`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Pagination className="m-0 w-auto !justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href={`${pathname}?page=${safePage - 1}&perPage=${itemsPerPage}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage > 1) {
                      updateUrl(safePage - 1, itemsPerPage);
                    }
                  }}
                  className={cn(
                    "gap-1 px-2.5 sm:pl-2.5",
                    safePage === 1 ? 'opacity-50 pointer-events-none' : ''
                  )}
                  size="default"
                  aria-label="Aller à la page précédente"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:block">Précédent</span>
                </PaginationLink>
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 ||
                         page === totalPages ||
                         Math.abs(page - safePage) <= 1;
                })
                .map((page, index, array) => {
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          href={`${pathname}?page=${page}&perPage=${itemsPerPage}`}
                          onClick={(e) => {
                            e.preventDefault();
                            updateUrl(page, itemsPerPage);
                          }}
                          isActive={safePage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  );
                })}

              <PaginationItem>
                <PaginationLink
                  href={`${pathname}?page=${safePage + 1}&perPage=${itemsPerPage}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage < totalPages) {
                      updateUrl(safePage + 1, itemsPerPage);
                    }
                  }}
                  className={cn(
                    "gap-1 px-2.5 sm:pr-2.5",
                    safePage === totalPages ? 'opacity-50 pointer-events-none' : ''
                  )}
                  size="default"
                  aria-label="Aller à la page suivante"
                >
                  <span className="hidden sm:block">Suivant</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          </div>
        </div>
      )}
      {/* Dialog détail (remplace Sheet) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedProject ? `Modifier : ${selectedProject.name}` : 'Modifier le projet'}
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                
                if (!selectedProject) return;

                // Filtrer les administrateurs valides (ceux qui ont au minimum nom et email)
                const validAdmins = (selectedProject.administrators || []).filter(admin => 
                  admin.name.trim() && admin.email.trim()
                );

                // Validation email pour les administrateurs valides
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const invalidEmails = validAdmins.filter(admin => 
                  !emailRegex.test(admin.email)
                );

                if (invalidEmails.length > 0) {
                  alert('Veuillez saisir des adresses email valides pour les administrateurs');
                  return;
                }

                // Validation poste pour les administrateurs valides
                const adminsWithoutPosition = validAdmins.filter(admin => 
                  !(admin.position || '').trim()
                );

                if (adminsWithoutPosition.length > 0) {
                  alert('Veuillez renseigner le poste pour tous les administrateurs');
                  return;
                }

                // TODO: appel projectsService.update(selectedProject.id, { name: ..., owner_name: ..., administrators: validAdmins })
                console.log(`${validAdmins.length} administrateur(s) sur ${(selectedProject.administrators || []).length} seront sauvegardés`);
                setDetailOpen(false);
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne gauche - Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Informations générales</h3>

                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Nom du projet *</label>
                    <Input
                      value={selectedProject.name}
                      onChange={(e) =>
                        setSelectedProject(prev =>
                          prev ? { ...prev, name: e.target.value } : prev
                        )
                      }
                      placeholder="Nom du projet"
                      required
                    />
                  </div>
                </div>

                {/* Colonne droite - Maître d'ouvrage */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Maître d&apos;ouvrage</h3>

                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Nom *</label>
                    <Input
                      value={selectedProject.ownerName || ''}
                      onChange={(e) =>
                        setSelectedProject(prev =>
                          prev ? { ...prev, ownerName: e.target.value } : prev
                        )
                      }
                      placeholder="Nom du maître d'ouvrage"
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Email *</label>
                    <Input
                      type="email"
                      value={selectedProject.ownerEmail || ''}
                      onChange={(e) =>
                        setSelectedProject(prev =>
                          prev ? { ...prev, ownerEmail: e.target.value } : prev
                        )
                      }
                      placeholder="nom@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Téléphone</label>
                    <Input
                      type="tel"
                      value={selectedProject.ownerPhone || ''}
                      onChange={(e) =>
                        setSelectedProject(prev =>
                          prev ? { ...prev, ownerPhone: e.target.value } : prev
                        )
                      }
                      placeholder="+224 622 123 456"
                    />
                  </div>
                </div>
              </div>

              {/* Section Administrateurs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Administrateurs du projet</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les administrateurs sans nom et email seront ignorés lors de la sauvegarde
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(prev => prev ? {
                        ...prev,
                        administrators: [...(prev.administrators || []), { id: '', name: '', email: '', phone: '', position: '', role: 'project-level', organizationId: '', createdAt: '', updatedAt: '' }]
                      } : prev);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-3">
                  {(selectedProject.administrators || []).map((admin, index) => (
                    <div key={admin.id || index} className="p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Administrateur {index + 1}</span>
                        {(selectedProject.administrators || []).length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(prev => prev ? {
                                ...prev,
                                administrators: (prev.administrators || []).filter((_, i) => i !== index)
                              } : prev);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <label className="text-xs font-medium">Poste/Titre *</label>
                          <Input
                            value={admin.position || ''}
                            onChange={(e) => {
                              setSelectedProject(prev => prev ? {
                                ...prev,
                                administrators: (prev.administrators || []).map((a, i) =>
                                  i === index ? { ...a, position: e.target.value } : a
                                )
                              } : prev);
                            }}
                            placeholder="ex: Directeur de projet"
                            required
                          />
                        </div>

                        <div className="grid gap-1">
                          <label className="text-xs font-medium">Nom complet *</label>
                          <Input
                            value={admin.name}
                            onChange={(e) => {
                              setSelectedProject(prev => prev ? {
                                ...prev,
                                administrators: (prev.administrators || []).map((a, i) =>
                                  i === index ? { ...a, name: e.target.value } : a
                                )
                              } : prev);
                            }}
                            placeholder="Nom et prénom"
                            required
                          />
                        </div>

                        <div className="grid gap-1">
                          <label className="text-xs font-medium">Email *</label>
                          <Input
                            type="email"
                            value={admin.email}
                            onChange={(e) => {
                              setSelectedProject(prev => prev ? {
                                ...prev,
                                administrators: (prev.administrators || []).map((a, i) =>
                                  i === index ? { ...a, email: e.target.value } : a
                                )
                              } : prev);
                            }}
                            placeholder="nom@example.com"
                            required
                          />
                        </div>

                        <div className="grid gap-1">
                          <label className="text-xs font-medium">Téléphone</label>
                          <Input
                            type="tel"
                            value={admin.phone || ''}
                            onChange={(e) => {
                              setSelectedProject(prev => prev ? {
                                ...prev,
                                administrators: (prev.administrators || []).map((a, i) =>
                                  i === index ? { ...a, phone: e.target.value } : a
                                )
                              } : prev);
                            }}
                            placeholder="+224 622 123 456"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog création projet */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Nouveau projet
            </DialogTitle>
            <DialogDescription>
              Créer un nouveau projet de construction. Les administrateurs peuvent être ajoutés maintenant ou plus tard.
            </DialogDescription>
          </DialogHeader>
        
          {createError && (
            <div className={`p-3 mb-4 text-sm rounded-md ${statusColors.critical.bg} ${statusColors.critical.text} border ${statusColors.critical.border}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            </div>
          )}
          <form
            className="flex flex-col gap-5 mt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newProject.name.trim() || !newProject.ownerName.trim() || !newProject.ownerEmail.trim() || !newProject.organizationId) {
                setCreateError('Veuillez remplir tous les champs obligatoires (nom du projet, maître d\'ouvrage, email et organisation)');
                return;
              }

              // Filtrer les administrateurs valides (ceux qui ont au minimum nom et email)
              const validAdmins = newProject.administrators.filter(admin => 
                admin.name.trim() && admin.email.trim()
              );

              // Validation email pour les administrateurs valides
              if (validAdmins.length > 0) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const invalidEmails = validAdmins.filter(admin => 
                  !emailRegex.test(admin.email)
                );

                if (invalidEmails.length > 0) {
                  setCreateError('Veuillez saisir des adresses email valides pour les administrateurs');
                  return;
                }

                // Validation poste pour les administrateurs valides
                const adminsWithoutPosition = validAdmins.filter(admin => 
                  !admin.position.trim()
                );

                if (adminsWithoutPosition.length > 0) {
                  setCreateError('Veuillez renseigner le poste pour tous les administrateurs');
                  return;
                }
              }

              try {
                setCreating(true);
                setCreateError(null);

                // Utiliser l'API route avec les bons champs
                const projectData = {
                  name: newProject.name.trim(),
                  organization_id: newProject.organizationId || organizations[0]?.id,
                  owner_name: newProject.ownerName.trim(),
                  owner_email: newProject.ownerEmail.trim(),
                  owner_phone: newProject.ownerPhone.trim() || '',
                  administrators: validAdmins.map(admin => ({
                    name: admin.name.trim(),
                    email: admin.email.trim(),
                    phone: admin.phone.trim() || '',
                    position: admin.position.trim()
                  }))
                };

                const response = await fetch('/api/projects', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(projectData),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  setCreateError(errorData.error?.message || 'Erreur lors de la création du projet');
                  return;
                }

                const result = await response.json();
                console.log('Projet créé avec succès:', result.data);

                setCreateOpen(false);
                setNewProject({
                  name: '',
                  ownerName: '',
                  ownerEmail: '',
                  ownerPhone: '',
                  organizationId: '',
                  administrators: []
                });
                
                // Recharger la liste des projets via callback
                if (onProjectCreated) {
                  onProjectCreated();
                } else {
                  // Fallback si pas de callback
                  window.location.reload();
                }
              } catch (error) {
                console.error('Erreur création projet:', error);
                setCreateError(`Erreur lors de la création du projet : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne gauche - Informations générales */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Informations générales</h3>

                <div className="grid gap-1">
                  <label className="text-xs font-medium">Nom du projet *</label>
                  <Input
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nom du projet"
                    required
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-medium">Organisation *</label>
                  {loadingOrganizations ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Chargement des organisations...
                    </div>
                  ) : (
                    <select
                      value={newProject.organizationId}
                      onChange={(e) =>
                        setNewProject(prev => ({ ...prev, organizationId: e.target.value }))
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Sélectionner une organisation</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Colonne droite - Maître d'ouvrage */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Maître d&apos;ouvrage</h3>

                <div className="grid gap-1">
                  <label className="text-xs font-medium">Nom *</label>
                  <Input
                    value={newProject.ownerName}
                    onChange={(e) =>
                      setNewProject(prev => ({ ...prev, ownerName: e.target.value }))
                    }
                    placeholder="Nom du maître d&apos;ouvrage"
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium">Email *</label>
                  <Input
                    type="email"
                    value={newProject.ownerEmail}
                    onChange={(e) =>
                      setNewProject(prev => ({ ...prev, ownerEmail: e.target.value }))
                    }
                    placeholder="nom@example.com"
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium">Téléphone</label>
                  <Input
                    type="tel"
                    value={newProject.ownerPhone}
                    onChange={(e) =>
                      setNewProject(prev => ({ ...prev, ownerPhone: e.target.value }))
                    }
                    placeholder="+224 622 123 456"
                  />
                </div>
              </div>
            </div>

            {/* Section Administrateurs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Administrateurs du projet (optionnel)</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous pouvez ajouter les administrateurs maintenant ou plus tard. Au moins un nom et email sont requis par administrateur.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewProject(prev => ({
                      ...prev,
                      administrators: [...prev.administrators, { name: '', email: '', phone: '', position: '' }]
                    }));
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {newProject.administrators.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    Aucun administrateur ajouté pour le moment
                  </div>
                )}
                {newProject.administrators.map((admin, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Administrateur {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewProject(prev => ({
                            ...prev,
                            administrators: prev.administrators.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Poste/Titre *</label>
                        <Input
                          value={admin.position}
                          onChange={(e) => {
                            setNewProject(prev => ({
                              ...prev,
                              administrators: prev.administrators.map((a, i) =>
                                i === index ? { ...a, position: e.target.value } : a
                              )
                            }));
                          }}
                          placeholder="ex: Directeur de projet"
                          required
                        />
                      </div>

                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Nom complet *</label>
                        <Input
                          value={admin.name}
                          onChange={(e) => {
                            setNewProject(prev => ({
                              ...prev,
                              administrators: prev.administrators.map((a, i) =>
                                i === index ? { ...a, name: e.target.value } : a
                              )
                            }));
                          }}
                          placeholder="Nom et prénom"
                          required
                        />
                      </div>

                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Email *</label>
                        <Input
                          type="email"
                          value={admin.email}
                          onChange={(e) => {
                            setNewProject(prev => ({
                              ...prev,
                              administrators: prev.administrators.map((a, i) =>
                                i === index ? { ...a, email: e.target.value } : a
                              )
                            }));
                          }}
                          placeholder="nom@example.com"
                          required
                        />
                      </div>

                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Téléphone</label>
                        <Input
                          type="tel"
                          value={admin.phone}
                          onChange={(e) => {
                            setNewProject(prev => ({
                              ...prev,
                              administrators: prev.administrators.map((a, i) =>
                                i === index ? { ...a, phone: e.target.value } : a
                              )
                            }));
                          }}
                          placeholder="+224 622 123 456"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateError(null);
                  setNewProject({
                    name: '',
                    ownerName: '',
                    ownerEmail: '',
                    ownerPhone: '',
                    organizationId: '',
                    administrators: []
                  });
                }}
                disabled={creating}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" className="gap-1.5" disabled={creating}>
                {creating ? 'Création...' : 'Créer le projet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Bouton filtre pill                                                        */
/* -------------------------------------------------------------------------- */
interface FilterPillProps {
  active: boolean;
  label: string;
  onClick: () => void;
  colorClass?: string;
}
const FilterPill: React.FC<FilterPillProps> = ({ active, label, onClick, colorClass }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-3 h-7 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-foreground border-accent-foreground/20'
          : 'bg-background text-muted-foreground hover:bg-accent/40 border-border',
      ].join(' ')}
    >
      {colorClass && (
        <span className={`inline-block h-2 w-2 rounded-sm ${colorClass}`} />
      )}
      {label}
    </button>
  );
};

export default ProjectListCompact;
