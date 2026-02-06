import { createClient } from "@supabase/supabase-js";

// Vite env vars are injected at build time.
// If env vars are missing in a deployment (common on misconfigured Production builds),
// Supabase initialization throws: "supabaseUrl is required" and the UI becomes blank.
//
// To avoid a white screen, we:
// 1) Read from import.meta.env (normal Vite)
// 2) Also support an optional runtime object: window.__PLAY_GROW_ENV__
//    (can be set by /env.js before the app loads).

const readEnv = (key) => {
  const viteVal = import.meta?.env?.[key];
  if (viteVal !== undefined && viteVal !== "") return viteVal;

  // Optional runtime injection
  if (typeof window !== "undefined") {
    const runtime = window.__PLAY_GROW_ENV__ || window.__env__ || {};
    const v = runtime[key];
    if (v !== undefined && v !== "") return v;
  }

  return undefined;
};

export const supabaseUrl = readEnv("VITE_SUPABASE_URL");
export const supabaseAnonKey = readEnv("VITE_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
