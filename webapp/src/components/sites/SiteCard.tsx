"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, MapPin, Building, Calendar, Users, TrendingUp, TrendingDown, Minus, Trash2, MoreVertical, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { translateStatus } from '@/lib/utils';

interface Site {
  id: string;
  name: string;
  code?: string;
  address: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  project?: {
    name: string;
    code?: string;
  };
  company_sites?: Array<{
    company: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      address?: string;
    };
  }>;
  monthly_progress?: Array<{
    month: number;
    year: number;
    physical_progress_total: number;
    status: 'bon' | 'problematique' | 'critique' | 'good' | 'problematic' | 'critical';
  }>;
}

interface SiteCardProps {
  site: Site;
  projectName: string;
  onEdit: (site: Site) => void;
  onDelete?: (site: Site) => void;
}

export function SiteCard({ site, projectName, onEdit, onDelete }: SiteCardProps) {
  // Obtenir le statut d'un site
  const getSiteStatus = () => {
    if (!site.monthly_progress || site.monthly_progress.length === 0) {
      return { status: 'Non évalué', variant: 'secondary' as const };
    }
    
    const latestProgress = site.monthly_progress.reduce((latest, current) => {
      const currentDate = new Date(current.year, current.month - 1);
      const latestDate = new Date(latest.year, latest.month - 1);
      return currentDate > latestDate ? current : latest;
    });

    // Si aucune valeur n'est fournie dans le mois, le statut ne peut être évalué
    if (latestProgress.physical_progress_total === null || 
        latestProgress.physical_progress_total === undefined ||
        latestProgress.physical_progress_total < 0) {
      return { status: 'Non évalué', variant: 'secondary' as const };
    }

    const variants = {
      'bon': 'default' as const,
      'good': 'default' as const,
      'problematique': 'secondary' as const,
      'problematic': 'secondary' as const,
      'critique': 'destructive' as const,
      'critical': 'destructive' as const
    };

    const statusKey = latestProgress.status as keyof typeof variants;
    const translatedStatus = translateStatus(latestProgress.status);
    
    return {
      status: translatedStatus,
      variant: variants[statusKey] || 'secondary' as const,
      progress: latestProgress.physical_progress_total
    };
  };

  // Obtenir la tendance (si on a plusieurs mois de données)
  const getTrend = () => {
    if (!site.monthly_progress || site.monthly_progress.length < 2) {
      return null;
    }

    const sortedProgress = [...site.monthly_progress].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateB.getTime() - dateA.getTime();
    });

    const latest = sortedProgress[0];
    const previous = sortedProgress[1];

    if (!latest || !previous || 
        latest.physical_progress_total === null || 
        previous.physical_progress_total === null) {
      return null;
    }

    const diff = latest.physical_progress_total - previous.physical_progress_total;
    
    if (diff > 0) return { type: 'up', icon: TrendingUp, color: 'text-green-600' };
    if (diff < 0) return { type: 'down', icon: TrendingDown, color: 'text-red-600' };
    return { type: 'stable', icon: Minus, color: 'text-gray-600' };
  };

  const siteStatus = getSiteStatus();
  const trend = getTrend();
  const companyCount = site.company_sites?.length || 0;
  const mainCompany = site.company_sites?.[0]?.company;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-1 pt-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              {site.name}
            </CardTitle>
            {site.code && (
              <p className="text-sm text-muted-foreground">Code: {site.code}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Badge variant={siteStatus.variant}>
                {siteStatus.status}
              </Badge>
              {trend && (
                <trend.icon className={`h-4 w-4 ${trend.color}`} />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(site)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(site)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1 pb-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{site.address}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {projectName}
          </p>
        </div>
        
        {mainCompany && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {mainCompany.name}
              </p>
            </div>
            <div className="pl-6 space-y-1">
              {mainCompany.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{mainCompany.email}</p>
                </div>
              )}
              {mainCompany.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{mainCompany.phone}</p>
                </div>
              )}
              {mainCompany.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{mainCompany.address}</p>
                </div>
              )}
            </div>
            {companyCount > 1 && (
              <p className="text-xs text-muted-foreground pl-6">
                +{companyCount - 1} autre{companyCount > 2 ? 's' : ''} entreprise{companyCount > 2 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {!mainCompany && companyCount > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {companyCount} entreprise{companyCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {siteStatus.progress !== undefined && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Avancement: {siteStatus.progress.toFixed(1)}%
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Créé le {new Date(site.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}