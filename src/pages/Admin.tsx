import { useEffect, useMemo, useState } from "react";
import { Brand, Icon, Notice, Spinner } from "../components/Brand";
import { api, formatDate, navigate } from "../lib/api";
import type { AssessmentListItem, DimensionDefinition } from "../lib/model";

type AdminTab = "overview" | "results" | "sessions" | "method";
type DashboardData = {
  summary: { total: number; pending: number; reviewed: number; delivered: number; avgQuality: number };
  recent: AssessmentListItem[];
  dimensions: DimensionDefinition[];
  sessions: Array<{ id: string; name: string; organization: string; active: boolean; version: string; participantCount: number; createdAt: string }>;
};

export default function AdminPage() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    api<{ authenticated: boolean; email: string }>("/admin/me")
      .then((data) => { setEmail(data.email); setAuth("in"); })
      .catch(() => setAuth("out"));
  }, []);

  if (auth === "loading") return <div className="admin-loading"><Spinner label="Vérification de l’accès" /></div>;
  if (auth === "out") return <AdminLogin onAuthenticated={(value) => { setEmail(value); setAuth("in"); }} />;
  return <AdminWorkspace email={email} onLogout={() => setAuth("out")} />;
}

function AdminLogin({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api<{ email: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(result.email);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <Brand />
        <div>
          <span className="eyebrow eyebrow--light">ESPACE PROFESSIONNEL</span>
          <h1>Analyse et restitution des inventaires</h1>
          <p>Un environnement confidentiel réservé aux formateurs habilités par Milliminds.</p>
        </div>
        <blockquote>« Observer les préférences pour mieux ajuster la relation. »</blockquote>
      </section>
      <section className="login-form-panel">
        <a href="/" className="back-home"><Icon name="back" size={17}/> Retour à la passation</a>
        <form className="login-card" onSubmit={submit}>
          <span className="login-icon"><Icon name="lock" size={25}/></span>
          <h2>Connexion formateur</h2>
          <p>Accédez aux résultats, analyses et comptes rendus de restitution.</p>
          {error && <Notice type="error">{error}</Notice>}
          <label className="field"><span>Adresse e-mail</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="formateur@milliminds.com" /></label>
          <label className="field"><span>Mot de passe</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••••" /></label>
          <button className="button button--primary button--wide" disabled={loading}>{loading ? "Connexion…" : <>Accéder à l’espace <Icon name="arrow"/></>}</button>
          <small className="security-copy"><Icon name="shield" size={15}/> Session chiffrée et limitée à huit heures</small>
        </form>
      </section>
    </main>
  );
}

function AdminWorkspace({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, assessmentResult] = await Promise.all([
        api<DashboardData>("/admin/dashboard"),
        api<{ assessments: AssessmentListItem[] }>("/admin/assessments"),
      ]);
      setDashboard(dashboardResult);
      setAssessments(assessmentResult.assessments);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await api("/admin/logout", { method: "POST" }).catch(() => undefined);
    onLogout();
  };

  const filtered = useMemo(() => assessments.filter((item) => {
    const haystack = `${item.firstName} ${item.lastName} ${item.organization ?? ""} ${item.sessionName}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!status || item.status === status);
  }), [assessments, search, status]);

  const items: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: "overview", label: "Vue d’ensemble", icon: "chart" },
    { id: "results", label: "Inventaires", icon: "users" },
    { id: "sessions", label: "Séminaires", icon: "file" },
    { id: "method", label: "Référentiel", icon: "settings" },
  ];

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Brand />
        <nav>
          <small>PILOTAGE</small>
          {items.map((item) => <button key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => { setTab(item.id); setMenuOpen(false); }}><Icon name={item.icon}/>{item.label}</button>)}
        </nav>
        <div className="sidebar-user"><span>{email.slice(0, 1).toUpperCase()}</span><div><strong>Administrateur</strong><small>{email}</small></div></div>
        <button className="sidebar-logout" onClick={logout}><Icon name="logout"/> Déconnexion</button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div><span>Milliminds</span><strong>{items.find((item) => item.id === tab)?.label}</strong></div>
          <a className="button button--soft" href="/" target="_blank" rel="noreferrer">Ouvrir la passation <Icon name="arrow" size={17}/></a>
        </header>
        <div className="admin-content">
          {loading && <Spinner label="Chargement des données" />}
          {error && <Notice type="error">{error}</Notice>}
          {!loading && dashboard && tab === "overview" && <Overview dashboard={dashboard} openResults={() => setTab("results")} />}
          {!loading && dashboard && tab === "results" && <ResultsList assessments={filtered} search={search} setSearch={setSearch} status={status} setStatus={setStatus} />}
          {!loading && dashboard && tab === "sessions" && <Sessions sessions={dashboard.sessions} onChanged={load} />}
          {!loading && dashboard && tab === "method" && <Methodology dimensions={dashboard.dimensions} />}
        </div>
      </main>
    </div>
  );
}

function Overview({ dashboard, openResults }: { dashboard: DashboardData; openResults: () => void }) {
  const cards = [
    { label: "Inventaires", value: dashboard.summary.total, detail: "Toutes sessions", tone: "blue", icon: "users" },
    { label: "À analyser", value: dashboard.summary.pending, detail: "Restitution à préparer", tone: "amber", icon: "file" },
    { label: "Analysés", value: dashboard.summary.reviewed, detail: "Notes formateur saisies", tone: "violet", icon: "chart" },
    { label: "Restitués", value: dashboard.summary.delivered, detail: "Entretiens finalisés", tone: "green", icon: "check" },
  ];
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">TABLEAU DE BORD</span><h1>Bonjour, Monsieur Yohann</h1><p>Suivez les passations et préparez les restitutions individuelles.</p></div><div className="date-chip">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date())}</div></div>
      <section className="metric-grid">
        {cards.map((card) => <article className={`metric-card metric-card--${card.tone}`} key={card.label}><span className="metric-icon"><Icon name={card.icon}/></span><div><small>{card.label}</small><strong>{card.value}</strong><em>{card.detail}</em></div></article>)}
      </section>
      <section className="overview-grid">
        <article className="panel panel--large">
          <div className="panel-heading"><div><h2>Passations récentes</h2><p>Dernières activités enregistrées</p></div><button className="text-button" onClick={openResults}>Voir tout <Icon name="arrow" size={16}/></button></div>
          <AssessmentTable assessments={dashboard.recent} compact />
        </article>
        <aside className="panel quality-panel">
          <span className="quality-gauge" style={{ "--gauge": `${dashboard.summary.avgQuality * 3.6}deg` } as React.CSSProperties}><strong>{Math.round(dashboard.summary.avgQuality || 0)}</strong><small>/100</small></span>
          <h2>Qualité moyenne</h2>
          <p>Indice de cohérence des passations terminées.</p>
          <div className="quality-legend"><span><i className="dot dot--green"/> ≥ 80 élevée</span><span><i className="dot dot--amber"/> 65–79 satisfaisante</span><span><i className="dot dot--red"/> &lt; 65 à examiner</span></div>
        </aside>
      </section>
      <section className="panel active-session-panel">
        <div><span className="live-dot"/><small>SESSION PARTICIPANT ACTIVE</small><h2>{dashboard.sessions.find((session) => session.active)?.name ?? "Aucune session active"}</h2><p>{dashboard.sessions.find((session) => session.active)?.organization ?? "Activez une session depuis l’onglet Séminaires."}</p></div>
        <a className="button button--dark" href="/" target="_blank" rel="noreferrer">Copier le lien de passation <Icon name="arrow"/></a>
      </section>
    </>
  );
}

function ResultsList({ assessments, search, setSearch, status, setStatus }: { assessments: AssessmentListItem[]; search: string; setSearch: (v: string) => void; status: string; setStatus: (v: string) => void }) {
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">RÉSULTATS</span><h1>Inventaires des participants</h1><p>Consultez, analysez et préparez chaque entretien.</p></div><a className="button button--soft" href="/api/admin/export"><Icon name="download"/> Exporter CSV</a></div>
      <section className="panel">
        <div className="filters"><label className="search-field"><Icon name="search"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un participant…" /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous les statuts</option><option value="submitted">À analyser</option><option value="reviewed">Analysé</option><option value="delivered">Restitué</option><option value="draft">En cours</option></select><span className="result-count">{assessments.length} résultat{assessments.length > 1 ? "s" : ""}</span></div>
        <AssessmentTable assessments={assessments} />
      </section>
    </>
  );
}

function AssessmentTable({ assessments, compact = false }: { assessments: AssessmentListItem[]; compact?: boolean }) {
  if (!assessments.length) return <div className="empty-state"><Icon name="users" size={34}/><h3>Aucune passation</h3><p>Les participants apparaîtront ici dès leur inscription.</p></div>;
  return (
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Participant</th><th>Session</th><th>Dominante</th><th>Qualité</th><th>Statut</th><th></th></tr></thead><tbody>
      {assessments.map((item) => <tr key={item.id}><td><button className="participant-cell" onClick={() => navigate(`/admin/result/${item.id}`)}><span>{item.firstName.slice(0, 1)}{item.lastName.slice(0, 1)}</span><div><strong>{item.firstName} {item.lastName}</strong><small>{item.organization || formatDate(item.submittedAt, true)}</small></div></button></td><td><span className="session-name">{item.sessionName}</span></td><td><div className="dominant-tags">{item.leadingStructure.length ? item.leadingStructure.map((code) => <i key={code}>{code}</i>) : <small>En cours</small>}</div></td><td><QualityBadge value={item.qualityScore}/></td><td><StatusBadge status={item.status}/></td><td><button className="row-arrow" aria-label="Voir le résultat" onClick={() => navigate(`/admin/result/${item.id}`)}><Icon name="arrow"/></button></td></tr>)}
    </tbody></table>{compact && assessments.length > 5 ? <small>Affichage limité aux éléments récents.</small> : null}</div>
  );
}

function QualityBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="quality-badge quality-badge--muted">—</span>;
  const tone = value >= 80 ? "good" : value >= 65 ? "medium" : "low";
  return <span className={`quality-badge quality-badge--${tone}`}>{Math.round(value)}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { draft: "En cours", submitted: "À analyser", reviewed: "Analysé", delivered: "Restitué" };
  return <span className={`status status--${status}`}>{labels[status] ?? status}</span>;
}

function Sessions({ sessions, onChanged }: { sessions: DashboardData["sessions"]; onChanged: () => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("Milliminds");
  const [message, setMessage] = useState("");

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    await api("/admin/sessions", { method: "POST", body: JSON.stringify({ name, organization }) });
    setName(""); setCreating(false); setMessage("Session créée."); await onChanged();
  };
  const activate = async (id: string) => {
    await api(`/admin/sessions/${id}/activate`, { method: "PUT", body: "{}" });
    setMessage("La session participant est maintenant active."); await onChanged();
  };

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">ORGANISATION</span><h1>Sessions de séminaire</h1><p>Une seule session est ouverte aux participants à la fois.</p></div><button className="button button--primary" onClick={() => setCreating(!creating)}><Icon name="plus"/> Nouvelle session</button></div>
      {message && <Notice type="success">{message}</Notice>}
      {creating && <form className="panel session-form" onSubmit={create}><div><h2>Créer une session</h2><p>Elle sera créée en attente. Vous pourrez ensuite l’activer.</p></div><label className="field"><span>Nom du séminaire</span><input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Séminaire Leadership — Octobre 2026"/></label><label className="field"><span>Organisation</span><input required value={organization} onChange={(e) => setOrganization(e.target.value)}/></label><div className="form-actions"><button type="button" className="button button--ghost" onClick={() => setCreating(false)}>Annuler</button><button className="button button--primary">Créer</button></div></form>}
      <div className="session-list">{sessions.map((session) => <article className={`panel session-item ${session.active ? "is-active" : ""}`} key={session.id}><div className="session-state">{session.active ? <><span className="live-dot"/> Active</> : "En attente"}</div><div className="session-main"><small>VERSION {session.version}</small><h2>{session.name}</h2><p>{session.organization} · créée le {formatDate(session.createdAt)}</p></div><div className="session-count"><strong>{session.participantCount}</strong><small>participant{session.participantCount > 1 ? "s" : ""}</small></div>{!session.active && <button className="button button--soft" onClick={() => activate(session.id)}>Activer</button>}</article>)}</div>
    </>
  );
}

function Methodology({ dimensions }: { dimensions: DimensionDefinition[] }) {
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">RÉFÉRENTIEL</span><h1>Cadre d’interprétation</h1><p>Repères communs pour une restitution rigoureuse et nuancée.</p></div></div>
      <Notice type="info"><strong>Positionnement.</strong> Cet inventaire pédagogique original éclaire des préférences déclarées. Il ne produit pas de Base, de Phase ou de Profil PCM officiel et ne remplace pas un questionnaire licencié.</Notice>
      <section className="method-intro-grid"><article className="panel"><span className="panel-icon"><Icon name="chart"/></span><h2>Structure déclarée</h2><p>54 affirmations portent sur les habitudes de communication. Les scores donnent une intensité relative, jamais une étiquette exclusive.</p></article><article className="panel"><span className="panel-icon"><Icon name="spark"/></span><h2>Dynamique actuelle</h2><p>18 affirmations explorent les sources de mobilisation du moment. Cette lecture est temporelle et doit être validée en entretien.</p></article><article className="panel"><span className="panel-icon"><Icon name="shield"/></span><h2>Qualité de passation</h2><p>Cohérence interne, variété des réponses, taux de neutralité, complétude et durée servent d’indicateurs de vigilance.</p></article></section>
      <section className="dimension-grid">{dimensions.map((dimension) => <article className="dimension-card" key={dimension.code} style={{ "--dimension": dimension.color } as React.CSSProperties}><div className="dimension-card__head"><span>{dimension.code}</span><div><h2>{dimension.shortName}</h2><p>{dimension.name}</p></div></div><p>{dimension.description}</p><dl><div><dt>Lecture privilégiée</dt><dd>{dimension.perception}</dd></div><div><dt>Canal conseillé</dt><dd>{dimension.channel}</dd></div><div><dt>Ressources</dt><dd>{dimension.strengths.join(" · ")}</dd></div><div><dt>Points de vigilance</dt><dd>{dimension.watchouts.join(" · ")}</dd></div></dl></article>)}</section>
    </>
  );
}
