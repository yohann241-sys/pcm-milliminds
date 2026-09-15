# Déploiement Netlify — Version 1.2.6

1. Remplacer les fichiers du dépôt par ceux de cette archive et valider sur `main`.
2. Attendre la fin du déploiement Netlify et de la migration `202609150003_session_invitations.sql`.
3. Ouvrir `/admin` et vérifier **Version 1.2.6**.
4. Dans **Identity > Users**, vérifier que le compte du formateur possède le rôle `formateur` (ou `admin` / `superadmin`).
5. Dans **Project configuration > Environment variables**, ajouter les variables d’envoi d’e-mails :
   - `RESEND_API_KEY` : clé API Resend ;
   - `INVITATION_FROM_EMAIL` : adresse d’expédition sur un domaine vérifié ;
   - `INVITATION_FROM_NAME` : nom d’expéditeur, par exemple `Milliminds Formation` (facultatif) ;
   - `APP_ORIGIN` : URL publique exacte du site, par exemple `https://pcmprocess.netlify.app`.
6. Relancer un déploiement après avoir ajouté les variables.
7. Tester le parcours : **Mes séminaires > Nouvelle session > Inviter > Envoyer les invitations**.

## Fonctionnement 1.2.6

- le panneau d’invitation s’ouvre juste après la création d’une session ;
- jusqu’à 100 destinataires peuvent être saisis par envoi ;
- chaque destinataire reçoit un e-mail séparé ;
- le lien pointe directement vers la session créée ;
- l’e-mail du formateur est inclus dans le lien et prérempli chez le participant ;
- les réponses reçues sont donc automatiquement attribuées au bon formateur ;
- le nombre d’invitations envoyées est visible sur la session ;
- l’historique est stocké dans `session_invitations` ;
- l’adresse du formateur est utilisée en `Reply-To` afin que le participant puisse lui répondre directement.

## Important

Netlify Identity ne permet pas d’envoyer arbitrairement des invitations à des participants qui n’ont pas de compte. L’application utilise donc un service d’e-mail transactionnel côté serveur. La v1.2.6 est configurée pour **Resend**. Si `RESEND_API_KEY` ou `INVITATION_FROM_EMAIL` n’est pas défini, l’application affiche un message de configuration au lieu d’échouer silencieusement.
