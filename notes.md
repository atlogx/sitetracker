# Application de suivi de "dossier d'appel d'offres" (DAO)

## Fonctionnalités
- Saisir les informations liées à l'offre découpée en plusieurs étapes
- Il existe 3 étapes, qui sont : pré-soumission, soumission et execution
- Alerter (par email) les parties prenantes de la DAO selon des conditions définies
- La seule condition d'alerte pour l'instant est lorsque la durée de validité (phase de soumission), par rapport à la date de soumission, de l'offre est atteinte
- Stockage de documents : lettre de soumission, lettre de caution, chèque certifié, caution de soumission (lettre de banque, chèque certifié, assurance), garantie de bonne exécution
- Être alerté, si dossier pas encore soumissionné :
  - Deux semaine avant la date de soumission si possible
  - Si avancement est à 'offre prete à être soumissionée', alerte pour inciter à soumissionné avec la date
  - La veille du dépôt pour rappeler l'heure de soumission

## Informations à renseigner
### Global :
- Dépenses circuit
- Frais bancaires
- Total dépensé

### Pré-soumission (constitutation de dossier)
- Date de soumission : délai de la soumission (date butoire)
- Département : maitre d'ouvrage - autorité contractante
- Numero d'appel d'offres (reference)
- Lots
- Montant de l'offre TTC (proposition)
- Avancement : statut dans la constitution du dossier (statuts étapes du cycle de vie)
- Validité de l'offre: durée de l'offre avant la reponse de l'autorité contractante
- Commentaires
- Prix d'achat DAO
- Nombre de cahiers achetés

### Soumission
- Caution ou garantie de soumission (type)
  - Chèque certifié
  - Lettre de banque
  - Caution d'assurance
- Montant garantie soumission
- Validité
- Action ou commentaires
- Statut
  - Rien à faire
  - À retourner
  - Retourné

### Exécution
- Montant garantie
- Validité
- Action ou commentaires
- Statut
  - Rien à faire
  - À retourner
  - Retourné

## Étapes du cycle de vie par phase
- DAO à acheter
- DAO acheté
- Montage de l'offre
- Offre prête à être soumise
- Soumission
- Attribution: Offre retenue
- Attribution: Offre non retenue
- Contractualisation: Signé
- Contractualisation: Non signé
- Exécution: En cours
- Exécution: Terminé
- Paiement: Partiellement (préciser montant)
- Paiement: Entièrement
