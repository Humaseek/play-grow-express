import React from "react";
import { NavLink } from "react-router";
import {
  CalendarDays,
  GraduationCap,
  UsersRound,
  LogOut,
  CreditCard,
  Receipt,
} from "lucide-react";

export default function Sidebar({ onSignOut }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="h1">Admin - </div>
        <div className="h2">Play & Grow</div>
      </div>

      <nav className="nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <CalendarDays size={18} /> <span>لوحة التحكم</span>
        </NavLink>

        <NavLink
          to="/courses"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <GraduationCap size={18} /> <span>دورات</span>
        </NavLink>

        <NavLink
          to="/payments"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <CreditCard size={18} /> <span>دخل</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Receipt size={18} /> <span>مصاريف</span>
        </NavLink>

        <NavLink
          to="/children"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <UsersRound size={18} /> <span>الاطفال</span>
        </NavLink>
      </nav>

      <hr className="sep" />

      <button
        className="btn danger"
        onClick={onSignOut}
        style={{ width: "100%" }}
      >
        <LogOut size={18} /> تسجيل خروج
      </button>

      <div style={{ marginTop: 10 }} className="muted"></div>
    </aside>
  );
}
