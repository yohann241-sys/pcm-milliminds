# Deploiement Netlify — Version 1.1.3

1. Remplacer les fichiers du depot par ceux de cette archive et valider sur `main`.
2. Attendre la fin du deploiement Netlify.
3. Ouvrir `/admin` et verifier **Version 1.1.3**.
4. Dans **Identity > Users**, verifier que le compte existe et possede `admin`, `superadmin` ou `formateur`.
5. Aucun `SESSION_SECRET`, `ADMIN_EMAIL` ou `ADMIN_PASSWORD` n est requis dans cette version.
6. Si `APP_ORIGIN` est defini, sa valeur doit etre exactement l URL publique du site, sans barre finale.
7. Tester une connexion puis ouvrir le tableau de bord.

## Corrections 1.1.3

- suppression du double systeme de connexion ;
- suppression de l appel `/api/admin/login` qui provoquait le 502 ;
- Netlify Identity devient l unique source d authentification admin/formateur ;
- controle des roles cote navigateur et cote fonction Netlify ;
- correction de la CSP pour autoriser le script inline Netlify signale par le navigateur via son hash SHA-256, sans activer `unsafe-inline` pour les scripts ;
- conservation du flux invitation et reinitialisation de mot de passe ;
- conservation du logo Milliminds corrige et du libelle Formation / Communication.
