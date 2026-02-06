import React from "react";
import { supabase } from "../supabaseClient";

export default function NotAdmin() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div className="h1">لا يوجد صلاحية</div>
        <div className="muted" style={{ marginTop: 6 }}>
          هذا النظام مخصص للأدمن فقط.
        </div>

        <hr className="sep" />

        <button className="btn danger" onClick={() => supabase.auth.signOut()}>
          تسجيل خروج
        </button>
      </div>
    </div>
  );
}
