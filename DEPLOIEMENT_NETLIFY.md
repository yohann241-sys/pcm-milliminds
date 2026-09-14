# Mise en ligne — checklist courte

1. Décompresser l’archive et pousser le dossier sur un dépôt GitHub privé.
2. Dans Netlify, importer ce dépôt.
3. Vérifier : build `npm run build`, publication `dist`.
4. Lancer le premier déploiement pour créer Netlify Database et appliquer les migrations.
5. Ajouter `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` et `APP_ORIGIN`.
6. Redéployer.
7. Tester `/api/health`, la page `/`, puis `/admin`.
8. Depuis **Séminaires**, créer ou activer la session qui doit accueillir les participants.
9. Réaliser une passation complète de contrôle avant l’ouverture du séminaire.

Important : `APP_ORIGIN` doit être l’URL exacte du site sans barre oblique finale. Ne placez jamais les secrets dans GitHub ou dans le code.
