# Version 1.2.6

## Invitations participants depuis l'espace formateur

- Après création d'une session, le panneau d'invitation s'ouvre automatiquement.
- Le formateur peut saisir jusqu'à 100 destinataires par envoi.
- Chaque participant reçoit un e-mail séparé avec le lien direct vers la session créée.
- Le lien préremplit et verrouille l'adresse e-mail du formateur pour éviter les erreurs d'attribution.
- Les sessions invitées sont accessibles directement via leur identifiant, sans dépendre de la session globale active.
- L'application compte les invitations envoyées par session.
- Historique des invitations enregistré dans `session_invitations`.
- Envoi via l'API Batch de Resend.
- Réponse directe au formateur grâce au champ Reply-To.

## Variables Netlify à ajouter

- `RESEND_API_KEY`
- `INVITATION_FROM_EMAIL`
- `INVITATION_FROM_NAME` (facultatif)
- `APP_ORIGIN` recommandé
