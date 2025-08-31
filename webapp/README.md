# SiteTracker - Suivi de Chantiers

Application de suivi et monitoring des projets de construction avec gestion des alertes et démobilisations automatiques.

## 🏗️ Fonctionnalités

- **Gestion des organisations** avec administrateurs (directeur général, service financier)
- **Gestion des projets** avec maîtres d'ouvrage et équipes projet
- **Suivi mensuel** de l'avancement physique des chantiers
- **Système d'alertes** automatique selon les règles de démobilisation
- **Tableau de bord** avec statistiques en temps réel
- **Historique des statuts** pour audit et traçabilité

## 🚀 Installation rapide

### 1. Prérequis

- Node.js 18+ ou Bun
- Compte Supabase (gratuit)

### 2. Configuration

1. **Clonez le projet** (si pas déjà fait)
2. **Installez les dépendances :**
   ```bash
   cd webapp
   bun install
   ```

3. **Créez un projet Supabase :**
   - Allez sur [supabase.com](https://supabase.com/dashboard)
   - Créez un nouveau projet
   - Notez votre `Project URL` et `anon key` dans Settings → API

4. **Configurez les variables d'environnement :**
   ```bash
   # Copiez le fichier d'exemple
   cp .env.example .env.local
   
   # Éditez .env.local avec vos vraies clés Supabase
   ```

5. **Initialisez la base de données :**
   - Ouvrez l'éditeur SQL dans votre dashboard Supabase
   - Copiez et exécutez le contenu de `sql/init_database.sql`

6. **Démarrez l'application :**
   ```bash
   bun run dev
   ```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📋 Configuration détaillée

### Variables d'environnement

Créez un fichier `.env.local` avec :

```env
# Configuration Supabase (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Configuration email (optionnel, pour les alertes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# URL de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Structure de la base de données

L'application crée automatiquement les tables suivantes :

- `organizations` - Organisations avec leurs administrateurs
- `projects` - Projets avec maîtres d'ouvrage et équipes
- `sites` - Sites de construction
- `companies` - Entreprises exécutantes
- `company_sites` - Liaison entreprises/sites
- `monthly_tracking` - Suivi mensuel des avancements
- `alerts` - Alertes et notifications
- `status_history` - Historique pour audit

## 🎯 Règles de démobilisation

Le système applique automatiquement les règles suivantes :

1. **Premier mois** : Si avancement < 50% → Alerte critique
2. **Deuxième mois** : Si avancement < 30% → Alerte pré-démobilisation
3. **Troisième mois** : Si avancement < 30% → Démobilisation
4. **Quatrième mois** : Si mois 3 > 30% et mois 4 < 50% → Démobilisation

### Alertes automatiques

- **Retard de saisie** : Données non saisies avant le 5 du mois
- **Situation problématique** : Avancement entre 30% et 50%
- **Situation critique** : Avancement < 30%

## 🛠️ Architecture technique

- **Frontend** : Next.js 15 + TypeScript
- **UI** : shadcn/ui + Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Validation** : Zod + React Hook Form
- **État** : React hooks + Context

### Structure des dossiers

```
webapp/
├── src/
│   ├── app/              # Pages Next.js App Router
│   ├── components/       # Composants réutilisables
│   │   └── ui/          # Composants shadcn/ui
│   ├── lib/             # Utilitaires et services
│   ├── types/           # Types TypeScript
│   └── hooks/           # Hooks personnalisés
├── sql/                 # Scripts SQL
└── public/              # Assets statiques
```

## 🎨 Personnalisation

### Couleurs et thème

L'application utilise le système de couleurs Tailwind CSS. Pour personnaliser :

1. Modifiez `src/lib/styles.ts` pour les couleurs de statut
2. Ajustez `tailwind.config.js` pour le thème global

### Règles métier

Pour modifier les règles de démobilisation, éditez les fonctions dans :
- `src/lib/business-rules.ts` (à créer)
- `sql/init_database.sql` (fonction `evaluate_tracking_status`)

## 🔧 Développement

### Scripts disponibles

```bash
# Développement
bun run dev

# Build de production
bun run build

# Démarrage production
bun run start

# Linting
bun run lint
```

### Base de données

```bash
# Réinitialiser la base (attention : supprime toutes les données)
# Exécutez le script sql/init_database.sql dans Supabase

# Sauvegarder la structure
# Utilisez l'outil de backup Supabase
```

## 📱 Utilisation

### 1. Créer une organisation
- Nom de l'organisation
- Directeur général (nom, email, téléphone)
- Service financier (nom, email, téléphone)

### 2. Créer un projet
- Informations générales
- Maître d'ouvrage
- Directeur de projet
- Chef de mission

### 3. Ajouter des sites
- Nom et adresse du site
- Entreprises exécutantes

### 4. Saisir le suivi mensuel
- Avancement physique total
- Avancement du mois
- Taux normal, objectif et retard
- Observations

### 5. Gérer les alertes
- Consultation des alertes automatiques
- Envoi de notifications
- Suivi des actions correctives

## 🚨 Dépannage

### Erreur "Missing Supabase environment variables"
- Vérifiez que `.env.local` existe et contient les bonnes clés
- Redémarrez le serveur de développement

### Erreur de connexion à la base
- Vérifiez que votre projet Supabase est actif
- Vérifiez l'URL et la clé dans `.env.local`
- Vérifiez que les tables sont créées (exécutez `init_database.sql`)

### Problème de performance
- Vérifiez les index dans la base de données
- Limitez les requêtes avec pagination
- Utilisez les vues SQL pour les requêtes complexes

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajoute nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créez une issue sur GitHub
- Consultez la documentation Supabase
- Vérifiez les logs de l'application

---

**Note** : Cette application est conçue pour le suivi de projets de construction selon les standards français. Les textes d'interface sont en français, le code source en anglais.