import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { supabase } from "./supabaseClient";
import ErrorBoundary from "./components/ErrorBoundary";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Today from "./pages/Today";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import RunDetails from "./pages/RunDetails";
import Children from "./pages/Children";
import ChildDetails from "./pages/ChildDetails";
import Attendance from "./pages/Attendance";
import NotAdmin from "./pages/NotAdmin";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error(error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);
      },
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (authLoading) {
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <div style={{ color: "#64748b", fontWeight: 800 }}>تحميل...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected */}
        <Route element={<ProtectedRoute session={session} />}>
          <Route element={<Layout session={session} />}>
            <Route index element={<Today />} />

            <Route path="courses" element={<Courses />} />
            <Route path="courses/:courseId" element={<CourseDetails />} />

            <Route path="runs/:runId" element={<RunDetails />} />

            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />

            <Route path="children" element={<Children />} />
            <Route path="children/:childId" element={<ChildDetails />} />

            <Route
              path="sessions/:sessionId/attendance"
              element={<Attendance />}
            />

            <Route path="not-admin" element={<NotAdmin />} />
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>

    </ErrorBoundary>
  );
}