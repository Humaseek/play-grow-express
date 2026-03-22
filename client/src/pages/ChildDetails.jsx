// ChildDetails.jsx

import React, { useState, useEffect } from "react";
// تمت إضافة useOutletContext لتعريف دالة الإشعارات toast
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";

// 1. إصلاح مسار ErrorBanner ليكون من مجلد المكونات
import ErrorBanner from "../components/ErrorBanner";

// 2. إزالة استيراد Loader الوهمي واستخدام نص تحميل بديل
import "./ChildDetails.css";

export default function ChildDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  // 3. تعريف دالة toast لتجنب تعطل الصفحة عند الحفظ
  const { toast } = useOutletContext() || { toast: () => {} };

  const [child, setChild] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // لحساب العمر
  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return "غير محدد";
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    async function fetchChildDetails() {
      setLoading(true);
      setError(null);
      try {
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("*, classes(name)")
          .eq("id", id)
          .single();
        if (childError) throw childError;
        setChild(childData);

        const { data: guardiansData, error: guardiansError } = await supabase
          .from("guardians")
          .select("*")
          .eq("id", childData.guardian_id);
        if (guardiansError) throw guardiansError;
        setGuardians(guardiansData);

        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*, courses(title)")
          .eq("child_id", id);
        if (enrollmentError) throw enrollmentError;
        setEnrollmentHistory(enrollmentData);

        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("child_id", id);
        if (paymentError) throw paymentError;
        setPaymentHistory(paymentData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchChildDetails();
  }, [id]);

  const updateChild = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          first_name: child.first_name,
          last_name: child.last_name,
          birth_date: child.birth_date,
          gender: child.gender,
        })
        .eq("id", id);
      if (error) throw error;
      toast("تم حفظ التعديلات بنجاح", "ok");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setSaving(false);
    }
  };

  const addPayment = () => {
    // الانتقال لصفحة المدفوعات بدلاً من الدالة الفارغة
    navigate("/payments");
  };

  // استبدال <Loader /> بنص تحميل مدمج
  if (loading)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: "#64748b",
          fontWeight: 800,
        }}
      >
        جاري تحميل بيانات الطالب...
      </div>
    );
  if (error) return <ErrorBanner error={error} />;
  if (!child)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: "#ef4444",
          fontWeight: 800,
        }}
      >
        لم يتم العثور على بيانات الطفل!
      </div>
    );

  return (
    <div className="page-content child-details" dir="rtl">
      {/* رأس الصفحة (Header) */}
      <div className="content-header">
        <div className="header-info">
          <h1>
            👤 {child.first_name} {child.last_name}
          </h1>
          <span className="id-badge">ID: {child.id}</span>
          {/* شارة حالة الاشتراك */}
          <span className={`status-badge active`}>نشط</span>
        </div>
        <div className="header-actions">
          <button onClick={updateChild} className="btn-save" disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
          <button onClick={() => navigate("/children")} className="btn-cancel">
            رجوع
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="main-grid">
          {/* المعلومات الأساسية (Basic Info) */}
          <div className="info-card basic-info">
            <div className="card-header">
              <h2>👶 المعلومات الأساسية</h2>
            </div>
            <div className="card-body">
              <div className="avatar-section">
                <div className="avatar-placeholder">👤</div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>الاسم الأول</label>
                  <input
                    type="text"
                    value={child.first_name || ""}
                    onChange={(e) =>
                      setChild({ ...child, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>اسم العائلة</label>
                  <input
                    type="text"
                    value={child.last_name || ""}
                    onChange={(e) =>
                      setChild({ ...child, last_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={child.birth_date || ""}
                    onChange={(e) =>
                      setChild({ ...child, birth_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>العمر</label>
                  <input
                    type="text"
                    value={calculateAge(child.birth_date)}
                    disabled
                    style={{ background: "#f8fafc" }}
                  />
                </div>
                <div className="form-group">
                  <label>الجنس</label>
                  <select
                    value={child.gender || "male"}
                    onChange={(e) =>
                      setChild({ ...child, gender: e.target.value })
                    }
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>الصف الحالي</label>
                  <input
                    type="text"
                    value={child.classes?.name || "غير محدد"}
                    disabled
                    style={{ background: "#f8fafc" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* معلومات ولي الأمر (Guardian Info) */}
          <div className="info-card guardian-info">
            <div className="card-header">
              <h2>🧑‍🧑‍🧒 معلومات ولي الأمر</h2>
            </div>
            <div className="card-body">
              {guardians.length > 0 ? (
                guardians.map((guardian) => (
                  <div key={guardian.id} className="guardian-item">
                    <div className="guardian-field">
                      <span>👤</span>
                      <span>
                        {guardian.first_name} {guardian.last_name}
                      </span>
                    </div>
                    <div className="guardian-field">
                      <span>📞</span>
                      <span dir="ltr">
                        {guardian.phone_number || "غير محدد"}
                      </span>
                    </div>
                    <div className="guardian-field">
                      <span>🔗</span>
                      <span>{guardian.relationship || "غير محدد"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted text-center" style={{ padding: 20 }}>
                  لا توجد معلومات مسجلة عن ولي الأمر
                </div>
              )}
            </div>
          </div>
        </div>

        {/* السجل المالي وتاريخ التسجيل */}
        <div className="tabs-container">
          {/* تاريخ الدفع (Payment History) */}
          <div className="info-card payment-history">
            <div className="card-header">
              <h2>💰 السجل المالي</h2>
              <button onClick={addPayment} className="btn-add-payment">
                إضافة دفعة
              </button>
            </div>
            <div className="card-body">
              {paymentHistory.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="modern-table payment-table"
                    style={{ width: "100%", textAlign: "right" }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #f1f5f9",
                          }}
                        >
                          التاريخ
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #f1f5f9",
                          }}
                        >
                          المبلغ
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #f1f5f9",
                          }}
                        >
                          طريقة الدفع
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr
                          key={payment.id}
                          style={{ borderBottom: "1px solid #f8fafc" }}
                        >
                          <td style={{ padding: "12px" }} dir="ltr">
                            {new Date(payment.created_at).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: "bold",
                              color: "#10b981",
                            }}
                            dir="ltr"
                          >
                            +{payment.amount} ₪
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                background: "#f1f5f9",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "13px",
                              }}
                            >
                              {payment.method === "cash"
                                ? "كاش"
                                : payment.method === "card"
                                  ? "بطاقة"
                                  : payment.method === "transfer"
                                    ? "تحويل"
                                    : payment.method || "أخرى"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="muted text-center" style={{ padding: 30 }}>
                  لا يوجد سجل مدفوعات
                </div>
              )}
            </div>
          </div>

          {/* تاريخ التسجيل (Enrollment History) */}
          <div className="info-card enrollment-history">
            <div className="card-header">
              <h2>📝 تاريخ التسجيل في الدورات</h2>
            </div>
            <div className="card-body">
              {enrollmentHistory.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="modern-table enrollment-table"
                    style={{ width: "100%", textAlign: "right" }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #f1f5f9",
                          }}
                        >
                          الدورة
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #f1f5f9",
                          }}
                        >
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollmentHistory.map((enrollment) => (
                        <tr
                          key={enrollment.id}
                          style={{ borderBottom: "1px solid #f8fafc" }}
                        >
                          <td style={{ padding: "12px", fontWeight: "bold" }}>
                            {enrollment.courses?.title || "غير محدد"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                background:
                                  enrollment.status === "active"
                                    ? "#f0fdf4"
                                    : "#fef2f2",
                                color:
                                  enrollment.status === "active"
                                    ? "#10b981"
                                    : "#ef4444",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "bold",
                              }}
                            >
                              {enrollment.status === "active"
                                ? "نشط"
                                : enrollment.status === "completed"
                                  ? "مكتمل"
                                  : enrollment.status === "withdrawn"
                                    ? "منسحب"
                                    : enrollment.status || "غير محدد"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="muted text-center" style={{ padding: 30 }}>
                  لا يوجد سجل تسجيلي
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
