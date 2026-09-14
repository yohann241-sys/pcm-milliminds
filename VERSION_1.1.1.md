# Version 1.1.1 — correction accès formateur

Corrections livrées le 14 septembre 2026 :

- bouton **Mot de passe oublié ?** rendu volontairement visible sous le bouton de connexion ;
- écran dédié de demande de réinitialisation avec uniquement l’adresse e-mail ;
- envoi du lien par Netlify Identity ;
- traitement du `recovery_token` au retour depuis l’e-mail ;
- écran **Nouveau mot de passe** puis confirmation du mot de passe ;
- logo officiel Milliminds recadré sur sa zone utile pour éviter toute coupure ;
- dimensions du logo corrigées dans l’écran de connexion et dans la barre latérale administrateur ;
- libellé de marque **Formation / Communication** conservé ;
- numéro de version visible sur l’écran de connexion afin de vérifier immédiatement que le bon déploiement est en ligne.

## Contrôle après déploiement

Sur `/admin`, le bas de la carte de connexion doit afficher **Version 1.1.1**. Si ce numéro n’apparaît pas, Netlify sert encore une ancienne version du site.
