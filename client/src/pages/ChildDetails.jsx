// ChildDetails.jsx

import React, { useState, useEffect } from "react";
// 1. استيراد useNavigate
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Loader from "./Loader";
import ErrorBanner from "./ErrorBanner";
// 2. تأكد من استيراد ملف CSS
import "./ChildDetails.css"; // أنشئ هذا الملف وأضف الأنماط

export default function ChildDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    // منطق إضافة دفعة جديدة (مثلاً: فتح نافذة مودال)
    console.log("إضافة دفعة جديدة للطفل:", id);
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="page-content child-details" dir="rtl">
      {/* 3. رأس الصفحة (Header) */}
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
            إلغاء
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="main-grid">
          {/* 4. المعلومات الأساسية (Basic Info) */}
          <div className="info-card basic-info">
            <div className="card-header">
              <h2>👶 المعلومات الأساسية</h2>
            </div>
            <div className="card-body">
              <div className="avatar-section">
                <div className="avatar-placeholder">👤</div>
                {/* يمكنك إضافة زر لتغيير الصورة لاحقاً */}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>الاسم الأول</label>
                  <input
                    type="text"
                    value={child.first_name}
                    onChange={(e) =>
                      setChild({ ...child, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>اسم العائلة</label>
                  <input
                    type="text"
                    value={child.last_name}
                    onChange={(e) =>
                      setChild({ ...child, last_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={child.birth_date}
                    onChange={(e) =>
                      setChild({ ...child, birth_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>العمر</label>
                  {/* حساب العمر وعرضه تلقائياً */}
                  <input
                    type="text"
                    value={calculateAge(child.birth_date)}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>الجنس</label>
                  <select
                    value={child.gender}
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
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. معلومات ولي الأمر (Guardian Info) */}
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
                      <span>{guardian.phone_number || "غير محدد"}</span>
                    </div>
                    <div className="guardian-field">
                      <span>🔗</span>
                      <span>{guardian.relationship || "غير محدد"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted text-center">
                  لا توجد معلومات عن ولي الأمر
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. السجل المالي وتاريخ التسجيل (Tabs/Cards) */}
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
                <table className="modern-table payment-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>طريقة الدفع</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.created_at || "غير محدد"}</td>
                        <td>{fmtMoney(payment.amount)} ₪</td>
                        <td>{payment.method || "غير محدد"}</td>
                        <td>
                          {/* شارة حالة الدفع */}
                          <span className={`payment-status paid`}>مدفوع</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted text-center">لا يوجد سجل مدفوعات</div>
              )}
            </div>
          </div>

          {/* تاريخ التسجيل (Enrollment History) */}
          <div className="info-card enrollment-history">
            <div className="card-header">
              <h2>📝 تاريخ التسجيل</h2>
            </div>
            <div className="card-body">
              {enrollmentHistory.length > 0 ? (
                <table className="modern-table enrollment-table">
                  <thead>
                    <tr>
                      <th>الدورة</th>
                      <th>تاريخ البدء</th>
                      <th>تاريخ الانتهاء</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentHistory.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.courses?.title || "غير محدد"}</td>
                        <td>{enrollment.start_date || "غير محدد"}</td>
                        <td>{enrollment.end_date || "غير محدد"}</td>
                        <td>
                          {/* شارة حالة التسجيل */}
                          <span className={`enrollment-status active`}>
                            نشط
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted text-center">لا يوجد سجل تسجيلي</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
