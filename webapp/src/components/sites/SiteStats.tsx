"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface SiteStatsProps {
  stats: {
    total: number;
    critical: number;
    problematic: number;
    good: number;
    notEvaluated: number;
  };
  isLoading?: boolean;
}

export function SiteStats({ stats, isLoading = false }: SiteStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-1 pt-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: 'Total Sites',
      value: stats.total,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Nombre total de sites'
    },
    {
      title: 'Critiques',
      value: stats.critical,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      description: 'Sites en situation critique',
      badge: stats.critical > 0 ? { text: 'Urgent', variant: 'destructive' as const } : null
    },
    {
      title: 'Problématiques',
      value: stats.problematic,
      icon: AlertTriangle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      description: 'Sites avec des difficultés',
      badge: stats.problematic > 0 ? { text: 'Attention', variant: 'secondary' as const } : null
    },
    {
      title: 'En Bonne Voie',
      value: stats.good,
      icon: CheckCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Sites performants',
      badge: stats.good > 0 ? { text: 'OK', variant: 'default' as const } : null
    },
    {
      title: 'Non Évalués',
      value: stats.notEvaluated,
      icon: HelpCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      description: 'Sites sans données récentes',
      badge: stats.notEvaluated > 0 ? { text: 'À saisir', variant: 'outline' as const } : null
    }
  ];

  // Calculer les pourcentages pour les tendances
  const getTrendIcon = (value: number, total: number) => {
    if (total === 0) return null;
    const percentage = (value / total) * 100;
    
    if (percentage > 50) return TrendingDown;
    if (percentage > 25) return Activity;
    return TrendingUp;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {statItems.map((item, index) => {
          const Icon = item.icon;
          const TrendIcon = index > 0 ? getTrendIcon(item.value, stats.total) : null;
          
          return (
            <Card key={item.title} className="relative overflow-hidden">
              <CardHeader className="pb-1 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-1 pb-3">
                <div className="flex items-baseline justify-between">
                  <div className={`text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </div>
                  {TrendIcon && (
                    <TrendIcon className={`h-4 w-4 ${item.color} opacity-60`} />
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
                
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-xs">
                    {item.badge.text}
                  </Badge>
                )}
                
                {stats.total > 0 && index > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {((item.value / stats.total) * 100).toFixed(1)}% du total
                  </div>
                )}
              </CardContent>
              
              {/* Barre de progression visuelle */}
              {stats.total > 0 && index > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      index === 1 ? 'bg-destructive' :
                      index === 2 ? 'bg-muted-foreground' :
                      index === 3 ? 'bg-primary' :
                      'bg-muted-foreground'
                    }`}
                    style={{ width: `${(item.value / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Résumé global */}
      {stats.total > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Résumé de l&apos;État des Sites</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.critical > 0 && `${stats.critical} site(s) nécessitent une attention immédiate. `}
                  {stats.problematic > 0 && `${stats.problematic} site(s) présentent des difficultés. `}
                  {stats.notEvaluated > 0 && `${stats.notEvaluated} site(s) attendent une saisie de données.`}
                  {stats.critical === 0 && stats.problematic === 0 && stats.notEvaluated === 0 && 
                    "Tous les sites sont en bonne voie ! 🎉"}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Sites Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}