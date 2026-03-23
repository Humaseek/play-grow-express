import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import {
  UserRound,
  Phone,
  CalendarDays,
  GraduationCap,
  ArrowRight,
  CreditCard,
  BookOpen,
  History,
  FileText,
  RefreshCcw,
  Wallet,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";

// دالة تنسيق المبالغ المالية
function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const PROFILE_STYLES = `
.page--profile {
  background: #f4f7f9;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: 'Tajawal', sans-serif;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 0;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

/* Stats Cards */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 900;
  color: #0f172a;
}

/* Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.bento-item {
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  padding: 28px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
}

.span-4 { grid-column: span 4; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

@media (max-width: 1024px) {
  .span-4, .span-8 { grid-column: span 12; }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 24px;
  color: #0f172a;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 12px;
}

/* Info Items */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 20px;
}

.info-item {
  background: #f8fafc;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.info-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-value {
  font-size: 16px;
  font-weight: 900;
  color: #1e293b;
}

.notes-box {
  background: #fffbeb;
  padding: 16px;
  border-radius: 12px;
  border-right: 4px solid #f59e0b;
  font-size: 14px;
  color: #92400e;
  line-height: 1.6;
  margin-top: 20px;
  font-weight: 600;
}

/* Parent Cards */
.parent-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.parent-card:last-child { margin-bottom: 0; }

.parent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.parent-role {
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}

.parent-name {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.phone-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 800;
  font-size: 14px;
  background: #eff6ff;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}
.phone-link:hover { background: #dbeafe; }

/* Modern Table */
.table-wrapper {
  overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}

.modern-table th {
  text-align: right;
  padding: 0 16px 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.modern-table td {
  padding: 16px;
  background: #f8fafc;
  font-weight: 700;
  color: #1e293b;
}

.modern-table tr td:first-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
.modern-table tr td:last-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }

.modern-table tr:hover td {
  background: #f1f5f9;
}

.btn-action {
  background: #3b82f6;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.btn-action:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
}
.status-active { background: #dcfce7; color: #166534; }
.status-withdrawn { background: #fee2e2; color: #991b1b; }
.status-completed { background: #e0e7ff; color: #3730a3; }
`;

export default function ChildDetails() {
  const params = useParams();
  const childId = params.id || params.childId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [child, setChild] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function loadData() {
      if (!childId) return;
      setLoading(true);
      try {
        // 1. جلب بيانات الطالب
        const { data: childData, error: childErr } = await supabase
          .from("children")
          .select("*")
          .eq("id", childId)
          .single();

        if (childErr) throw childErr;
        setChild(childData);

        // 2. جلب الاشتراكات باستخدام الـ View الصحيح الذي يحتوي على اسم الدورة
        const { data: enrData, error: enrErr } = await supabase
          .from("child_enrollments_view")
          .select("*")
          .eq("child_id", childId);

        if (enrErr) throw enrErr;
        if (enrData) setEnrollments(enrData);

        // 3. جلب الدفعات
        const { data: payData, error: payErr } = await supabase
          .from("payments_details_view")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false });

        if (payErr) throw payErr;
        if (payData) setPayments(payData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [childId]);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "20px",
        }}
      >
        <RefreshCcw className="spin-icon" size={48} color="#3b82f6" />
        <h2 style={{ color: "#64748b", fontFamily: "'Tajawal', sans-serif" }}>
          جاري تجهيز ملف الطالب...
        </h2>
      </div>
    );

  if (error) return <ErrorBanner error={error} />;
  if (!child)
    return (
      <EmptyState
        title="غير موجود"
        description="لم يتم العثور على بيانات هذا الطالب."
      />
    );

  // الحسابات المالية الدقيقة بناءً على الاشتراكات
  const totalAgreed = enrollments.reduce(
    (sum, e) => sum + Number(e.agreed_price || 0),
    0,
  );
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalBalance = totalAgreed - totalPaid;

  const renderStatus = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="status-badge status-active">
            <CheckCircle2 size={14} /> نشط
          </span>
        );
      case "withdrawn":
        return (
          <span className="status-badge status-withdrawn">
            <XCircle size={14} /> منسحب
          </span>
        );
      case "completed":
        return (
          <span className="status-badge status-completed">
            <CheckCircle2 size={14} /> مكتمل
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="page--profile" dir="rtl">
      <style>{PROFILE_STYLES}</style>
      <div
        className="container"
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}
      >
        {/* Header Section */}
        <div className="profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              className="btn-back"
              onClick={() => navigate("/children")}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "10px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              <ArrowRight size={24} color="#64748b" />
            </button>
            <div className="avatar-circle">{child.name.charAt(0)}</div>
            <div>
              <h1
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {child.name}
              </h1>
              <Badge variant="info">رقم الطالب: {child.id}</Badge>
            </div>
          </div>
          <button className="btn-action" onClick={() => navigate("/payments")}>
            <CreditCard size={20} /> دفع قسط جديد
          </button>
        </div>

        {/* Quick Financial Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "#eff6ff", color: "#3b82f6" }}
            >
              <Wallet size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">إجمالي المتفق عليه</span>
              <span className="stat-value">{fmtMoney(totalAgreed)} ₪</span>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "#ecfdf5", color: "#10b981" }}
            >
              <History size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">إجمالي المدفوع</span>
              <span className="stat-value">{fmtMoney(totalPaid)} ₪</span>
            </div>
          </div>
          <div
            className="stat-card"
            style={{
              border:
                totalBalance > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
              background: totalBalance > 0 ? "#fff5f5" : "white",
            }}
          >
            <div
              className="stat-icon"
              style={{
                background: totalBalance > 0 ? "#fee2e2" : "#f1f5f9",
                color: totalBalance > 0 ? "#ef4444" : "#64748b",
              }}
            >
              <TrendingDown size={28} />
            </div>
            <div className="stat-info">
              <span className="stat-label">المتبقي المطلوب (الديون)</span>
              <span
                className="stat-value"
                style={{ color: totalBalance > 0 ? "#ef4444" : "#0f172a" }}
              >
                {fmtMoney(totalBalance)} ₪
              </span>
            </div>
          </div>
        </div>

        <div className="bento-grid">
          {/* Main Info Box */}
          <div className="bento-item span-8">
            <h2 className="section-title">
              <UserRound color="#3b82f6" size={22} /> البيانات الأساسية
            </h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">
                  <CalendarDays size={14} /> العمر
                </div>
                <div className="info-value">{child.age} سنوات</div>
              </div>
              <div className="info-item">
                <div className="info-label">
                  <Users size={14} /> الجنس
                </div>
                <div className="info-value">
                  {child.gender === "male" ? "ذكر" : "أنثى"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">
                  <GraduationCap size={14} /> الصف الدراسي
                </div>
                <div className="info-value">{child.class || "غير محدد"}</div>
              </div>
            </div>

            {child.notes && (
              <div className="notes-box">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <FileText size={16} /> <span>ملاحظات المركز:</span>
                </div>
                {child.notes}
              </div>
            )}
          </div>

          {/* Parents Contact Box */}
          <div
            className="bento-item span-4"
            style={{ background: "#f8fafc", border: "none" }}
          >
            <h2 className="section-title">
              <Phone color="#f43f5e" size={22} /> بيانات الأهل للتواصل
            </h2>

            <div className="parent-card">
              <div className="parent-header">
                <span className="parent-role">الأم</span>
                <span className="parent-name">
                  {child.mother_name || "غير مسجل"}
                </span>
              </div>
              {child.mother_phone && (
                <a href={`tel:${child.mother_phone}`} className="phone-link">
                  <Phone size={14} /> {child.mother_phone}
                </a>
              )}
            </div>

            <div className="parent-card">
              <div className="parent-header">
                <span className="parent-role">الأب</span>
                <span className="parent-name">
                  {child.father_name || "غير مسجل"}
                </span>
              </div>
              {child.father_phone && (
                <a href={`tel:${child.father_phone}`} className="phone-link">
                  <Phone size={14} /> {child.father_phone}
                </a>
              )}
            </div>
          </div>

          {/* Courses & Enrollments */}
          <div className="bento-item span-12">
            <h2 className="section-title">
              <BookOpen color="#8b5cf6" size={22} /> الدورات المشترك بها
            </h2>
            {enrollments.length === 0 ? (
              <EmptyState
                title="لا توجد اشتراكات"
                description="هذا الطالب غير مسجل في أي دورة حالياً."
              />
            ) : (
              <div className="table-wrapper">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>اسم الدورة (المجموعة)</th>
                      <th>حالة الاشتراك</th>
                      <th>السعر المتفق عليه</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => (
                      <tr key={enr.enrollment_id}>
                        <td>
                          <div
                            style={{
                              fontWeight: 900,
                              color: "#1e293b",
                              fontSize: "15px",
                            }}
                          >
                            {enr.title || "دورة محذوفة"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginTop: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Clock size={12} /> {enr.label}
                          </div>
                        </td>
                        <td>{renderStatus(enr.enrollment_status)}</td>
                        <td style={{ color: "#0f172a" }}>
                          {fmtMoney(enr.agreed_price)} ₪
                        </td>
                        <td style={{ color: "#10b981" }}>
                          {fmtMoney(enr.paid_amount)} ₪
                        </td>
                        <td
                          style={{
                            color: enr.balance > 0 ? "#ef4444" : "#64748b",
                          }}
                        >
                          {enr.balance > 0
                            ? `${fmtMoney(enr.balance)} ₪`
                            : "مسدد"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments Timeline */}
          <div className="bento-item span-12">
            <h2 className="section-title">
              <History color="#10b981" size={22} /> سجل الدفعات المالية
            </h2>
            {payments.length === 0 ? (
              <EmptyState
                title="لا توجد دفعات"
                description="لم يقم الطالب بأي دفعات مالية بعد."
              />
            ) : (
              <div className="table-wrapper">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الدورة المرتبطة</th>
                      <th>طريقة الدفع</th>
                      <th>المبلغ</th>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: "#475569" }}>
                          {new Date(p.created_at).toLocaleDateString("en-GB")}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>
                            {p.course_title || "—"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {p.run_label}
                          </div>
                        </td>
                        <td>
                          <Badge variant="neutral">
                            {p.method === "cash"
                              ? "كاش نقدي"
                              : p.method === "card"
                                ? "بطاقة ائتمان"
                                : "تحويل بنكي"}
                          </Badge>
                        </td>
                        <td
                          style={{
                            color: "#10b981",
                            fontSize: "16px",
                            fontWeight: 900,
                          }}
                        >
                          +{fmtMoney(p.amount)} ₪
                        </td>
                        <td
                          style={{
                            color: "#64748b",
                            fontSize: "13px",
                            maxWidth: "200px",
                          }}
                        >
                          {p.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
