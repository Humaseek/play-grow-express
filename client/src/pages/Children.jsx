import React, { useEffect, useMemo, useState, useRef } from "react";
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
  MapPin,
  Phone,
  Cake,
  GraduationCap,
  ChevronDown,
  UserRound,
  Copy,
  MoreVertical,
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
        style={{ width: "100%" }}
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

// --- تنسيقات CSS احترافية ومطلقة الدقة (Desktop + Ultra Mobile) ---
const CHILDREN_STYLES = `
/* ==========================================================================
   DESKTOP & GLOBAL STYLES
   ========================================================================== */
.page--children {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
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
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.child-id { font-weight: 800; color: #94a3b8; }
.child-name { font-weight: 900; color: #0f172a; }
.phone-number { direction: ltr; unicode-bidi: embed; display: inline-block; font-weight: 600; color: #475569; }

.btn-add {
  background: #0ea5e9 !important; /* لون أزرق فخم */
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.25) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-add:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35) !important; background: #0284c7 !important; }

.actions-cell { display: flex; gap: 8px; align-items: center; }
.form-section-title { margin: 0 0 16px 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; display: flex; align-items: center; gap: 8px; font-weight: 800; }

/* ==========================================================================
   NATIVE MOBILE APP VIBE (ABSOLUTE PERFECTION)
   ========================================================================== */
.mobile-only { display: none; }
.desktop-only { display: block; }
.mc-fab { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  /* 1. إزالة الفراغ العلوي وتجهيز المساحة بالكامل */
  html, body {
    background: #f4f6f9 !important;
  }
  
  .page--children {
    padding: 0 0 100px 0 !important; /* 0 من فوق، 100 من تحت عشان البار السفلي */
    background: #f4f6f9 !important;
  }
  
  .container {
    padding: 0 !important; /* إلغاء حشوة الكونتينر */
    max-width: 100% !important;
  }

  /* 2. ترويسة التطبيق العلوية (App Header) */
  .mobile-app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(244, 246, 249, 0.95);
    backdrop-filter: blur(16px);
    padding: env(safe-area-inset-top, 16px) 16px 12px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-app-header-top {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .mobile-app-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.3px;
  }

  /* 3. شريط البحث المدمج للموبايل */
  .mobile-search-bar {
    position: relative;
    width: 100%;
  }
  
  .mobile-search-bar input {
    width: 100%;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 16px;
    padding: 12px 16px 12px 44px;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    outline: none;
    transition: border-color 0.2s;
  }
  
  .mobile-search-bar input:focus {
    border-color: #3b82f6;
  }

  .mobile-search-bar .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  /* 4. إخفاء العناصر القديمة التي تم استبدالها */
  .children-header, .children-toolbar, .children-card {
    display: none !important;
  }

  /* 5. الزر العائم (FAB) - ثابت، أزرق، وفخم */
  .mc-fab.mobile-only {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7); /* أزرق جذاب */
    color: #fff;
    position: fixed !important;
    bottom: 96px !important; /* فوق شريط التنقل السفلي */
    left: 20px !important; /* على اليسار في الواجهة العربية */
    right: auto !important;
    z-index: 9000;
    box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4);
    border: none;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .mc-fab.mobile-only:active {
    transform: scale(0.92);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  }

  /* 6. قائمة الكروت المتطابقة تماماً مع الصورة المطلوبة */
  .mobile-child-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .premium-mc-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    position: relative;
    transition: transform 0.1s ease;
  }
  .premium-mc-card:active { transform: scale(0.98); background: #fdfdfd; }

  /* الصف الأول: الاسم على اليمين والأزرار على اليسار */
  .pmc-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .pmc-name {
    font-size: 17px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.3;
    text-align: right;
  }

  .pmc-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .pmc-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .pmc-icon-btn:active { background: #f1f5f9; }
  .pmc-icon-btn.edit:active { color: #16a34a; background: #f0fdf4; }
  .pmc-icon-btn.delete:active { color: #dc2626; background: #fef2f2; }

  /* الصف الثاني: الشارات (Badges) */
  .pmc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .pmc-badge {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pmc-badge.green { background: #f0fdf4; color: #16a34a; } /* للمحاكاة */
  .pmc-badge.gray { background: #f1f5f9; color: #475569; }

  /* الصف الثالث: الموقع والـ ID */
  .pmc-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
  }
  .pmc-location {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #64748b;
    font-weight: 600;
  }
  .pmc-id {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 700;
  }

  /* خط فاصل أنيق */
  .pmc-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.04);
    margin: 0 -18px 16px -18px; /* يمتد لطرف الكرت */
  }

  /* الصف الرابع: شبكة الهواتف (Contact Grid) */
  .pmc-contacts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    direction: ltr; /* لضبط الأرقام والنصوص الإنجليزية إذا لزم كما بالصورة */
    text-align: left;
  }

  .pmc-contact-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pmc-contact-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #475569;
    font-weight: 600;
  }
  .pmc-contact-item svg {
    color: #94a3b8;
    flex-shrink: 0;
  }
  .pmc-contact-number {
    font-weight: 800;
    color: #0f172a;
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

  const genderBadge = (g) => {
    if (g === "male") return <Badge variant="info">ذكر</Badge>;
    if (g === "female") return <Badge variant="warn">أنثى</Badge>;
    return "-";
  };

  return (
    <div className="page page--children" dir="rtl" lang="ar">
      <style>{CHILDREN_STYLES}</style>

      {/* ==================== Tamer's Absolute Mobile Header (Replaces old spacing) ==================== */}
      <div className="mobile-app-header mobile-only">
        <div className="mobile-app-header-top">
          <div className="mobile-app-title">الأطفال</div>
        </div>
        <div className="mobile-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {/* ============================================================================================== */}

      <div className="container">
        {/* رأس الصفحة للديسكتوب فقط */}
        <div className="children-header desktop-only">
          <div className="children-title">الأطفال</div>
          <div className="children-subtitle">
            <span style={{ color: "#cbd5e1" }}>|</span>
            <Users size={16} /> إدارة جميع الأطفال
          </div>
        </div>

        {/* كبسة الإضافة العائمة (FAB) الثابتة بقوة للموبايل */}
        <button
          className="mc-fab mobile-only"
          onClick={openAddModal}
          aria-label="إضافة طفل"
        >
          <Plus size={24} />
        </button>

        {error && <ErrorBanner error={error} />}

        {/* الكرت الرئيسي للجدول والبحث (يظهر فقط عالديسكتوب، عالموبايل مخفي من CSS) */}
        <div className="children-card desktop-only">
          <div className="children-toolbar">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-add" onClick={openAddModal}>
              <Plus size={18} /> إضافة طفل
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              جاري التحميل...
            </div>
          ) : filteredChildren.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              لا يوجد بيانات متطابقة.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
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
                    <th style={{ width: 100, textAlign: "center" }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChildren.map((child) => (
                    <tr
                      key={child.id}
                      className="clickable-row"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      <td className="child-id" style={{ textAlign: "center" }}>
                        {child.id}
                      </td>
                      <td className="child-name">{child.name}</td>
                      <td>{child.age ?? "-"}</td>
                      <td className="muted">{child.class || "-"}</td>
                      <td>{genderBadge(child.gender)}</td>
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
                                text: `حذف (${child.name})؟`,
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
          )}
        </div>

        {/* ==================== عرض الموبايل (الكروت الاحترافية المطابقة للصورة) ==================== */}
        <div className="mobile-only mobile-child-list">
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              جاري التحميل...
            </div>
          ) : filteredChildren.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              لا يوجد بيانات متطابقة.
            </div>
          ) : (
            filteredChildren.map((child) => (
              <div
                key={child.id}
                className="premium-mc-card"
                onClick={() => navigate(`/children/${child.id}`)}
              >
                {/* الصف الأول: الاسم والأزرار (عكس الديسكتوب لمطابقة الصورة) */}
                <div className="pmc-top-row">
                  <div className="pmc-name">{child.name}</div>
                  <div
                    className="pmc-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="pmc-icon-btn edit"
                      onClick={() => openEditModal(child)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="pmc-icon-btn delete"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          id: child.id,
                          text: `هل أنت متأكد من حذف ${child.name}؟`,
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="pmc-icon-btn" onClick={() => {}}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* الصف الثاني: الشارات (كما في الصورة) */}
                <div className="pmc-badges">
                  <span className="pmc-badge green">
                    {child.gender === "female" ? "أنثى" : "ذكر"}
                  </span>
                  <span className="pmc-badge gray">
                    العمر {child.age || "—"} / {child.class || "بدون صف"}
                  </span>
                </div>

                {/* الصف الثالث: الموقع والـ ID */}
                <div className="pmc-meta">
                  <div className="pmc-location">
                    <MapPin size={14} /> {child.country || "المدينة غير مسجلة"}
                  </div>
                  <div className="pmc-id">ID {child.id}</div>
                </div>

                {/* خط فاصل */}
                {(child.mother_phone || child.father_phone) && (
                  <div className="pmc-divider"></div>
                )}

                {/* الصف الرابع: شبكة الهواتف (مطابقة للتوزيع الهندسي) */}
                {(child.mother_phone || child.father_phone) && (
                  <div className="pmc-contacts-grid">
                    <div className="pmc-contact-col">
                      {child.mother_phone && (
                        <div className="pmc-contact-item">
                          <Phone size={14} />{" "}
                          <span>
                            أم:{" "}
                            <span className="pmc-contact-number">
                              {child.mother_phone}
                            </span>
                          </span>
                        </div>
                      )}
                      {child.father_phone && (
                        <div className="pmc-contact-item">
                          <Phone size={14} />{" "}
                          <span>
                            أب:{" "}
                            <span className="pmc-contact-number">
                              {child.father_phone}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* نموذج الإضافة والتعديل (محسن للموبايل والديسكتوب) */}
      <Modal
        open={isModalOpen}
        title={editingId ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
        onClose={() => !saving && setIsModalOpen(false)}
      >
        <div className="grid" style={{ padding: "10px 0" }}>
          <div className="col-12">
            <h4 className="form-section-title">
              <Users size={18} color="#64748b" /> البيانات الأساسية
            </h4>
            <div
              className="grid"
              style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
            >
              <div className="col-12" style={{ width: "100%" }}>
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  الاسم الرباعي *
                </div>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: أحمد محمد علي"
                  style={{ minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  العمر (سنوات)
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
                  placeholder="مثال: 5"
                  style={{ minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  الجنس
                </div>
                <ModernSelect
                  value={formData.gender}
                  onChange={(v) => setFormData({ ...formData, gender: v })}
                  options={[
                    { value: "male", label: "ذكر" },
                    { value: "female", label: "أنثى" },
                  ]}
                  style={{ minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  الصف الدراسي
                </div>
                <CustomCombobox
                  value={formData.class}
                  onChange={(v) => setFormData({ ...formData, class: v })}
                  options={classes.map((c) => ({
                    value: c.name,
                    label: c.name,
                  }))}
                  placeholder="اختر أو اكتب..."
                  style={{ minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
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
                  placeholder="اختر أو اكتب..."
                  style={{ minHeight: 48 }}
                />
              </div>
            </div>
          </div>

          <div className="col-12" style={{ marginTop: 12 }}>
            <h4 className="form-section-title">
              <Phone size={18} color="#64748b" /> معلومات التواصل
            </h4>
            <div
              className="grid"
              style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
            >
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
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
                  style={{ textAlign: "right", minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  اسم الأم
                </div>
                <input
                  className="input"
                  value={formData.mother_name}
                  onChange={(e) =>
                    setFormData({ ...formData, mother_name: e.target.value })
                  }
                  placeholder="اختياري"
                  style={{ minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
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
                  style={{ textAlign: "right", minHeight: 48 }}
                />
              </div>
              <div
                className="col-6"
                style={{ flex: "1 1 calc(50% - 6px)", minWidth: 140 }}
              >
                <div
                  className="muted"
                  style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
                >
                  اسم الأب
                </div>
                <input
                  className="input"
                  value={formData.father_name}
                  onChange={(e) =>
                    setFormData({ ...formData, father_name: e.target.value })
                  }
                  placeholder="اختياري"
                  style={{ minHeight: 48 }}
                />
              </div>
            </div>
          </div>

          <div className="col-12" style={{ marginTop: 12 }}>
            <div
              className="muted"
              style={{ marginBottom: 6, fontWeight: 800, fontSize: 13 }}
            >
              ملاحظات إضافية
            </div>
            <textarea
              className="input"
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="أي تفاصيل طبية، ملاحظات غذائية، إلخ..."
              style={{
                resize: "vertical",
                minHeight: 80,
                padding: "12px 16px",
              }}
            />
          </div>

          <div
            className="col-12"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              className="btn"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              style={{ minHeight: 46, padding: "0 24px", borderRadius: 12 }}
            >
              إلغاء
            </button>
            <button
              className="btn btn-add"
              onClick={handleSave}
              disabled={saving}
              style={{ minHeight: 46, padding: "0 24px", borderRadius: 12 }}
            >
              {saving ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
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
    </div>
  );
}
