import React, { useState } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const cleanEmail = String(email || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) return;

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginTop: 24 }}>
        <div
          className="h1"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <LogIn size={20} /> Login
        </div>

        <div className="muted" style={{ marginTop: 6, lineHeight: 1.4 }}>
          ادخل الإيميل وكلمة السر.
        </div>

        <hr className="sep" />

        <ErrorBanner error={error} />

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="label">Email</div>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <Mail size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                }}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="label">Password</div>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <Lock size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="btn"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  padding: "8px 10px",
                  minWidth: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="btn primary"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
