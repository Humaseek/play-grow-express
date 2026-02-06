import React from "react";
import { Navigate, Outlet } from "react-router";

/**
 * Route-Guard for React Router nested routes.
 *
 * IMPORTANT:
 * - When used as a <Route element={...}> wrapper, we must render <Outlet />
 *   (not children) so nested routes actually render.
 */
export default function ProtectedRoute({ session }) {
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
