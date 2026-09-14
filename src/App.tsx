import { useEffect, useState } from "react";
import { acceptInvite, handleAuthCallback, updateUser } from "@netlify/identity";
import { Brand, Icon, Notice, Spinner } from "./components/Brand";
import ParticipantPage from "./pages/Participant";
import AdminPage from "./pages/Admin";
import ReportPage from "./pages/Report";

type AuthFlow =
  | { type: "none" }
  | { type: "processing" }
  | { type: "recovery" }
  | { type: "invite"; token: string }
  | { type: "error"; message: string };

const AUTH_HASH_PATTERN = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [authFlow, setAuthFlow] = useState<AuthFlow>(() =>
    AUTH_HASH_PATTERN.test(window.location.hash) ? { type: "processing" } : { type: "none" },
  );

  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  useEffect(() => {
    if (!AUTH_HASH_PATTERN.test(window.location.hash)) return;

    handleAuthCallback()
      .then((result) => {
        if (!result) {
          setAuthFlow({ type: "none" });
          return;
        }
        if (result.type === "recovery") {
          window.history.replaceState({}, "", "/admin/reset-password");
          setPath("/admin/reset-password");
          setAuthFlow({ type: "recovery" });
          return;
        }
        if (result.type === "invite" && result.token) {
          window.history.replaceState({}, "", "/admin/activate-account");
          setPath("/admin/activate-account");
          setAuthFlow({ type: "invite", token: result.token });
          return;
        }
        window.history.replaceState({}, "", "/admin");
        setPath("/admin");
        setAuthFlow({ type: "none" });
      })
      .catch((reason) => {
        setAuthFlow({
          type: "error",
          message: reason instanceof Error ? reason.message : "Le lien d'authentification n'a pas pu etre traite.",
        });
      });
  }, []);

  if (authFlow.type === "processing") {
    return <AuthShell><Spinner label="Verification du lien securise" /></AuthShell>;
  }
  if (authFlow.type === "error") {
    return <AuthShell><Notice type="error">{authFlow.message}</Notice></AuthShell>;
  }
  if (authFlow.type === "recovery") {
    return <SetPasswordPage mode="recovery" />;
  }
  if (authFlow.type === "invite") {
    return <SetPasswordPage mode="invite" inviteToken={authFlow.token} />;
  }
  if (path === "/admin/reset-password") {
    return <SetPasswordPage mode="recovery" />;
  }

  const report = path.match(/^\/admin\/result\/([0-9a-f-]{36})$/i);
  if (report) return <ReportPage assessmentId={report[1]} />;
  if (path.startsWith("/admin")) return <AdminPage />;
  return <ParticipantPage />;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <Brand />
        <div>
          <span className="eyebrow eyebrow--light">ESPACE PROFESSIONNEL</span>
          <h1>Acces securise Milliminds</h1>
          <p>Gestion du compte formateur et protection de l'espace d'administration.</p>
        </div>
        <blockquote>Formation et communication au service de pratiques professionnelles durables.</blockquote>
      </section>
      <section className="login-form-panel">
        <div className="login-card">{children}</div>
      </section>
    </main>
  );
}

function SetPasswordPage({ mode, inviteToken }: { mode: "recovery" | "invite"; inviteToken?: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 9) {
      setError("Le mot de passe doit contenir au moins 9 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "invite") {
        if (!inviteToken) throw new Error("Le lien d'invitation est incomplet ou expire.");
        await acceptInvite(inviteToken, password);
      } else {
        await updateUser({ password });
      }
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le mot de passe n'a pas pu etre enregistre.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <span className="login-icon"><Icon name="check" size={25}/></span>
        <h2>Mot de passe enregistre</h2>
        <Notice type="success">Votre mot de passe a ete defini avec succes.</Notice>
        <button className="button button--primary button--wide" onClick={() => { window.location.href = "/admin"; }}>
          Aller a la connexion <Icon name="arrow" />
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <span className="login-icon"><Icon name="lock" size={25}/></span>
      <h2>{mode === "invite" ? "Activer votre compte" : "Nouveau mot de passe"}</h2>
      <p>
        {mode === "invite"
          ? "Definissez le mot de passe de votre compte formateur Milliminds."
          : "Le lien Netlify a ete valide. Choisissez maintenant votre nouveau mot de passe."}
      </p>
      {error && <Notice type="error">{error}</Notice>}
      <form className="password-reset-form" onSubmit={submit}>
        <label className="field">
          <span>Nouveau mot de passe</span>
          <input type="password" autoComplete="new-password" minLength={9} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="field">
          <span>Confirmer le mot de passe</span>
          <input type="password" autoComplete="new-password" minLength={9} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
        </label>
        <button className="button button--primary button--wide" disabled={loading}>
          {loading ? "Enregistrement..." : <>Enregistrer le mot de passe <Icon name="check" /></>}
        </button>
      </form>
    </AuthShell>
  );
}
