import React, { useEffect, useMemo, useState, useRef } from "react";
// إضافة الاستيراد الخاص بـ useNavigate للانتقال بين الصفحات
import { useNavigate } from "react-router-dom";
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
   تنسيقات الموبايل (البطاقات والزر العائم) 
========================================= */

.mobile-list {
  display: flex;
  flex-direction: column;
}

.mobile-card {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mobile-card:hover {
  background: #f8fafc;
}

.mobile-card:last-child {
  border-bottom: none;
}

.mc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mc-row.mt-2 {
  margin-top: 12px;
}

.mc-name {
  font-weight: 800;
  color: #0f172a;
  font-size: 16px;
}

.mc-category {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.mc-details {
  font-size: 14px;
  color: #475569;
}

.mc-actions {
  display: flex;
  gap: 12px;
}

/* الزر العائم في الموبايل - الآن هو خارج صفحة الأنيميشن لذلك سيثبت تماماً */
.fab-button {
  position: fixed !important;
  bottom: 95px !important; /* مسافة كافية ليكون فوق الشريط السفلي (الذي ارتفاعه 75px) */
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
  z-index: 99999 !important; /* لضمان ظهوره فوق جميع العناصر */
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
  }
  .page--children { 
    padding-bottom: 120px; /* لتوفير مساحة للزر العائم والشريط السفلي */
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

                {/* عرض القائمة كبطاقات للموبايل (Mobile) */}
                <div className="mobile-list">
                  {filteredChildren.map((child) => (
                    <div
                      key={child.id}
                      className="mobile-card"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      <div className="mc-row">
                        <span className="mc-name">{child.name}</span>
                        <span className="mc-category">
                          {child.class || "غير محدد"}
                        </span>
                      </div>
                      <div className="mc-row mt-2">
                        <span className="mc-details phone-number">
                          {child.mother_phone ||
                            child.father_phone ||
                            "لا يوجد رقم هاتف"}
                        </span>
                        <div className="mc-actions">
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
                          >
                            <Trash2 size={20} />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(child);
                            }}
                          >
                            <Pencil size={20} />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======== الحل السحري ========
        الزر العائم الخاص بالموبايل (FAB) تم نقله هنا
        خارج حاوية <div className="page"> 
        ليتجنب تأثير الـ CSS Transform 
        ويصبح ثابتاً على الشاشة!
      */}
      <button className="fab-button" onClick={openAddModal} title="إضافة طفل">
        <Plus size={30} strokeWidth={2.5} />
      </button>

      {/* نموذج الإضافة والتعديل */}
      <Modal
        open={isModalOpen}
        title={editingId ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
        onClose={() => !saving && setIsModalOpen(false)}
      >
        <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
          {/* قسم البيانات الأساسية */}
          <div style={{ gridColumn: "span 12" }}>
            <h4 className="form-section-title">
              <Users size={18} color="#64748b" /> البيانات الأساسية
            </h4>
            <div className="grid" style={{ gap: "16px" }}>
              <div style={{ gridColumn: "span 12" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  الاسم الرباعي *
                </div>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: أحمد محمد علي"
                />
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  العمر
                </div>
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
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  الجنس
                </div>
                <ModernSelect
                  value={formData.gender}
                  onChange={(v) => setFormData({ ...formData, gender: v })}
                  options={[
                    { value: "male", label: "ذكر" },
                    { value: "female", label: "أنثى" },
                  ]}
                />
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  الصف
                </div>
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
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  المدينة / البلد
                </div>
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
          <div style={{ gridColumn: "span 12" }}>
            <h4 className="form-section-title">
              <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
            </h4>
            <div className="grid" style={{ gap: "16px" }}>
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  هاتف الأم
                </div>
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
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  اسم الأم
                </div>
                <input
                  className="input"
                  value={formData.mother_name}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_name: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  هاتف الأب
                </div>
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
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted" style={{ marginBottom: 6 }}>
                  اسم الأب
                </div>
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
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              ملاحظات إضافية
            </div>
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

          {/* أزرار الإجراءات في النموذج */}
          <div
            style={{
              gridColumn: "span 12",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 10,
            }}
          >
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
