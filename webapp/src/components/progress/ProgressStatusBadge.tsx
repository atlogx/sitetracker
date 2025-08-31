import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProgressStatusBadge
 * 
 * UI badge component displaying a standardized color + label for a progress status.
 * 
 * Domain statuses (English, internal):
 *  - CRITICAL
 *  - PROBLEMATIC
 *  - GOOD
 * 
 * French UI labels:
 *  - Critique
 *  - Problématique
 *  - Bon
 * 
 * Color Guidelines (Tailwind):
 *  - CRITICAL      -> red
 *  - PROBLEMATIC   -> amber
 *  - GOOD          -> emerald
 * 
 * Props:
 *  - status: domain status
 *  - compact: if true, reduces horizontal padding
 *  - className: extend / override base styles
 *  - withIcon: display contextual icon (default true)
 */
export type ProgressStatus = 'critical' | 'problematic' | 'good';

export interface ProgressStatusBadgeProps {
  status: ProgressStatus;
  compact?: boolean;
  className?: string;
  withIcon?: boolean;
  titleAttr?: string; // optional custom title attribute
}

const STATUS_CONFIG: Record<
  ProgressStatus,
  {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    classes: string;
    ring: string;
  }
> = {
  critical: {
    label: 'Critique',
    icon: AlertCircle,
    classes: 'bg-red-50 text-red-700',
    ring: 'ring-red-200'
  },
  problematic: {
    label: 'Problématique',
    icon: AlertTriangle,
    classes: 'bg-amber-50 text-amber-700',
    ring: 'ring-amber-200'
  },
  good: {
    label: 'Bon',
    icon: CheckCircle,
    classes: 'bg-emerald-50 text-emerald-700',
    ring: 'ring-emerald-200'
  }
};

export const ProgressStatusBadge: React.FC<ProgressStatusBadgeProps> = ({
  status,
  compact,
  className,
  withIcon = true,
  titleAttr
}) => {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-xs font-medium ring-1',
        compact ? 'px-2 py-0.5' : 'px-2.5 py-0.5',
        cfg.classes,
        cfg.ring,
        className
      )}
      aria-label={`Statut: ${cfg.label}`}
      title={titleAttr || cfg.label}
      data-status={status.toLowerCase()}
    >
      {withIcon && (
        <Icon
          className={cn(
            'mr-1 h-3.5 w-3.5',
            status === 'good' && 'stroke-[2.25]'
          )}
          aria-hidden="true"
        />
      )}
      {cfg.label}
    </span>
  );
};

ProgressStatusBadge.displayName = 'ProgressStatusBadge';

/**
 * Utility to map database lowercase statuses (good | problematic | critical)
 * to domain uppercase variant expected by the component.
 */
export function normalizeDbStatus(
  dbStatus: 'good' | 'problematic' | 'critical'
): ProgressStatus {
  switch (dbStatus) {
    case 'critical':
      return 'critical';
    case 'problematic':
      return 'problematic';
    case 'good':
      return 'good';
  }
}

/**
 * Optional helper to quickly evaluate a raw monthly progress percentage
 * into one of the component's statuses.
 */
export function evaluateProgressStatus(value: number | null | undefined): ProgressStatus {
  if (value == null || isNaN(value)) return 'critical';
  if (value < 30) return 'critical';
  if (value < 50) return 'problematic';
  return 'good';
}

export default ProgressStatusBadge;