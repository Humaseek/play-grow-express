import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <div className="h1">התחברות מנהל</div>
        <div className="muted" style={{ marginTop: 6 }}>
          אם החשבון אינו מנהל, לא תהיה גישה לנתונים.
        </div>

        <hr className="sep" />

        <ErrorBanner error={error} />

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            className="input"
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="input"
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn primary" disabled={loading}>
            {loading ? "מתחבר..." : "התחברות"}
          </button>
        </form>
      </div>
    </div>
  );
}
