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
          <CalendarDays size={18} />
          <span className="navFull">لوحة التحكم</span>
          <span className="navShort">اليوم</span>
        </NavLink>

        <NavLink
          to="/courses"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <GraduationCap size={18} />
          <span className="navFull">دورات</span>
          <span className="navShort">دورات</span>
        </NavLink>

        <NavLink
          to="/payments"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <CreditCard size={18} />
          <span className="navFull">دخل</span>
          <span className="navShort">دخل</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Receipt size={18} />
          <span className="navFull">مصاريف</span>
          <span className="navShort">مصاريف</span>
        </NavLink>

        <NavLink
          to="/staff-hours"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Clock size={18} />
          <span className="navFull">ساعات العمل</span>
          <span className="navShort">ساعات</span>
        </NavLink>

        <NavLink
          to="/children"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <UsersRound size={18} />
          <span className="navFull">الاطفال</span>
          <span className="navShort">أطفال</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <BarChart2 size={18} />
          <span className="navFull">التحليل المالي</span>
          <span className="navShort">تحليل</span>
        </NavLink>
      </nav>

      <hr className="sep desktop-only" />

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
