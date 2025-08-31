"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DatabaseHealth {
  status: 'healthy' | 'unhealthy' | 'checking';
  error?: string;
  stats?: {
    organizations: number;
    projects: number;
    sites: number;
    monthlyProgress: number;
    alerts: number;
  };
  responseTime?: number;
}

export function DatabaseHealthCheck() {
  const [health, setHealth] = useState<DatabaseHealth>({ status: 'checking' });
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkDatabaseHealth = async () => {
    setHealth({ status: 'checking' });
    const startTime = Date.now();

    try {
      // Test de base : connexion à Supabase
      const { error: authError } = await supabase.auth.getSession();

      if (authError) {
        throw new Error(`Erreur d'authentification: ${authError.message}`);
      }

      // Test des tables principales avec comptage
      const [
        { count: organizationsCount, error: orgError },
        { count: projectsCount, error: projError },
        { count: sitesCount, error: sitesError },
        { count: progressCount, error: progressError },
        { count: alertsCount, error: alertsError }
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('sites').select('*', { count: 'exact', head: true }),
        supabase.from('monthly_progress').select('*', { count: 'exact', head: true }),
        supabase.from('alerts').select('*', { count: 'exact', head: true })
      ]);

      // Vérifier s'il y a des erreurs
      const errors = [
        orgError && `Organizations: ${orgError.message}`,
        projError && `Projects: ${projError.message}`,
        sitesError && `Sites: ${sitesError.message}`,
        progressError && `Progress: ${progressError.message}`,
        alertsError && `Alerts: ${alertsError.message}`
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(`Erreurs de tables: ${errors.join(', ')}`);
      }

      const responseTime = Date.now() - startTime;

      setHealth({
        status: 'healthy',
        stats: {
          organizations: organizationsCount || 0,
          projects: projectsCount || 0,
          sites: sitesCount || 0,
          monthlyProgress: progressCount || 0,
          alerts: alertsCount || 0
        },
        responseTime
      });

      setLastCheck(new Date());

    } catch (error) {
      const responseTime = Date.now() - startTime;
      setHealth({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        responseTime
      });
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkDatabaseHealth();
  }, []);

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (health.status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Unhealthy</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Checking...</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Health Check
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status et timing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Statut de connexion</p>
            <p className="font-medium">
              {health.status === 'healthy' && '✅ Connecté à Supabase'}
              {health.status === 'unhealthy' && '❌ Erreur de connexion'}
              {health.status === 'checking' && '🔄 Vérification en cours...'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Temps de réponse</p>
            <p className="font-medium">
              {health.responseTime ? `${health.responseTime}ms` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Dernière vérification */}
        {lastCheck && (
          <div>
            <p className="text-sm text-muted-foreground">Dernière vérification</p>
            <p className="font-medium">{lastCheck.toLocaleString('fr-FR')}</p>
          </div>
        )}

        {/* Statistiques des tables */}
        {health.status === 'healthy' && health.stats && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Statistiques des données</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{health.stats.organizations}</p>
                <p className="text-xs text-muted-foreground">Organisations</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{health.stats.projects}</p>
                <p className="text-xs text-muted-foreground">Projets</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{health.stats.sites}</p>
                <p className="text-xs text-muted-foreground">Sites</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{health.stats.monthlyProgress}</p>
                <p className="text-xs text-muted-foreground">Progressions</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{health.stats.alerts}</p>
                <p className="text-xs text-muted-foreground">Alertes</p>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {health.status === 'unhealthy' && health.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Erreur de connexion</p>
                <p className="text-sm text-red-700 mt-1">{health.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton de rafraîchissement */}
        <div className="flex justify-center">
          <Button
            onClick={checkDatabaseHealth}
            disabled={health.status === 'checking'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${health.status === 'checking' ? 'animate-spin' : ''}`} />
            Vérifier la connexion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
