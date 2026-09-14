CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL UNIQUE,
  estimated_minutes INTEGER NOT NULL DEFAULT 20,
  disclaimer TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dimensions (
  code VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color VARCHAR(9) NOT NULL,
  description TEXT NOT NULL,
  perception TEXT NOT NULL,
  channel TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  watchouts JSONB NOT NULL DEFAULT '[]'::jsonb,
  motivators JSONB NOT NULL DEFAULT '[]'::jsonb,
  connection_tips JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE seminar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT 'Milliminds',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questionnaire_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  dimension_code VARCHAR(3) NOT NULL REFERENCES dimensions(code),
  item_kind TEXT NOT NULL CHECK (item_kind IN ('structure', 'dynamique')),
  wording TEXT NOT NULL,
  reverse_scored BOOLEAN NOT NULL DEFAULT FALSE,
  pair_key TEXT,
  order_index INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (assessment_version_id, order_index)
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization TEXT,
  consent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
  seminar_session_id UUID NOT NULL REFERENCES seminar_sessions(id) ON DELETE RESTRICT,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'delivered')),
  access_token_hash TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  score_json JSONB,
  quality_score NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_responses (
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questionnaire_items(id) ON DELETE RESTRICT,
  value SMALLINT NOT NULL CHECK (value BETWEEN 1 AND 5),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE interpretations (
  assessment_id UUID PRIMARY KEY REFERENCES assessments(id) ON DELETE CASCADE,
  synthesis TEXT NOT NULL DEFAULT '',
  observations TEXT NOT NULL DEFAULT '',
  action_plan TEXT NOT NULL DEFAULT '',
  trainer_name TEXT NOT NULL DEFAULT '',
  restitution_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assessments_status_idx ON assessments(status);
CREATE INDEX assessments_created_at_idx ON assessments(created_at DESC);
CREATE INDEX participants_name_idx ON participants(last_name, first_name);
CREATE INDEX seminar_sessions_active_idx ON seminar_sessions(active);
CREATE INDEX questionnaire_items_version_idx ON questionnaire_items(assessment_version_id, order_index);

INSERT INTO assessment_versions (name, version, estimated_minutes, disclaimer, active)
VALUES (
  'Repères Communication — Inventaire pédagogique',
  '1.0',
  20,
  'Cet inventaire original décrit des préférences de communication déclarées. Il ne constitue ni un diagnostic psychologique, ni un Profil PCM officiel, ni une identification automatisée de la Base ou de la Phase PCM. La restitution relève du formateur qualifié.',
  TRUE
);

INSERT INTO dimensions (
  code, name, short_name, color, description, perception, channel,
  strengths, watchouts, motivators, connection_tips
) VALUES
('ANA', 'Repères factuels et structurés', 'Analyse', '#2364d2',
 'Tendance à organiser, vérifier et décider à partir d’informations précises.',
 'Faits, logique, organisation et responsabilité.',
 'Questions précises, informations structurées, objectifs et délais explicites.',
 '["Analyse","Fiabilité","Planification","Clarté"]',
 '["Surcontrôle","Surcharge de détails","Difficulté à déléguer"]',
 '["Qualité du travail","Temps bien utilisé","Autonomie organisée"]',
 '["Préparer les données utiles","Annoncer le plan","Confirmer les critères de réussite"]'),
('CON', 'Repères de convictions et de sens', 'Conviction', '#7c3aed',
 'Tendance à évaluer les situations selon des valeurs, des engagements et une vision du juste.',
 'Opinions, valeurs, cohérence et contribution.',
 'Questionner le point de vue, reconnaître l’engagement et relier l’action au sens.',
 '["Engagement","Conscience professionnelle","Observation","Loyauté"]',
 '["Rigidité","Jugement rapide","Exigence excessive"]',
 '["Reconnaissance des convictions","Contribution utile","Confiance"]',
 '["Demander l’avis","Montrer la cohérence","Respecter les engagements"]'),
('REL', 'Repères relationnels et humains', 'Relation', '#e34872',
 'Tendance à accorder une place centrale à la qualité du lien, au climat et aux personnes.',
 'Personnes, ressentis, ambiance et attention.',
 'Accueil chaleureux, écoute personnelle, formulation bienveillante et reconnaissance sincère.',
 '["Empathie","Écoute","Coopération","Sens du climat"]',
 '["Évitement du désaccord","Suradaptation","Difficulté à dire non"]',
 '["Reconnaissance personnelle","Relations de confiance","Environnement agréable"]',
 '["Créer un contact humain","Nommer les ressentis","Valoriser la personne"]'),
('REF', 'Repères réflexifs et intériorisés', 'Réflexion', '#64748b',
 'Tendance à réfléchir en interne, à préserver son espace et à avancer avec un cadre clair.',
 'Réflexion, espace, rythme et représentation mentale.',
 'Consignes claires, temps de préparation, étapes simples et espace de concentration.',
 '["Calme","Imagination","Concentration","Autonomie"]',
 '["Retrait","Attente prolongée","Difficulté à se rendre visible"]',
 '["Temps seul","Cadre prévisible","Charge maîtrisée"]',
 '["Donner une consigne explicite","Laisser un délai","Éviter la sursollicitation"]'),
('CRE', 'Repères créatifs et spontanés', 'Créativité', '#e39a16',
 'Tendance à réagir spontanément, créer du mouvement et apprendre par interaction.',
 'Réactions, plaisir, nouveauté et énergie du moment.',
 'Échange vivant, participation, humour approprié et formats variés.',
 '["Créativité","Spontanéité","Adaptabilité","Énergie"]',
 '["Dispersion","Réaction impulsive","Perte d’intérêt dans la routine"]',
 '["Contact stimulant","Variété","Reconnaissance ludique"]',
 '["Faire participer","Varier le rythme","Autoriser les idées originales"]'),
('ACT', 'Repères d’action et d’impact', 'Action', '#008b86',
 'Tendance à aller vite vers le résultat, saisir les occasions et agir dans le concret.',
 'Action, opportunité, résultat et défi.',
 'Message bref, direct et orienté résultat, avec marge de manœuvre et défi concret.',
 '["Décision","Audace","Négociation","Réactivité"]',
 '["Précipitation","Prise de risque","Impatience face aux détours"]',
 '["Défi","Impact visible","Liberté d’action"]',
 '["Aller à l’essentiel","Proposer un défi","Donner un résultat observable"]');

INSERT INTO seminar_sessions (name, organization, active, assessment_version_id)
SELECT 'Séminaire Milliminds', 'Milliminds', TRUE, id
FROM assessment_versions WHERE version = '1.0';

