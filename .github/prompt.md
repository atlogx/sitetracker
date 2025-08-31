Je suis en train d'implementer une application, je te mets en copie en quoi elle consiste, suis les instructions dans le dossier github, pour l'instant tout se fait via un tableau excel qui permet de gérer les projets des sites (cf. capture d'écran), je te laisse la liberté sur le design, mais fait quelque chose de pratique et de beau :

Voici le **mini cahier de charges mis à jour** avec la distinction claire entre administrateurs d’organisation et administrateurs de projet, et les informations à sauvegarder pour chacun :

---

# Mini Cahier des Charges – Suivi de Chantiers

## 1. **Objectif du système**

Mettre en place un système permettant de :

* Suivre l’avancement physique des projets de construction **mois par mois**.
* Détecter les **retards ou non-respects des objectifs mensuels**.
* Déclencher des **alertes** et, si nécessaire, la **démobilisation ou remobilisation des équipes**.
* Centraliser les informations relatives aux projets, sites, entreprises et responsables internes.
* Fournir un **historique des statuts mensuels** pour analyse et audit.

---

## 2. **Structure organisationnelle et hiérarchie**

### 2.1 Organisation (niveau supérieur)

* Une organisation peut posséder **un ou plusieurs projets**.
* **Administrateurs internes de l’organisation** : Directeur général et Service financier.
* **Informations à sauvegarder pour chaque administrateur** :

  * Nom complet
  * Numéro de téléphone
  * Email

### 2.2 Projet

* Un projet peut comporter **un ou plusieurs sites**.
* **Administrateurs internes de projet** : Directeur de projet et Chef de mission.
* **Rôle** : Suivi opérationnel, saisie des données mensuelles, suivi des alertes et actions correctives.
* **Informations à sauvegarder pour chaque administrateur de projet** :

  * Nom complet
  * Numéro de téléphone
  * Email
* Informations à conserver pour le projet :

  * Nom du projet
  * Maître d’ouvrage : Nom, email, téléphone
  * Statut global : actif ou démobilisé
  * `isActive` : booléen (actif / démobilisé / remobilisé)

### 2.3 Site

* Un site représente une portion physique d’un projet.
* Peut être géré par **une ou plusieurs entreprises**.
* Informations à conserver :

  * Nom ou code du site
  * Adresse physique
  * Entreprises exécutantes associées

### 2.4 Entreprise exécutante

* Informations à conserver :

  * Nom
  * Adresse physique
  * Email
  * Téléphone

---

## 3. **Suivi mensuel**

Pour chaque site et projet :

* **Mois**
* **Avancement physique total**
* **Avancement du mois**
* **Taux normal mensuel**
* **Taux objectif mensuel**
* **Taux de retard mensuel**
* **Observations**

### Interprétation des taux

| Taux atteint | Statut        |
| ------------ | ------------- |
| < 30%        | Critique      |
| 30–50%       | Problématique |
| ≥ 50%        | Bon           |

---

## 4. **Règles d’alerte et de démobilisation**

* **Premier mois** :

  * Si avancement < 50%, **alerte critique / problématique**.

* **Second mois** :

  * Si avancement < 30%, **alerte pré-démobilisation**.

* **Troisième mois** :

  * Si avancement < 30%, **démobilisation**.

* **Quatrième mois** (optionnel) :

  * Se déclenche **seulement si le troisième mois > 30%**.
  * Si avancement < 50%, **démobilisation**.

* **Projets démobilisés** peuvent être **remobilisés**.

---

## 5. **Alertes et notifications**

* **Non-saisie des données** :

  * Alerte aux administrateurs internes (organisation + projet) si le tableau du mois précédent n’est pas rempli avant le 5 du mois suivant.

* **Retards détectés** :

  * Alerte envoyée à :

    * Entreprise exécutante
    * Maître d’ouvrage
    * Administrateurs internes (organisation + projet)

---

## 6. **Informations complémentaires**

* Historique des statuts mensuels (`mois`, `mois-1`, `mois-2`) pour suivi et audit.
* Observations qualitatives pour expliquer les écarts.
* Tableaux regroupant tous les sites et entreprises pour un projet.
* Objectif : fournir un suivi clair, actionnable et validable par toutes les parties prenantes.
