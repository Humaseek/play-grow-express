import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

/* =========================================
   تنسيقات النموذج (المودال) 
========================================= */
.form-col-full {
  grid-column: span 12;
}
.form-col {
  grid-column: span 6;
}

.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.modal-form-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  max-height: 65vh; 
}

.modal-form-scroll-container::-webkit-scrollbar {
  width: 5px;
}
.modal-form-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.desktop-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding-bottom: 16px;
}
.desktop-form-col-full {
  grid-column: span 2;
}

.modal-fixed-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  margin-top: 10px;
  border-top: 1px solid #f1f5f9;
}

/* =========================================
   تصميم كروت الموبايل
========================================= */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: transparent;
}

.art-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.art-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.art-card::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  background: #f59e0b;
  border-radius: 0 16px 16px 0;
}

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-right: 8px;
}

.ac-name {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
}

.ac-class-badge {
  background: #f8fafc;
  color: #475569;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid #e2e8f0;
}

.ac-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 8px;
}

.ac-phone {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  direction: ltr;
}

.ac-phone-icon {
  color: #f59e0b;
  background: #fffbeb;
  padding: 4px;
  border-radius: 50%;
}

.ac-actions {
  display: flex;
  gap: 8px;
}

.ac-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}
.ac-btn-edit { background: #f1f5f9; color: #3b82f6; }
.ac-btn-delete { background: #fef2f2; color: #ef4444; }

/* الزر العائم في الموبايل */
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
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999999 !important;
}

/* =========================================
   التجاوب الخاص بالموبايل وإلغاء تأثير Bottom Sheet من styles.css
========================================= */
@media (max-width: 980px) {
  /* 👇 الكود الصارم لإلغاء النزول للأسفل وتوسيط الفورم غصباً عن styles.css 👇 */
  div.modalOverlay {
    align-items: center !important; /* توسيط عمودي */
    padding: 16px !important;
  }
  
  div.modalOverlay > div.modalCard {
    border-radius: 24px !important; 
    margin: auto !important; 
    width: 92% !important; 
    max-height: 85vh !important; 
    margin-bottom: auto !important;
    
    /* 👇 السطر الجديد للتحكم بالرفع 👇 */
    transform: translateY(-5vh) !important; 
  }

  .modal-form-scroll-container {
    max-height: calc(85vh - 140px) !important; /* مساحة السكرول المتاحة داخل الفورم الموسط */
    padding: 0 5px;
  }

  .desktop-table-container { display: none; }
  .btn-add-desktop { display: none !important; }
  .children-toolbar { padding: 16px; border-bottom: none; }
  .page--children { padding-bottom: 120px; }
  .children-card { background: transparent; border: none; box-shadow: none; }
  .children-toolbar { background: #ffffff; border-radius: 20px; margin: 0 16px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03); }
  
  .mobile-condensed-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding-bottom: 12px;
  }
  
  .mobile-condensed-grid .form-col {
    grid-column: span 1 !important; 
  }
  .mobile-condensed-grid .form-col-full {
    grid-column: span 2 !important; 
  }

  .form-section-title {
    margin: 10px 0 10px 0;
    font-size: 14px;
  }
  .input {
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .modal-fixed-footer {
    padding-bottom: 10px;
    margin-top: 5px;
  }
}

@media (min-width: 981px) {
  .mobile-list { display: none; }
  .fab-button { display: none !important; }
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

      <div className="page page--children" dir="rtl" lang="ar">
        <div className="container">
          <div className="children-header">
            <div className="children-title">الأطفال</div>
            <div className="children-subtitle">
              <span style={{ color: "#cbd5e1" }}>|</span>
              <Users size={16} /> إدارة جميع الأطفال
            </div>
          </div>

          {error && <ErrorBanner error={error} />}

          <div className="children-card">
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

                <div className="mobile-list">
                  {filteredChildren.map((child) => (
                    <div
                      key={child.id}
                      className="art-card"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      <div className="ac-header">
                        <h3 className="ac-name">{child.name}</h3>
                        <span className="ac-class-badge">
                          {child.class || "غير محدد"}
                        </span>
                      </div>
                      <div className="ac-footer">
                        <div className="ac-phone">
                          <span className="ac-phone-icon">
                            <Phone size={14} strokeWidth={2.5} />
                          </span>
                          {child.mother_phone ||
                            child.father_phone ||
                            "لا يوجد رقم"}
                        </div>
                        <div className="ac-actions">
                          <button
                            className="ac-btn ac-btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(child);
                            }}
                          >
                            <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            className="ac-btn ac-btn-delete"
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
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* الزر العائم - 👇 استخدمنا style لإخفائه بشكل قاطع عند فتح الفورم 👇 */}
      {createPortal(
        <button
          className="fab-button"
          onClick={openAddModal}
          title="إضافة طفل"
          style={{ display: isModalOpen ? "none" : "flex" }}
        >
          <Plus size={30} strokeWidth={2.5} />
        </button>,
        document.body,
      )}

      {/* نموذج الإضافة والتعديل */}
      <Modal
        open={isModalOpen}
        title={editingId ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
        onClose={() => !saving && setIsModalOpen(false)}
      >
        <div className="modal-form-scroll-container">
          <h4 className="form-section-title">البيانات الأساسية</h4>
          <div className="desktop-form-grid mobile-condensed-grid">
            <div className="desktop-form-col-full form-col-full">
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

            <div className="form-col">
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
            <div className="form-col">
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

            <div className="form-col">
              <div className="muted" style={{ marginBottom: 6 }}>
                الصف
              </div>
              <CustomCombobox
                value={formData.class}
                onChange={(v) => setFormData({ ...formData, class: v })}
                options={classes.map((c) => ({ value: c.name, label: c.name }))}
                placeholder="اختر أو اكتب صفاً..."
              />
            </div>
            <div className="form-col">
              <div className="muted" style={{ marginBottom: 6 }}>
                المدينة / البلد
              </div>
              <CustomCombobox
                value={formData.country_name}
                onChange={(v) => setFormData({ ...formData, country_name: v })}
                options={countries.map((c) => ({
                  value: c.name,
                  label: c.name,
                }))}
                placeholder="اختر أو اكتب مدينة..."
              />
            </div>
          </div>

          <h4 className="form-section-title" style={{ marginTop: 10 }}>
            معلومات التواصل
          </h4>
          <div className="desktop-form-grid mobile-condensed-grid">
            <div className="form-col">
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
            <div className="form-col">
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
            <div className="form-col">
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
            <div className="form-col">
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

          <div className="desktop-form-grid mobile-condensed-grid">
            <div className="desktop-form-col-full form-col-full">
              <div className="muted" style={{ marginBottom: 6 }}>
                ملاحظات إضافية
              </div>
              <textarea
                className="input"
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="أي تفاصيل طبية أو ملاحظات أخرى..."
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        <div className="modal-fixed-footer">
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
      </Modal>

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
