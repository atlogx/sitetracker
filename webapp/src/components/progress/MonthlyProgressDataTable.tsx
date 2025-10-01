'use client';

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

// Helper function to format numbers with French decimal separator - LIMITED TO 2 DECIMALS
const formatPercentage = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(numValue)) return '';
  
  // Arrondir à 2 décimales pour éviter les problèmes de précision (ex: 3.9699999999999998 -> 3.97)
  const rounded = Math.round(numValue * 100) / 100;
  
  // Convertir en string avec max 2 décimales et enlever les zéros inutiles
  // 3.97 -> "3.97", 12.50 -> "12.5", 100.00 -> "100"
  const formatted = rounded.toFixed(2).replace(/\.?0+$/, '');
  
  // Remplacer le point par la virgule (format français)
  return formatted.replace('.', ',');
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

// Helper function to calculate target rate based on monthly progress derived from total
const calculateTargetRate = (totalProgress: string, previousTotal: number, normalRate: string): string => {
  const current = parseFloat(totalProgress.replace(',', '.')) || 0;
  
  // Si l'avancement physique est 0 ou vide, le taux objectif est 0
  if (current === 0) return '0';
  
  const monthlyProgress = current - previousTotal;
  const normal = parseFloat(normalRate.replace(',', '.')) || 0;
  if (normal === 0) return '0';
  const result = (monthlyProgress / normal) * 100;
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
  hasChanges,
  cellId,
  onFocusCell,
  hasError,
  errorMessage
}: { 
  value: string; 
  onChange: (value: string) => void; 
  hasChanges: boolean;
  cellId?: string;
  onFocusCell?: () => void;
  hasError?: boolean;
  errorMessage?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Valeur locale pour éviter de remonter à chaque frappe (stabilise le focus)
  const [localValue, setLocalValue] = useState(value);
  const dirtyRef = useRef(false);
  
  // Reset local value when parent value changes (for cancel functionality)
  const previousValue = useRef(value);

  // Quand la valeur extérieure change (suite à une sauvegarde ou reset) et qu'on n'est pas en édition locale
  useEffect(() => {
    if (!dirtyRef.current || previousValue.current !== value) {
      setLocalValue(value);
      dirtyRef.current = false;
      previousValue.current = value;
    }
  }, [value]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = inputValue.replace(/[^0-9,]/g, '').replace(/,+/g, ',');
    dirtyRef.current = true;
    setLocalValue(formattedValue);
    
    // Nettoyer le timer précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Déclencher onChange avec délai si valeur > 0
    const numericValue = parseFloat(formattedValue.replace(',', '.')) || 0;
    if (numericValue > 0) {
      debounceTimerRef.current = setTimeout(() => {
        onChange(formattedValue);
      }, 1000); // 1000ms de délai pour laisser finir la saisie
    }
  }, [onChange]);

  const commitIfDirty = useCallback(() => {
    // Nettoyer le timer si on commit manuellement
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (dirtyRef.current && localValue !== value) {
      onChange(localValue);
    }
    dirtyRef.current = false;
  }, [localValue, value, onChange]);



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
    return () => {
      // Nettoyer le timer au démontage
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cellRef}
      className={cn(
        "w-full h-full p-1 relative",
        hasChanges && getChangesBackground(hasChanges),
        hasError && "bg-red-50 border border-red-200 rounded"
      )}
      title={hasError ? errorMessage : undefined}
    >
      <div className="flex items-center h-full">
        <Input
          ref={inputRef}
          data-cell={cellId}
          value={localValue}
          onChange={handleChange}
          onFocus={() => {
            onFocusCell?.();
          }}
          onBlur={() => {
            commitIfDirty();
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 border-none bg-transparent text-center text-sm p-1 focus:ring-1",
            hasError ? "focus:ring-red-500 text-red-700" : "focus:ring-primary"
          )}
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
    return dynamicMonths.map((monthInfo, index) => {
      const originalData = dataByMonth[monthInfo.month];
      const totalProgress = formatPercentage(originalData?.totalProgress);
      
      // Calculate previous total for monthly calculation
      const previousMonthData = index > 0 ? dataByMonth[dynamicMonths[index - 1].month] : null;
      const previousTotal = previousMonthData?.totalProgress || 0;
      
      const normalRateFromDb = originalData?.normalRate ? formatPercentage(originalData.normalRate) : '';
      const normalRateCalculated = calculateNormalRate(site.projectDurationMonths) || '12,5';
      const normalRate = normalRateFromDb || normalRateCalculated;
      
      const targetRate = calculateTargetRate(totalProgress, previousTotal, normalRate);
      const totalProgressValue = originalData?.totalProgress ? parseNumber(formatPercentage(originalData.totalProgress)) : 0;
      const monthlyProgressValue = index === 0 ? totalProgressValue : totalProgressValue - previousTotal;
      const hasData = totalProgressValue > 0;
      
      // Si l'avancement physique est 0, l'avancement du mois est aussi 0
      let displayMonthlyProgress = '';
      if (index === 0) {
        displayMonthlyProgress = totalProgressValue === 0 ? '0' : '';
      } else {
        displayMonthlyProgress = totalProgressValue === 0 ? '0' : formatPercentage(monthlyProgressValue);
      }
      
      return {
        month: monthInfo.month,
        label: monthInfo.label,
        totalProgress,
        monthlyProgress: displayMonthlyProgress,
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
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  // Focus preservation
  const focusedCellRef = useRef<string | null>(null);
  const cellInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Re-focus automatically after any re-render if a cell was focused
  useEffect(() => {
    if (focusedCellRef.current) {
      const el = cellInputRefs.current[focusedCellRef.current];
      if (el && document.activeElement !== el) {
        el.focus();
        // Place caret at end
        try {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } catch {}
      }
    }
  });

  // Reset data when initial data changes
  useEffect(() => {
    setSpreadsheetData(initialData);
    setPendingChanges([]);
  }, [initialData]);

  const hasPendingChanges = pendingChanges.length > 0;

  // Re-focus after data/state updates if a month was focused
  useEffect(() => {
    if (focusedMonth !== null) {
      const el = document.querySelector<HTMLInputElement>(`input[data-cell="total-${focusedMonth}"]`);
      if (el && document.activeElement !== el) {
        el.focus();
        try {
          const len = el.value.length;
            el.setSelectionRange(len, len);
        } catch {}
      }
    }
  }, [spreadsheetData, focusedMonth]);

  // Vérifier s'il y a des valeurs > 0 dans les changements
  const hasValidChanges = pendingChanges.some(change => {
    if (change.field === 'totalProgress') {
      const value = parseFloat((change.value as string).replace(',', '.')) || 0;
      return value > 0;
    }
    return true; // Pour les autres champs (observations), considérer comme valide
  });

  // Vérifier s'il y a des erreurs de validation
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Vérifier s'il y a des mois partiellement renseignés (un seul champ sur deux)
  const hasIncompleteData = false; // Plus de validation croisée nécessaire

  // Update cell value and track changes
  const updateCellValue = useCallback((month: number, field: string, value: string) => {
    const errorKey = `${month}-${field}`;
    
    setSpreadsheetData(prev => {
      // Validation pour totalProgress : ne peut pas être inférieur au mois précédent
      if (field === 'totalProgress') {
        const numericValue = parseFloat(value.replace(',', '.')) || 0;
        const currentIndex = prev.findIndex(row => row.month === month);
        
        // Vérifier avec le mois précédent uniquement (pas la somme)
        if (currentIndex > 0) {
          const previousMonthProgress = parseNumber(prev[currentIndex - 1].totalProgress) || 0;
          
          if (numericValue < previousMonthProgress) {
            setValidationErrors(prevErrors => ({
              ...prevErrors,
              [errorKey]: `L'avancement physique doit être au moins égal au mois précédent (${formatPercentage(previousMonthProgress)})`
            }));
            // Continue avec la mise à jour pour garder la valeur saisie
          } else {
            // Supprimer l'erreur si elle existe
            setValidationErrors(prevErrors => {
              const newErrors = { ...prevErrors };
              delete newErrors[errorKey];
              return newErrors;
            });
          }
        } else {
          // Premier mois : pas de validation avec un mois précédent
          setValidationErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[errorKey];
            return newErrors;
          });
        }
      }
      const newData = [...prev];
      const rowIndex = newData.findIndex(row => row.month === month);
      if (rowIndex === -1) return prev;

      (newData[rowIndex] as any)[field] = value;

      // Recalculate target rate, delay rate and status if total progress changed
      if (field === 'totalProgress') {
        const currentIndex = prev.findIndex(row => row.month === month);
        const previousTotal = currentIndex > 0 ? parseNumber(prev[currentIndex - 1].totalProgress) : 0;
        const currentTotal = parseNumber(newData[rowIndex].totalProgress) || 0;
        
        // Calculer l'avancement du mois automatiquement
        const monthlyProgress = currentIndex === 0 ? currentTotal : Math.max(0, currentTotal - previousTotal);
        newData[rowIndex].monthlyProgress = currentTotal === 0 ? '0' : formatPercentage(monthlyProgress);
        
        newData[rowIndex].targetRate = calculateTargetRate(
          newData[rowIndex].totalProgress,
          previousTotal,
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
        const totalProgressChange = changes.find(c => c.field === 'totalProgress');
        const currentRow = spreadsheetData.find(row => row.month === parseInt(monthNum));
        const totalProgressValue = totalProgressChange ? 
          parseNumber(totalProgressChange.value as string) :
          parseNumber(currentRow?.totalProgress || '0');
        
        // Calculate monthly progress for status determination
        const currentIndex = spreadsheetData.findIndex(row => row.month === parseInt(monthNum));
        const previousTotal = currentIndex > 0 ? parseNumber(spreadsheetData[currentIndex - 1].totalProgress) : 0;
        const monthlyProgressValue = totalProgressValue - previousTotal;

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
    if (pendingChanges.length === 0) return;
    
    const modifiedMonths = new Set(pendingChanges.map(c => c.month));

    setSpreadsheetData(prev => prev.map(row => {
      if (!modifiedMonths.has(row.month)) {
        return row; // untouched row
      }
      const initialRow = initialData.find(r => r.month === row.month);
      const hasTotalProgressChange = pendingChanges.some(c => c.month === row.month && c.field === 'totalProgress');
      const hasObservationsChange = pendingChanges.some(c => c.month === row.month && c.field === 'observations');
      
      let updated = { ...row };
      
      if (hasTotalProgressChange) {
        // Seule la cellule Avancement physique est vidée (valeur effacée) et les dérivés remis à 0
        updated.totalProgress = '';
        updated.monthlyProgress = '0';
        updated.targetRate = '0';
        updated.delayRate = 0;
        updated.status = 'Non renseigné';
      }
      
      if (hasObservationsChange && initialRow) {
        // Restaure uniquement l'observation initiale
        updated.observations = initialRow.observations;
      }
      
      return updated;
    }));

    // Nettoyer les changements et erreurs associés uniquement aux cellules modifiées
    setPendingChanges([]);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      pendingChanges.forEach(c => {
        delete newErrors[`${c.month}-${c.field}`];
        if (c.field === 'totalProgress') {
          delete newErrors[`${c.month}-monthlyProgress`];
        }
      });
      return newErrors;
    });
    setFocusedMonth(null);
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

        const errorKey = `${month}-${field}`;
        const hasError = !!validationErrors[errorKey];
        const errorMessage = validationErrors[errorKey];

        return (
          <NumericCell
            key={`total-${month}-${resetKey}`}
            value={value}
            onChange={(newValue) => updateCellValue(month, field, newValue)}
            hasChanges={hasChanges}
            cellId={`total-${month}`}
            onFocusCell={() => setFocusedMonth(month)}
            hasError={hasError}
            errorMessage={errorMessage}
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
        const hasPhysicalChanges = isPendingChange(month, 'totalProgress');
        
        return (
          <div className="relative flex items-center justify-center p-1">
            {value === '' ? (
              <span className="text-sm text-muted-foreground">-</span>
            ) : (
              <span className="text-sm bg-muted/30 px-1.5 py-0.5 rounded">
                {value}%
              </span>
            )}
            {hasPhysicalChanges && (
              <div className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            )}
          </div>
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
            <span className="text-sm bg-muted/30 px-1.5 py-0.5 rounded">
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
            <span className="text-sm bg-muted/30 px-1.5 py-0.5 rounded">
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
  ], [updateCellValue, isPendingChange, validationErrors]);

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
      <div className={hasPendingChanges ? 'block' : 'block'} style={{ opacity: hasPendingChanges ? 1 : 0.7 }}>
      {(
      <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {pendingChanges.length > 0 
                ? `${pendingChanges.length} modification${pendingChanges.length > 1 ? 's' : ''} en attente`
                : 'Aucune modification en attente'
              }
            </span>
            {hasValidationErrors && (
              <div className="mt-1 text-xs text-red-600 font-medium">
                {Object.entries(validationErrors).map(([key, error]) => {
                  const [month] = key.split('-');
                  const monthLabel = spreadsheetData.find(row => row.month === parseInt(month))?.label || `Mois ${month}`;
                  return (
                    <div key={key}>
                      {monthLabel}: {error}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                      disabled={isSaving || hasIncompleteData || (!hasPendingChanges || !hasValidChanges) || hasValidationErrors}
                      className={hasIncompleteData || (!hasPendingChanges || !hasValidChanges) || hasValidationErrors
                        ? "bg-muted text-muted-foreground cursor-not-allowed" 
                        : "bg-primary hover:bg-primary/90"
                      }
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSaving ? 'Sauvegarde...' : 'Valider tout'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(hasIncompleteData || (!hasPendingChanges || !hasValidChanges) || hasValidationErrors) && (
                  <TooltipContent>
                    <p>{hasIncompleteData 
                      ? "Pour valider, chaque mois modifié doit avoir ses deux avancements renseignés (physique ET mensuel)"
                      : hasValidationErrors
                        ? "Corrigez les erreurs de validation avant de sauvegarder"
                        : !hasPendingChanges 
                          ? "Aucune modification à valider"
                          : "Les valeurs doivent être supérieures à 0"
                    }</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        )}
      </div>

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