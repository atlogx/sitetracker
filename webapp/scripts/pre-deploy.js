#!/usr/bin/env node

/**
 * Script de pré-déploiement pour SiteTracker
 * Vérifie que toutes les configurations sont correctes avant le déploiement
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration de déploiement...\n');

let hasErrors = false;
let hasWarnings = false;

// Couleurs pour les logs
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function logError(message) {
  console.log(`${colors.red}❌ ERREUR: ${message}${colors.reset}`);
  hasErrors = true;
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ATTENTION: ${message}${colors.reset}`);
  hasWarnings = true;
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

// 1. Vérification des fichiers requis
console.log('📁 Vérification des fichiers requis...');

const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'vercel.json'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    logSuccess(`${file} présent`);
  } else {
    logError(`${file} manquant`);
  }
});

// 2. Vérification du package.json
console.log('\n📦 Vérification du package.json...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Scripts requis
  const requiredScripts = ['build', 'start', 'dev'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      logSuccess(`Script "${script}" présent`);
    } else {
      logError(`Script "${script}" manquant`);
    }
  });

  // Dépendances critiques
  const criticalDeps = ['next', 'react', 'react-dom'];
  criticalDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      logSuccess(`Dépendance "${dep}" présente`);
    } else {
      logError(`Dépendance critique "${dep}" manquante`);
    }
  });

  // Vérification de la version Next.js
  if (packageJson.dependencies && packageJson.dependencies.next) {
    const nextVersion = packageJson.dependencies.next;
    logInfo(`Version Next.js: ${nextVersion}`);
  }

} catch (error) {
  logError(`Impossible de lire package.json: ${error.message}`);
}

// 3. Vérification des variables d'environnement
console.log('\n🔐 Vérification des variables d\'environnement...');

const envFiles = ['.env.local', '.env.example'];
let envFileFound = false;

envFiles.forEach(envFile => {
  if (fs.existsSync(envFile)) {
    logSuccess(`${envFile} présent`);
    envFileFound = true;
  }
});

if (!envFileFound) {
  logWarning('Aucun fichier .env trouvé. Assurez-vous de configurer les variables d\'environnement dans Vercel.');
}

// Variables d'environnement requises pour Vercel
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

logInfo('Variables d\'environnement requises dans Vercel:');
requiredEnvVars.forEach(envVar => {
  console.log(`  - ${envVar}`);
});

// 4. Vérification de la configuration Next.js
console.log('\n⚙️ Vérification de next.config.ts...');

try {
  const nextConfigContent = fs.readFileSync('next.config.ts', 'utf8');

  if (nextConfigContent.includes('compress: true')) {
    logSuccess('Compression activée');
  } else {
    logWarning('Compression non configurée');
  }

  if (nextConfigContent.includes('poweredByHeader: false')) {
    logSuccess('Header X-Powered-By désactivé');
  } else {
    logWarning('Header X-Powered-By non désactivé');
  }

  if (nextConfigContent.includes('headers()')) {
    logSuccess('Headers de sécurité configurés');
  } else {
    logWarning('Headers de sécurité non configurés');
  }

} catch (error) {
  logError(`Impossible de lire next.config.ts: ${error.message}`);
}

// 5. Vérification de la configuration Vercel
console.log('\n🚀 Vérification de vercel.json...');

try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

  if (vercelConfig.buildCommand) {
    logSuccess(`Build command: ${vercelConfig.buildCommand}`);
  } else {
    logInfo('Build command par défaut (auto-détection)');
  }

  if (vercelConfig.installCommand) {
    logSuccess(`Install command: ${vercelConfig.installCommand}`);
  } else {
    logInfo('Install command par défaut');
  }

  if (vercelConfig.framework === 'nextjs') {
    logSuccess('Framework Next.js spécifié');
  } else {
    logInfo('Framework en auto-détection');
  }

  if (vercelConfig.regions) {
    logSuccess(`Région(s): ${vercelConfig.regions.join(', ')}`);
  } else {
    logInfo('Région par défaut (auto)');
  }

} catch (error) {
  logError(`Impossible de lire vercel.json: ${error.message}`);
}

// 6. Vérification du TypeScript
console.log('\n📝 Vérification TypeScript...');

try {
  const tsconfigContent = fs.readFileSync('tsconfig.json', 'utf8');
  const tsconfig = JSON.parse(tsconfigContent);

  if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
    logSuccess('Mode strict activé');
  } else {
    logWarning('Mode strict TypeScript non activé');
  }

  logSuccess('tsconfig.json valide');
} catch (error) {
  logError(`Problème avec tsconfig.json: ${error.message}`);
}

// 7. Vérification de
