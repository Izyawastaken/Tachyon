import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Boxes, Check, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { ShellViewport } from "@/shell/components/ShellViewport";
import type { AuthController } from "./useAuth";
import "./LoginPage.css";

interface LoginPageProps {
  sidebarOpen: boolean;
  auth: AuthController;
  onHome: () => void;
}

export default function LoginPage({ sidebarOpen, auth, onHome }: LoginPageProps) {
  const { session, status, error, signIn, cancelSignIn, signOut } = auth;
  const signingIn = status === "signing-in";
  const signingOut = status === "signing-out";

  useEffect(() => cancelSignIn, [cancelSignIn]);

  return <ShellViewport expanded={sidebarOpen}>
    <div className="login-page">
      <header className="login-topline" data-tauri-drag-region>
        <span>Tachyon <span className="login-separator">/</span> Account</span>
        <span className="login-preview-label">Sign-in preview</span>
      </header>
      <div className="login-content">
        <section className="login-panel" aria-labelledby="login-heading" aria-busy={signingIn || signingOut}>
          <div className={`login-emblem${session ? " login-emblem-account" : ""}`} aria-hidden="true">
            {session ? <UserRound size={30} strokeWidth={1.5} /> : <Boxes size={34} strokeWidth={1.25} />}
            {session && <span className="login-check"><Check size={12} strokeWidth={2.5} /></span>}
          </div>
          <p className="login-eyebrow">{session ? "Welcome to Tachyon" : "A place for your next adventure"}</p>
          <h1 id="login-heading">{session ? "You're signed in." : "Make yourself at home."}</h1>
          <p className="login-description">{session
            ? "Your demo profile is ready. Take a look around."
            : "Sign in with Microsoft to bring your Minecraft account to Tachyon."}</p>
          {session ? <>
            <div className="login-profile">
              <span className="login-profile-avatar" aria-hidden="true">{session.profile.name.slice(0, 1)}</span>
              <div><strong>{session.profile.name}</strong><span>Demo profile</span></div>
            </div>
            <button type="button" className="login-primary" onClick={onHome}>Back to Home <ArrowRight size={17} aria-hidden="true" /></button>
          </> : <button type="button" className="login-primary" onClick={() => void signIn()} disabled={signingIn}>
            {signingIn ? <LoaderCircle className="login-spinner" size={18} aria-hidden="true" />
              : <span className="login-microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>}
            {signingIn ? "Signing in…" : "Continue with Microsoft"}
            {!signingIn && <ArrowRight size={17} aria-hidden="true" />}
          </button>}
          <div className="login-feedback" aria-live="polite" aria-atomic="true">
            {error ? <p role="alert" className="login-error">{error}</p> : signingIn ? <p role="status">Creating your demo session…</p>
              : signingOut ? <p role="status">Signing out…</p> : session ? <p role="status">Signed in as {session.profile.name}.</p> : null}
          </div>
          {session ? <button type="button" className="login-secondary" disabled={signingOut} onClick={() => void signOut()}>
            {signingOut ? <LoaderCircle className="login-spinner" size={15} aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
            {signingOut ? "Signing out…" : "Sign out"}
          </button> : signingIn ? <button type="button" className="login-secondary" onClick={cancelSignIn}>Cancel sign-in</button>
            : <button type="button" className="login-secondary" onClick={onHome}><ArrowLeft size={15} aria-hidden="true" /> Back to Home</button>}
        </section>
      </div>
      <footer className="login-footer"><span className="login-demo-badge">Demo</span><p>This preview uses a demo profile. No Microsoft account is connected.</p></footer>
    </div>
  </ShellViewport>;
}
