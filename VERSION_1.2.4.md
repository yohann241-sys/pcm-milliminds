# Version 1.2.4

## Affectation directe au formateur
- Le participant doit saisir l’adresse e-mail de son formateur avant de commencer l’inventaire.
- L’inventaire est enregistré avec cette adresse e-mail et apparaît automatiquement dans l’espace personnel du formateur correspondant.
- Le lien de passation accepte aussi `?formateur=adresse@email.com` pour préremplir le champ.
- Les anciens inventaires sont automatiquement repris à partir du formateur responsable de leur session lorsqu’une affectation historique existe.

## Espace formateur
- Le tableau de bord personnel n’est plus limité aux seules sessions créées par le formateur : il affiche les inventaires directement attribués à son adresse e-mail.
- Les contrôles d’accès serveur, l’export CSV et l’ouverture des rapports utilisent la même affectation par e-mail.

## Espace administrateur
- Nouvel onglet **Formateurs**.
- Liste consolidée des formateurs et adresses référencées dans l’application.
- Nombre total d’inventaires, inventaires à analyser, analysés, restitués et dernière activité par formateur.
- Les tableaux administrateur affichent le formateur attribué à chaque inventaire.

## Base de données
- Nouvelle migration `202609150002_trainer_assignment.sql`.
- Ajout de `assessments.trainer_email`.
- Ajout du répertoire `trainer_directory`.
