# Version 1.2.3

## Gouvernance des rôles

- Les rôles `admin` et `superadmin` disposent d’une vue globale sur toutes les sessions et tous les inventaires.
- Le rôle `formateur` dispose d’un tableau de bord personnel limité aux sessions dont il est propriétaire et aux inventaires associés.
- Chaque session nouvellement créée enregistre automatiquement l’e-mail du formateur connecté dans `seminar_sessions.owner_email`.
- Les contrôles de périmètre sont effectués côté API pour les listes, rapports, mises à jour, changements de statut et exports CSV.

## Suppression administrateur

- Ajout d’une action **Supprimer** dans la liste des inventaires pour les administrateurs.
- Confirmation obligatoire avant suppression.
- Suppression des réponses et de la restitution par cascade.
- Suppression du participant uniquement lorsqu’aucun autre inventaire ne lui est rattaché.
- Journalisation de la suppression dans `audit_logs`.

## Base de données

- Nouvelle migration `202609150001_role_scoping_and_ownership.sql`.
- Ajout de `seminar_sessions.owner_email` et de son index.
