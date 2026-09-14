# Version 1.1.3

Cette version corrige les erreurs observees dans la console :

- `api/admin/login` 502 : route et session parallele supprimees ;
- `api/admin/me` 401 au chargement : la verification initiale se fait maintenant directement avec Netlify Identity dans le navigateur ;
- protection des routes admin : verification Netlify Identity et roles `admin`, `superadmin`, `formateur` dans la fonction ;
- CSP : ajout du hash `sha256-mTJ4cJaTm2Gw95GeXEpZdvEEY9ybh6FZu1bwcNE7QlY=` pour le script inline explicitement signale par le navigateur ;
- suppression de la dependance aux variables `SESSION_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
