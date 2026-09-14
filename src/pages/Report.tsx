import { useEffect, useMemo, useState } from "react";
import { Brand, Icon, Notice, Spinner } from "../components/Brand";
import { RadarChart, ScoreBars } from "../components/Charts";
import { StatusBadge } from "./Admin";
import { api, formatDate, navigate } from "../lib/api";
import type { AssessmentDetail, DimensionCode, Interpretation } from "../lib/model";

export default function ReportPage({ assessmentId }: { assessmentId: string }) {
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [form, setForm] = useState<Interpretation>({ synthesis: "", observations: "", actionPlan: "", trainerName: "", restitutionDate: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await api<{ assessment: AssessmentDetail }>(`/admin/assessments/${assessmentId}`);
      setDetail(result.assessment);
      setForm(result.assessment.interpretation);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Résultat introuvable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [assessmentId]);

  const save = async () => {
    setSaving(true); setMessage(""); setError("");
    try {
      await api(`/admin/assessments/${assessmentId}/interpretation`, { method: "PUT", body: JSON.stringify(form) });
      setMessage("Analyse formateur enregistrée.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally { setSaving(false); }
  };

  const markDelivered = async () => {
    await api(`/admin/assessments/${assessmentId}/status`, { method: "PUT", body: JSON.stringify({ status: "delivered" }) });
    setMessage("Restitution marquée comme réalisée.");
    await load();
  };

  if (loading) return <div className="admin-loading"><Spinner label="Préparation du rapport" /></div>;
  if (error && !detail) return <div className="report-error"><Notice type="error">{error}</Notice><button className="button button--ghost" onClick={() => navigate("/admin")}><Icon name="back"/> Retour</button></div>;
  if (!detail || !detail.scores) return <div className="report-error"><Notice type="error">Cette passation n’est pas encore terminée.</Notice><button className="button button--ghost" onClick={() => navigate("/admin")}><Icon name="back"/> Retour</button></div>;

  const byCode = Object.fromEntries(detail.dimensions.map((dimension) => [dimension.code, dimension]));
  const leadStructure = detail.scores.leadingStructure.map((code) => byCode[code]).filter(Boolean);
  const leadDynamics = detail.scores.leadingDynamics.map((code) => byCode[code]).filter(Boolean);

  return (
    <main className="report-shell">
      <header className="report-toolbar no-print">
        <button className="button button--ghost" onClick={() => navigate("/admin")}><Icon name="back"/> Tableau de bord</button>
        <div className="report-toolbar__actions"><button className="button button--soft" onClick={() => window.print()}><Icon name="printer"/> Imprimer / PDF</button>{detail.status !== "delivered" && <button className="button button--primary" onClick={markDelivered}><Icon name="check"/> Marquer restitué</button>}</div>
      </header>

      <article className="report-document">
        <ReportHeader detail={detail}/>

        {message && <div className="no-print"><Notice type="success">{message}</Notice></div>}
        {error && <div className="no-print"><Notice type="error">{error}</Notice></div>}

        <section className="report-summary">
          <div><span className="report-number">01</span><small>SYNTHÈSE DU PROFIL DÉCLARÉ</small><h2>Une lecture globale avant d’entrer dans le détail</h2><p>{form.synthesis || "La synthèse sera complétée par le formateur lors de l’analyse."}</p></div>
          <aside><span>Repère dominant</span><strong>{leadStructure.map((item) => item.shortName).join(" + ")}</strong><small>Structure déclarée</small><hr/><span>Dynamique actuelle</span><strong>{leadDynamics.map((item) => item.shortName).join(" + ")}</strong><small>À valider en entretien</small></aside>
        </section>

        <section className="report-section">
          <SectionTitle number="02" kicker="CARTOGRAPHIE" title="Intensité des six repères de communication" />
          <div className="charts-grid">
            <div className="chart-card"><h3>Vue d’ensemble</h3><p>Scores de structure déclarée sur une échelle de 0 à 100.</p><RadarChart scores={detail.scores.dimensions} dimensions={detail.dimensions}/></div>
            <div className="chart-card"><h3>Classement relatif</h3><p>La lecture porte sur l’ordre et les écarts, pas sur une norme de valeur.</p><ScoreBars scores={detail.scores.dimensions} dimensions={detail.dimensions} field="structure" /></div>
          </div>
        </section>

        <section className="report-section">
          <SectionTitle number="03" kicker="DOMINANTES" title="Repères les plus accessibles" />
          <div className="lead-grid">{leadStructure.map((dimension) => <article className="lead-card" key={dimension.code} style={{ "--dimension": dimension.color } as React.CSSProperties}><div className="lead-card__title"><span>{dimension.code}</span><div><h3>{dimension.shortName}</h3><p>{dimension.name}</p></div></div><p>{dimension.description}</p><div className="lead-columns"><div><h4>Ressources mobilisables</h4><ul>{dimension.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h4>Vigilances possibles</h4><ul>{dimension.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="channel-box"><small>CANAL DE COMMUNICATION CONSEILLÉ</small><p>{dimension.channel}</p></div></article>)}</div>
        </section>

        <section className="report-section">
          <SectionTitle number="04" kicker="DYNAMIQUE ACTUELLE" title="Ce qui semble mobiliser la personne aujourd’hui" />
          <div className="dynamic-grid"><div className="chart-card"><ScoreBars scores={detail.scores.dimensions} dimensions={detail.dimensions} field="dynamique" /></div><div className="dynamic-copy"><p>Cette mesure reflète la période récente déclarée par le participant. Elle peut évoluer et doit être confrontée à son vécu.</p>{leadDynamics.map((dimension) => <div className="motivation-item" key={dimension.code}><i style={{ background: dimension.color }}/><div><strong>{dimension.shortName}</strong><p>{dimension.motivators.join(" · ")}</p></div></div>)}</div></div>
        </section>

        <section className="report-section">
          <SectionTitle number="05" kicker="QUALITÉ DE PASSATION" title="Fiabilité des réponses à examiner" />
          <div className="quality-report"><div className={`quality-score quality-score--${detail.scores.quality.score >= 80 ? "good" : detail.scores.quality.score >= 65 ? "medium" : "low"}`}><strong>{Math.round(detail.scores.quality.score)}</strong><span>/100</span><small>{detail.scores.quality.label}</small></div><div className="quality-metrics"><QualityMetric label="Complétude" value={detail.scores.quality.completeness}/><QualityMetric label="Cohérence" value={detail.scores.quality.consistency}/><QualityMetric label="Différenciation" value={detail.scores.quality.variability}/><QualityMetric label="Rythme" value={detail.scores.quality.pace}/></div><div className="quality-flags"><h4>Points d’attention</h4>{detail.scores.quality.flags.length ? <ul>{detail.scores.quality.flags.map((flag) => <li key={flag}><Icon name="alert" size={16}/>{flag}</li>)}</ul> : <p>Aucun signal particulier détecté. La validation qualitative reste recommandée.</p>}<small>Durée : {Math.max(1, Math.round(detail.scores.quality.durationSeconds / 60))} min · réponses neutres : {Math.round(detail.scores.quality.neutralRate)} %</small></div></div>
        </section>

        <section className="report-section trainer-section">
          <SectionTitle number="06" kicker="RESTITUTION FORMATEUR" title="Analyse contextualisée et plan d’action" />
          <div className="print-interpretation">
            <ReportText label="Synthèse validée" value={form.synthesis}/><ReportText label="Observations issues de l’entretien" value={form.observations}/><ReportText label="Pistes d’action convenues" value={form.actionPlan}/>
            <div className="signature-row"><div><small>Formateur</small><strong>{form.trainerName || "À compléter"}</strong></div><div><small>Date de restitution</small><strong>{form.restitutionDate ? formatDate(form.restitutionDate) : "À compléter"}</strong></div></div>
          </div>
          <div className="trainer-form no-print">
            <label className="field"><span>Synthèse validée</span><textarea rows={5} value={form.synthesis} onChange={(e) => setForm({ ...form, synthesis: e.target.value })}/></label>
            <label className="field"><span>Observations issues de l’entretien</span><textarea rows={5} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Éléments confirmés, nuances, exemples observables…"/></label>
            <label className="field"><span>Pistes d’action convenues</span><textarea rows={4} value={form.actionPlan} onChange={(e) => setForm({ ...form, actionPlan: e.target.value })} placeholder="Deux ou trois engagements concrets…"/></label>
            <div className="field-grid"><label className="field"><span>Nom du formateur</span><input value={form.trainerName} onChange={(e) => setForm({ ...form, trainerName: e.target.value })}/></label><label className="field"><span>Date de restitution</span><input type="date" value={form.restitutionDate ?? ""} onChange={(e) => setForm({ ...form, restitutionDate: e.target.value || null })}/></label></div>
            <button className="button button--primary" onClick={save} disabled={saving}><Icon name="save"/> {saving ? "Enregistrement…" : "Enregistrer l’analyse"}</button>
          </div>
        </section>

        <footer className="report-footer"><p><strong>Note méthodologique.</strong> Ce document restitue un inventaire pédagogique original de préférences déclarées. Il ne constitue ni un diagnostic, ni un Profil PCM officiel, ni une détermination automatisée de Base ou de Phase. Toute conclusion professionnelle doit être contextualisée par un entretien conduit par un formateur qualifié.</p><span>Milliminds · Formation Communication · Réf. {detail.id.slice(0, 8).toUpperCase()}</span></footer>
      </article>
    </main>
  );
}

function ReportHeader({ detail }: { detail: AssessmentDetail }) {
  return (
    <header className="report-head">
      <div className="report-head__brand"><Brand/><span>Rapport confidentiel</span></div>
      <div className="report-head__title"><span>INVENTAIRE DE PRÉFÉRENCES</span><h1>Formation<br/>Communication</h1><p>Support d’analyse et de restitution individuelle</p></div>
      <div className="report-identity"><div><small>PARTICIPANT</small><strong>{detail.firstName} {detail.lastName}</strong><span>{detail.organization || "Organisation non renseignée"}</span></div><div><small>SESSION</small><strong>{detail.sessionName}</strong><span>Passation du {formatDate(detail.submittedAt)}</span></div><StatusBadge status={detail.status}/></div>
    </header>
  );
}

function SectionTitle({ number, kicker, title }: { number: string; kicker: string; title: string }) {
  return <div className="section-title"><span>{number}</span><div><small>{kicker}</small><h2>{title}</h2></div></div>;
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return <div><span><strong>{label}</strong><em>{Math.round(value)} %</em></span><div><i style={{ width: `${value}%` }}/></div></div>;
}

function ReportText({ label, value }: { label: string; value: string }) {
  return <div className="report-text"><small>{label}</small><p>{value || "À compléter lors de l’entretien de restitution."}</p></div>;
}
