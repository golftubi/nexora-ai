"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type Props = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: "/" })
        : await authClient.signIn.email({ email: email.trim(), password, callbackURL: "/" });
      if (result.error) setError(result.error.message || "Authentication failed.");
      else window.location.assign("/");
    } catch {
      setError("Unable to reach the authentication service. Check the database configuration and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brandmark">N</span><b>NEXORA AI</b></Link>
        <span className="eyebrow">YOUR INTELLIGENCE WORKSPACE</span>
        <h1>{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p>{isSignUp ? "Create an account to access your Nexora AI workspace." : "Sign in to continue to your Nexora AI workspace."}</p>
        <form onSubmit={submit}>
          {isSignUp && <label>Full name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} /></label>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={isSignUp ? 10 : 1} /></label>
          {isSignUp && <small>Use at least 10 characters.</small>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}</button>
        </form>
        <div className="auth-switch">{isSignUp ? "Already registered?" : "New to Nexora AI?"} <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link></div>
        <Link href="/" className="back-link">← Back to Nexora AI</Link>
      </section>
    </main>
  );
}
