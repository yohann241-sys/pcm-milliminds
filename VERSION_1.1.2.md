# Version 1.1.2

Correctif du 14 septembre 2026.

- Gestion explicite des erreurs HTTP 429 / rate limit de Netlify Identity.
- Aucun second essai automatique vers l’authentification historique lorsqu’un rate limit est détecté.
- Message utilisateur en français pour éviter les clics répétés qui prolongent le blocage temporaire.
- Même traitement sur la connexion et l’envoi du lien de réinitialisation.
- Version visible sur l’écran de connexion : 1.1.2.
