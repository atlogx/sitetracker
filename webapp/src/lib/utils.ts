import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Génère un slug à partir d'un nom
 * @param name - Le nom à convertir en slug
 * @returns Le slug généré
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
    .trim()
    .replace(/^-+|-+$/g, '') // Supprime les tirets en début et fin
}

/**
 * Trouve un projet par son slug
 * @param projects - Liste des projets
 * @param slug - Le slug à rechercher
 * @returns Le projet trouvé ou undefined
 */
export function findProjectBySlug<T extends { name: string; id: string }>(
  projects: T[], 
  slug: string
): T | undefined {
  return projects.find(project => generateSlug(project.name) === slug)
}

/**
 * Trouve un site par son slug
 * @param sites - Liste des sites
 * @param slug - Le slug à rechercher
 * @returns Le site trouvé ou undefined
 */
export function findSiteBySlug<T extends { name: string; id: string }>(
  sites: T[], 
  slug: string
): T | undefined {
  return sites.find(site => generateSlug(site.name) === slug)
}

/**
 * Traduit un statut anglais en français
 * @param status - Le statut en anglais
 * @returns Le statut en français
 */
export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'good': 'Bon',
    'problematic': 'Problématique', 
    'critical': 'Critique',
    'active': 'Actif',
    'inactive': 'Inactif',
    'demobilized': 'Démobilisé',
    'remobilized': 'Remobilisé'
  }
  
  return statusMap[status.toLowerCase()] || status
}

/**
 * Traduit un statut français en anglais pour la base de données
 * @param status - Le statut en français
 * @returns Le statut en anglais
 */
export function translateStatusToEnglish(status: string): string {
  const statusMap: Record<string, string> = {
    'bon': 'good',
    'problématique': 'problematic',
    'critique': 'critical',
    'actif': 'active',
    'inactif': 'inactive',
    'démobilisé': 'demobilized',
    'remobilisé': 'remobilized'
  }
  
  return statusMap[status.toLowerCase()] || status.toLowerCase()
}
