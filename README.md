
## Version 1.2.6 — invitations e-mail depuis l’espace formateur

Chaque participant renseigne désormais l’adresse e-mail de son formateur avant la passation. Cette adresse devient la clé d’affectation de l’inventaire : un compte Netlify Identity disposant du rôle `formateur` voit automatiquement les inventaires attribués à son e-mail. Les administrateurs conservent une visibilité globale et disposent d’un onglet **Formateurs** avec les volumes d’inventaires par adresse.

# Milliminds — Inventaire de personnalité PCM

Version 1.2.6. Application professionnelle de passation, d’analyse et de restitution destinée aux formateurs certifiés. Elle permet désormais de créer une session puis d’envoyer directement les invitations aux participants depuis l’espace formateur. Chaque invitation ouvre la bonne session et préremplit l’adresse du formateur pour garantir l’attribution automatique de l’inventaire.


## Nouveautés v1.2.3 — rôles et tableaux de bord

- **Administrateur / superadmin** : visibilité sur l’ensemble des inventaires et des sessions.
- **Formateur** : tableau de bord personnel limité aux inventaires rattachés aux sessions qu’il a créées.
- Chaque nouvelle session est automatiquement rattachée à l’adresse e-mail Netlify Identity du formateur qui la crée.
- L’export CSV respecte le même périmètre : global pour l’administrateur, personnel pour le formateur.
- L’administrateur peut supprimer définitivement un inventaire depuis la liste des résultats ; les réponses et la restitution associées sont supprimées en cascade, et l’action est tracée dans le journal d’audit.
- Les accès directs à un rapport sont également contrôlés côté serveur : un formateur ne peut pas ouvrir le rapport d’une session qui ne lui appartient pas.

## Correction v1.2.1 — ordre des Étages

Dans la restitution et dans l’export PDF, la Base validée est toujours positionnée à l’Étage 1, au bas de la Structure de Personnalité. Les cinq autres Types occupent les Étages 2 à 6 au-dessus. La Phase actuelle est signalée sur l’Étage du Type concerné ; lorsqu’elle est différente de la Base, elle apparaît donc nécessairement au-dessus de l’Étage 1.


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
- tableau de bord de toutes les passations ;
- recherche, filtrage et export CSV ;
- création et activation de sessions de séminaire ;
- Structure de Personnalité à six Étages ;
- Base proposée automatiquement puis validée par le formateur ;
- Phase actuelle proposée à partir des Besoins Psychologiques puis validée par le formateur ;
- indicateur de qualité : complétude, cohérence, différenciation, neutralité et rythme ;
- analyse détaillée des Perceptions, Canaux de Communication, Points Forts et Besoins Psychologiques ;
- zone de synthèse et de notes réservée au formateur ;
- statut de suivi : en cours, à analyser, analysé, restitué ;
- rapport professionnel imprimable ou enregistrable en PDF.

## Positionnement méthodologique et propriété intellectuelle

L’application reprend la terminologie du Process Communication Model® : Analyseur, Persévérant, Empathique, Imagineur, Énergiseur et Promoteur, ainsi que les notions de Base, Phase, Perceptions, Canaux de Communication et Besoins Psychologiques.

Le **jeu d’items intégré est un inventaire Milliminds** conçu pour une restitution par un formateur certifié. Il ne reproduit pas le questionnaire propriétaire PCM Profile ni sa clé de cotation. Le logiciel propose une Base et une Phase à partir des réponses ; le formateur les confirme ou les ajuste dans le rapport avant restitution.

Si un jeu d’items et une méthode de cotation licenciés sont fournis par leur titulaire, l’architecture peut être raccordée à cette source sans modifier l’expérience générale de passation et de restitution.

## Architecture

- interface : React 19 + TypeScript + Vite ;
- API : Netlify Functions ;
- base : Netlify Database (PostgreSQL) ;
- schéma et données : migrations SQL versionnées ;
- calcul : effectué exclusivement côté serveur ;
- stockage des jetons participants : empreinte SHA-256 uniquement ;
- authentification administrateur : Netlify Identity et contrôle des rôles côté fonction ;
- protections : CSP, en-têtes de sécurité, contrôle d’origine et limitation de débit Netlify.

## Base de données

Les migrations se trouvent dans `netlify/database/migrations/` et créent :

- `assessment_versions` : versions de l’inventaire ;
- `dimensions` : référentiel des six Types de Personnalité ;
- `seminar_sessions` : sessions de séminaire, avec rattachement au formateur propriétaire ;
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
git commit -m "Inventaire PCM Milliminds"
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

### 3. Configurer l authentification

Cette version utilise uniquement **Netlify Identity** pour l espace formateur. Les anciennes variables `SESSION_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` ne sont plus utilisees.

Dans **Identity > Users** :

1. inviter ou ouvrir le compte concerne ;
2. lui attribuer un role autorise : `formateur`, `admin` ou `superadmin` ;
3. definir le mot de passe via le lien d invitation ou le flux **Mot de passe oublie ?** ;
4. apres un changement de role, se deconnecter puis se reconnecter pour renouveler le jeton.

Variable facultative recommandee :

| Variable | Valeur attendue |
| --- | --- |
| `APP_ORIGIN` | URL exacte du site, sans barre finale, ex. `https://pcmprocess.netlify.app` |


### 4. Configurer l’envoi des invitations par e-mail

L’envoi est réalisé côté serveur via **Resend**. Dans Netlify, ouvrir **Project configuration > Environment variables** et ajouter :

| Variable | Valeur attendue |
| --- | --- |
| `RESEND_API_KEY` | clé API Resend, ex. `re_...` |
| `INVITATION_FROM_EMAIL` | adresse d’expédition appartenant à un domaine vérifié dans Resend |
| `INVITATION_FROM_NAME` | nom affiché, ex. `Milliminds Formation` (facultatif) |
| `APP_ORIGIN` | URL publique exacte du site, ex. `https://pcmprocess.netlify.app` |

Après ajout ou modification des variables, relancer un déploiement Netlify.

Dans l’espace **Formateur > Mes séminaires** :
1. créer la session ;
2. le panneau **Envoyer les invitations** s’ouvre automatiquement ;
3. saisir une adresse par ligne, ou `Nom Prénom <email@exemple.com>` ;
4. personnaliser éventuellement l’objet et le message ;
5. cliquer sur **Envoyer les invitations**.

Le participant reçoit un lien contenant l’identifiant de la session et l’e-mail du formateur. L’adresse du formateur est préremplie et verrouillée pendant l’identification du participant.

### 5. Controle apres deploiement

- ouvrir `/api/health` : la reponse doit contenir `"ok": true` ;
- ouvrir `/admin` et verifier **Version 1.2.6** ;
- se connecter avec un utilisateur Netlify Identity ayant le role `admin`, `superadmin` ou `formateur` ;
- verifier que le tableau de bord se charge sans appel a `/api/admin/login` ;
- tester **Mot de passe oublie ?** puis l ecran de definition du nouveau mot de passe.

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

Les tests vérifient notamment la cotation inversée, l’ordre relatif de la Structure, les indicateurs de qualité et l’équilibre du questionnaire : 72 affirmations, dont 54 pour la Structure de Personnalité et 18 pour les Besoins Psychologiques associés à la Phase actuelle.

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
