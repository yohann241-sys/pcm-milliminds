import { useEffect, useMemo, useState } from "react";
import { api, participantApi } from "../lib/api";
import type { AnswerPayload, ParticipantDraft, PublicSession } from "../lib/model";
import { Brand, Icon, Notice, Spinner } from "../components/Brand";

const DRAFT_KEY = "milliminds-pcm-draft-v124";

type ConfigResponse = { session: PublicSession; disclaimer: string };
type SavedDraft = ParticipantDraft & { answers: Record<string, number>; currentIndex: number };

function readDraft(): SavedDraft | null {
  try {
    const value = localStorage.getItem(DRAFT_KEY);
    return value ? (JSON.parse(value) as SavedDraft) : null;
  } catch {
    return null;
  }
}

export default function ParticipantPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [draft, setDraft] = useState<SavedDraft | null>(() => readDraft());
  const [receipt, setReceipt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ConfigResponse>("/public/config")
      .then(setConfig)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ParticipantShell><Spinner label="Préparation de la session" /></ParticipantShell>;
  if (receipt) return <ParticipantShell><Completion receipt={receipt} /></ParticipantShell>;
  if (draft) {
    return (
      <Questionnaire
        initial={draft}
        onCancel={() => {
          localStorage.removeItem(DRAFT_KEY);
          setDraft(null);
        }}
        onComplete={(value) => {
          localStorage.removeItem(DRAFT_KEY);
          setReceipt(value);
          setDraft(null);
        }}
      />
    );
  }

  return (
    <ParticipantShell>
      {error || !config ? (
        <div className="welcome-card"><Notice type="error">{error || "La session n’est pas disponible."}</Notice></div>
      ) : (
        <Registration
          config={config}
          onStarted={(newDraft) => {
            const saved = { ...newDraft, answers: {}, currentIndex: 0 };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
            setDraft(saved);
          }}
        />
      )}
    </ParticipantShell>
  );
}

function ParticipantShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="participant-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <header className="participant-header">
        <Brand />
        <a href="/admin" className="admin-link"><Icon name="lock" size={16}/> Espace formateur</a>
      </header>
      <div className="participant-content">{children}</div>
      <footer className="participant-footer">© {new Date().getFullYear()} Milliminds · Données confidentielles</footer>
    </main>
  );
}

function Registration({ config, onStarted }: { config: ConfigResponse; onStarted: (draft: ParticipantDraft) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [trainerEmail, setTrainerEmail] = useState(() => new URLSearchParams(window.location.search).get("formateur")?.trim().toLowerCase() ?? "");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api<ParticipantDraft>("/public/participants", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, organization, trainerEmail: trainerEmail.trim().toLowerCase(), consent }),
      });
      onStarted(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de commencer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="welcome-grid">
      <section className="welcome-copy">
        <span className="eyebrow"><Icon name="spark" size={16}/> Inventaire de personnalité PCM</span>
        <h1>Découvrir votre Structure de Personnalité</h1>
        <p className="lead">Un inventaire confidentiel centré sur les six Types de Personnalité, la Base, la Phase actuelle, les Perceptions, les Canaux de Communication et les Besoins Psychologiques.</p>
        <div className="facts-row">
          <span><Icon name="clock"/> {config.session.estimatedMinutes} minutes</span>
          <span><Icon name="file"/> {config.session.itemCount} affirmations</span>
          <span><Icon name="shield"/> Restitution encadrée</span>
        </div>
        <div className="session-card">
          <small>Session ouverte</small>
          <strong>{config.session.name}</strong>
          <span>{config.session.organization}</span>
        </div>
      </section>

      <form className="welcome-card" onSubmit={submit}>
        <div className="form-heading">
          <span className="step-kicker">IDENTIFICATION</span>
          <h2>Commencer la passation</h2>
          <p>Répondez spontanément en vous appuyant sur ce qui vous ressemble réellement.</p>
        </div>
        {error && <Notice type="error">{error}</Notice>}
        <div className="field-grid">
          <label className="field">
            <span>Prénom</span>
            <input autoComplete="given-name" required minLength={2} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
          </label>
          <label className="field">
            <span>Nom</span>
            <input autoComplete="family-name" required minLength={2} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
          </label>
        </div>
        <label className="field trainer-email-field">
          <span>E-mail de votre formateur</span>
          <input type="email" autoComplete="off" inputMode="email" required value={trainerEmail} onChange={(e) => setTrainerEmail(e.target.value)} placeholder="formateur@exemple.com" />
          <small>L’inventaire sera automatiquement attribué à ce formateur dans son espace personnel.</small>
        </label>
        <label className="field">
          <span>Organisation <em>facultatif</em></span>
          <input autoComplete="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Entreprise ou groupe" />
        </label>
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>J’accepte que mes réponses soient enregistrées pour préparer une restitution individuelle par le formateur.</span>
        </label>
        <button className="button button--primary button--wide" disabled={submitting || !consent}>
          {submitting ? "Ouverture…" : <>Commencer <Icon name="arrow"/></>}
        </button>
        <details className="legal-note">
          <summary>Cadre de l’inventaire</summary>
          <p>{config.disclaimer}</p>
        </details>
      </form>
    </div>
  );
}

function Questionnaire({ initial, onComplete, onCancel }: { initial: SavedDraft; onComplete: (receipt: string) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial.answers ?? {});
  const [index, setIndex] = useState(initial.currentIndex ?? 0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const question = initial.questions[index];
  const total = initial.questions.length;
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / total) * 100);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...initial, answers, currentIndex: index }));
  }, [answers, index, initial]);

  const currentValue = question ? answers[question.id] : undefined;
  const scale = useMemo(() => [
    { value: 1, short: "Pas du tout", number: "1" },
    { value: 2, short: "Peu", number: "2" },
    { value: 3, short: "Moyennement", number: "3" },
    { value: 4, short: "Plutôt", number: "4" },
    { value: 5, short: "Tout à fait", number: "5" },
  ], []);

  const choose = (value: number) => {
    if (!question) return;
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    setSaving(true);
    participantApi(`/public/assessments/${initial.assessmentId}/progress`, initial.accessToken, {
      method: "PUT",
      body: JSON.stringify({ answers: [{ questionId: question.id, value }] }),
    }).catch(() => undefined).finally(() => setSaving(false));
    if (index < total - 1) window.setTimeout(() => setIndex((current) => Math.min(total - 1, current + 1)), 180);
  };

  const submit = async () => {
    if (answered !== total) {
      const missing = initial.questions.findIndex((item) => answers[item.id] === undefined);
      setIndex(missing >= 0 ? missing : index);
      setError("Répondez à toutes les affirmations avant de terminer.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload: AnswerPayload[] = initial.questions.map((item) => ({ questionId: item.id, value: answers[item.id] }));
      const result = await participantApi<{ receipt: string }>(`/public/assessments/${initial.assessmentId}/submit`, initial.accessToken, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      onComplete(result.receipt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La finalisation a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) return <ParticipantShell><Notice type="error">Le questionnaire n’a pas pu être chargé.</Notice></ParticipantShell>;

  return (
    <main className="questionnaire-shell">
      <header className="questionnaire-header">
        <Brand compact />
        <div className="questionnaire-person"><span>{initial.firstName} {initial.lastName}</span><small>{saving ? "Enregistrement…" : "Progression enregistrée"}</small></div>
      </header>
      <div className="progress-line"><span style={{ width: `${progress}%` }}/></div>
      <section className="question-stage">
        <div className="question-meta">
          <span>{question.kind === "dynamique" ? "PHASE ACTUELLE · BESOINS PSYCHOLOGIQUES" : "STRUCTURE DE PERSONNALITÉ"}</span>
          <strong>{index + 1} <em>/ {total}</em></strong>
        </div>
        <article className="question-card" key={question.id}>
          <p className="question-instruction">Dans quelle mesure cette affirmation vous correspond-elle&nbsp;?</p>
          <h1>{question.wording}</h1>
          <div className="likert" role="radiogroup" aria-label="Choisissez une réponse de 1 à 5">
            {scale.map((option) => (
              <button
                type="button"
                role="radio"
                aria-checked={currentValue === option.value}
                className={`likert-option ${currentValue === option.value ? "is-selected" : ""}`}
                onClick={() => choose(option.value)}
                key={option.value}
              >
                <span>{option.number}</span><small>{option.short}</small>
              </button>
            ))}
          </div>
        </article>
        {error && <Notice type="error">{error}</Notice>}
        <div className="question-actions">
          <button className="button button--ghost" type="button" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}><Icon name="back"/> Précédent</button>
          {index === total - 1 ? (
            <button className="button button--primary" type="button" disabled={submitting || answered !== total} onClick={submit}>{submitting ? "Finalisation…" : <>Terminer <Icon name="check"/></>}</button>
          ) : (
            <button className="button button--ghost" type="button" onClick={() => setIndex((current) => Math.min(total - 1, current + 1))}>{currentValue === undefined ? "Passer" : "Suivant"} <Icon name="arrow"/></button>
          )}
        </div>
        <div className="answered-count">{answered} réponse{answered > 1 ? "s" : ""} sur {total}</div>
      </section>
      <button className="quit-link" onClick={onCancel}>Abandonner cette passation</button>
    </main>
  );
}

function Completion({ receipt }: { receipt: string }) {
  return (
    <div className="completion-card">
      <span className="completion-icon"><Icon name="check" size={34}/></span>
      <span className="eyebrow">PASSATION TERMINÉE</span>
      <h1>Merci, vos réponses sont enregistrées.</h1>
      <p>Votre inventaire a été automatiquement attribué au formateur dont vous avez renseigné l’adresse e-mail. Il pourra analyser votre Structure de Personnalité, la Base proposée et la Phase actuelle proposée afin de préparer la restitution. Les résultats ne sont pas affichés automatiquement afin de préserver la qualité de la restitution.</p>
      <div className="receipt"><small>Référence confidentielle</small><strong>{receipt}</strong></div>
      <p className="completion-note">Vous pouvez fermer cette page en toute sécurité.</p>
    </div>
  );
}
