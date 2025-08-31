"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert as AlertCard, AlertDescription } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  statisticsService,
  projectsService,
  alertsService,
  type ProjectWithRelations,
  type AlertWithRelations
} from "@/lib/supabase";
import {
  convertDatabaseToProject,
  convertDatabaseToAlert,
  type Project,
  type Alert as AlertType,
  type DashboardStats
} from "@/types/models";
import { generateSlug } from "@/lib/utils";
import {

  FolderOpen,
  AlertTriangle,
  TrendingUp,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Eye,
  Building2,
  MapPin,
  Calendar
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer
} from "recharts";
function StatusBadge({ status }: { status: "active" | "demobilized" | "remobilized" }) {
  if (status === "demobilized") return <Badge variant="outline" className="text-xs border-red-500 text-red-600 bg-red-50">Démobilisé</Badge>;
  if (status === "remobilized") return <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 bg-blue-50">Remobilisé</Badge>;
  return <Badge variant="outline" className="text-xs border-green-500 text-green-600 bg-green-50">Actif</Badge>;
}
function AlertTypeBadge({ type }: { type: string }) {
  const config = {
    data_missing: { label: "Données manquantes", class: "border-orange-500 text-orange-600 bg-orange-50" },
    progress_alert: { label: "Alerte progression", class: "border-yellow-500 text-yellow-600 bg-yellow-50" },
    pre_demobilization: { label: "Pré-démobilisation", class: "border-red-500 text-red-600 bg-red-50" },
    demobilization: { label: "Démobilisation", class: "border-red-700 text-red-700 bg-red-100" }
  };
  const typeConfig = config[type as keyof typeof config] || config.progress_alert;
  return <Badge variant="outline" className={`text-xs ${typeConfig.class}`}>{typeConfig.label}</Badge>;
}
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardStats = await statisticsService.getDashboard();
      setStats(dashboardStats);
      const projectsData = await projectsService.getAll();
      const projects = projectsData.map((p: ProjectWithRelations) => convertDatabaseToProject(p));
      setRecentProjects(projects.slice(0, 5));
      const alertsData = await alertsService.getUnresolved();
      const alerts = alertsData.map((a: AlertWithRelations) => convertDatabaseToAlert(a));
      setRecentAlerts(alerts.slice(0, 4));
    } catch {
      setError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };
  const remobilized = useMemo(() => {
    if (!stats) return 0;
    const r = stats.totalProjects - stats.activeProjects - stats.demobilizedProjects;
    return r > 0 ? r : 0;
  }, [stats]);
  const statusPieData = useMemo(() => {
    if (!stats) return [];
    return [
      { key: "active", name: "Actifs", value: stats.activeProjects, fill: "var(--color-chart-1)" },
      { key: "demobilized", name: "Démobilisés", value: stats.demobilizedProjects, fill: "var(--color-chart-2)" },
      { key: "remobilized", name: "Remobilisés", value: remobilized, fill: "var(--color-chart-3)" }
    ].filter(d => d.value > 0);
  }, [stats, remobilized]);
  const radialData = useMemo(() => {
    if (!stats) return [];
    return [{ name: "Avancement", progress: stats.averageProgress, fill: "var(--color-chart-4)" }];
  }, [stats]);
  const barData = useMemo(() => {
    return recentProjects.map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
      progress: p.averageProgress ?? 0
    }));
  }, [recentProjects]);
  const chartConfig = {
    active: { label: "Actifs", color: "var(--color-chart-1)" },
    demobilized: { label: "Démobilisés", color: "var(--color-chart-2)" },
    remobilized: { label: "Remobilisés", color: "var(--color-chart-3)" },
    progress: { label: "Progression", color: "var(--color-chart-4)" }
  };
  if (loading) {
    return (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-3" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-0">
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex items-center justify-center">
                  <Skeleton className="h-56 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-44" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div key={j} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>
    );
  }
  if (error) {
    return (
        <div className="max-w-xl space-y-6">
          <AlertCard className="border-destructive/40 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </AlertCard>
          <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
    );
  }
  return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
              <p className="text-muted-foreground mt-1 text-sm">Vue synthétique de vos projets</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/site-tracker/projects">
                <Button variant="outline" className="flex gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projets
                </Button>
              </Link>
              <Button className="flex gap-2">
                <Plus className="h-4 w-4" />
                Nouveau Projet
              </Button>
            </div>
        </div>
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Total Projets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-semibold">{stats.totalProjects}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                    {stats.activeProjects} actifs
                  </Badge>
                  {stats.demobilizedProjects > 0 && (
                    <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50">
                      {stats.demobilizedProjects} démobilisés
                    </Badge>
                  )}
                  {remobilized > 0 && (
                    <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
                      {remobilized} remobilisés
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Avancement Moyen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">{stats.averageProgress}%</span>
                </div>
                <Progress value={stats.averageProgress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Basé sur les derniers relevés des sites actifs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertes en attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-semibold">{stats.pendingAlerts}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.pendingAlerts > 0 ? "Action requise" : "Aucune alerte critique"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Synthèse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Actifs</span><span className="font-medium">{stats.activeProjects}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Démobilisés</span><span className="font-medium">{stats.demobilizedProjects}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Remobilisés</span><span className="font-medium">{remobilized}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avancement</span><span className="font-medium">{stats.averageProgress}%</span></div>
              </CardContent>
            </Card>
          </div>
        )}
        {stats && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Répartition des statuts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <ChartContainer config={chartConfig} className="h-64 aspect-auto overflow-hidden">
                  <PieChart>
                    <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={92} paddingAngle={4}>
                      {statusPieData.map(d => (
                        <Cell key={d.key} fill={d.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Avancement Global
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <ChartContainer config={chartConfig} className="h-64 aspect-auto overflow-hidden">
                  <ResponsiveContainer>
                    <RadialBarChart data={radialData} innerRadius="60%" outerRadius="100%" startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="progress" cornerRadius={6} background />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-semibold">
                        {stats.averageProgress}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Progression Projets Récents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <ChartContainer config={chartConfig} className="h-64 aspect-auto overflow-hidden">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 100]} />
                    <Bar dataKey="progress" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Alertes récentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAlerts.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-green-100 mb-4">
                    <AlertTriangle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium">Aucune alerte</p>
                  <p className="text-xs text-muted-foreground mt-1">Tous les projets sont stables</p>
                </div>
              )}
              {recentAlerts.map(a => (
                <div key={a.id} className="p-4 rounded-lg border border-border flex flex-col gap-2 bg-background">
                  <div className="flex items-center gap-2">
                    <AlertTypeBadge type={a.type} />
                    <span className="text-xs text-muted-foreground">
                      <ClientOnly fallback={a.createdAt}>
                        {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                      </ClientOnly>
                    </span>
                  </div>
                  <p className="text-sm">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.projectName || "Projet"} {a.siteName ? "• " + a.siteName : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                Projets récents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-muted mb-4">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Aucun projet</p>
                  <p className="text-xs text-muted-foreground mt-1">Créez votre premier projet</p>
                  <Button size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Projet
                  </Button>
                </div>
              )}
              {recentProjects.map(p => (
                <div key={p.id} className="flex gap-4 items-start p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-sm">{p.name}</h3>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex flex-wrap gap-5 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{p.totalSites} sites</span>
                      </div>
                      {p.averageProgress !== undefined && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>{p.averageProgress}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <ClientOnly fallback={p.createdAt.slice(0,10)}>
                          {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                        </ClientOnly>
                      </div>
                      {p.organizationName && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{p.organizationName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link href={`/site-tracker/projects/${generateSlug(p.name)}`}>
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Voir
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}