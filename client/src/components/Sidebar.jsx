import React from "react";
import { NavLink } from "react-router";
import {
  CalendarDays,
  GraduationCap,
  UsersRound,
  LogOut,
  CreditCard,
  Receipt,
  Clock,
  BarChart2,
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
          to="/staff-hours"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Clock size={18} /> <span>ساعات العمل</span>
        </NavLink>

        <NavLink
          to="/children"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <UsersRound size={18} /> <span>الاطفال</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <BarChart2 size={18} /> <span>التحليل المالي</span>
        </NavLink>
      </nav>

      {/* تمت إضافة كلاس desktop-only لإخفاء الخط في الموبايل */}
      <hr className="sep desktop-only" />

      {/* تمت إضافة كلاس logout-btn و logout-text للتحكم بظهورهم في الموبايل */}
      <button
        className="btn danger logout-btn"
        onClick={onSignOut}
        style={{ width: "100%" }}
      >
        <LogOut size={18} /> <span className="logout-text">خروج</span>
      </button>
    </aside>
  );
}
