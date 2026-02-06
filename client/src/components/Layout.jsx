import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import Sidebar from "./Sidebar";
import { supabase } from "../supabaseClient";
import ToastHost from "./ToastHost";
import { useToast } from "../hooks/useToast";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, push, remove } = useToast();

  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      setCheckingAdmin(true);
      const { data, error } = await supabase.rpc("is_admin");
      if (!mounted) return;

      if (error) {
        push("בדיקת הרשאות מנהל נכשלה.", "danger");
        setCheckingAdmin(false);
        return;
      }

      if (!data) {
        // ليس أدמ -> صفحة not-admin
        if (location.pathname !== "/not-admin")
          navigate("/not-admin", { replace: true });
      }

      setCheckingAdmin(false);
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname, push]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="layout">
      <Sidebar onSignOut={signOut} />

      <main className="main">
        {checkingAdmin ? (
          <div className="container">
            <div className="card">בודק הרשאות מנהל...</div>
          </div>
        ) : (
          <div className="page">
            <Outlet context={{ toast: push }} />
          </div>
        )}
      </main>

      <ToastHost toasts={toasts} onRemove={remove} />
    </div>
  );
}
