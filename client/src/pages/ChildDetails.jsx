import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
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
  Heart,
  RefreshCcw,
  Wallet,
  TrendingDown,
  Info,
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
  background: #f8fafc;
  min-height: 100vh;
  padding-bottom: 60px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 0;
}

/* Stats Cards */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s;
}

.stat-icon {
  width: 54px;
  height: 54px;
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
}

.stat-value {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
}

/* Info Display */
.info-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-value {
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
  padding: 8px 0;
}

.notes-box {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 16px;
  border-right: 4px solid #3b82f6;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.bento-item {
  background: white;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
  padding: 28px;
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
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th {
  text-align: right;
  padding: 16px;
  color: #64748b;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

.modern-table td {
  padding: 16px;
  border-bottom: 1px solid #f8fafc;
  font-weight: 700;
}

.btn-action {
  background: #3b82f6;
  color: white;
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: 0.2s;
}

.btn-action:hover {
  background: #2563eb;
  transform: translateY(-2px);
}
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
        const { data: childData, error: childErr } = await supabase
          .from("children")
          .select("*")
          .eq("id", childId)
          .single();

        if (childErr) throw childErr;
        setChild(childData);

        const { data: rpData } = await supabase
          .from("run_participants_view")
          .select("*")
          .eq("child_id", childId);

        if (rpData) setEnrollments(rpData);

        const { data: payData } = await supabase
          .from("payments_details_view")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false });

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
        <h2 style={{ color: "#64748b" }}>جاري تحضير ملف الطالب...</h2>
      </div>
    );

  if (error) return <ErrorBanner error={error} />;

  // حساب الإجماليات سريعة العرض
  const totalAgreed = enrollments.reduce(
    (sum, e) => sum + Number(e.agreed_price),
    0,
  );
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalBalance = totalAgreed - totalPaid;

  return (
    <div className="page--profile" dir="rtl">
      <style>{PROFILE_STYLES}</style>
      <div
        className="container"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}
      >
        {/* Header */}
        <div className="profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              className="btn-back"
              onClick={() => navigate("/children")}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "8px",
                cursor: "pointer",
              }}
            >
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 900 }}>
                {child.name}
              </h1>
              <Badge variant="info">رقم الطالب: {child.id}</Badge>
            </div>
          </div>
          <button className="btn-action" onClick={() => navigate("/payments")}>
            <CreditCard size={18} /> إضافة دفعة مالية
          </button>
        </div>

        {/* Quick Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "#eff6ff", color: "#3b82f6" }}
            >
              <Wallet />
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
              <History />
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
                totalBalance > 0 ? "1px solid #fee2e2" : "1px solid #e2e8f0",
            }}
          >
            <div
              className="stat-icon"
              style={{ background: "#fef2f2", color: "#ef4444" }}
            >
              <TrendingDown />
            </div>
            <div className="stat-info">
              <span className="stat-label">المتبقي المطلوب</span>
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
          {/* Main Info */}
          <div className="bento-item span-8">
            <h2 className="section-title">
              <UserRound color="#3b82f6" /> المعلومات العامة
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div>
                <div className="info-label">
                  <CalendarDays size={14} /> العمر
                </div>
                <div className="info-value">{child.age} سنوات</div>
              </div>
              <div>
                <div className="info-label">
                  <UserRound size={14} /> الجنس
                </div>
                <div className="info-value">
                  {child.gender === "male" ? "ذكر" : "أنثى"}
                </div>
              </div>
              <div>
                <div className="info-label">
                  <GraduationCap size={14} /> الصف الدراسي
                </div>
                <div className="info-value">{child.class || "غير محدد"}</div>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div className="info-label">
                  <FileText size={14} /> ملاحظات إضافية
                </div>
                <div className="notes-box">
                  {child.notes || "لا توجد ملاحظات مسجلة لهذا الطالب."}
                </div>
              </div>
            </div>
          </div>

          {/* Parents Card */}
          <div className="bento-item span-4" style={{ background: "#f8fafc" }}>
            <h2 className="section-title">
              <Heart color="#f43f5e" /> بيانات التواصل
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <div className="info-label">الأم</div>
              <div className="info-value">{child.mother_name || "—"}</div>
              {child.mother_phone && (
                <a
                  href={`tel:${child.mother_phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#3b82f6",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  <Phone size={14} /> {child.mother_phone}
                </a>
              )}
            </div>

            <div
              style={{ height: "1px", background: "#e2e8f0", margin: "16px 0" }}
            ></div>

            <div>
              <div className="info-label">الأب</div>
              <div className="info-value">{child.father_name || "—"}</div>
              {child.father_phone && (
                <a
                  href={`tel:${child.father_phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#3b82f6",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  <Phone size={14} /> {child.father_phone}
                </a>
              )}
            </div>
          </div>

          {/* Courses Table */}
          <div className="bento-item span-12">
            <h2 className="section-title">
              <BookOpen color="#8b5cf6" /> سجل الاشتراكات والدورات
            </h2>
            {enrollments.length === 0 ? (
              <EmptyState
                title="لا توجد اشتراكات"
                description="هذا الطالب غير مسجل في أي دورة حالياً."
              />
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>الدورة</th>
                    <th>الحالة</th>
                    <th>السعر المتفق عليه</th>
                    <th>الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enr) => (
                    <tr key={enr.enrollment_id}>
                      <td>
                        <div style={{ fontWeight: 900 }}>
                          {enr.course_title || "دورة عامة"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {enr.run_label}
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            enr.enrollment_status === "active"
                              ? "ok"
                              : "neutral"
                          }
                        >
                          {enr.enrollment_status === "active" ? "نشط" : "منتهي"}
                        </Badge>
                      </td>
                      <td>{fmtMoney(enr.agreed_price)} ₪</td>
                      <td
                        style={{
                          color: enr.balance > 0 ? "#ef4444" : "#10b981",
                        }}
                      >
                        {fmtMoney(enr.balance)} ₪
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payment History */}
          <div className="bento-item span-12">
            <h2 className="section-title">
              <History color="#10b981" /> سجل الدفعات الأخيرة
            </h2>
            {payments.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#94a3b8",
                }}
              >
                لا توجد دفعات مسجلة.
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الطريقة</th>
                    <th>ملاحظات</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {new Date(p.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td>
                        <Badge variant="neutral">
                          {p.method === "cash" ? "كاش" : "بطاقة / تحويل"}
                        </Badge>
                      </td>
                      <td style={{ color: "#64748b", fontSize: "13px" }}>
                        {p.note || "—"}
                      </td>
                      <td style={{ color: "#10b981", fontSize: "16px" }}>
                        +{fmtMoney(p.amount)} ₪
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
