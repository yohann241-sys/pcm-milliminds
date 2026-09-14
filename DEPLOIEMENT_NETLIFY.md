# Mise en ligne - version Netlify Identity

1. Decompresser l archive et pousser le contenu sur le depot GitHub du projet.
2. Dans Netlify, verifier le build `npm run build` et le dossier de publication `dist`.
3. Verifier que **Identity** est active sur le projet.
4. Dans **Identity > Users**, inviter ou selectionner le compte formateur.
5. Attribuer dans les metadonnees du compte un role `formateur`, `admin` ou `superadmin`.
6. Dans **Project configuration > Environment variables**, definir `SESSION_SECRET` et `APP_ORIGIN`. `ADMIN_EMAIL` et `ADMIN_PASSWORD` restent facultatifs comme acces historique de secours.
7. Redeployer.
8. Tester `/admin`, puis **Mot de passe oublie ?**. Le lien recu doit ouvrir l ecran **Nouveau mot de passe** de l application.
9. Tester une passation complete et l espace formateur.

Important : `APP_ORIGIN` doit etre l URL exacte du site sans barre oblique finale. Ne placez jamais les mots de passe dans GitHub.
