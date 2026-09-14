## Version 1.1.1

Cette version corrige l’affichage du logo Milliminds et le parcours Mot de passe oublié / réinitialisation Netlify Identity.

# Milliminds — Formation Communication

Application professionnelle de passation, d’analyse et de restitution d’un inventaire original de préférences de communication. Elle est conçue pour des séminaires animés par des formateurs qualifiés et pour un déploiement complet sur Netlify.

## Ce que contient l’application

### Espace participant

- connexion simple par prénom et nom ;
- consentement explicite avant la collecte ;
- 72 affirmations originales, présentées une par une ;
- navigation optimisée pour smartphone ;
- sauvegarde locale et distante au fil de la passation ;
- reprise automatique après fermeture ou actualisation de la page ;
- confirmation finale sans divulgation automatique du résultat.

### Espace administrateur / formateur

- authentification Netlify Identity pour les formateurs, avec roles `admin`, `superadmin` ou `formateur` ;
- invitation, mot de passe oublié et reinitialisation directement dans l application ;
- cookie de session applicatif securise apres validation du compte Identity ;
- tableau de bord de toutes les passations ;
- recherche, filtrage et export CSV ;
- création et activation de sessions de séminaire ;
- cartographie de six repères de communication ;
- lecture distincte des préférences habituelles et de la dynamique actuelle ;
- indicateur de qualité : complétude, cohérence, différenciation, neutralité et rythme ;
- analyse détaillée des canaux conseillés, ressources, motivations et vigilances ;
- zone de synthèse et de notes réservée au formateur ;
- statut de suivi : en cours, à analyser, analysé, restitué ;
- rapport professionnel imprimable ou enregistrable en PDF.

## Positionnement méthodologique et propriété intellectuelle

L’outil livré est un **inventaire pédagogique original**. Il ne reprend aucun questionnaire, algorithme de cotation, rapport ou support PCM non public. Il ne doit pas être présenté comme un Profil PCM officiel et ne détermine pas automatiquement une Base ou une Phase PCM.

Les noms utilisés pour les six repères sont volontairement génériques : Analyse, Conviction, Relation, Réflexion, Créativité et Action. La « dynamique actuelle » est une mesure déclarative propre à cette application ; elle ne correspond pas à la Phase PCM.

Si Milliminds obtient une autorisation écrite de Kahler Communications ou un accès officiel à une API/licence d’intégration, le moteur peut être remplacé ou raccordé sans modifier l’expérience utilisateur générale.

## Architecture

- interface : React 19 + TypeScript + Vite ;
- API : Netlify Functions ;
- base : Netlify Database (PostgreSQL) ;
- schéma et données : migrations SQL versionnées ;
- calcul : effectué exclusivement côté serveur ;
- stockage des jetons participants : empreinte SHA-256 uniquement ;
- session administrateur : signature HMAC, cookie `HttpOnly`, `SameSite=Strict`, durée 8 h ;
- protections : CSP, en-têtes de sécurité, contrôle d’origine et limitation de débit Netlify.

## Base de données

Les migrations se trouvent dans `netlify/database/migrations/` et créent :

- `assessment_versions` : versions de l’inventaire ;
- `dimensions` : référentiel des six repères ;
- `seminar_sessions` : sessions de séminaire ;
- `questionnaire_items` : 72 affirmations et clés de cotation ;
- `participants` : identité minimale et consentement ;
- `assessments` : passations, statuts, scores et qualité ;
- `assessment_responses` : réponses détaillées ;
- `interpretations` : synthèses et plans d’action du formateur ;
- `audit_logs` : opérations sensibles et événements de suivi.

Une première session, « Séminaire Milliminds », est ouverte automatiquement après la migration initiale.

## Déploiement Netlify

### 1. Placer le projet sur GitHub

Créez un dépôt privé, copiez le contenu de ce dossier à sa racine, puis poussez la branche principale.

```bash
git init
git add .
git commit -m "Application Repères Communication"
git branch -M main
git remote add origin URL_DU_DEPOT
git push -u origin main
```

### 2. Importer le dépôt dans Netlify

Dans Netlify :

1. sélectionner **Add new project** puis **Import an existing project** ;
2. choisir le dépôt GitHub ;
3. conserver les réglages détectés :
   - commande : `npm run build` ;
   - dossier publié : `dist` ;
   - fonctions : `netlify/functions` ;
4. lancer le premier déploiement.

Netlify détecte `@netlify/database` et les migrations placées dans `netlify/database/migrations`. La base PostgreSQL est provisionnée et les migrations sont appliquées au déploiement.

### 3. Définir les variables d’environnement

Dans **Project configuration → Environment variables**, ajouter :

| Variable | Valeur attendue |
| --- | --- |
| `SESSION_SECRET` | chaine aleatoire d au moins 32 caracteres |
| `APP_ORIGIN` | URL exacte du site, sans barre finale, ex. `https://nom-du-site.netlify.app` |
| `ADMIN_EMAIL` | facultatif : ancien compte de secours |
| `ADMIN_PASSWORD` | facultatif : mot de passe de secours correspondant |

Pour générer une clé de session :

```bash
openssl rand -base64 48
```

Relancer ensuite un déploiement pour appliquer les variables.


### 4. Autoriser un formateur avec Netlify Identity

1. Activer **Identity** dans le projet Netlify.
2. Dans **Identity > Users**, inviter ou ouvrir l utilisateur concerne.
3. Dans ses metadonnees, attribuer un role autorise : `formateur`, `admin` ou `superadmin`.
4. L utilisateur definit son mot de passe via l invitation. En cas d oubli, le lien de recuperation revient maintenant dans l application sur l ecran de nouveau mot de passe.
5. Apres une modification de role, se deconnecter puis se reconnecter afin de renouveler le jeton Identity.

### 5. Contrôler le premier démarrage

- ouvrir `/api/health` : la réponse doit contenir `"ok": true` ;
- ouvrir `/` : la session « Séminaire Milliminds » doit apparaître ;
- ouvrir `/admin` et se connecter avec les variables configurées ;
- effectuer une passation de contrôle complète ;
- vérifier le résultat, enregistrer une note de restitution et tester l’impression PDF.

## Développement local

Pré-requis : Node.js 22 ou supérieur et Netlify CLI.

```bash
npm install
npx netlify dev
```

Netlify CLI lance l’interface, les fonctions et une base PostgreSQL locale compatible avec les migrations. Copier `.env.example` vers `.env` et remplacer toutes les valeurs avant le premier essai.

## Vérifications automatisées

```bash
npm test
npm run build
```

Les tests vérifient notamment la cotation inversée, le classement des repères, les indicateurs de qualité et l’équilibre du questionnaire : 72 affirmations, 12 par dimension, dont 54 sur les habitudes et 18 sur la dynamique actuelle.

## Conseils d’exploitation

- garder le dépôt et le site Netlify privés jusqu’à la validation finale ;
- utiliser un mot de passe administrateur différent de tous les autres services ;
- limiter l’accès au tableau de bord aux formateurs autorisés ;
- annoncer la durée de conservation des données aux participants ;
- utiliser les sauvegardes et instantanés de Netlify Database avant toute évolution du schéma ;
- ne jamais communiquer un profil à un tiers sans base légitime et consentement approprié ;
- toujours contextualiser le résultat lors d’un entretien individuel.

## Personnalisation

Le logo Milliminds fourni est intégré dans `public/milliminds-logo-white.png`. Les textes du référentiel, les couleurs, les recommandations et les affirmations sont stockés ou initialisés dans les migrations SQL afin de conserver une version traçable du questionnaire.
