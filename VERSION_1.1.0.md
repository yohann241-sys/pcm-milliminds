# Version 1.1.0 - Netlify Identity

Cette livraison repart de l archive PCM retrouvee du 14 septembre 2026.

Corrections integrees :
- prise en charge du lien Netlify `recovery_token` ;
- ecran Nouveau mot de passe puis confirmation ;
- bouton Mot de passe oublie dans l espace formateur ;
- prise en charge des invitations Identity (`invite_token`) ;
- acces admin autorise pour les roles `formateur`, `admin` et `superadmin` ;
- ancien acces ADMIN_EMAIL / ADMIN_PASSWORD conserve en secours ;
- logo Milliminds recadre et rendu plus lisible ;
- libelle de marque Formation / Communication ;
- bouton Passer disponible pour avancer sans repondre immediatement ;
- validation finale toujours bloquee tant que toutes les questions ne sont pas completees.

Configuration minimale Netlify :
- Identity active ;
- compte utilisateur present dans Identity > Users ;
- role `formateur`, `admin` ou `superadmin` ;
- variable `SESSION_SECRET` d au moins 32 caracteres ;
- variable `APP_ORIGIN` egale a l URL exacte du site.
