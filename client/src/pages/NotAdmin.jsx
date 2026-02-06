import React from "react";
import { supabase } from "../supabaseClient";

export default function NotAdmin() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div className="h1">לא יש صלאحية</div>
        <div className="muted" style={{ marginTop: 6 }}>
          זה النظام מוקצה للأدמ فقط.
        </div>

        <hr className="sep" />

        <button className="btn danger" onClick={() => supabase.auth.signOut()}>
          התנתקות
        </button>
      </div>
    </div>
  );
}
