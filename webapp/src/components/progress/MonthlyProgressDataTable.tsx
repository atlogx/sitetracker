"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, RotateCcw, MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonthlyProgress, Site } from '@/types/models';

interface MonthlyProgressDataTableProps {
  site: Site;
  data: MonthlyProgress[];
  onSave: (monthData: Partial<MonthlyProgress>) => Promise<void>;
  className?: string;
}

const ALL_MONTHS = [
  { key: 'janvier', label: 'Janvier', month: 1 },
  { key: 'fevrier', label: 'Février', month: 2 },
  { key: 'mars', label: 'Mars', month: 3 },
  { key: 'avril', label: 'Avril', month: 4 },
  { key: 'mai', label: 'Mai', month: 5 },
  { key: 'juin', label: 'Juin', month: 6 },
  { key: 'juillet', label: 'Juillet', month: 7 },
  { key: 'aout', label: 'Août', month: 8 },
  { key: 'septembre', label: 'Septembre', month: 9 },
  { key: 'octobre', label: 'Octobre', month: 10 },
  { key: 'novembre', label: 'Novembre', month: 11 },
  { key: 'decembre', label: 'Décembre', month: 12 }
];
function buildMonths(startMonth?: string, duration?: number) {
  const start = startMonth ? parseInt(startMonth, 10) : 1; // 1-12
  const len = duration && duration > 0 ? duration : 12;
  const result: typeof ALL_MONTHS = [];
  for (let i = 0; i < len; i++) {
    const idx = ((start - 1 + i) % 12);
    result.push(ALL_MONTHS[idx]);
  }
  return result;
}

interface SpreadsheetData {
  month: number;
  label: string;
  totalProgress: string;
  monthlyProgress: string;
  normalRate: string;
  targetRate: string;
  delayRate: number;
  status: string;
  observations: string;
}

interface PendingChange {
  month: number;
  field: string;
  value: string | number;
  originalValue: string | number | undefined;
}

// Helper function to format numbers with French decimal separator
const formatPercentage = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toString().replace('.', ',');
};

// Helper function to calculate delay rate (100 - target rate)
const calculateDelayRate = (targetRate: string): number => {
  const target = parseFloat(targetRate.replace(',', '.')) || 0;
  const delayRate = 100 - target;
  return Math.round(delayRate * 10) / 10; // Arrondi à 1 décimale
};

// Helper function to calculate normal rate (100 / project duration)
const calculateNormalRate = (projectDurationMonths?: number): string => {
  if (!projectDurationMonths || projectDurationMonths === 0) return '0';
  const result = 100 / projectDurationMonths;
  return formatPercentage(Math.round(result * 10) / 10);
};

// Helper function to calculate target rate (monthlyProgress / normalRate)
const calculateTargetRate = (monthlyProgress: string, normalRate: string): string => {
  const monthly = parseFloat(monthlyProgress.replace(',', '.')) || 0;
  const normal = parseFloat(normalRate.replace(',', '.')) || 0;
  if (normal === 0) return '0';
  const result = (monthly / normal) * 100;
  return formatPercentage(Math.round(result * 10) / 10);
};

// Helper function to parse French number format
const parseNumber = (value: string): number => {
  return parseFloat(value.replace(',', '.')) || 0;
};

// Helper function to calculate status based on target rate
const calculateStatus = (targetRate: string, hasData: boolean = true): string => {
  if (!hasData) return 'Non renseigné'; // Statut pour les mois sans données
  const value = parseNumber(targetRate);
  if (value < 30) return 'Critique';
  if (value < 50) return 'Problématique';
  return 'Bon';
};

const getChangesBackground = (hasChanges: boolean) => {
  if (!hasChanges) return '';
  return 'bg-muted/50 border-muted-foreground/20 shadow-sm';
};

// Individual cell components to prevent re-renders
const NumericCell = React.memo(({ 
  value, 
  onChange, 
  hasChanges
}: { 
  value: string; 
  onChange: (value: string) => void; 
  hasChanges: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Valeur locale pour éviter de remonter à chaque frappe (stabilise le focus)
  const [localValue, setLocalValue] = useState(value);
  const dirtyRef = useRef(false);

  // Quand la valeur extérieure change (suite à une sauvegarde ou reset) et qu'on n'est pas en édition locale
  useEffect(() => {
    if (!dirtyRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = inputValue.replace(/[^0-9,]/g, '').replace(/,+/g, ',');
    dirtyRef.current = true;
    setLocalValue(formattedValue);
  }, []);

  const commitIfDirty = useCallback(() => {
    if (dirtyRef.current && localValue !== value) {
      onChange(localValue);
    }
    dirtyRef.current = false;
  }, [localValue, value, onChange]);

  const handleBlur = useCallback(() => {
    commitIfDirty();
  }, [commitIfDirty]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitIfDirty();
      // Reste le focus (pas de blur) pour pouvoir continuer si besoin
    } else if (e.key === 'Tab') {
      // Commit puis laisser le navigateur gérer le focus
      commitIfDirty();
    }
  }, [commitIfDirty]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        // Perte de focus uniquement si clic externe
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={cellRef}
      className={cn(
        "w-full h-full p-1 relative",
        hasChanges && getChangesBackground(hasChanges)
      )}
    >
      <div className="flex items-center h-full">
        <Input
          ref={inputRef}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 border-none bg-transparent text-center text-sm p-1 focus:ring-1 focus:ring-primary"
          placeholder="0,00"
        />
        <span className="text-xs text-muted-foreground ml-1">%</span>
      </div>
      {hasChanges && (
        <div className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></div>
      )}
    </div>
  );
});
NumericCell.displayName = 'NumericCell';

const ObservationCell = React.memo(({ 
  value, 
  onChange, 
  hasChanges, 
  month 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  hasChanges: boolean;
  month: number;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalValue, setModalValue] = useState(value);

  const handleSave = useCallback(() => {
    onChange(modalValue);
    setIsModalOpen(false);
  }, [modalValue, onChange]);

  const handleCancel = useCallback(() => {
    setModalValue(value);
    setIsModalOpen(false);
  }, [value]);

  useEffect(() => {
    setModalValue(value);
  }, [value]);

  return (
    <>
      <div className={cn(
        "w-full h-full p-1 relative flex items-center justify-center",
        hasChanges && getChangesBackground(hasChanges)
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsModalOpen(true)}
          title={value || "Ajouter une observation"}
        >
          <div className="relative">
            <MessageSquare className={cn(
              "h-4 w-4",
              value ? "text-foreground" : "text-muted-foreground"
            )} />
            {value && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></div>
            )}
          </div>
        </Button>
        {hasChanges && (
          <div className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Observation - {ALL_MONTHS.find(m => m.month === month)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              placeholder="Saisissez votre observation..."
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
ObservationCell.displayName = 'ObservationCell';

export default function MonthlyProgressDataTable({
  site,
  data,
  onSave,
  className
}: MonthlyProgressDataTableProps) {
  // Initialize spreadsheet data
  const initialData = useMemo(() => {
    const dataByMonth: Record<number, MonthlyProgress> = {};
    data.forEach(item => {
      const [, monthStr] = item.month.split('-');
      const monthNum = parseInt(monthStr);
      dataByMonth[monthNum] = item;
    });

    const dynamicMonths = buildMonths(site.startMonth, site.projectDurationMonths);
    return dynamicMonths.map(monthInfo => {
      const originalData = dataByMonth[monthInfo.month];
      const monthlyProgress = formatPercentage(originalData?.monthlyProgress);
      
      const normalRateFromDb = originalData?.normalRate ? formatPercentage(originalData.normalRate) : '';
      // Si pas présent en DB, on calcule à partir de la durée (ou fallback 12,5 si besoin)
      const normalRateCalculated = calculateNormalRate(site.projectDurationMonths) || '12,5';
      const normalRate = normalRateFromDb || normalRateCalculated;
      
      const targetRate = calculateTargetRate(monthlyProgress, normalRate);
      const monthlyProgressValue = originalData?.monthlyProgress ? parseNumber(formatPercentage(originalData.monthlyProgress)) : 0;
      const totalProgressValue = originalData?.totalProgress ? parseNumber(formatPercentage(originalData.totalProgress)) : 0;
      const hasData = monthlyProgressValue > 0 || totalProgressValue > 0;
      
      return {
        month: monthInfo.month,
        label: monthInfo.label,
        totalProgress: formatPercentage(originalData?.totalProgress),
        monthlyProgress,
        normalRate,
        targetRate,
        delayRate: calculateDelayRate(targetRate),
        status: calculateStatus(targetRate, hasData),
        observations: originalData?.observations || '',
      };
    });
  }, [data, site.startMonth, site.projectDurationMonths]);

  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData[]>(initialData);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset data when initial data changes
  useEffect(() => {
    setSpreadsheetData(initialData);
    setPendingChanges([]);
  }, [initialData]);

  const hasPendingChanges = pendingChanges.length > 0;

  // Vérifier s'il y a des mois partiellement renseignés (un seul champ sur deux)
  const hasIncompleteData = pendingChanges.length > 0 && spreadsheetData.some(row => {
    // Récupérer les valeurs actuelles ou les modifications en attente
    const monthlyProgressChange = pendingChanges.find(c => c.month === row.month && c.field === 'monthlyProgress');
    const totalProgressChange = pendingChanges.find(c => c.month === row.month && c.field === 'totalProgress');
    
    const monthlyProgressValue = monthlyProgressChange ? parseNumber(monthlyProgressChange.value as string) : parseNumber(row.monthlyProgress);
    const totalProgressValue = totalProgressChange ? parseNumber(totalProgressChange.value as string) : parseNumber(row.totalProgress);
    
    // Un mois est incomplet si l'un des deux champs est renseigné mais pas l'autre
    const hasMonthly = monthlyProgressValue > 0;
    const hasTotal = totalProgressValue > 0;
    
    return (hasMonthly && !hasTotal) || (!hasMonthly && hasTotal);
  });

  // Update cell value and track changes
  const updateCellValue = useCallback((month: number, field: string, value: string) => {
    setSpreadsheetData(prev => {
      const newData = [...prev];
      const rowIndex = newData.findIndex(row => row.month === month);
      if (rowIndex === -1) return prev;

      (newData[rowIndex] as any)[field] = value;

      // Recalculate target rate, delay rate and status if monthly progress changed
      if (field === 'monthlyProgress') {
        newData[rowIndex].targetRate = calculateTargetRate(
          newData[rowIndex].monthlyProgress,
          newData[rowIndex].normalRate
        );
        newData[rowIndex].delayRate = calculateDelayRate(
          newData[rowIndex].targetRate
        );
        newData[rowIndex].status = calculateStatus(newData[rowIndex].targetRate, true);
      }

      return newData;
    });

    // Track pending change
    const originalData = data.find(item => {
      const [, monthStr] = item.month.split('-');
      return parseInt(monthStr) === month;
    });

    const originalValue = originalData ? (originalData as any)[field] : undefined;
    const formattedOriginalValue = typeof originalValue === 'number' ? 
      formatPercentage(originalValue) : originalValue;

    // Only track if value actually changed
    if (value !== formattedOriginalValue) {
      setPendingChanges(prev => {
        const filtered = prev.filter(change => 
          !(change.month === month && change.field === field)
        );
        
        return [...filtered, {
          month,
          field,
          value,
          originalValue: formattedOriginalValue
        }];
      });
    } else {
      setPendingChanges(prev => prev.filter(change => 
        !(change.month === month && change.field === field)
      ));
    }
  }, [data]);

  const handleSaveAll = async () => {
    if (!hasPendingChanges || isSaving) return;

    setIsSaving(true);
    try {
      const changesByMonth: Record<number, PendingChange[]> = {};
      pendingChanges.forEach(change => {
        if (!changesByMonth[change.month]) {
          changesByMonth[change.month] = [];
        }
        changesByMonth[change.month].push(change);
      });

      for (const [monthNum, changes] of Object.entries(changesByMonth)) {
        const currentYear = new Date().getFullYear();
        const monthString = `${currentYear}-${monthNum.toString().padStart(2, '0')}`;

        let status = 'good';
        const monthlyProgressChange = changes.find(c => c.field === 'monthlyProgress');
        const monthlyProgressValue = monthlyProgressChange ? 
          parseNumber(monthlyProgressChange.value as string) :
          parseNumber(spreadsheetData.find(row => row.month === parseInt(monthNum))?.monthlyProgress || '0');

        if (monthlyProgressValue < 30) {
          status = 'critical';
        } else if (monthlyProgressValue < 50) {
          status = 'problematic';
        }

        const updatedData: Partial<MonthlyProgress> = {
          siteId: site.id,
          month: monthString,
          status: status as any,
        };

        changes.forEach(change => {
          if (change.field === 'observations') {
            (updatedData as any)[change.field] = change.value;
          } else {
            (updatedData as any)[change.field] = parseNumber(change.value as string);
          }
        });

        await onSave(updatedData);
      }

      setPendingChanges([]);
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAll = () => {
    setSpreadsheetData(initialData);
    setPendingChanges([]);
  };

  const isPendingChange = useCallback((month: number, field: string) => {
    return pendingChanges.some(change => 
      change.month === month && change.field === field
    );
  }, [pendingChanges]);

  // Define columns outside of component to prevent recreation
  const columns = useMemo<ColumnDef<SpreadsheetData, unknown>[]>(() => [
    {
      accessorKey: 'label',
      header: 'Mois',
      size: 160,
      cell: ({ row }: any) => (
        <div className="font-medium text-sm text-center py-1">
          {row.getValue('label')}
        </div>
      ),
    },
    {
      accessorKey: 'totalProgress',
      header: 'Avancement physique',
      size: 140,
      cell: ({ row }: any) => {
        const month = row.original.month;
        const value = row.original.totalProgress;
        const field = 'totalProgress';
        const hasChanges = isPendingChange(month, field);

        return (
          <NumericCell
            value={value}
            onChange={(newValue) => updateCellValue(month, field, newValue)}
            hasChanges={hasChanges}
          />
        );
      },
    },
    {
      accessorKey: 'monthlyProgress',
      header: 'Avancement du mois',
      size: 140,
      cell: ({ row }: any) => {
        const month = row.original.month;
        const value = row.original.monthlyProgress;
        const field = 'monthlyProgress';
        const hasChanges = isPendingChange(month, field);

        return (
          <NumericCell
            value={value}
            onChange={(newValue) => updateCellValue(month, field, newValue)}
            hasChanges={hasChanges}
          />
        );
      },
    },
    {
      accessorKey: 'normalRate',
      header: 'Taux normal mensuel',
      size: 140,
      cell: ({ row }: any) => {
        const value = row.original.normalRate;

        return (
          <div className="flex items-center justify-center p-1">
            <span className="text-sm text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {formatPercentage(value)}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'targetRate',
      header: 'Taux objectif mensuel',
      size: 160,
      cell: ({ row }: any) => {
        const value = row.original.targetRate;
        const status = row.original.status;
        
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'Critique': return 'bg-red-500';
            case 'Problématique': return 'bg-orange-500';
            case 'Bon': return 'bg-green-500';
            case 'Non renseigné': return 'bg-gray-400';
            default: return 'bg-gray-500';
          }
        };

        return (
          <div className="relative flex items-center justify-center p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${status === 'Non renseigné' ? '' : 'animate-pulse'} cursor-help ${getStatusColor(status)}`}></div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{status}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm bg-muted/30 px-1.5 py-0.5 rounded">
              {formatPercentage(value)}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'delayRate',
      header: 'Taux retard mensuel',
      size: 130,
      cell: ({ row }: any) => {
        const value = row.original.delayRate;

        return (
          <div className="flex items-center justify-center p-1">
            <span className="text-sm text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {formatPercentage(value)}%
            </span>
          </div>
        );
      },
    },

    {
      accessorKey: 'observations',
      header: 'Observation',
      size: 80,
      cell: ({ row }: any) => {
        const month = row.original.month;
        const value = row.original.observations;
        const field = 'observations';
        const hasChanges = isPendingChange(month, field);

        return (
          <ObservationCell
            value={value}
            onChange={(newValue) => updateCellValue(month, field, newValue)}
            hasChanges={hasChanges}
            month={month}
          />
        );
      },
    },
  ], [updateCellValue, isPendingChange]);

  const [showLegend, setShowLegend] = useState(false);

  const legendData = React.useMemo(() => {
    const base = [
      { field: "Mois", description: "Mois affichés selon le planning défini (ordre chronologique du chantier)" },
      { field: "Avancement physique total", description: "Pourcentage global d'avancement cumulé du chantier (ex : 65%)" },
      { field: "Avancement du mois", description: "Avancement constaté uniquement pour le mois affiché" },
      { field: "Taux normal mensuel", description: "Taux linéaire théorique : 100% / durée (lecture seule). Si durée personnalisée, appliqué à chaque mois de la période." },
      { field: "Taux objectif mensuel", description: "Avancement du mois / Taux normal mensuel (en % d'atteinte) avec indicateur de statut" },
      { field: "Taux de retard mensuel", description: "100% - Taux objectif mensuel (avance si négatif)" },
      { field: "Codes couleurs des statuts", description: "🟢 Bon (≥50%) | 🟠 Problématique (30-49%) | 🔴 Critique (<30%) | ⚪ Non renseigné" },
      { field: "Observations", description: "Remarques qualitatives ou explications en cas d'écart (icône de saisie)" }
    ];
    if (site.projectDurationMonths && site.startMonth) {
      const monthsSequence = buildMonths(site.startMonth, site.projectDurationMonths)
        .map(m => m.label)
        .join(' → ');
      const startIdx = parseInt(site.startMonth, 10) - 1;
      const startLabel = ALL_MONTHS[startIdx]?.label || '';
      base.unshift({
        field: "Période couverte",
        description: `Planning personnalisé: ${site.projectDurationMonths} mois à partir de ${startLabel} (${monthsSequence})`
      });
    }
    return base;
  }, [site.projectDurationMonths, site.startMonth]);

  const table = useReactTable({
    data: spreadsheetData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `month-${row.month}`,
  });

  return (
    <div className="space-y-6">
      {/* Header with Legend Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Suivi mensuel</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend(true)}
          className="gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          Légende
        </Button>
      </div>

      {/* Action Buttons */}
      {hasPendingChanges && (
        <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-foreground">
              {pendingChanges.length} modification{pendingChanges.length > 1 ? 's' : ''} en attente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAll}
              disabled={isSaving}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Annuler tout
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleSaveAll}
                      disabled={isSaving || hasIncompleteData}
                      className={hasIncompleteData 
                        ? "bg-muted text-muted-foreground cursor-not-allowed" 
                        : "bg-primary hover:bg-primary/90"
                      }
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSaving ? 'Sauvegarde...' : 'Valider tout'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {hasIncompleteData && (
                  <TooltipContent>
                    <p>Pour valider, chaque mois modifié doit avoir ses deux avancements renseignés (physique ET mensuel)</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className={cn("rounded-lg border overflow-hidden", className)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id} className="bg-primary hover:bg-primary border-b">
                {headerGroup.headers.map((header: any) => (
                  <TableHead
                    key={header.id}
                    className="text-primary-foreground font-medium text-sm py-2 px-2 text-center border-r border-primary-foreground/20 last:border-r-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: any, index: number) => (
                <TableRow
                  key={`month-${row.original.month}`}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-accent/30 transition-colors",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell
                      key={`${row.original.month}-${cell.column.id}`}
                      className="border-r border-border/50 last:border-r-0 p-0 h-10"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-16 text-center">
                  Aucune donnée disponible.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend Modal */}
      <Dialog open={showLegend} onOpenChange={setShowLegend}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Légende des colonnes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Explication des différentes colonnes du tableau de suivi mensuel :
            </p>
            <div className="space-y-3">
              {legendData.map((item, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4">
                  <h4 className="font-medium text-sm">{item.field}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowLegend(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}