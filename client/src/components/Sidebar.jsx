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
 <div className="h1">Admin Panel</div>
 <div className="h2">Kids Learning Center</div>
 </div>

 <nav className="nav">
 <NavLink
 to="/"
 end
 className={({ isActive }) => (isActive ? "active" : "")}
 >
 <CalendarDays size={18} /> <span>Today</span>
 </NavLink>

 <NavLink
 to="/courses"
 className={({ isActive }) => (isActive ? "active" : "")}
 >
 <GraduationCap size={18} /> <span>Courses</span>
 </NavLink>

 <NavLink
 to="/payments"
 className={({ isActive }) => (isActive ? "active" : "")}
 >
 <CreditCard size={18} /> <span>Payments</span>
 </NavLink>

 <NavLink
 to="/expenses"
 className={({ isActive }) => (isActive ? "active" : "")}
 >
 <Receipt size={18} /> <span>Expenses</span>
 </NavLink>

 <NavLink
 to="/children"
 className={({ isActive }) => (isActive ? "active" : "")}
 >
 <UsersRound size={18} /> <span>Children</span>
 </NavLink>
 </nav>

 <hr className="sep" />

 <button
 className="btn danger"
 onClick={onSignOut}
 style={{ width: "100%" }}
 >
 <LogOut size={18} /> Sign out
 </button>

 <div style={{ marginTop: 10 }} className="muted">
 </div>
 </aside>
 );
}
