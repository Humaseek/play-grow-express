import React, { useEffect, useMemo, useState, useRef } from "react";
// إضافة الاستيراد الخاص بـ useNavigate للانتقال بين الصفحات
import { useNavigate } from "react-router-dom";
// السلاح السري لحل مشكلة الزر العائم
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import IconButton from "../components/IconButton";
import Badge from "../components/Badge";
import ModernSelect from "../components/ModernSelect";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  ChevronDown,
} from "lucide-react";

// --- مُركّب مخصص للجمع بين الكتابة والقائمة المنسدلة (Combobox) ---
function CustomCombobox({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    (o.label || "").toLowerCase().includes((value || "").toLowerCase()),
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{ width: "100%", paddingLeft: 36 }}
      />
      <ChevronDown
        size={16}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
          color: "#94a3b8",
          pointerEvents: "none",
          transition: "transform 0.2s ease",
        }}
      />
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: "14px",
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            padding: "4px",
          }}
        >
          {filtered.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                color: "#334155",
                borderRadius: "10px",
                transition: "background 0.15s ease",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8fafc")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- تنسيقات CSS مدمجة ---
const CHILDREN_STYLES = `
.page--children {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, #f4f6f8 300px);
  min-height: 100vh;
  padding-bottom: 40px;
}

.children-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.children-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 10px 24px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  font-size: 24px;
  font-weight: 900;
  color: #0f172a;
}

.children-subtitle {
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.children-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
  overflow: hidden;
}

.children-toolbar {
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.search-wrapper {
  position: relative;
  flex: 1 1 300px;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.search-input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.modern-table th {
  background: #fff;
  color: #64748b;
  font-weight: 800;
  font-size: 14px;
  padding: 16px 24px;
  border-bottom: 2px solid #f1f5f9;
  white-space: nowrap;
}

.modern-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #f8fafc;
  color: #334155;
  font-size: 15px;
  vertical-align: middle;
  transition: background 0.15s ease;
}

.modern-table tr.clickable-row {
  cursor: pointer;
}
.modern-table tr.clickable-row:hover td {
  background: #f8fafc;
}

.modern-table tr:last-child td {
  border-bottom: none;
}

.child-id {
  font-weight: 800;
  color: #94a3b8;
}

.child-name {
  font-weight: 900;
  color: #0f172a;
}

.phone-number {
  direction: ltr;
  unicode-bidi: embed;
  display: inline-block;
  font-weight: 600;
  color: #475569;
}

.btn-add {
  background: #f59e0b !important;
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.2) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3) !important;
  background: #d97706 !important;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ModernBadge.ModernBadge-info {
  border-color: #bbf7d0 !important;
  background: #f0fdf4 !important;
  color: #16a34a !important;
}

.ModernBadge.ModernBadge-warning {
  border-color: #fde68a !important;
  background: #fffbeb !important;
  color: #d97706 !important;
}

.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* =========================================
   تنسيقات النموذج (المودال) المتجاوبة والاحترافية
========================================= */

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0;
}

.form-fields-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* أهم تنسيق: ترتيب عمودي للحقول على الموبايل */
.form-fields-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* تنسيق مجموعة الحقل (الاسم + صندوق الإدخال) */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

/* وضع اسم الحقل فوق صندوق الإدخال */
.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}

/* لضمان أن صناديق الإدخال تملأ المساحة */
.form-container .input,
.form-container textarea {
  width: 100% !important;
  box-sizing: border-box;
}

/* شريط الأزرار في أسفل النموذج */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f1f5f9;
}

/* تنسيقات كروت الموبايل (كما هي) */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
}

.mobile-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.04);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.mc-avatar {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  flex-shrink: 0;
}

.mc-avatar.male {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #0284c7;
}

.mc-avatar.female {
  background: linear-gradient(135deg, #fce7f3, #fbcfe8);
  color: #db2777;
}

.mc-avatar.default {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #d97706;
}

.mc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mc-name {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.mc-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mc-class-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
}

.mc-phone-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  direction: ltr;
}

.mc-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.mc-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mc-btn-edit {
  background: #f1f5f9;
  color: #64748b;
}

.mc-btn-edit:hover {
  background: #e2e8f0;
  color: #334155;
  transform: scale(1.05);
}

.mc-btn-delete {
  background: #fef2f2;
  color: #ef4444;
}

.mc-btn-delete:hover {
  background: #fee2e2;
  color: #dc2626;
  transform: scale(1.05);
}

.fab-button {
  position: fixed !important;
  bottom: 95px !important;
  right: 20px !important;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f59e0b;
  color: white;
  border: none;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999999 !important;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.fab-button:hover, .fab-button:active {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
  background: #d97706;
}

/* التجاوب (Media Queries) */
@media (max-width: 768px) {
  .desktop-table-container { 
    display: none; 
  }
  .btn-add-desktop { 
    display: none !important; 
  }
  .children-toolbar { 
    padding: 16px; 
    border-bottom: none; 
  }
  .page--children { 
    padding-bottom: 120px; 
  }
  .children-card {
    background: transparent; 
    border: none;
    box-shadow: none;
  }
  .children-toolbar {
    background: #ffffff;
    border-radius: 20px;
    margin: 0 16px; 
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
  }
}

@media (min-width: 769px) {
  .mobile-list { 
    display: none; 
  }
  .fab-button { 
    display: none !important; 
  }
}
`;

export default function Children() {
  const navigate = useNavigate();

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [countries, setCountries] = useState([]);
  const [classes, setClasses] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    class: "",
    gender: "male",
    country_name: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    notes: "",
  });

  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    text: "",
  });

  useEffect(() => {
    loadData();
    loadPicklists();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("children_view")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setChildren(data || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPicklists() {
    try {
      const [cRes, clRes] = await Promise.all([
        supabase.from("countries").select("id,name").order("name"),
        supabase.from("child_classes").select("id,name").order("name"),
      ]);
      if (cRes.data) setCountries(cRes.data);
      if (clRes.data) setClasses(clRes.data);
    } catch (e) {
      console.error("Failed to load picklists:", e);
    }
  }

  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children;
    const q = searchQuery.toLowerCase();
    return children.filter(
      (c) =>
        (c.id && String(c.id).includes(q)) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.mother_phone || "").includes(q) ||
        (c.father_phone || "").includes(q),
    );
  }, [children, searchQuery]);

  function openAddModal() {
    setEditingId(null);
    setFormData({
      name: "",
      age: "",
      class: "",
      gender: "male",
      country_name: "",
      mother_name: "",
      mother_phone: "",
      father_name: "",
      father_phone: "",
      notes: "",
    });
    setIsModalOpen(true);
  }

  function openEditModal(child) {
    setEditingId(child.id);
    setFormData({
      name: child.name || "",
      age: child.age ?? "",
      class: child.class || "",
      gender: child.gender || "male",
      country_name: child.country || "",
      mother_name: child.mother_name || "",
      mother_phone: child.mother_phone || "",
      father_name: child.father_name || "",
      father_phone: child.father_phone || "",
      notes: child.notes || "",
    });
    setIsModalOpen(true);
  }

  async function handleSave() {
    const name = formData.name.trim();
    const ageNum = Number(formData.age);

    if (!name) {
      alert("الرجاء إدخال اسم الطفل الرباعي.");
      return;
    }

    setSaving(true);
    try {
      let countryId = null;
      const typedCountry = formData.country_name.trim();
      if (typedCountry) {
        const existingC = countries.find((c) => c.name === typedCountry);
        if (existingC) {
          countryId = existingC.id;
        } else {
          const created = await supabase
            .from("countries")
            .insert([{ name: typedCountry }])
            .select("id")
            .single();
          if (created.data) countryId = created.data.id;
        }
      }

      const typedClass = formData.class.trim();
      if (typedClass) {
        const existingCl = classes.find((c) => c.name === typedClass);
        if (!existingCl) {
          await supabase.from("child_classes").insert([{ name: typedClass }]);
        }
      }

      const payload = {
        name,
        age: isNaN(ageNum) ? null : ageNum,
        class: typedClass || null,
        gender: formData.gender,
        country_id: countryId,
        mother_name: formData.mother_name.trim() || null,
        mother_phone: formData.mother_phone.trim() || null,
        father_name: formData.father_name.trim() || null,
        father_phone: formData.father_phone.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("children")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("children").insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      loadData();
      loadPicklists();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const { error } = await supabase.from("children").delete().eq("id", id);
      if (error) {
        if (error.message.includes("foreign key constraint")) {
          alert("لا يمكن حذف الطفل لارتباطه بدفعات أو دورات مسجلة.");
        } else {
          throw error;
        }
      } else {
        loadData();
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء عملية الحذف.");
    }
  }

  const genderLabel = (g) => {
    if (g === "male") return <Badge variant="info">ذكر</Badge>;
    if (g === "female") return <Badge variant="warning">أنثى</Badge>;
    return "-";
  };

  const getAvatarClass = (gender) => {
    if (gender === "male") return "male";
    if (gender === "female") return "female";
    return "default";
  };

  return (
    <>
      <style>{CHILDREN_STYLES}</style>

      {/* حاوية الصفحة الأساسية */}
      <div className="page page--children" dir="rtl" lang="ar">
        <div className="container">
          {/* رأس الصفحة */}
          <div className="children-header">
            <div className="children-title">الأطفال</div>
            <div className="children-subtitle">
              <span style={{ color: "#cbd5e1" }}>|</span>
              <Users size={16} /> إدارة جميع الأطفال
            </div>
          </div>

          {error && <ErrorBanner error={error} />}

          <div className="children-card">
            {/* شريط الأدوات العلوي */}
            <div className="children-toolbar">
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="ابحث بالاسم، المعرف أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* زر الإضافة للشاشات الكبيرة فقط */}
              <button
                className="btn btn-add btn-add-desktop"
                onClick={openAddModal}
              >
                <Plus size={18} /> إضافة طفل
              </button>
            </div>

            {loading ? (
              <div
                style={{ padding: 40, textAlign: "center", color: "#64748b" }}
              >
                جاري التحميل...
              </div>
            ) : filteredChildren.length === 0 ? (
              <div
                style={{ padding: 40, textAlign: "center", color: "#64748b" }}
              >
                لا يوجد بيانات متطابقة.
              </div>
            ) : (
              <>
                {/* عرض الجدول المعتاد للشاشات الكبيرة (Desktop) */}
                <div
                  className="desktop-table-container"
                  style={{ overflowX: "auto" }}
                >
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: 60, textAlign: "center" }}>معرف</th>
                        <th>الاسم</th>
                        <th>العمر</th>
                        <th>الصف</th>
                        <th>الجنس</th>
                        <th>المدينة</th>
                        <th>هاتف الأم</th>
                        <th>هاتف الأب</th>
                        <th style={{ width: 100, textAlign: "center" }}>
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChildren.map((child) => (
                        <tr
                          key={child.id}
                          className="clickable-row"
                          onClick={() => navigate(`/children/${child.id}`)}
                        >
                          <td
                            className="child-id"
                            style={{ textAlign: "center" }}
                          >
                            {child.id}
                          </td>
                          <td className="child-name">{child.name}</td>
                          <td>{child.age ?? "-"}</td>
                          <td className="muted">{child.class || "-"}</td>
                          <td>{genderLabel(child.gender)}</td>
                          <td className="muted">{child.country || "-"}</td>
                          <td>
                            <span className="phone-number">
                              {child.mother_phone || "-"}
                            </span>
                          </td>
                          <td>
                            <span className="phone-number">
                              {child.father_phone || "-"}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(child);
                                }}
                                title="تعديل"
                              >
                                <Pencil size={16} />
                              </IconButton>
                              <IconButton
                                danger
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirm({
                                    open: true,
                                    id: child.id,
                                    text: `هل أنت متأكد من حذف بيانات الطفل (${child.name})؟`,
                                  });
                                }}
                                title="حذف"
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* تصميم الكروت للموبايل (Mobile) كما هي */}
                <div className="mobile-list">
                  {filteredChildren.map((child) => (
                    <div
                      key={child.id}
                      className="mobile-card"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      {/* الأفاتار الملون */}
                      <div
                        className={`mc-avatar ${getAvatarClass(child.gender)}`}
                      >
                        {child.name ? (
                          child.name.charAt(0)
                        ) : (
                          <Users size={24} />
                        )}
                      </div>

                      {/* معلومات الطفل */}
                      <div className="mc-info">
                        <h3 className="mc-name">{child.name}</h3>
                        <div className="mc-meta-row">
                          <span className="mc-class-badge">
                            {child.class || "غير محدد"}
                          </span>
                          <span className="mc-phone-badge">
                            <Phone size={12} strokeWidth={2.5} />
                            {child.mother_phone ||
                              child.father_phone ||
                              "لا يوجد رقم"}
                          </span>
                        </div>
                      </div>

                      {/* أزرار الإجراءات الجانبية */}
                      <div className="mc-actions">
                        <button
                          className="mc-btn mc-btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(child);
                          }}
                        >
                          <Pencil size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          className="mc-btn mc-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirm({
                              open: true,
                              id: child.id,
                              text: `هل أنت متأكد من حذف بيانات الطفل (${child.name})؟`,
                            });
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* الزر العائم (FAB) باستخدام createPortal لضمان ثباته */}
      {createPortal(
        <button className="fab-button" onClick={openAddModal} title="إضافة طفل">
          <Plus size={30} strokeWidth={2.5} />
        </button>,
        document.body,
      )}

      {/* نموذج الإضافة والتعديل المحدث ليكون متجاوباً */}
      <Modal
        open={isModalOpen}
        title={editingId ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
        onClose={() => !saving && setIsModalOpen(false)}
      >
        {/* حاوية النموذج الجديدة */}
        <div className="form-container">
          {/* قسم البيانات الأساسية */}
          <div className="form-fields-group">
            <h4 className="form-section-title">
              <Users size={18} color="#64748b" /> البيانات الأساسية
            </h4>

            {/* أهم شيء: ترتيب عمودي للحقول على الموبايل */}
            <div className="form-fields-stack">
              {/* مجموعة الحقل: الاسم */}
              <div className="form-group">
                <label className="form-label">الاسم الرباعي *</label>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: أحمد محمد علي"
                />
              </div>

              {/* مجموعة الحقل: العمر */}
              <div className="form-group">
                <label className="form-label">العمر</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={120}
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="بالسنوات"
                />
              </div>

              {/* مجموعة الحقل: الجنس */}
              <div className="form-group">
                <label className="form-label">الجنس</label>
                <ModernSelect
                  value={formData.gender}
                  onChange={(v) => setFormData({ ...formData, gender: v })}
                  options={[
                    { value: "male", label: "ذكر" },
                    { value: "female", label: "أنثى" },
                  ]}
                />
              </div>

              {/* مجموعة الحقل: الصف */}
              <div className="form-group">
                <label className="form-label">الصف</label>
                <CustomCombobox
                  value={formData.class}
                  onChange={(v) => setFormData({ ...formData, class: v })}
                  options={classes.map((c) => ({
                    value: c.name,
                    label: c.name,
                  }))}
                  placeholder="اختر أو اكتب صفاً..."
                />
              </div>

              {/* مجموعة الحقل: المدينة */}
              <div className="form-group">
                <label className="form-label">المدينة / البلد</label>
                <CustomCombobox
                  value={formData.country_name}
                  onChange={(v) =>
                    setFormData({ ...formData, country_name: v })
                  }
                  options={countries.map((c) => ({
                    value: c.name,
                    label: c.name,
                  }))}
                  placeholder="اختر أو اكتب مدينة..."
                />
              </div>
            </div>
          </div>

          {/* قسم معلومات التواصل مع الأهل */}
          <div className="form-fields-group">
            <h4 className="form-section-title">
              <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
            </h4>

            <div className="form-fields-stack">
              <div className="form-group">
                <label className="form-label">هاتف الأم</label>
                <input
                  className="input"
                  value={formData.mother_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_phone: e.target.value })
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم الأم</label>
                <input
                  className="input"
                  value={formData.mother_name}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_name: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>

              <div className="form-group">
                <label className="form-label">هاتف الأب</label>
                <input
                  className="input"
                  value={formData.father_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, father_phone: e.target.value })
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم الأب</label>
                <input
                  className="input"
                  value={formData.father_name}
                  onChange={(e) =>
                    setFormData({ ...formData, father_name: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
          </div>

          {/* قسم الملاحظات */}
          <div className="form-fields-group">
            <div className="form-group">
              <label className="form-label">ملاحظات إضافية</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="أي تفاصيل طبية أو ملاحظات أخرى..."
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* أزرار الإجراءات المحدثة */}
          <div className="form-footer">
            <button
              className="btn"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              className="btn btn-add"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </div>
      </Modal>

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        open={confirm.open}
        title="تأكيد الحذف"
        message={confirm.text}
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirm({ open: false, id: null, text: "" })}
        onConfirm={async () => {
          await handleDelete(confirm.id);
          setConfirm({ open: false, id: null, text: "" });
        }}
      />
    </>
  );
}
