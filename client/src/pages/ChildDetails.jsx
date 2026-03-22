import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";

import {
  UserRound,
  Phone,
  CalendarDays,
  GraduationCap,
  Save,
  ArrowRight,
  CreditCard,
  BookOpen,
  UserCog,
  History,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Heart,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";

// ============================================================================
// CSS STYLES (مدمجة هنا لمنع أخطاء Vercel)
// ============================================================================
const PROFILE_STYLES = `
.page--profile {
  background: #f4f7f9;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(160,100%,94%,0.7) 0px, transparent 50%);
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
  padding-top: 24px;
}

.ph-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #334155;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.btn-back:hover {
  background: #f8fafc;
  transform: translateX(2px);
  border-color: #94a3b8;
}

.profile-title {
  margin: 0;
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ph-actions {
  display: flex;
  gap: 12px;
}

.btn-save {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.btn-save:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-payment {
  background: #10b981;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  text-decoration: none;
}
.btn-payment:hover {
  background: #059669;
  transform: translateY(-2px);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.bento-item {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 4px 24px -4px rgba(15, 23, 42, 0.04), 0 1px 4px -1px rgba(15, 23, 42, 0.02);
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.span-4 { grid-column: span 4; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

@media (max-width: 1024px) {
  .span-4, .span-8 { grid-column: span 12; }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group.full { grid-column: 1 / -1; }

.form-label {
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-input {
  background: #fff;
  border: 1px solid #cbd5e1;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}
.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.form-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

/* Tables */
.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}
.modern-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 800;
  font-size: 13px;
  padding: 14px 16px;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}
.modern-table th:first-child { border-radius: 0 12px 12px 0; }
.modern-table th:last-child { border-radius: 12px 0 0 12px; }

.modern-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  vertical-align: middle;
}
.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover td { background: #f8fafc; }

.loader-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  color: #64748b;
  gap: 16px;
}
.spin-icon { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default function ChildDetails() {
  const params = useParams();
  const childId = params.id || params.childId;
  const navigate = useNavigate();
  const { toast } = useOutletContext() || { toast: () => {} };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // States
  const [child, setChild] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "male",
    class: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    notes: "",
  });

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      if (!childId) return;
      setLoading(true);
      setError(null);
      try {
        // 1. جلب بيانات الطفل من الجدول الحقيقي (حسب Schema الخاص بك)
        const { data: childData, error: childErr } = await supabase
          .from("children")
          .select("*")
          .eq("id", childId)
          .single();

        if (childErr) throw childErr;

        setChild(childData);
        setFormData({
          name: childData.name || "",
          age: childData.age || "",
          gender: childData.gender || "male",
          class: childData.class || "",
          mother_name: childData.mother_name || "",
          mother_phone: childData.mother_phone || "",
          father_name: childData.father_name || "",
          father_phone: childData.father_phone || "",
          notes: childData.notes || "",
        });

        // 2. جلب الاشتراكات باستخدام الـ Views
        const { data: rpData } = await supabase
          .from("run_participants_view")
          .select("*")
          .eq("child_id", childId);

        const { data: runsSummary } = await supabase
          .from("course_runs_summary_view")
          .select("run_id, title, label");

        if (rpData && runsSummary) {
          const merged = rpData.map((enr) => {
            const runInfo =
              runsSummary.find((r) => r.run_id === enr.run_id) || {};
            return {
              ...enr,
              course_title: runInfo.title || "غير معروف",
              run_label: runInfo.label || "غير معروف",
            };
          });
          setEnrollments(merged);
        }

        // 3. جلب سجل المدفوعات
        const { data: payData } = await supabase
          .from("payments_details_view")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false });

        if (payData) setPayments(payData);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message || "حدث خطأ أثناء جلب بيانات الطالب");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [childId]);

  // Handle Save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast("اسم الطفل مطلوب", "warn");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender,
        class: formData.class,
        mother_name: formData.mother_name,
        mother_phone: formData.mother_phone,
        father_name: formData.father_name,
        father_phone: formData.father_phone,
        notes: formData.notes,
      };

      const { error: upErr } = await supabase
        .from("children")
        .update(payload)
        .eq("id", childId);

      if (upErr) throw upErr;
      toast("تم حفظ بيانات الطالب بنجاح", "ok");
    } catch (err) {
      console.error(err);
      toast("فشل حفظ البيانات", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="loader-wrap">
        <RefreshCcw size={40} className="spin-icon" color="#cbd5e1" />
        <h2>جاري تحميل البروفايل...</h2>
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

  return (
    <div className="page page--profile" dir="rtl" lang="ar">
      <style>{PROFILE_STYLES}</style>
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* ================= HEADER ================= */}
        <div className="profile-header">
          <div className="ph-left">
            <button
              className="btn-back"
              onClick={() => navigate("/children")}
              title="رجوع"
            >
              <ArrowRight size={20} />
            </button>
            <h1 className="profile-title">
              <div
                style={{
                  background: "#e0e7ff",
                  color: "#3b82f6",
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserRound size={24} />
              </div>
              {formData.name}
              <Badge variant="info" style={{ fontSize: 14 }}>
                ID: {child.id}
              </Badge>
            </h1>
          </div>
          <div className="ph-actions">
            <button
              className="btn-payment"
              onClick={() => navigate("/payments")} // يمكن تمرير الـ ID هنا مستقبلاً
            >
              <CreditCard size={18} /> دفع رسوم
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <Save size={18} /> {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </div>

        {/* ================= BENTO GRID ================= */}
        <div className="bento-grid">
          {/* 1. Basic Info Form */}
          <div className="bento-item span-8">
            <div className="section-header">
              <h2 className="section-title">
                <UserCog size={20} color="#3b82f6" /> بيانات الطالب الأساسية
              </h2>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">الاسم الرباعي</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <CalendarDays size={14} /> العمر (سنوات)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <UserRound size={14} /> الجنس
                </label>
                <select
                  className="form-input"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <GraduationCap size={14} /> الصف / المستوى
                </label>
                <input
                  className="form-input"
                  value={formData.class}
                  onChange={(e) =>
                    setFormData({ ...formData, class: e.target.value })
                  }
                  placeholder="مثال: الصف الأول"
                />
              </div>
              <div className="form-group full">
                <label className="form-label">
                  <FileText size={14} /> ملاحظات طبية أو إضافية
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="أي ملاحظات تهم المركز عن الطالب..."
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          {/* 2. Parents Info */}
          <div
            className="bento-item span-4"
            style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <div className="section-header">
              <h2 className="section-title">
                <Heart size={20} color="#f43f5e" /> معلومات الأهل
              </h2>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="form-group">
                <label className="form-label">اسم الأم</label>
                <input
                  className="form-input"
                  value={formData.mother_name}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_name: e.target.value })
                  }
                  placeholder="اسم الأم"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} /> هاتف الأم
                </label>
                <input
                  className="form-input"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  value={formData.mother_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_phone: e.target.value })
                  }
                  placeholder="05X-XXXXXXX"
                />
              </div>

              <div
                style={{ height: 1, background: "#cbd5e1", margin: "10px 0" }}
              ></div>

              <div className="form-group">
                <label className="form-label">اسم الأب</label>
                <input
                  className="form-input"
                  value={formData.father_name}
                  onChange={(e) =>
                    setFormData({ ...formData, father_name: e.target.value })
                  }
                  placeholder="اسم الأب"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} /> هاتف الأب
                </label>
                <input
                  className="form-input"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  value={formData.father_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, father_phone: e.target.value })
                  }
                  placeholder="05X-XXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* 3. Enrollments Table */}
          <div className="bento-item span-12">
            <div className="section-header">
              <h2 className="section-title">
                <BookOpen size={20} color="#8b5cf6" /> الدورات والاشتراكات
                الحالية
              </h2>
            </div>

            {enrollments.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                لا يوجد أي اشتراكات لهذا الطالب حتى الآن.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>الدورة / الفوج</th>
                      <th>حالة الاشتراك</th>
                      <th>السعر المتفق عليه</th>
                      <th>المدفوع</th>
                      <th>الرصيد المتبقي</th>
                      <th>حالة الدفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => (
                      <tr key={enr.enrollment_id}>
                        <td>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#0f172a",
                              marginBottom: 4,
                            }}
                          >
                            {enr.course_title}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>
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
                            {enr.enrollment_status === "active"
                              ? "نشط"
                              : enr.enrollment_status}
                          </Badge>
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          {fmtMoney(enr.agreed_price)} ₪
                        </td>
                        <td style={{ fontWeight: 800, color: "#10b981" }}>
                          {fmtMoney(enr.paid_amount)} ₪
                        </td>
                        <td
                          style={{
                            fontWeight: 900,
                            color: enr.balance > 0 ? "#ef4444" : "#64748b",
                          }}
                        >
                          {fmtMoney(enr.balance)} ₪
                        </td>
                        <td>
                          {enr.payment_status === "paid" ? (
                            <Badge variant="ok">خالص</Badge>
                          ) : enr.payment_status === "partial" ? (
                            <Badge variant="warn">جزئي</Badge>
                          ) : (
                            <Badge variant="danger">غير مدفوع</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Payment History */}
          <div className="bento-item span-12">
            <div className="section-header">
              <h2 className="section-title">
                <History size={20} color="#10b981" /> سجل الدفعات المالية
              </h2>
            </div>

            {payments.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                لم يقم الطالب بأي دفعات مالية بعد.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>طريقة الدفع</th>
                      <th>ملاحظات</th>
                      <th>المبلغ المدفوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#334155" }}>
                            {new Date(p.created_at).toLocaleDateString("en-GB")}
                          </div>
                          <div
                            style={{ fontSize: 12, color: "#94a3b8" }}
                            dir="ltr"
                          >
                            {new Date(p.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td>
                          <Badge variant="neutral">
                            {p.method === "cash"
                              ? "كاش"
                              : p.method === "card"
                                ? "بطاقة"
                                : p.method === "transfer"
                                  ? "حوالة"
                                  : "أخرى"}
                          </Badge>
                        </td>
                        <td style={{ color: "#64748b" }}>{p.note || "—"}</td>
                        <td
                          style={{
                            fontWeight: 900,
                            color: "#10b981",
                            fontSize: 16,
                          }}
                        >
                          <span dir="ltr">+{fmtMoney(p.amount)} ₪</span>
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
