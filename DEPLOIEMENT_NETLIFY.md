# Déploiement Netlify — Version 1.1.1

1. Décompresser l'archive et remplacer les fichiers du dépôt GitHub par ceux de cette version.
2. Valider les changements sur la branche `main`.
3. Attendre la fin du déploiement Netlify.
4. Ouvrir `/admin` et vérifier que **Version 1.1.1** apparaît au bas de la carte de connexion.
5. Vérifier que Netlify **Identity** est activé et que l'adresse e-mail formateur existe dans **Identity > Users**.
6. Donner au compte un rôle autorisé : `formateur`, `admin` ou `superadmin`.
7. Cliquer sur **Mot de passe oublié ?**, saisir l'e-mail et choisir **Envoyer le lien de réinitialisation**.
8. Ouvrir l'e-mail reçu. Le lien doit revenir sur l'application et afficher **Nouveau mot de passe**.
9. Saisir et confirmer le nouveau mot de passe, puis revenir à la connexion.

Si la page `/admin` n'affiche pas **Version 1.1.1**, l'ancien déploiement est encore celui qui est servi.
