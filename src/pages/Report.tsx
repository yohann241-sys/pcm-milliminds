import { useEffect, useMemo, useState } from "react";
import { Brand, Icon, Notice, Spinner } from "../components/Brand";
import { RadarChart, ScoreBars } from "../components/Charts";
import { StatusBadge } from "./Admin";
import { api, formatDate, navigate } from "../lib/api";
import { BASE_DEFINITION, PCM_REFERENCE, PHASE_DEFINITION, type AssessmentDetail, type DimensionCode, type Interpretation } from "../lib/model";

const emptyInterpretation: Interpretation = { synthesis: "", observations: "", actionPlan: "", trainerName: "", restitutionDate: null, baseCode: null, phaseCode: null };

export default function ReportPage({ assessmentId }: { assessmentId: string }) {
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [form, setForm] = useState<Interpretation>(emptyInterpretation);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await api<{ assessment: AssessmentDetail }>(`/admin/assessments/${assessmentId}`);
      setDetail(result.assessment);
      setForm({ ...emptyInterpretation, ...result.assessment.interpretation });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Résultat introuvable."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [assessmentId]);

  const save = async () => {
    setSaving(true); setMessage(""); setError("");
    try {
      await api(`/admin/assessments/${assessmentId}/interpretation`, { method: "PUT", body: JSON.stringify(form) });
      setMessage("Analyse PCM et validation formateur enregistrées."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  const markDelivered = async () => { await api(`/admin/assessments/${assessmentId}/status`, { method: "PUT", body: JSON.stringify({ status: "delivered" }) }); setMessage("Restitution marquée comme réalisée."); await load(); };

  if (loading) return <div className="admin-loading"><Spinner label="Préparation du rapport PCM" /></div>;
  if (error && !detail) return <div className="report-error"><Notice type="error">{error}</Notice><button className="button button--ghost" onClick={() => navigate("/admin")}><Icon name="back"/> Retour</button></div>;
  if (!detail || !detail.scores) return <div className="report-error"><Notice type="error">Cette passation n’est pas encore terminée.</Notice></div>;

  const byCode = Object.fromEntries(detail.dimensions.map((dimension) => [dimension.code, dimension])) as Record<DimensionCode, (typeof detail.dimensions)[number]>;
  const ordered = [...detail.scores.dimensions].sort((a,b) => b.structure - a.structure);
  const proposedBase = ordered[0]?.code ?? "ANA";
  const proposedPhase = [...detail.scores.dimensions].sort((a,b) => b.dynamique - a.dynamique)[0]?.code ?? "ANA";
  const baseCode = form.baseCode ?? proposedBase;
  const phaseCode = form.phaseCode ?? proposedPhase;
  const base = byCode[baseCode];
  const phase = byCode[phaseCode];
  const baseRef = PCM_REFERENCE[baseCode];
  const phaseRef = PCM_REFERENCE[phaseCode];
  const floorOrder = [...ordered].reverse();

  return (
    <main className="report-shell">
      <header className="report-toolbar no-print">
        <button className="button button--ghost" onClick={() => navigate("/admin")}><Icon name="back"/> Tableau de bord</button>
        <div className="report-toolbar__actions">
          <button className="button button--soft" onClick={() => window.print()}><Icon name="download"/> Exporter en PDF</button>
          {detail.status !== "delivered" && <button className="button button--primary" onClick={markDelivered}><Icon name="check"/> Marquer restitué</button>}
        </div>
      </header>

      <article className="report-document pcm-report">
        <ReportHeader detail={detail}/>
        {message && <div className="no-print"><Notice type="success">{message}</Notice></div>}
        {error && <div className="no-print"><Notice type="error">{error}</Notice></div>}

        <section className="pcm-hero-summary">
          <article className="pcm-identity-card pcm-base-card" style={{ "--dimension": base.color } as React.CSSProperties}>
            <span className="pcm-concept-label">BASE {form.baseCode ? "VALIDÉE" : "PROPOSÉE"}</span>
            <h2>{baseRef.typeName}</h2>
            <p>{BASE_DEFINITION}</p>
            <div className="pcm-keyline"><span>Perception</span><strong>{baseRef.perception}</strong></div>
            <div className="pcm-keyline"><span>Canal de Communication</span><strong>{baseRef.channelName}</strong></div>
          </article>
          <article className="pcm-identity-card pcm-phase-card" style={{ "--dimension": phase.color } as React.CSSProperties}>
            <span className="pcm-concept-label">PHASE ACTUELLE {form.phaseCode ? "VALIDÉE" : "PROPOSÉE"}</span>
            <h2>{phaseRef.typeName}</h2>
            <p>{PHASE_DEFINITION}</p>
            <div className="pcm-keyline"><span>Besoins Psychologiques</span><strong>{phaseRef.psychologicalNeeds.join(" · ")}</strong></div>
          </article>
        </section>

        <section className="report-section">
          <SectionTitle number="01" kicker="STRUCTURE DE PERSONNALITÉ" title="Les six Étages et la Base" />
          <div className="pcm-structure-layout">
            <div className="pcm-building" aria-label="Structure de Personnalité PCM">
              {floorOrder.map((score, index) => {
                const d = byCode[score.code]; const isBase = score.code === baseCode; const isPhase = score.code === phaseCode;
                return <div className={`pcm-floor ${isBase ? "is-base" : ""} ${isPhase ? "is-phase" : ""}`} key={score.code} style={{ "--dimension": d.color } as React.CSSProperties}>
                  <span className="pcm-floor-number">ÉTAGE {floorOrder.length-index}</span><strong>{d.shortName}</strong><em>{Math.round(score.structure)}%</em>{isBase && <b>BASE</b>}{isPhase && <b>PHASE</b>}
                </div>;
              })}
              <div className="pcm-foundation">Structure de Personnalité</div>
            </div>
            <div className="pcm-structure-copy">
              <h3>Lecture de la structure</h3>
              <p>Chaque personne possède les six Types de Personnalité dans un ordre qui lui est propre. La Base constitue le premier Étage et reste la référence privilégiée pour la connexion : <strong>Perception + Canal de Communication</strong>.</p>
              <p>Dans cet inventaire, l’ordre est calculé à partir des réponses de Structure puis validé par le formateur lors de l’entretien.</p>
              <div className="pcm-legend"><span><i className="legend-base"/> Base</span><span><i className="legend-phase"/> Phase actuelle</span></div>
            </div>
          </div>
        </section>

        <section className="report-section">
          <SectionTitle number="02" kicker="BASE" title={`${baseRef.typeName} · Perception et Canal de Communication`} />
          <div className="pcm-base-detail">
            <div className="pcm-detail-main" style={{ "--dimension": base.color } as React.CSSProperties}>
              <h3>Se connecter à la Base {baseRef.typeName}</h3><p>{baseRef.baseExplanation}</p>
              <div className="pcm-detail-grid"><div><small>PERCEPTION</small><strong>{baseRef.perception}</strong></div><div><small>CANAL</small><strong>{baseRef.channelName}</strong></div><div><small>STYLE D’INTERACTION</small><strong>{baseRef.interactionStyle}</strong></div></div>
              <div className="channel-box"><small>CANAL DE COMMUNICATION À OFFRIR</small><p>{baseRef.channelDescription}</p></div>
            </div>
            <aside className="pcm-strengths"><h3>Points Forts</h3>{baseRef.strengths.map(x => <span key={x}>{x}</span>)}</aside>
          </div>
        </section>

        <section className="report-section">
          <SectionTitle number="03" kicker="PHASE ACTUELLE" title={`${phaseRef.typeName} · Besoins Psychologiques`} />
          <div className="pcm-phase-detail" style={{ "--dimension": phase.color } as React.CSSProperties}>
            <div><h3>Ce qui motive aujourd’hui</h3><p>{phaseRef.phaseExplanation}</p></div>
            <div className="pcm-needs">{phaseRef.psychologicalNeeds.map((need) => <span key={need}>{need}</span>)}</div>
          </div>
          <div className="dynamic-grid"><div className="chart-card"><h3>Indicateurs de Phase</h3><ScoreBars scores={detail.scores.dimensions} dimensions={detail.dimensions} field="dynamique" /></div><div className="dynamic-copy"><h3>Lecture formateur</h3><p>Les scores ci-contre servent à repérer le Type de Personnalité dont les Besoins Psychologiques sont les plus saillants au moment de la passation. La Phase est ensuite confirmée pendant la restitution.</p></div></div>
        </section>

        <section className="report-section">
          <SectionTitle number="04" kicker="SIX TYPES DE PERSONNALITÉ" title="Cartographie de la Structure" />
          <div className="charts-grid"><div className="chart-card"><h3>Vue d’ensemble</h3><RadarChart scores={detail.scores.dimensions} dimensions={detail.dimensions}/></div><div className="chart-card"><h3>Ordre relatif des Étages</h3><ScoreBars scores={detail.scores.dimensions} dimensions={detail.dimensions} field="structure" /></div></div>
          <div className="pcm-type-grid">{detail.dimensions.map(d => { const ref=PCM_REFERENCE[d.code]; return <article key={d.code} style={{ "--dimension": d.color } as React.CSSProperties}><h3>{ref.typeName}</h3><p><b>Perception :</b> {ref.perception}</p><p><b>Canal :</b> {ref.channelName}</p><p><b>Points Forts :</b> {ref.strengths.join(" · ")}</p><p><b>Besoins Psychologiques :</b> {ref.psychologicalNeeds.join(" · ")}</p></article>; })}</div>
        </section>

        <section className="report-section">
          <SectionTitle number="05" kicker="QUALITÉ DE PASSATION" title="Indicateurs de cohérence" />
          <div className="quality-report"><div className={`quality-score quality-score--${detail.scores.quality.score >= 80 ? "good" : detail.scores.quality.score >= 65 ? "medium" : "low"}`}><strong>{Math.round(detail.scores.quality.score)}</strong><span>/100</span><small>{detail.scores.quality.label}</small></div><div className="quality-metrics"><QualityMetric label="Complétude" value={detail.scores.quality.completeness}/><QualityMetric label="Cohérence" value={detail.scores.quality.consistency}/><QualityMetric label="Différenciation" value={detail.scores.quality.variability}/><QualityMetric label="Rythme" value={detail.scores.quality.pace}/></div><div className="quality-flags"><h4>Points d’attention</h4>{detail.scores.quality.flags.length ? <ul>{detail.scores.quality.flags.map(flag => <li key={flag}><Icon name="alert" size={16}/>{flag}</li>)}</ul> : <p>Aucun signal particulier détecté.</p>}<small>Durée : {Math.max(1, Math.round(detail.scores.quality.durationSeconds/60))} min · réponses neutres : {Math.round(detail.scores.quality.neutralRate)} %</small></div></div>
        </section>

        <section className="report-section trainer-section">
          <SectionTitle number="06" kicker="VALIDATION FORMATEUR" title="Base, Phase et restitution" />
          <div className="print-interpretation"><div className="pcm-validation-print"><div><small>BASE VALIDÉE</small><strong>{PCM_REFERENCE[baseCode].typeName}</strong></div><div><small>PHASE ACTUELLE VALIDÉE</small><strong>{PCM_REFERENCE[phaseCode].typeName}</strong></div></div><ReportText label="Synthèse validée" value={form.synthesis}/><ReportText label="Observations issues de l’entretien" value={form.observations}/><ReportText label="Pistes d’action convenues" value={form.actionPlan}/><div className="signature-row"><div><small>Formateur</small><strong>{form.trainerName || "À compléter"}</strong></div><div><small>Date de restitution</small><strong>{form.restitutionDate ? formatDate(form.restitutionDate) : "À compléter"}</strong></div></div></div>
          <div className="trainer-form no-print">
            <div className="field-grid"><label className="field"><span>Base validée par le formateur</span><select value={form.baseCode ?? proposedBase} onChange={e => setForm({...form, baseCode:e.target.value as DimensionCode})}>{detail.dimensions.map(d => <option value={d.code} key={d.code}>{d.shortName}</option>)}</select></label><label className="field"><span>Phase actuelle validée</span><select value={form.phaseCode ?? proposedPhase} onChange={e => setForm({...form, phaseCode:e.target.value as DimensionCode})}>{detail.dimensions.map(d => <option value={d.code} key={d.code}>{d.shortName}</option>)}</select></label></div>
            <label className="field"><span>Synthèse validée</span><textarea rows={5} value={form.synthesis} onChange={e => setForm({...form,synthesis:e.target.value})}/></label>
            <label className="field"><span>Observations issues de l’entretien</span><textarea rows={5} value={form.observations} onChange={e => setForm({...form,observations:e.target.value})}/></label>
            <label className="field"><span>Pistes d’action convenues</span><textarea rows={4} value={form.actionPlan} onChange={e => setForm({...form,actionPlan:e.target.value})}/></label>
            <div className="field-grid"><label className="field"><span>Nom du formateur</span><input value={form.trainerName} onChange={e => setForm({...form,trainerName:e.target.value})}/></label><label className="field"><span>Date de restitution</span><input type="date" value={form.restitutionDate ?? ""} onChange={e => setForm({...form,restitutionDate:e.target.value || null})}/></label></div>
            <button className="button button--primary" onClick={save} disabled={saving}><Icon name="save"/> {saving ? "Enregistrement…" : "Valider la Base, la Phase et l’analyse"}</button>
          </div>
        </section>

        <footer className="report-footer"><p><strong>Cadre d’utilisation.</strong> Ce rapport utilise le vocabulaire du Process Communication Model® pour une restitution conduite par un formateur certifié. Le questionnaire intégré à cette application est un inventaire Milliminds et ne reproduit pas le questionnaire propriétaire PCM Profile ni sa clé de cotation. La Base et la Phase affichées deviennent des conclusions de restitution après validation du formateur.</p><span>Milliminds · Inventaire de personnalité PCM · Réf. {detail.id.slice(0,8).toUpperCase()}</span></footer>
      </article>
    </main>
  );
}

function ReportHeader({ detail }: { detail: AssessmentDetail }) { return <header className="report-head"><div className="report-head__brand"><Brand/><span>Rapport confidentiel</span></div><div className="report-head__title"><span>INVENTAIRE DE PERSONNALITÉ</span><h1>Process Communication<br/>Model®</h1><p>Structure · Base · Phase · Canaux de Communication</p></div><div className="report-identity"><div><small>PARTICIPANT</small><strong>{detail.firstName} {detail.lastName}</strong><span>{detail.organization || "Organisation non renseignée"}</span></div><div><small>SESSION</small><strong>{detail.sessionName}</strong><span>Passation du {formatDate(detail.submittedAt)}</span></div><StatusBadge status={detail.status}/></div></header>; }
function SectionTitle({ number, kicker, title }: { number:string;kicker:string;title:string }) { return <div className="section-title"><span>{number}</span><div><small>{kicker}</small><h2>{title}</h2></div></div>; }
function QualityMetric({ label, value }: { label:string;value:number }) { return <div><span><strong>{label}</strong><em>{Math.round(value)} %</em></span><div><i style={{width:`${value}%`}}/></div></div>; }
function ReportText({ label, value }: { label:string;value:string }) { return <div className="report-text"><small>{label}</small><p>{value || "À compléter lors de l’entretien de restitution."}</p></div>; }
