export const DIMENSION_CODES = ["ANA", "CON", "REL", "REF", "CRE", "ACT"] as const;

export type DimensionCode = (typeof DIMENSION_CODES)[number];
export type QuestionKind = "structure" | "dynamique";
export type AssessmentStatus = "draft" | "submitted" | "reviewed" | "delivered";

export interface DimensionDefinition {
  code: DimensionCode;
  name: string;
  shortName: string;
  color: string;
  description: string;
  perception: string;
  channel: string;
  strengths: string[];
  watchouts: string[];
  motivators: string[];
  connectionTips: string[];
}

export interface Question {
  id: string;
  orderIndex: number;
  wording: string;
  dimension: DimensionCode;
  kind: QuestionKind;
  reverseScored: boolean;
  pairKey?: string | null;
}

export interface AnswerPayload {
  questionId: string;
  value: number;
}

export interface DimensionScore {
  code: DimensionCode;
  structure: number;
  dynamique: number;
  rank: number;
}

export interface QualityIndicators {
  score: number;
  label: "Élevée" | "Satisfaisante" | "À consolider" | "Fragile";
  completeness: number;
  consistency: number;
  variability: number;
  pace: number;
  neutralRate: number;
  durationSeconds: number;
  flags: string[];
}

export interface ScoreResult {
  dimensions: DimensionScore[];
  leadingStructure: DimensionCode[];
  leadingDynamics: DimensionCode[];
  quality: QualityIndicators;
}

export interface PublicSession {
  id: string;
  name: string;
  organization: string;
  assessmentVersion: string;
  itemCount: number;
  estimatedMinutes: number;
}

export interface ParticipantDraft {
  participantId: string;
  assessmentId: string;
  accessToken: string;
  firstName: string;
  lastName: string;
  sessionName: string;
  questions: Question[];
  startedAt: string;
}

export interface AssessmentListItem {
  id: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  sessionName: string;
  status: AssessmentStatus;
  submittedAt: string | null;
  qualityScore: number | null;
  leadingStructure: DimensionCode[];
  leadingDynamics: DimensionCode[];
}

export interface Interpretation {
  synthesis: string;
  observations: string;
  actionPlan: string;
  trainerName: string;
  restitutionDate: string | null;
}

export interface AssessmentDetail extends AssessmentListItem {
  createdAt: string;
  scores: ScoreResult;
  answers: AnswerPayload[];
  dimensions: DimensionDefinition[];
  interpretation: Interpretation;
}

export const DIMENSIONS: DimensionDefinition[] = [
  {
    code: "ANA",
    name: "Repères factuels et structurés",
    shortName: "Analyse",
    color: "#2364d2",
    description: "Tendance à organiser, vérifier et décider à partir d’informations précises.",
    perception: "Faits, logique, organisation et responsabilité.",
    channel: "Questions précises, informations structurées, objectifs et délais explicites.",
    strengths: ["Analyse", "Fiabilité", "Planification", "Clarté"],
    watchouts: ["Surcontrôle", "Surcharge de détails", "Difficulté à déléguer"],
    motivators: ["Qualité du travail", "Temps bien utilisé", "Autonomie organisée"],
    connectionTips: ["Préparer les données utiles", "Annoncer le plan", "Confirmer les critères de réussite"],
  },
  {
    code: "CON",
    name: "Repères de convictions et de sens",
    shortName: "Conviction",
    color: "#7c3aed",
    description: "Tendance à évaluer les situations selon des valeurs, des engagements et une vision du juste.",
    perception: "Opinions, valeurs, cohérence et contribution.",
    channel: "Questionner le point de vue, reconnaître l’engagement et relier l’action au sens.",
    strengths: ["Engagement", "Conscience professionnelle", "Observation", "Loyauté"],
    watchouts: ["Rigidité", "Jugement rapide", "Exigence excessive"],
    motivators: ["Reconnaissance des convictions", "Contribution utile", "Confiance"],
    connectionTips: ["Demander l’avis", "Montrer la cohérence", "Respecter les engagements"],
  },
  {
    code: "REL",
    name: "Repères relationnels et humains",
    shortName: "Relation",
    color: "#e34872",
    description: "Tendance à accorder une place centrale à la qualité du lien, au climat et aux personnes.",
    perception: "Personnes, ressentis, ambiance et attention.",
    channel: "Accueil chaleureux, écoute personnelle, formulation bienveillante et reconnaissance sincère.",
    strengths: ["Empathie", "Écoute", "Coopération", "Sens du climat"],
    watchouts: ["Évitement du désaccord", "Suradaptation", "Difficulté à dire non"],
    motivators: ["Reconnaissance personnelle", "Relations de confiance", "Environnement agréable"],
    connectionTips: ["Créer un contact humain", "Nommer les ressentis", "Valoriser la personne"],
  },
  {
    code: "REF",
    name: "Repères réflexifs et intériorisés",
    shortName: "Réflexion",
    color: "#64748b",
    description: "Tendance à réfléchir en interne, à préserver son espace et à avancer avec un cadre clair.",
    perception: "Réflexion, espace, rythme et représentation mentale.",
    channel: "Consignes claires, temps de préparation, étapes simples et espace de concentration.",
    strengths: ["Calme", "Imagination", "Concentration", "Autonomie"],
    watchouts: ["Retrait", "Attente prolongée", "Difficulté à se rendre visible"],
    motivators: ["Temps seul", "Cadre prévisible", "Charge maîtrisée"],
    connectionTips: ["Donner une consigne explicite", "Laisser un délai", "Éviter la sursollicitation"],
  },
  {
    code: "CRE",
    name: "Repères créatifs et spontanés",
    shortName: "Créativité",
    color: "#e39a16",
    description: "Tendance à réagir spontanément, créer du mouvement et apprendre par interaction.",
    perception: "Réactions, plaisir, nouveauté et énergie du moment.",
    channel: "Échange vivant, participation, humour approprié et formats variés.",
    strengths: ["Créativité", "Spontanéité", "Adaptabilité", "Énergie"],
    watchouts: ["Dispersion", "Réaction impulsive", "Perte d’intérêt dans la routine"],
    motivators: ["Contact stimulant", "Variété", "Reconnaissance ludique"],
    connectionTips: ["Faire participer", "Varier le rythme", "Autoriser les idées originales"],
  },
  {
    code: "ACT",
    name: "Repères d’action et d’impact",
    shortName: "Action",
    color: "#008b86",
    description: "Tendance à aller vite vers le résultat, saisir les occasions et agir dans le concret.",
    perception: "Action, opportunité, résultat et défi.",
    channel: "Message bref, direct et orienté résultat, avec marge de manœuvre et défi concret.",
    strengths: ["Décision", "Audace", "Négociation", "Réactivité"],
    watchouts: ["Précipitation", "Prise de risque", "Impatience face aux détours"],
    motivators: ["Défi", "Impact visible", "Liberté d’action"],
    connectionTips: ["Aller à l’essentiel", "Proposer un défi", "Donner un résultat observable"],
  },
];

export const DIMENSION_BY_CODE = Object.fromEntries(
  DIMENSIONS.map((dimension) => [dimension.code, dimension]),
) as Record<DimensionCode, DimensionDefinition>;
