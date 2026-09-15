import { useEffect, useMemo, useState } from "react";
import { getUser as getIdentityUser, login as identityLogin, logout as identityLogout, requestPasswordRecovery } from "@netlify/identity";
import { Brand, Icon, Notice, Spinner } from "../components/Brand";
import { api, formatDate, navigate } from "../lib/api";
import type { AssessmentListItem, DimensionDefinition } from "../lib/model";

type AdminTab = "overview" | "results" | "trainers" | "sessions" | "method";

function isRateLimitError(reason: unknown) {
  const status = typeof reason === "object" && reason !== null && "status" in reason
    ? Number((reason as { status?: unknown }).status)
    : 0;
  const message = reason instanceof Error ? reason.message.toLowerCase() : String(reason ?? "").toLowerCase();
  return status === 429 || message.includes("rate limit") || message.includes("too many requests");
}

const RATE_LIMIT_MESSAGE =
  "Trop de tentatives ont été effectuées. Netlify a temporairement limité les connexions. Patientez quelques minutes avant de réessayer et évitez de cliquer plusieurs fois.";

function hasAdminRole(roles: string[] | undefined, primaryRole?: string) {
  const normalized = new Set([...(roles ?? []), ...(primaryRole ? [primaryRole] : [])].map((role) => String(role).toLowerCase()));
  return ["admin", "superadmin", "formateur"].some((role) => normalized.has(role));
}

function hasGlobalAdminRole(roles: string[] | undefined, primaryRole?: string) {
  const normalized = new Set([...(roles ?? []), ...(primaryRole ? [primaryRole] : [])].map((role) => String(role).toLowerCase()));
  return normalized.has("admin") || normalized.has("superadmin");
}


type TrainerDirectoryItem = {
  email: string;
  displayName: string | null;
  source: string;
  isTrainer: boolean;
  roles: string[];
  inventoryCount: number;
  pendingCount: number;
  reviewedCount: number;
  deliveredCount: number;
  lastActivity: string | null;
};

type DashboardData = {
  viewer: { email: string; roles: string[]; isAdmin: boolean; isTrainer: boolean; scope: "global" | "personal" };
  summary: { total: number; pending: number; reviewed: number; delivered: number; avgQuality: number };
  recent: AssessmentListItem[];
  dimensions: DimensionDefinition[];
  sessions: Array<{ id: string; name: string; organization: string; active: boolean; version: string; participantCount: number; createdAt: string; ownerEmail: string | null }>;
  trainers: TrainerDirectoryItem[];
};

export default function AdminPage() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [email, setEmail] = useState("");
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  useEffect(() => {
    getIdentityUser()
      .then((user) => {
        if (!user?.email || !hasAdminRole(user.roles, user.role)) {
          setAuth("out");
          return;
        }
        setEmail(user.email);
        setIsGlobalAdmin(hasGlobalAdminRole(user.roles, user.role));
        setAuth("in");
      })
      .catch(() => setAuth("out"));
  }, []);

  if (auth === "loading") return <div className="admin-loading"><Spinner label="Vérification de l’accès" /></div>;
  if (auth === "out") return <AdminLogin />;
  return <AdminWorkspace email={email} initialIsAdmin={isGlobalAdmin} />;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "forgot") {
      await recover();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await identityLogin(email.trim().toLowerCase(), password);
      if (!user?.email) {
        throw new Error("Connexion Netlify Identity incomplète.");
      }
      if (!hasAdminRole(user.roles, user.role)) {
        await identityLogout().catch(() => undefined);
        setError("Compte reconnu, mais le rôle admin, superadmin ou formateur est absent.");
        return;
      }
      window.location.href = "/admin";
    } catch (reason) {
      if (isRateLimitError(reason)) {
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError(reason instanceof Error ? reason.message : "Connexion impossible.");
      }
    } finally {
      setLoading(false);
    }
  };

  const recover = async () => {
    setError("");
    setRecoverySent(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Saisissez d'abord votre adresse e-mail.");
      return;
    }
    setRecoveryLoading(true);
    try {
      await requestPasswordRecovery(normalizedEmail);
      setRecoverySent(true);
    } catch (reason) {
      if (isRateLimitError(reason)) {
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError(reason instanceof Error ? reason.message : "L'e-mail de réinitialisation n'a pas pu être envoyé.");
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  const showForgot = () => {
    setMode("forgot");
    setError("");
    setRecoverySent(false);
    setPassword("");
  };

  const showLogin = () => {
    setMode("login");
    setError("");
    setRecoverySent(false);
  };

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <Brand />
        <div>
          <span className="eyebrow eyebrow--light">ESPACE PROFESSIONNEL</span>
          <h1>Analyse et restitution PCM</h1>
          <p>Un environnement confidentiel réservé aux formateurs habilités par Milliminds.</p>
        </div>
        <blockquote>« Pour la Base : Perception + Canal. Pour la Phase : Besoins Psychologiques. »</blockquote>
      </section>
      <section className="login-form-panel">
        <a href="/" className="back-home"><Icon name="back" size={17}/> Retour à la passation</a>
        <form className="login-card" onSubmit={submit}>
          <span className="login-icon"><Icon name="lock" size={25}/></span>
          <h2>{mode === "forgot" ? "Réinitialiser le mot de passe" : "Connexion formateur"}</h2>
          <p>
            {mode === "forgot"
              ? "Saisissez l'adresse e-mail enregistrée dans Netlify Identity. Vous recevrez un lien sécurisé pour créer un nouveau mot de passe."
              : "Accédez aux résultats, analyses et comptes rendus de restitution."}
          </p>
          {error && <Notice type="error">{error}</Notice>}
          {recoverySent && <Notice type="success">E-mail envoyé. Ouvrez le lien reçu : l'application affichera directement l'écran « Nouveau mot de passe ».</Notice>}
          <label className="field">
            <span>Adresse e-mail</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="formateur@milliminds.com" />
          </label>
          {mode === "login" && (
            <label className="field">
              <span>Mot de passe</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••••" />
            </label>
          )}
          {mode === "login" ? (
            <>
              <button className="button button--primary button--wide" disabled={loading}>{loading ? "Connexion…" : <>Accéder à l’espace <Icon name="arrow"/></>}</button>
              <button className="password-recovery-button" type="button" onClick={showForgot}>
                <Icon name="lock" size={17}/> Mot de passe oublié ?
              </button>
            </>
          ) : (
            <>
              <button className="button button--primary button--wide" disabled={recoveryLoading}>
                {recoveryLoading ? "Envoi…" : <>Envoyer le lien de réinitialisation <Icon name="arrow"/></>}
              </button>
              <button className="password-recovery-back" type="button" onClick={showLogin}>
                <Icon name="back" size={17}/> Retour à la connexion
              </button>
            </>
          )}
          <small className="security-copy"><Icon name="shield" size={15}/> Authentification sécurisée par Netlify Identity</small>
          <small className="build-version">Version 1.2.4</small>
        </form>
      </section>
    </main>
  );
}

function AdminWorkspace({ email, initialIsAdmin }: { email: string; initialIsAdmin: boolean }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = dashboard?.viewer.isAdmin ?? initialIsAdmin;

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
    await identityLogout().catch(() => undefined);
    window.location.href = "/admin";
  };

  const deleteInventory = async (item: AssessmentListItem) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Supprimer définitivement l’inventaire de ${item.firstName} ${item.lastName} ?\n\nCette action efface les réponses, l’analyse et le rapport associés.`);
    if (!confirmed) return;
    setError("");
    try {
      await api(`/admin/assessments/${item.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  };

  const filtered = useMemo(() => assessments.filter((item) => {
    const haystack = `${item.firstName} ${item.lastName} ${item.organization ?? ""} ${item.sessionName} ${item.trainerEmail ?? ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!status || item.status === status);
  }), [assessments, search, status]);

  const items: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: "overview", label: isAdmin ? "Vue d’ensemble" : "Mon tableau de bord", icon: "chart" },
    { id: "results", label: isAdmin ? "Tous les inventaires" : "Mes inventaires", icon: "users" },
    ...(isAdmin ? [{ id: "trainers" as AdminTab, label: "Formateurs", icon: "users" }] : []),
    { id: "sessions", label: isAdmin ? "Séminaires" : "Mes séminaires", icon: "file" },
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
        <div className="sidebar-user"><span>{email.slice(0, 1).toUpperCase()}</span><div><strong>{isAdmin ? "Administrateur" : "Formateur"}</strong><small>{email}</small></div></div>
        <button className="sidebar-logout" onClick={logout}><Icon name="logout"/> Déconnexion</button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div><span>Milliminds</span><strong>{items.find((item) => item.id === tab)?.label}</strong></div>
          <a className="button button--soft" href={isAdmin ? "/" : `/?formateur=${encodeURIComponent(email)}`} target="_blank" rel="noreferrer">{isAdmin ? "Ouvrir la passation" : "Ma passation personnalisée"} <Icon name="arrow" size={17}/></a>
        </header>
        <div className="admin-content">
          {loading && <Spinner label="Chargement des données" />}
          {error && <Notice type="error">{error}</Notice>}
          {!loading && dashboard && tab === "overview" && <Overview dashboard={dashboard} openResults={() => setTab("results")} />}
          {!loading && dashboard && tab === "results" && <ResultsList assessments={filtered} search={search} setSearch={setSearch} status={status} setStatus={setStatus} isAdmin={isAdmin} onDelete={deleteInventory} />}
          {!loading && dashboard && isAdmin && tab === "trainers" && <TrainersDirectory trainers={dashboard.trainers} />}
          {!loading && dashboard && tab === "sessions" && <Sessions sessions={dashboard.sessions} onChanged={load} />}
          {!loading && dashboard && tab === "method" && <Methodology dimensions={dashboard.dimensions} />}
        </div>
      </main>
    </div>
  );
}

function Overview({ dashboard, openResults }: { dashboard: DashboardData; openResults: () => void }) {
  const cards = [
    { label: dashboard.viewer.isAdmin ? "Inventaires" : "Mes inventaires", value: dashboard.summary.total, detail: dashboard.viewer.isAdmin ? "Toutes sessions" : "Mes sessions", tone: "blue", icon: "users" },
    { label: "À analyser", value: dashboard.summary.pending, detail: "Restitution à préparer", tone: "amber", icon: "file" },
    { label: "Analysés", value: dashboard.summary.reviewed, detail: "Notes formateur saisies", tone: "violet", icon: "chart" },
    { label: "Restitués", value: dashboard.summary.delivered, detail: "Entretiens finalisés", tone: "green", icon: "check" },
  ];
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">{dashboard.viewer.isAdmin ? "TABLEAU DE BORD ADMINISTRATEUR" : "TABLEAU DE BORD FORMATEUR"}</span><h1>{dashboard.viewer.isAdmin ? "Pilotage global des inventaires" : "Mon espace formateur"}</h1><p>{dashboard.viewer.isAdmin ? "Vous voyez l’ensemble des inventaires, des formateurs, des sessions et des restitutions." : "Vous voyez uniquement les inventaires pour lesquels les participants ont renseigné votre adresse e-mail de formateur."}</p></div><div className="date-chip">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date())}</div></div>
      <section className="metric-grid">
        {cards.map((card) => <article className={`metric-card metric-card--${card.tone}`} key={card.label}><span className="metric-icon"><Icon name={card.icon}/></span><div><small>{card.label}</small><strong>{card.value}</strong><em>{card.detail}</em></div></article>)}
      </section>
      <section className="overview-grid">
        <article className="panel panel--large">
          <div className="panel-heading"><div><h2>Passations récentes</h2><p>Dernières activités enregistrées</p></div><button className="text-button" onClick={openResults}>Voir tout <Icon name="arrow" size={16}/></button></div>
          <AssessmentTable assessments={dashboard.recent} compact isAdmin={dashboard.viewer.isAdmin} />
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
        <a className="button button--dark" href={dashboard.viewer.isAdmin ? "/" : `/?formateur=${encodeURIComponent(dashboard.viewer.email)}`} target="_blank" rel="noreferrer">{dashboard.viewer.isAdmin ? "Ouvrir le lien de passation" : "Ouvrir mon lien prérempli"} <Icon name="arrow"/></a>
      </section>
    </>
  );
}

function ResultsList({ assessments, search, setSearch, status, setStatus, isAdmin, onDelete }: { assessments: AssessmentListItem[]; search: string; setSearch: (v: string) => void; status: string; setStatus: (v: string) => void; isAdmin: boolean; onDelete: (item: AssessmentListItem) => Promise<void> }) {
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">RÉSULTATS</span><h1>{isAdmin ? "Tous les inventaires" : "Mes inventaires"}</h1><p>{isAdmin ? "Consultez l’ensemble des inventaires, leur formateur attribué et administrez les données." : "Consultez les inventaires que les participants ont directement attribués à votre adresse e-mail."}</p></div><a className="button button--soft" href="/api/admin/export"><Icon name="download"/> Exporter CSV</a></div>
      {isAdmin && <Notice type="info"><strong>Droit administrateur.</strong> Vous pouvez supprimer définitivement un inventaire. Cette action efface également ses réponses et sa restitution associée.</Notice>}
      <section className="panel">
        <div className="filters"><label className="search-field"><Icon name="search"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un participant…" /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous les statuts</option><option value="submitted">À analyser</option><option value="reviewed">Analysé</option><option value="delivered">Restitué</option><option value="draft">En cours</option></select><span className="result-count">{assessments.length} résultat{assessments.length > 1 ? "s" : ""}</span></div>
        <AssessmentTable assessments={assessments} isAdmin={isAdmin} onDelete={onDelete} />
      </section>
    </>
  );
}

function AssessmentTable({ assessments, compact = false, isAdmin = false, onDelete }: { assessments: AssessmentListItem[]; compact?: boolean; isAdmin?: boolean; onDelete?: (item: AssessmentListItem) => Promise<void> }) {
  if (!assessments.length) return <div className="empty-state"><Icon name="users" size={34}/><h3>Aucune passation</h3><p>Les participants apparaîtront ici dès leur inscription.</p></div>;
  return (
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Participant</th><th>Session</th>{isAdmin && <th>Formateur attribué</th>}<th>Base proposée</th><th>Qualité</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
      {assessments.map((item) => <tr key={item.id}><td><button className="participant-cell" onClick={() => navigate(`/admin/result/${item.id}`)}><span>{item.firstName.slice(0, 1)}{item.lastName.slice(0, 1)}</span><div><strong>{item.firstName} {item.lastName}</strong><small>{item.organization || formatDate(item.submittedAt, true)}</small></div></button></td><td><span className="session-name">{item.sessionName}</span></td>{isAdmin && <td><span className="trainer-assignment">{item.trainerEmail || "Non attribué"}</span></td>}<td><div className="dominant-tags">{item.leadingStructure.length ? item.leadingStructure.map((code) => <i key={code}>{code}</i>) : <small>En cours</small>}</div></td><td><QualityBadge value={item.qualityScore}/></td><td><StatusBadge status={item.status}/></td><td><div className="row-actions"><button className="row-arrow" aria-label="Voir le résultat" onClick={() => navigate(`/admin/result/${item.id}`)}><Icon name="arrow"/></button>{isAdmin && onDelete && <button className="row-delete" aria-label="Supprimer l’inventaire" title="Supprimer définitivement" onClick={() => onDelete(item)}><Icon name="trash" size={17}/></button>}</div></td></tr>)}
    </tbody></table>{compact && assessments.length > 5 ? <small>Affichage limité aux éléments récents.</small> : null}</div>
  );
}

function TrainersDirectory({ trainers }: { trainers: TrainerDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = trainers.filter((trainer) => {
    const haystack = `${trainer.email} ${trainer.displayName ?? ""}`.toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  });
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Liste des formateurs</h1><p>Cette liste regroupe les formateurs reconnus dans l’application et les adresses e-mail auxquelles des participants ont attribué un inventaire.</p></div><div className="trainer-total"><strong>{trainers.length}</strong><span>formateur{trainers.length > 1 ? "s" : ""}</span></div></div>
      <Notice type="info"><strong>Affectation directe.</strong> Lors de l’inscription, le participant saisit l’adresse e-mail de son formateur. L’inventaire apparaît ensuite automatiquement dans le tableau de bord personnel correspondant.</Notice>
      <section className="panel">
        <div className="filters"><label className="search-field"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un formateur…" /></label><span className="result-count">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span></div>
        {!filtered.length ? <div className="empty-state"><Icon name="users" size={34}/><h3>Aucun formateur référencé</h3><p>Les adresses apparaîtront ici dès une affectation ou une connexion formateur.</p></div> : <div className="table-wrap"><table className="data-table trainer-table"><thead><tr><th>Formateur</th><th>Statut</th><th>Inventaires</th><th>À analyser</th><th>Analysés</th><th>Restitués</th><th>Dernière activité</th></tr></thead><tbody>{filtered.map((trainer) => <tr key={trainer.email}><td><div className="trainer-cell"><span>{trainer.email.slice(0,1).toUpperCase()}</span><div><strong>{trainer.displayName || trainer.email.split("@")[0]}</strong><small>{trainer.email}</small></div></div></td><td><span className={`trainer-state ${trainer.isTrainer ? "is-confirmed" : "is-referenced"}`}>{trainer.isTrainer ? "Compte formateur reconnu" : "Référencé par affectation"}</span></td><td><strong>{trainer.inventoryCount}</strong></td><td>{trainer.pendingCount}</td><td>{trainer.reviewedCount}</td><td>{trainer.deliveredCount}</td><td>{trainer.lastActivity ? formatDate(trainer.lastActivity, true) : "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </>
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
      <div className="session-list">{sessions.map((session) => <article className={`panel session-item ${session.active ? "is-active" : ""}`} key={session.id}><div className="session-state">{session.active ? <><span className="live-dot"/> Active</> : "En attente"}</div><div className="session-main"><small>VERSION {session.version}</small><h2>{session.name}</h2><p>{session.organization} · créée le {formatDate(session.createdAt)}</p>{session.ownerEmail && <span className="session-owner">Formateur responsable : {session.ownerEmail}</span>}</div><div className="session-count"><strong>{session.participantCount}</strong><small>participant{session.participantCount > 1 ? "s" : ""}</small></div>{!session.active && <button className="button button--soft" onClick={() => activate(session.id)}>Activer</button>}</article>)}</div>
    </>
  );
}

function Methodology({ dimensions }: { dimensions: DimensionDefinition[] }) {
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">RÉFÉRENTIEL</span><h1>Cadre d’interprétation</h1><p>Référentiel PCM pour une restitution structurée par la Base, la Phase, les Perceptions et les Canaux de Communication.</p></div></div>
      <Notice type="info"><strong>Usage formateur.</strong> Cette version reprend le vocabulaire PCM et propose une Base et une Phase à partir de l’inventaire Milliminds. La validation finale appartient au formateur certifié. Le questionnaire propriétaire PCM Profile et sa clé de cotation ne sont pas reproduits dans l’application.</Notice>
      <section className="method-intro-grid"><article className="panel"><span className="panel-icon"><Icon name="chart"/></span><h2>Structure de Personnalité</h2><p>54 affirmations explorent l’ordre relatif des six Types de Personnalité et proposent une Base à confirmer lors de la restitution.</p></article><article className="panel"><span className="panel-icon"><Icon name="spark"/></span><h2>Phase actuelle</h2><p>18 affirmations explorent les Besoins Psychologiques du moment et proposent une Phase actuelle à valider avec le participant.</p></article><article className="panel"><span className="panel-icon"><Icon name="shield"/></span><h2>Qualité de passation</h2><p>Cohérence interne, variété des réponses, taux de neutralité, complétude et durée servent d’indicateurs de vigilance.</p></article></section>
      <section className="dimension-grid">{dimensions.map((dimension) => <article className="dimension-card" key={dimension.code} style={{ "--dimension": dimension.color } as React.CSSProperties}><div className="dimension-card__head"><span>{dimension.code}</span><div><h2>{dimension.shortName}</h2><p>{dimension.name}</p></div></div><p>{dimension.description}</p><dl><div><dt>Perception</dt><dd>{dimension.perception}</dd></div><div><dt>Canal de Communication</dt><dd>{dimension.channel}</dd></div><div><dt>Points Forts</dt><dd>{dimension.strengths.join(" · ")}</dd></div><div><dt>Besoins Psychologiques</dt><dd>{dimension.motivators.join(" · ")}</dd></div><div><dt>Connexion</dt><dd>{dimension.connectionTips.join(" · ")}</dd></div><div><dt>Points de vigilance</dt><dd>{dimension.watchouts.join(" · ")}</dd></div></dl></article>)}</section>
    </>
  );
}
