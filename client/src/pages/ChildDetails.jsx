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
  Wallet,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Activity,
  RefreshCcw, // <-- أضفنا هذه هنا
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";

// --- دالة تنسيق المبالغ المالية ---
function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// --- تصميم الـ CSS المدمج (محسن بالكامل لمعالجة مشاكل الصورة) ---
const PROFILE_STYLES = `
/* إعدادات عامة */
.dashboard-wrapper {
  background-color: #f3f6f9;
  min-height: 100vh;
  padding: 32px 24px 60px;
  font-family: 'Tajawal', system-ui, sans-serif;
  direction: rtl;
}

.max-w-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* الرأس (Header) */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.header-user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-back {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-back:hover { background: #f8fafc; color: #0f172a; transform: translateX(4px); }

.avatar-large {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 900;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.25);
}

.user-name-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
}

/* الأزرار */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 12px 28px;
  border-radius: 14px;
  border: none;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35); }

/* البطاقات المالية (Stats) */
.financial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.finance-card {
  background: white;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s;
  position: relative;
  overflow: hidden;
}
.finance-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.05); }

.finance-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.finance-details { display: flex; flex-direction: column; z-index: 1; width: 100%; }
.finance-label { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
.finance-amount { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }

/* شريط تقدم للديون */
.progress-container { width: 100%; height: 6px; background: #e2e8f0; border-radius: 4px; margin-top: 12px; overflow: hidden; }
.progress-bar { height: 100%; background: #ef4444; border-radius: 4px; transition: width 0.5s ease; }

/* شبكة البينتو (Bento Grid) */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.bento-box {
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
}

.col-8 { grid-column: span 8; }
.col-4 { grid-column: span 4; }
.col-12 { grid-column: span 12; }

@media (max-width: 1024px) {
  .col-8, .col-4 { grid-column: span 12; }
}

.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

/* معلومات الطالب */
.info-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
}

.info-cell {
  background: #f8fafc;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.cell-label { font-size: 13px; color: #64748b; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.cell-value { font-size: 18px; font-weight: 900; color: #1e293b; }

.notes-alert {
  background: #fffbeb;
  padding: 20px;
  border-radius: 16px;
  border-right: 4px solid #f59e0b;
  margin-top: 24px;
  font-size: 15px;
  color: #92400e;
  font-weight: 600;
  line-height: 1.7;
}

/* معلومات الأهل */
.parent-block {
  background: #f8fafc;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.parent-block:last-child { margin-bottom: 0; }

.parent-role { font-size: 14px; font-weight: 800; color: #3b82f6; }
.parent-name { font-size: 18px; font-weight: 900; color: #0f172a; }

.contact-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: white;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  padding: 10px 16px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 800;
  font-size: 14px;
  transition: all 0.2s;
}
.contact-btn:hover { background: #f1f5f9; border-color: #94a3b8; }

/* الجداول الاحترافية - تم حل مشكلة الصورة هنا */
.table-responsive { overflow-x: auto; border-radius: 16px; border: 1px solid #e2e8f0; }

.data-table {
  width: 100%;
  border-collapse: collapse; /* استخدام collapse يمنع مشاكل المسافات */
  text-align: right;
  background: white;
}

.data-table th {
  background: #f8fafc;
  padding: 16px 24px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.data-table td {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  vertical-align: middle;
}

.data-table tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background-color: #f8fafc; }

/* الشارات (Badges) */
.badge-pro {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 800;
}
.badge-active { background: #dcfce7; color: #166534; }
.badge-withdrawn { background: #fee2e2; color: #991b1b; }
.badge-completed { background: #e0e7ff; color: #3730a3; }
.badge-pay-cash { background: #f3e8ff; color: #6b21a8; }
.badge-pay-card { background: #e0f2fe; color: #0369a1; }

/* حالة التحميل */
.loader-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
  background: #f8fafc;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* الحالات الفارغة */
.empty-box {
  text-align: center;
  padding: 48px 24px;
  background: #f8fafc;
  border-radius: 16px;
  border: 2px dashed #e2e8f0;
  color: #64748b;
}
.empty-box h3 { font-size: 18px; font-weight: 800; margin: 16px 0 8px; color: #0f172a; }
.empty-box p { font-size: 14px; margin: 0; }
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
    async function loadDashboardData() {
      if (!childId) return;
      setLoading(true);
      try {
        // 1. جلب بيانات الطالب الأساسية
        const { data: childData, error: childErr } = await supabase
          .from("children_view") // استخدام الـ view عشان نجيب اسم الدولة كمان لو موجود
          .select("*")
          .eq("id", childId)
          .single();

        if (childErr) throw childErr;
        setChild(childData);

        // 2. جلب الاشتراكات مع الإحصائيات الدقيقة
        const { data: enrData, error: enrErr } = await supabase
          .from("run_participants_view") // هذا الـ view يجلب الحضور، والباكجات، وكل التفاصيل
          .select("*")
          .eq("child_id", childId);

        if (enrErr) throw enrErr;
        setEnrollments(enrData || []);

        // 3. جلب الدفعات الخاصة بالطالب
        const { data: payData, error: payErr } = await supabase
          .from("payments_details_view")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false });

        if (payErr) throw payErr;
        setPayments(payData || []);
      } catch (err) {
        setError("حدث خطأ أثناء تحميل بيانات الطالب: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [childId]);

  // --- شاشة التحميل ---
  if (loading)
    return (
      <div className="loader-wrapper">
        <RefreshCcw
          className="spin"
          size={56}
          color="#3b82f6"
          strokeWidth={2.5}
        />
        <h2
          style={{
            color: "#0f172a",
            fontFamily: "'Tajawal', sans-serif",
            fontWeight: 800,
          }}
        >
          جاري تهيئة لوحة تحكم الطالب...
        </h2>
      </div>
    );

  if (error) return <ErrorBanner error={error} />;
  if (!child)
    return (
      <div className="loader-wrapper">
        <h2>الطالب غير موجود.</h2>
      </div>
    );

  // --- العمليات الحسابية ---
  const totalAgreed = enrollments.reduce(
    (sum, e) => sum + Number(e.agreed_price || 0),
    0,
  );
  const totalPaid = enrollments.reduce(
    (sum, e) => sum + Number(e.paid_amount || 0),
    0,
  ); // نعتمد على الـ view لأدق نتيجة
  const totalBalance = totalAgreed - totalPaid;
  const debtPercentage =
    totalAgreed > 0 ? (totalBalance / totalAgreed) * 100 : 0;

  // --- دوال مساعدة للرسم ---
  const renderEnrollmentStatus = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="badge-pro badge-active">
            <CheckCircle2 size={16} /> نشط
          </span>
        );
      case "withdrawn":
        return (
          <span className="badge-pro badge-withdrawn">
            <XCircle size={16} /> منسحب
          </span>
        );
      case "completed":
        return (
          <span className="badge-pro badge-completed">
            <CheckCircle2 size={16} /> مكتمل
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const renderPaymentMethod = (method) => {
    switch (method) {
      case "cash":
        return <span className="badge-pro badge-pay-cash">نقدي (كاش)</span>;
      case "card":
        return <span className="badge-pro badge-pay-card">بطاقة بنكية</span>;
      case "transfer":
        return (
          <span
            className="badge-pro"
            style={{ background: "#ffedd5", color: "#c2410c" }}
          >
            حوالة
          </span>
        );
      default:
        return (
          <span
            className="badge-pro"
            style={{ background: "#f1f5f9", color: "#64748b" }}
          >
            أخرى
          </span>
        );
    }
  };

  return (
    <div className="dashboard-wrapper">
      <style>{PROFILE_STYLES}</style>
      <div className="max-w-container">
        {/* === القسم الأول: الهيدر === */}
        <div className="header-section">
          <div className="header-user-info">
            <button
              className="btn-back"
              onClick={() => navigate("/children")}
              title="رجوع للقائمة"
            >
              <ArrowRight size={24} />
            </button>
            <div className="avatar-large">{child.name.charAt(0)}</div>
            <div>
              <h1 className="user-name-title">{child.name}</h1>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <Badge variant="neutral">رقم الملف: {child.id}</Badge>
                {child.country && (
                  <Badge variant="info">
                    <MapPin size={12} /> {child.country}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate("/payments")}>
            <CreditCard size={20} /> دفع قسط جديد
          </button>
        </div>

        {/* === القسم الثاني: الإحصائيات المالية === */}
        <div className="financial-grid">
          <div className="finance-card">
            <div
              className="finance-icon-wrapper"
              style={{ background: "#eff6ff", color: "#3b82f6" }}
            >
              <Wallet size={32} strokeWidth={2.5} />
            </div>
            <div className="finance-details">
              <span className="finance-label">
                إجمالي المطلوب (المتفق عليه)
              </span>
              <span className="finance-amount">{fmtMoney(totalAgreed)} ₪</span>
            </div>
          </div>

          <div className="finance-card">
            <div
              className="finance-icon-wrapper"
              style={{ background: "#ecfdf5", color: "#10b981" }}
            >
              <History size={32} strokeWidth={2.5} />
            </div>
            <div className="finance-details">
              <span className="finance-label">إجمالي المدفوع حتى الآن</span>
              <span className="finance-amount">{fmtMoney(totalPaid)} ₪</span>
            </div>
          </div>

          <div
            className="finance-card"
            style={{
              background: totalBalance > 0 ? "#fffcfc" : "white",
              borderColor: totalBalance > 0 ? "#fecaca" : "#e2e8f0",
            }}
          >
            <div
              className="finance-icon-wrapper"
              style={{
                background: totalBalance > 0 ? "#fee2e2" : "#f8fafc",
                color: totalBalance > 0 ? "#ef4444" : "#94a3b8",
              }}
            >
              <TrendingDown size={32} strokeWidth={2.5} />
            </div>
            <div className="finance-details">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="finance-label">الديون المتبقية</span>
                {totalBalance > 0 && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#ef4444",
                    }}
                  >
                    {debtPercentage.toFixed(0)}% متبقي
                  </span>
                )}
              </div>
              <span
                className="finance-amount"
                style={{ color: totalBalance > 0 ? "#ef4444" : "#0f172a" }}
              >
                {fmtMoney(totalBalance)} ₪
              </span>
              {totalBalance > 0 && (
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${debtPercentage}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === القسم الثالث: تفاصيل الطالب (Bento) === */}
        <div className="bento-grid">
          {/* بيانات الطالب */}
          <div className="bento-box col-8">
            <h2 className="section-head">
              <UserRound color="#3b82f6" size={24} /> البيانات الأساسية
            </h2>
            <div className="info-matrix">
              <div className="info-cell">
                <div className="cell-label">
                  <CalendarDays size={16} /> العمر
                </div>
                <div className="cell-value">{child.age} سنوات</div>
              </div>
              <div className="info-cell">
                <div className="cell-label">
                  <Users size={16} /> الجنس
                </div>
                <div className="cell-value">
                  {child.gender === "male" ? "ذكر" : "أنثى"}
                </div>
              </div>
              <div className="info-cell">
                <div className="cell-label">
                  <GraduationCap size={16} /> الصف الدراسي
                </div>
                <div className="cell-value">{child.class || "غير محدد"}</div>
              </div>
            </div>
            {child.notes && (
              <div className="notes-alert">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <FileText size={18} /> <span>ملاحظات المركز الهامة:</span>
                </div>
                {child.notes}
              </div>
            )}
          </div>

          {/* جهات الاتصال */}
          <div className="bento-box col-4" style={{ background: "white" }}>
            <h2 className="section-head">
              <Phone color="#f43f5e" size={24} /> جهات الاتصال
            </h2>
            <div className="parent-block">
              <span className="parent-role">ولي الأمر (الأم)</span>
              <span className="parent-name">
                {child.mother_name || "غير مسجل"}
              </span>
              {child.mother_phone && (
                <a href={`tel:${child.mother_phone}`} className="contact-btn">
                  <Phone size={16} color="#3b82f6" /> اتصال:{" "}
                  {child.mother_phone}
                </a>
              )}
            </div>
            <div className="parent-block">
              <span className="parent-role">ولي الأمر (الأب)</span>
              <span className="parent-name">
                {child.father_name || "غير مسجل"}
              </span>
              {child.father_phone && (
                <a href={`tel:${child.father_phone}`} className="contact-btn">
                  <Phone size={16} color="#3b82f6" /> اتصال:{" "}
                  {child.father_phone}
                </a>
              )}
            </div>
          </div>

          {/* === القسم الرابع: الدورات والاشتراكات === */}
          <div className="bento-box col-12">
            <h2 className="section-head">
              <BookOpen color="#8b5cf6" size={24} /> الدورات المشترك بها
            </h2>
            {enrollments.length === 0 ? (
              <div className="empty-box">
                <Activity
                  size={48}
                  color="#cbd5e1"
                  style={{ margin: "0 auto" }}
                />
                <h3>لا توجد اشتراكات</h3>
                <p>هذا الطالب غير مسجل في أي دورة أو مجموعة حالياً.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم الدورة (المجموعة)</th>
                      <th>حالة الاشتراك</th>
                      <th>الحضور</th>
                      <th>السعر المتفق عليه</th>
                      <th>المدفوع</th>
                      <th>الرصيد المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => (
                      <tr key={enr.enrollment_id}>
                        <td>
                          <div
                            style={{
                              fontWeight: 900,
                              color: "#0f172a",
                              fontSize: "16px",
                            }}
                          >
                            {enr.child_name || "دورة"}{" "}
                            {/* استخدمنا child_name مؤقتاً لو الدورة مش جاية من الفيو، لكن في الفيو تبعك title غير موجود في run_participants_view مباشرة، بنعوض عنه بالـ label */}
                            <span style={{ color: "#3b82f6" }}>
                              {" "}
                              {enr.label}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#64748b",
                              marginTop: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Clock size={14} /> الحصص المخصصة:{" "}
                            {enr.sessions_allocated || 0}
                          </div>
                        </td>
                        <td>{renderEnrollmentStatus(enr.enrollment_status)}</td>
                        <td>
                          <span
                            style={{
                              background: "#f1f5f9",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                          >
                            {enr.sessions_attended_in_run} حصة حضرها
                          </span>
                        </td>
                        <td style={{ color: "#0f172a", fontSize: "16px" }}>
                          {fmtMoney(enr.agreed_price)} ₪
                        </td>
                        <td style={{ color: "#10b981", fontSize: "16px" }}>
                          {fmtMoney(enr.paid_amount)} ₪
                        </td>
                        <td
                          style={{
                            color: enr.balance > 0 ? "#ef4444" : "#64748b",
                            fontWeight: 900,
                            fontSize: "16px",
                          }}
                        >
                          {enr.balance > 0
                            ? `${fmtMoney(enr.balance)} ₪`
                            : "مسدد بالكامل"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === القسم الخامس: سجل الدفعات === */}
          <div className="bento-box col-12">
            <h2 className="section-head">
              <History color="#10b981" size={24} /> سجل الدفعات المالية
            </h2>
            {payments.length === 0 ? (
              <div className="empty-box">
                <Wallet
                  size={48}
                  color="#cbd5e1"
                  style={{ margin: "0 auto" }}
                />
                <h3>لا توجد دفعات مسجلة</h3>
                <p>لم يقم الطالب بدفع أي أقساط حتى الآن.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الإيصال</th>
                      <th>تاريخ الدفع</th>
                      <th>الدورة المرتبطة</th>
                      <th>طريقة الدفع</th>
                      <th>ملاحظات المحاسب</th>
                      <th>المبلغ المدفوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td
                          style={{ fontFamily: "monospace", color: "#64748b" }}
                        >
                          #{p.id}
                        </td>
                        <td style={{ color: "#334155", fontWeight: 800 }}>
                          {new Date(p.created_at).toLocaleDateString("en-GB")}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>
                            {p.course_title || "دفعة عامة"}
                          </div>
                          {p.run_label && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#94a3b8",
                                marginTop: "4px",
                              }}
                            >
                              {p.run_label}
                            </div>
                          )}
                        </td>
                        <td>{renderPaymentMethod(p.method)}</td>
                        <td
                          style={{
                            color: "#64748b",
                            maxWidth: "250px",
                            whiteSpace: "normal",
                          }}
                        >
                          {p.note || "لا توجد ملاحظات"}
                        </td>
                        <td
                          style={{
                            color: "#10b981",
                            fontSize: "18px",
                            fontWeight: 900,
                          }}
                        >
                          +{fmtMoney(p.amount)} ₪
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
