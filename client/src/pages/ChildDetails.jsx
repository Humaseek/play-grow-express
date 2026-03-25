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
  Wallet,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Activity,
  RefreshCcw,
  Banknote,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton"; // تأكدنا من استيراد زر الأيقونة

// --- دوال مساعدة ---
function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function toInputDatetimeLocal(dt) {
  const d = dt ? new Date(dt) : new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

// --- تصميم الـ CSS المدمج المطور ---
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

/* الرأس (Header) الناعم */
.header-section {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  background: white;
  padding: 32px 40px;
  border-radius: 24px;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.03);
  position: relative;
  border-right: 6px solid #3b82f6; 
}

.btn-back {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-back:hover { 
  background: #f1f5f9; 
  color: #0f172a; 
  transform: translateX(6px); 
  border-color: #cbd5e1;
}

.header-user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name-title {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.badges-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

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

/* --- التحكم في المودال (النافذة المنبثقة) للموبايل --- */
  div.modalOverlay {
    align-items: center !important; 
    padding: 16px !important;
  }
  
  div.modalOverlay > div.modalCard {
    border-radius: 24px !important; 
    margin: auto !important; 
    width: 92% !important;        /* 👈 هان بتتحكم بالعرض (مثلا 95% أو 90%) */
    max-height: 75vh !important;  /* 👈 هان بتتحكم بالطول الأقصى */
    transform: translateY(-5vh) !important; /* 👈 هان بترفع المودال لفوق أو بتنزله */
  }

  .modal-form-scroll-container {
    max-height: calc(85vh - 250px) !important; 
    padding: 0 5px;
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

/* الجداول الاحترافية */
.table-responsive { overflow-x: auto; border-radius: 16px; border: 1px solid #e2e8f0; }

.data-table {
  width: 100%;
  border-collapse: collapse;
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

/* خلية الإجراءات المضافة حديثاً للجدول */
.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end; /* لضبط الأيقونة جهة اليسار قليلاً */
}

/* تأثيرات رابط الدورة */
.course-link-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 10px;
  border-radius: 10px;
  margin-right: -10px;
}
.course-link-group:hover {
  background: #eff6ff;
}
.course-link-group:hover .course-title-text {
  color: #3b82f6;
}
.course-title-text {
  font-weight: 900;
  color: #0f172a;
  font-size: 16px;
  transition: color 0.2s;
}
.run-badge {
  background: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

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

/* مدخلات النافذة */
.modal-input {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s;
  background: #fff;
}
.modal-input:focus { outline: none; border-color: #3b82f6; }
.modal-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }

/* صندوق معلومات الدورة المرتبطة بالدفع داخل النافذة (مثل الصورة 2) */
.course-link-info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  padding: 16px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
`;

export default function ChildDetails() {
  const params = useParams();
  const childId = params.id || params.childId;
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [child, setChild] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);

  // حالات نافذة الدفع المرتبطة بالدورة (الدفع للديون المسجلة)
  const [openAddPayModal, setOpenAddPayModal] = useState(false);

  // حالة جديدة لتخزين بيانات الاشتراك النشط للدفع (الاسم، الفوج، المعرف)
  const [activeEnrollment, setActiveEnrollment] = useState(null);

  // حالات المدخلات الأساسية للدفع
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payAt, setPayAt] = useState(toInputDatetimeLocal(new Date()));
  const [savingLinkedPay, setSavingLinkedPay] = useState(false);

  const loadDashboardData = async () => {
    if (!childId) return;
    setLoading(true);
    try {
      // 1. جلب بيانات الطالب
      const { data: childData, error: childErr } = await supabase
        .from("children_view")
        .select("*")
        .eq("id", childId)
        .single();

      if (childErr) throw childErr;
      setChild(childData);

      // 2. جلب الاشتراكات
      const { data: rpData, error: rpErr } = await supabase
        .from("run_participants_view")
        .select("*")
        .eq("child_id", childId);

      const { data: ceData } = await supabase
        .from("child_enrollments_view")
        .select("enrollment_id, title, label")
        .eq("child_id", childId);

      if (rpErr) throw rpErr;

      const mergedEnrollments = (rpData || []).map((enr) => {
        const courseInfo =
          (ceData || []).find((c) => c.enrollment_id === enr.enrollment_id) ||
          {};
        return {
          ...enr,
          title: courseInfo.title,
          label: courseInfo.label,
        };
      });

      setEnrollments(mergedEnrollments);

      // 3. جلب المدفوعات (فقط المرتبطة بـ enrollment_id)
      const { data: payData, error: payErr } = await supabase
        .from("payments_details_view")
        .select("*")
        .eq("child_id", childId)
        .not("enrollment_id", "is", null) // تأكيد أننا نجلب فقط دفعات الدورات
        .order("created_at", { ascending: false });

      if (payErr) throw payErr;
      setPayments(payData || []);
    } catch (err) {
      setError("حدث خطأ أثناء تحميل بيانات الطالب: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [childId]);

  // دالة فتح نافذة الدفع للديون المسجلة (من زر الجدول)
  const handleOpenAddPayModal = (enrollment) => {
    // تخزين بيانات الدورة النشطة عشان نظهرها بالنافذة ونثبت الدفع عليها
    setActiveEnrollment(enrollment);

    // تجهيز المدخلات تلقائياً
    setPayMethod("cash");
    setPayNote("");
    setPayAt(toInputDatetimeLocal(new Date()));

    // تعبئة المبلغ المتبقي (balance) كقيمة أولية للتسهيل، إذا كان أكبر من صفر
    if (Number(enrollment.balance) > 0) {
      setPayAmt(enrollment.balance);
    } else {
      setPayAmt("");
    }

    setOpenAddPayModal(true);
  };

  // دالة إرسال الدفعة (المرتبطة باشتراك)
  const handleLinkedPaymentSubmit = async () => {
    const val = Number(payAmt);
    if (!val || val <= 0) {
      toast("الرجاء إدخال مبلغ صحيح أكبر من صفر.", "warn");
      return;
    }

    // validate we have the linked enrollment id
    if (!activeEnrollment || !activeEnrollment.enrollment_id) {
      toast("خطأ في البيانات المرتبطة بالدورة.", "danger");
      return;
    }

    setSavingLinkedPay(true);
    try {
      const payload = {
        enrollment_id: activeEnrollment.enrollment_id, // مربوط بالمعرف الذي كبسنا بجانبه
        amount: val,
        method: payMethod,
        note: payNote.trim() || null,
        created_at: new Date(payAt).toISOString(),
      };

      const { error: insErr } = await supabase
        .from("payments")
        .insert([payload]);

      if (insErr) throw insErr;

      toast(`تم تسجيل قسط دورة "${activeEnrollment.title}" بنجاح.`, "ok");
      setOpenAddPayModal(false);
      await loadDashboardData(); // تحديث الأرقام والجداول
    } catch (e) {
      toast("حدث خطأ أثناء حفظ القسط.", "danger");
      console.error(e);
    } finally {
      setSavingLinkedPay(false);
    }
  };

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

  // --- العمليات الحسابية (للسداد المسجل) ---
  const totalAgreed = enrollments.reduce(
    (sum, e) => sum + Number(e.agreed_price || 0),
    0,
  );
  // إجمالي المدفوع هو مجموع كل المدفوعات التي جلبناها (المرتبطة بدورات)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalBalance = totalAgreed - totalPaid;
  const isCreditor = totalBalance < 0;

  const debtPercentage =
    totalAgreed > 0 && totalBalance > 0
      ? (totalBalance / totalAgreed) * 100
      : 0;

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
        {/* === القسم الأول: الهيدر الناعم === */}
        <div className="header-section">
          <button
            className="btn-back"
            onClick={() => navigate("/children")}
            title="رجوع للقائمة"
          >
            <ArrowRight size={26} strokeWidth={2.5} />
          </button>

          <div className="header-user-info">
            <h1 className="user-name-title">{child.name}</h1>
            {child.country && (
              <div className="badges-row">
                <Badge variant="info">
                  <MapPin size={14} style={{ marginLeft: "4px" }} />{" "}
                  {child.country}
                </Badge>
              </div>
            )}
          </div>
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
              background:
                totalBalance > 0 ? "#fffcfc" : isCreditor ? "#f0fdf4" : "white",
              borderColor:
                totalBalance > 0
                  ? "#fecaca"
                  : isCreditor
                    ? "#bbf7d0"
                    : "#e2e8f0",
            }}
          >
            <div
              className="finance-icon-wrapper"
              style={{
                background:
                  totalBalance > 0
                    ? "#fee2e2"
                    : isCreditor
                      ? "#dcfce7"
                      : "#f8fafc",
                color:
                  totalBalance > 0
                    ? "#ef4444"
                    : isCreditor
                      ? "#16a34a"
                      : "#94a3b8",
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
                {isCreditor && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#16a34a",
                    }}
                  >
                    رصيد إضافي (دائن)
                  </span>
                )}
              </div>
              <span
                className="finance-amount"
                style={{
                  color:
                    totalBalance > 0
                      ? "#ef4444"
                      : isCreditor
                        ? "#16a34a"
                        : "#0f172a",
                }}
              >
                {fmtMoney(Math.abs(totalBalance))} ₪
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

          {/* === القسم الرابع: الدورات والاشتراكات المطور بالكبسة === */}
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
                      <th>الإجراءات</th> {/* عمود جديد للكبسة كما طلبت */}
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => (
                      <tr key={enr.enrollment_id}>
                        <td>
                          {/* رابط قابل للنقر يوجه لصفحة الدورة */}
                          <div
                            className="course-link-group"
                            onClick={() => navigate(`/runs/${enr.run_id}`)}
                            title="اضغط للانتقال إلى تفاصيل الفوج"
                          >
                            <span className="course-title-text">
                              {enr.title || "دورة غير مسماة"}
                            </span>
                            {enr.label && (
                              <span className="run-badge">{enr.label}</span>
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "#64748b",
                              marginTop: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              paddingRight: "10px",
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

                        {/* كبسة تسجيل قسط سياقية جنب كل دورة كما هو في الصورة 1 */}
                        <td>
                          <div className="actions-cell">
                            <IconButton
                              title="سداد قسط"
                              onClick={() => handleOpenAddPayModal(enr)}
                              icon={Banknote}
                            />
                          </div>
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
                          {p.course_title ? (
                            <>
                              <div
                                style={{ fontWeight: 800, color: "#0f172a" }}
                              >
                                {p.course_title}
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
                            </>
                          ) : (
                            <span
                              style={{
                                background: "#eff6ff",
                                color: "#3b82f6",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: 800,
                              }}
                            >
                              دفعة غير مرتبطة
                            </span>
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

      {/* نافذة الدفع المخصصة للطفل (تسجيل قسط مربوط بالدورة تلقائياً) */}
      <Modal
        open={openAddPayModal}
        title="تسجيل قسط دورة"
        onClose={() => !savingLinkedPay && setOpenAddPayModal(false)}
      >
        <div className="grid" style={{ gap: "16px", padding: "10px 0" }}>
          <div style={{ gridColumn: "span 12" }}>
            {/* صندوق معلومات الدورة المرتبطة - مثل الصورة 2 */}
            <div className="course-link-info-box">
              <BookOpen size={18} />
              الدورة: {activeEnrollment?.title} ({activeEnrollment?.label})
            </div>

            <div
              className="muted"
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              المبلغ المطلوب سداده (₪) *
            </div>
            <input
              className="modal-input"
              type="number"
              min="0"
              step="0.01"
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              placeholder="أدخل قيمة القسط..."
            />
            {activeEnrollment && Number(activeEnrollment.balance) > 0 && (
              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  marginTop: "4px",
                  fontWeight: "bold",
                }}
              >
                المبلغ المتبقي على الدورة: {fmtMoney(activeEnrollment.balance)}{" "}
                ₪
              </div>
            )}
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div
              className="muted"
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              طريقة الدفع
            </div>
            <select
              className="modal-input"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="cash">كاش نقدي</option>
              <option value="card">بطاقة بنكية</option>
              <option value="transfer">تحويل بنكي</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div
              className="muted"
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              التاريخ والوقت
            </div>
            <input
              className="modal-input"
              type="datetime-local"
              value={payAt}
              onChange={(e) => setPayAt(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div
              className="muted"
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              ملاحظة (اختياري)
            </div>
            <input
              className="modal-input"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="أي ملاحظات حول القسط..."
            />
          </div>

          <div
            style={{
              gridColumn: "span 12",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <button
              className="btn"
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                fontWeight: 800,
                color: "#64748b",
              }}
              onClick={() => setOpenAddPayModal(false)}
              disabled={savingLinkedPay}
            >
              إلغاء
            </button>
            <button
              className="btn-primary"
              style={{
                background: "#16a34a",
                color: "white",
                padding: "12px 24px",
                borderRadius: "14px",
                border: "none",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
              }}
              onClick={handleLinkedPaymentSubmit}
              disabled={savingLinkedPay}
            >
              {savingLinkedPay ? "جاري التسجيل..." : "تأكيد السداد"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
