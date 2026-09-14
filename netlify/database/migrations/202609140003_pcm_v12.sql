ALTER TABLE interpretations ADD COLUMN IF NOT EXISTS base_code VARCHAR(3) REFERENCES dimensions(code);
ALTER TABLE interpretations ADD COLUMN IF NOT EXISTS phase_code VARCHAR(3) REFERENCES dimensions(code);

UPDATE dimensions SET
  name='Type de Personnalité Analyseur', short_name='Analyseur',
  description='Pensée logique, organisation et sens de la responsabilité.',
  perception='Pensées factuelles', channel='Canal Interrogatif',
  strengths='["Logique","Responsable","Organisé"]'::jsonb,
  watchouts='["Sur-contrôle sous stress","Excès de détails","Difficulté à déléguer"]'::jsonb,
  motivators='["Reconnaissance du travail productif","Structuration du temps"]'::jsonb,
  connection_tips='["Donner les faits","Questionner précisément","Clarifier le temps et les critères"]'::jsonb
WHERE code='ANA';
UPDATE dimensions SET
  name='Type de Personnalité Persévérant', short_name='Persévérant',
  description='Engagement, observation et attention portée aux valeurs et aux convictions.',
  perception='Opinions', channel='Canal Interrogatif',
  strengths='["Engagé","Observateur","Consciencieux"]'::jsonb,
  watchouts='["Rigidification sous stress","Jugement","Exigence excessive"]'::jsonb,
  motivators='["Reconnaissance du travail dévoué","Reconnaissance des convictions"]'::jsonb,
  connection_tips='["Demander l’avis","Reconnaître l’engagement","Respecter les convictions"]'::jsonb
WHERE code='CON';
UPDATE dimensions SET
  name='Type de Personnalité Empathique', short_name='Empathique',
  description='Sensibilité aux personnes, aux émotions et à la qualité du lien.',
  perception='Émotions', channel='Canal Nourricier',
  strengths='["Compatissant","Sensible","Chaleureux"]'::jsonb,
  watchouts='["Sur-adaptation sous stress","Difficulté à dire non","Dévalorisation"]'::jsonb,
  motivators='["Reconnaissance de la personne","Besoins sensoriels"]'::jsonb,
  connection_tips='["Personnaliser le contact","Montrer de la considération","Soigner l’environnement relationnel"]'::jsonb
WHERE code='REL';
UPDATE dimensions SET
  name='Type de Personnalité Imagineur', short_name='Imagineur',
  description='Réflexion intérieure, calme et capacité à travailler avec autonomie.',
  perception='Inactions (réflexions)', channel='Canal Directif',
  strengths='["Imaginatif","Réfléchi","Calme"]'::jsonb,
  watchouts='["Retrait sous stress","Passivité","Dispersion interne"]'::jsonb,
  motivators='["Solitude"]'::jsonb,
  connection_tips='["Donner une consigne claire","Laisser du temps","Préserver un espace calme"]'::jsonb
WHERE code='REF';
UPDATE dimensions SET
  name='Type de Personnalité Énergiseur', short_name='Énergiseur',
  description='Spontanéité, créativité et réaction immédiate à l’environnement.',
  perception='Réactions (j’aime / j’aime pas)', channel='Canal Émotif',
  strengths='["Spontané","Créatif","Ludique"]'::jsonb,
  watchouts='["Blâme sous stress","Dispersion","Perte d’intérêt dans la routine"]'::jsonb,
  motivators='["Contact"]'::jsonb,
  connection_tips='["Créer du contact","Utiliser une interaction vivante","Laisser place à la spontanéité"]'::jsonb
WHERE code='CRE';
UPDATE dimensions SET
  name='Type de Personnalité Promoteur', short_name='Promoteur',
  description='Action, adaptabilité et goût pour les opportunités et les défis.',
  perception='Actions', channel='Canal Directif',
  strengths='["Adaptable","Persuasif","Charmeur"]'::jsonb,
  watchouts='["Prise de risque sous stress","Impatience","Contournement des règles"]'::jsonb,
  motivators='["Excitation"]'::jsonb,
  connection_tips='["Aller à l’essentiel","Donner un défi","Laisser une marge de manœuvre"]'::jsonb
WHERE code='ACT';

UPDATE assessment_versions SET active=FALSE;
INSERT INTO assessment_versions(name, version, estimated_minutes, disclaimer, active)
VALUES ('Inventaire de personnalité PCM — Milliminds formateur','1.2',20,
'Inventaire destiné à une restitution par un formateur certifié. Il reprend le référentiel PCM (Structure de Personnalité, Base, Phase, Perceptions, Canaux de Communication et Besoins Psychologiques). Le jeu d’items intégré est un inventaire Milliminds et ne reproduit pas le questionnaire propriétaire PCM Profile ni sa clé de cotation.', TRUE)
ON CONFLICT(version) DO UPDATE SET name=EXCLUDED.name, estimated_minutes=EXCLUDED.estimated_minutes, disclaimer=EXCLUDED.disclaimer, active=TRUE;

WITH source AS (SELECT id FROM assessment_versions WHERE version='1.0'), target AS (SELECT id FROM assessment_versions WHERE version='1.2')
INSERT INTO questionnaire_items(assessment_version_id, dimension_code, item_kind, wording, reverse_scored, pair_key, order_index)
SELECT target.id, q.dimension_code, q.item_kind, q.wording, q.reverse_scored, q.pair_key, q.order_index
FROM questionnaire_items q, source, target
WHERE q.assessment_version_id=source.id AND q.item_kind='structure'
ON CONFLICT(assessment_version_id,order_index) DO NOTHING;

WITH v AS (SELECT id FROM assessment_versions WHERE version='1.2')
INSERT INTO questionnaire_items(assessment_version_id,dimension_code,item_kind,wording,reverse_scored,pair_key,order_index)
SELECT v.id,q.dimension_code,'dynamique',q.wording,FALSE,NULL,q.order_index FROM v CROSS JOIN (VALUES
('ANA','En ce moment, il est particulièrement important pour moi que la qualité de mon travail soit reconnue.',55),
('REL','En ce moment, j’ai particulièrement besoin d’être reconnu pour qui je suis, au-delà de mes résultats.',56),
('ACT','En ce moment, j’ai besoin de stimulation, de défi et d’excitation pour rester pleinement engagé.',57),
('CON','En ce moment, j’ai besoin que mon engagement et mes convictions soient reconnus.',58),
('CRE','En ce moment, le contact, les échanges vivants et la spontanéité alimentent particulièrement mon énergie.',59),
('REF','En ce moment, j’ai besoin de temps seul et d’un espace calme pour me recentrer.',60),
('ANA','En ce moment, organiser mon temps et savoir précisément ce qui est attendu me motive.',61),
('REL','En ce moment, la qualité de mon environnement et le confort sensoriel ont une importance particulière.',62),
('ACT','En ce moment, je recherche davantage les situations où je peux agir vite et relever un défi.',63),
('CON','En ce moment, j’ai besoin de contribuer à quelque chose qui correspond à mes valeurs.',64),
('CRE','En ce moment, la routine me pèse davantage et j’ai besoin de contacts stimulants.',65),
('REF','En ce moment, je récupère surtout lorsque je peux me retirer et réfléchir seul.',66),
('ANA','Actuellement, une reconnaissance explicite de mon travail me donne de l’énergie.',67),
('REL','Actuellement, les marques personnelles d’appréciation et un cadre agréable me ressourcent.',68),
('ACT','Actuellement, les occasions de prendre des initiatives et de vivre de l’intensité me motivent.',69),
('CON','Actuellement, être écouté et respecté pour mon point de vue renforce mon engagement.',70),
('CRE','Actuellement, rire, bouger et interagir me permettent de retrouver rapidement de l’énergie.',71),
('REF','Actuellement, la solitude choisie et un cadre structuré m’aident à fonctionner au mieux.',72)
) AS q(dimension_code,wording,order_index)
ON CONFLICT(assessment_version_id,order_index) DO UPDATE SET wording=EXCLUDED.wording, dimension_code=EXCLUDED.dimension_code, item_kind='dynamique', reverse_scored=FALSE, pair_key=NULL;

UPDATE seminar_sessions SET assessment_version_id=(SELECT id FROM assessment_versions WHERE version='1.2');
