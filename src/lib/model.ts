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

export interface PcmReference {
  typeName: string;
  perception: string;
  channelName: string;
  channelDescription: string;
  psychologicalNeeds: string[];
  interactionStyle: string;
  strengths: string[];
  baseExplanation: string;
  phaseExplanation: string;
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

export interface AnswerPayload { questionId: string; value: number; }
export interface DimensionScore { code: DimensionCode; structure: number; dynamique: number; rank: number; }

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
  trainerEmail: string;
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
  trainerEmail: string | null;
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
  baseCode: DimensionCode | null;
  phaseCode: DimensionCode | null;
}

export interface AssessmentDetail extends AssessmentListItem {
  createdAt: string;
  scores: ScoreResult;
  answers: AnswerPayload[];
  dimensions: DimensionDefinition[];
  interpretation: Interpretation;
}

export const PCM_REFERENCE: Record<DimensionCode, PcmReference> = {
  ANA: {
    typeName: "Analyseur",
    perception: "Pensées factuelles",
    channelName: "Interrogatif",
    channelDescription: "Échanger des informations précises, poser des questions factuelles et expliciter critères, étapes et délais.",
    psychologicalNeeds: ["Reconnaissance du travail productif", "Structuration du temps"],
    interactionStyle: "Démocratique",
    strengths: ["Logique", "Responsable", "Organisé"],
    baseExplanation: "Une Base Analyseur accède spontanément au monde par les faits et la logique. La communication gagne à être structurée, précise et orientée vers l'information utile.",
    phaseExplanation: "Une Phase Analyseur met au premier plan la reconnaissance du travail accompli et la structuration du temps. Ces besoins soutiennent la motivation lorsqu'ils sont satisfaits positivement.",
  },
  CON: {
    typeName: "Persévérant",
    perception: "Opinions",
    channelName: "Interrogatif",
    channelDescription: "Demander le point de vue, écouter les convictions et échanger des informations en respectant les engagements et les valeurs.",
    psychologicalNeeds: ["Reconnaissance du travail dévoué", "Reconnaissance des convictions"],
    interactionStyle: "Démocratique",
    strengths: ["Engagé", "Observateur", "Consciencieux"],
    baseExplanation: "Une Base Persévérant filtre naturellement les situations par les opinions, les valeurs et les convictions. Elle apprécie que son point de vue soit sollicité et respecté.",
    phaseExplanation: "Une Phase Persévérant est particulièrement mobilisée par la reconnaissance de son engagement et de ses convictions. La cohérence entre paroles, valeurs et actes devient centrale.",
  },
  REL: {
    typeName: "Empathique",
    perception: "Émotions",
    channelName: "Nourricier",
    channelDescription: "Créer un contact chaleureux, personnalisé et authentique, avec une attention réelle portée à la personne et à son ressenti.",
    psychologicalNeeds: ["Reconnaissance de la personne", "Besoins sensoriels"],
    interactionStyle: "Bienveillant",
    strengths: ["Compatissant", "Sensible", "Chaleureux"],
    baseExplanation: "Une Base Empathique perçoit d'abord les personnes et les situations à travers les émotions. La qualité de la relation et la chaleur du contact facilitent la connexion.",
    phaseExplanation: "Une Phase Empathique met au premier plan la reconnaissance personnelle et la qualité sensorielle de l'environnement. Ces besoins nourrissent le sentiment d'être considéré.",
  },
  REF: {
    typeName: "Imagineur",
    perception: "Inactions (réflexions)",
    channelName: "Directif",
    channelDescription: "Donner une consigne claire, brève et explicite, puis laisser l'espace et le temps nécessaires à la réflexion et à l'exécution autonome.",
    psychologicalNeeds: ["Solitude"],
    interactionStyle: "Autocratique",
    strengths: ["Imaginatif", "Réfléchi", "Calme"],
    baseExplanation: "Une Base Imagineur traite volontiers l'information en interne. Des consignes claires et un espace de réflexion permettent d'utiliser pleinement ses ressources.",
    phaseExplanation: "Une Phase Imagineur a besoin de solitude choisie et structurée pour se recentrer. Préserver des plages de retrait favorise la récupération et la disponibilité.",
  },
  CRE: {
    typeName: "Énergiseur",
    perception: "Réactions (j’aime / j’aime pas)",
    channelName: "Émotif",
    channelDescription: "Utiliser une communication vivante, spontanée et expressive, laissant une place au jeu, à l'humour approprié et à la réaction immédiate.",
    psychologicalNeeds: ["Contact"],
    interactionStyle: "Laissez-faire",
    strengths: ["Spontané", "Créatif", "Ludique"],
    baseExplanation: "Une Base Énergiseur réagit spontanément à son environnement et aux personnes. Le contact vivant, la variété et une communication expressive facilitent la connexion.",
    phaseExplanation: "Une Phase Énergiseur est fortement alimentée par le contact et les interactions stimulantes. Le mouvement relationnel contribue directement à la motivation.",
  },
  ACT: {
    typeName: "Promoteur",
    perception: "Actions",
    channelName: "Directif",
    channelDescription: "Aller droit au but, formuler clairement ce qui est attendu et laisser une marge d'action autour d'un résultat concret ou d'un défi.",
    psychologicalNeeds: ["Excitation"],
    interactionStyle: "Autocratique",
    strengths: ["Adaptable", "Persuasif", "Charmeur"],
    baseExplanation: "Une Base Promoteur se connecte facilement par l'action, l'opportunité et le résultat. Une communication directe et concise soutient l'efficacité de l'échange.",
    phaseExplanation: "Une Phase Promoteur recherche davantage l'excitation, le défi et l'intensité. Des objectifs stimulants et une marge de manœuvre entretiennent la motivation.",
  },
};

export const BASE_DEFINITION = "La Base correspond au premier étage de la Structure de Personnalité. Elle est considérée comme stable et indique notamment la Perception et le Canal de Communication les plus naturellement accessibles pour entrer en relation.";
export const PHASE_DEFINITION = "La Phase actuelle indique la source principale de motivation psychologique du moment. Elle renseigne sur les Besoins Psychologiques à satisfaire positivement et peut évoluer au cours de la vie.";

export const DIMENSIONS: DimensionDefinition[] = [
  { code: "ANA", name: "Type de Personnalité Analyseur", shortName: "Analyseur", color: "#2364d2", description: "Pensée logique, organisation et sens de la responsabilité.", perception: "Pensées factuelles", channel: "Canal Interrogatif", strengths: PCM_REFERENCE.ANA.strengths, watchouts: ["Sur-contrôle sous stress", "Excès de détails", "Difficulté à déléguer"], motivators: PCM_REFERENCE.ANA.psychologicalNeeds, connectionTips: ["Donner les faits", "Questionner précisément", "Clarifier le temps et les critères"] },
  { code: "CON", name: "Type de Personnalité Persévérant", shortName: "Persévérant", color: "#7c3aed", description: "Engagement, observation et attention portée aux valeurs et aux convictions.", perception: "Opinions", channel: "Canal Interrogatif", strengths: PCM_REFERENCE.CON.strengths, watchouts: ["Rigidification sous stress", "Jugement", "Exigence excessive"], motivators: PCM_REFERENCE.CON.psychologicalNeeds, connectionTips: ["Demander l'avis", "Reconnaître l'engagement", "Respecter les convictions"] },
  { code: "REL", name: "Type de Personnalité Empathique", shortName: "Empathique", color: "#e34872", description: "Sensibilité aux personnes, aux émotions et à la qualité du lien.", perception: "Émotions", channel: "Canal Nourricier", strengths: PCM_REFERENCE.REL.strengths, watchouts: ["Sur-adaptation sous stress", "Difficulté à dire non", "Dévalorisation"], motivators: PCM_REFERENCE.REL.psychologicalNeeds, connectionTips: ["Personnaliser le contact", "Montrer de la considération", "Soigner l'environnement relationnel"] },
  { code: "REF", name: "Type de Personnalité Imagineur", shortName: "Imagineur", color: "#64748b", description: "Réflexion intérieure, calme et capacité à travailler avec autonomie.", perception: "Inactions (réflexions)", channel: "Canal Directif", strengths: PCM_REFERENCE.REF.strengths, watchouts: ["Retrait sous stress", "Passivité", "Dispersion interne"], motivators: PCM_REFERENCE.REF.psychologicalNeeds, connectionTips: ["Donner une consigne claire", "Laisser du temps", "Préserver un espace calme"] },
  { code: "CRE", name: "Type de Personnalité Énergiseur", shortName: "Énergiseur", color: "#e39a16", description: "Spontanéité, créativité et réaction immédiate à l'environnement.", perception: "Réactions (j’aime / j’aime pas)", channel: "Canal Émotif", strengths: PCM_REFERENCE.CRE.strengths, watchouts: ["Blâme sous stress", "Dispersion", "Perte d'intérêt dans la routine"], motivators: PCM_REFERENCE.CRE.psychologicalNeeds, connectionTips: ["Créer du contact", "Utiliser une interaction vivante", "Laisser place à la spontanéité"] },
  { code: "ACT", name: "Type de Personnalité Promoteur", shortName: "Promoteur", color: "#008b86", description: "Action, adaptabilité et goût pour les opportunités et les défis.", perception: "Actions", channel: "Canal Directif", strengths: PCM_REFERENCE.ACT.strengths, watchouts: ["Prise de risque sous stress", "Impatience", "Contournement des règles"], motivators: PCM_REFERENCE.ACT.psychologicalNeeds, connectionTips: ["Aller à l'essentiel", "Donner un défi", "Laisser une marge de manœuvre"] },
];

export const DIMENSION_BY_CODE = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.code, dimension])) as Record<DimensionCode, DimensionDefinition>;
