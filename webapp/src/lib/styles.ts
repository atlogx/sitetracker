import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Status colors using semantic Tailwind theme
export const statusColors = {
  good: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    badge: "bg-secondary text-secondary-foreground border-border",
    icon: "text-primary"
  },
  problematic: {
    bg: "bg-accent",
    text: "text-accent-foreground",
    border: "border-border",
    badge: "bg-accent text-accent-foreground border-border",
    icon: "text-accent-foreground"
  },
  critical: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive",
    icon: "text-destructive"
  }
};

// Priority colors
export const priorityColors = {
  low: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    badge: "bg-muted text-muted-foreground border-border"
  },
  medium: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    badge: "bg-secondary text-secondary-foreground border-border"
  },
  high: {
    bg: "bg-accent",
    text: "text-accent-foreground",
    border: "border-border",
    badge: "bg-accent text-accent-foreground border-border"
  },
  critical: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive"
  }
};

// Alert status colors
export const alertStatusColors = {
  pending: {
    bg: "bg-accent",
    text: "text-accent-foreground",
    border: "border-border",
    badge: "bg-accent text-accent-foreground border-border",
    icon: "text-accent-foreground"
  },
  sent: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    badge: "bg-secondary text-secondary-foreground border-border",
    icon: "text-primary"
  },
  failed: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive",
    icon: "text-destructive"
  }
};

// Project status colors
export const projectStatusColors = {
  active: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    badge: "bg-secondary text-secondary-foreground border-border",
    icon: "text-primary"
  },
  demobilized: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    badge: "bg-muted text-muted-foreground border-border",
    icon: "text-muted-foreground"
  }
};

// Alert type colors
export const alertTypeColors = {
  data_entry_delay: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "text-blue-600"
  },
  problematic: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "text-amber-600"
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border-red-200",
    icon: "text-red-600"
  },
  pre_demobilization: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "text-purple-600"
  },
  demobilization: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "text-gray-600"
  }
};

// Progress bar colors based on percentage
export function getProgressColor(percentage: number): string {
  if (percentage >= 70) return "bg-primary";
  if (percentage >= 50) return "bg-accent";
  if (percentage >= 30) return "bg-accent";
  return "bg-destructive";
}

// Table cell colors for tracking data
export function getTrackingCellColor(value: number, type: 'target' | 'delay'): string {
  if (type === 'target') {
    if (value >= 50) return "bg-secondary";
    if (value >= 30) return "bg-accent";
    return "bg-destructive/10";
  } else if (type === 'delay') {
    if (value >= 70) return "bg-destructive/10";
    if (value >= 40) return "bg-accent";
    return "bg-secondary";
  }
  return "";
}

// Common card styles
export const cardStyles = {
  base: "bg-card rounded-lg border border-border shadow-sm",
  hover: "hover:shadow-md transition-shadow duration-200",
  interactive: "cursor-pointer hover:shadow-md hover:border-border transition-all duration-200"
};

// Button variant styles
export const buttonStyles = {
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  secondary: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
  success: "bg-primary hover:bg-primary/90 text-primary-foreground",
  warning: "bg-accent hover:bg-accent/80 text-accent-foreground",
  danger: "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
};

// Helper functions to get colors
export function getStatusColor(status: keyof typeof statusColors) {
  return statusColors[status] || statusColors.good;
}

export function getPriorityColor(priority: keyof typeof priorityColors) {
  return priorityColors[priority] || priorityColors.medium;
}

export function getAlertStatusColor(status: keyof typeof alertStatusColors) {
  return alertStatusColors[status] || alertStatusColors.pending;
}

export function getProjectStatusColor(status: keyof typeof projectStatusColors) {
  return projectStatusColors[status] || projectStatusColors.active;
}

export function getAlertTypeColor(type: keyof typeof alertTypeColors) {
  return alertTypeColors[type] || alertTypeColors.problematic;
}

// Responsive grid classes
export const gridStyles = {
  cards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
  stats: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  form: "grid grid-cols-1 md:grid-cols-2 gap-4",
  table: "overflow-x-auto"
};

// Animation classes
export const animations = {
  fadeIn: "animate-in fade-in duration-200",
  slideIn: "animate-in slide-in-from-bottom-4 duration-300",
  bounce: "animate-bounce",
  pulse: "animate-pulse",
  spin: "animate-spin"
};