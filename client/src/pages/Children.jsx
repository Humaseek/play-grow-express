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
  MapPin,
  Phone,
  Cake,
  GraduationCap,
  ChevronDown,
  UserRound,
} from "lucide-react";

// --- مُركّب مخصص للجمع بين الكتابة والقائمة المنسدلة (Combobox) ---
function CustomCombobox({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // تصفية الخيارات بناءً على النص المدخل
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
                e.preventDefault(); // منع فقدان التركيز من حقل الإدخال
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

// --- تنسيقات CSS مدمجة مع تعديلات احترافية جداً وحازمة للموبايل ---
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

/* ==========================================================================
   MOBILE RESPONSIVE TWEAKS (HACKING THE VIBE)
   ========================================================================== */
.mobile-only { display: none; }
.desktop-only { display: block; }
.mc-fab { display: none; } /* مخفي على الديسكتوب */

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  /* تقليل الفراغ العلوي فوق الكروت - تعديل جديد وحازم */
  .page--children {
    padding: 0 12px 100px 12px !important; /* حشوة علوية صفر */
    background: #f8fafc;
  }

  .children-header {
    margin-bottom: 16px;
    padding-top: 0 !important; /* إزالة المسافة تماماً */
    margin-top: 0 !important;
  }

  .children-title {
    font-size: 20px;
    min-height: 44px;
    padding: 8px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    border: none;
  }
  
  .children-subtitle {
    font-size: 13px;
  }

  .children-card {
    background: transparent;
    border: none;
    box-shadow: none;
  }
  
  /* شريط البحث المدمج - تعديل جديد */
  .children-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 0 0 16px 0;
    background: transparent;
    border: none;
    gap: 12px;
  }
  
  .search-wrapper {
    max-width: 100%;
  }

  .search-input {
    border-radius: 16px;
    min-height: 52px;
    border: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    padding-right: 48px;
  }
  .search-icon { left: 16px; }
  
  /* إخفاء زر الإضافة العريض على الموبايل - تعديل جديد */
  .btn-add.mobile-add {
    display: none !important;
  }

  /* كبسة الإضافة العائمة context FAB - تعديل جديد للتثبيت والظهور الدائم */
  .mc-fab.mobile-only {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px; // حجم FAB قياسي
    height: 52px; // حجم FAB قياسي
    border-radius: 999px;
    background: rgb(2, 54, 80); // لون الخلفية الأزرق
    color: #fff;
    cursor: pointer;
    position: fixed !important; // تثبيت الزر فوق المحتوى
    bottom: 90px !important; // وضعه في الأسفل فوق البار السفلي بمسافة آمنة
    inset-inline-end: 16px !important; // على اليسار في RTL
    top: auto !important; // إلغاء الإعداد القديم
    z-index: 1000;
    box-shadow: 0 8px 22px rgba(2, 54, 80, 0.25);
    border: none;
  }

  /* قائمة الكروت - روح التطبيق الحقيقية */
  .mobile-child-list {
    display: flex;
    flex-direction: column;
    gap: 16px; /* مسافة ممتازة بين الكروت */
  }

  /* تصميم الكرت الفخم */
  .mc-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(226, 232, 240, 0.6);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .mc-card:active {
    transform: scale(0.98);
  }

  /* الخط الملون الجانبي (Gradient Line) لإعطاء روح للكرت */
  .mc-card::before {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: linear-gradient(180deg, #f59e0b, #fbbf24);
    border-radius: 0 4px 4px 0;
  }

  .mc-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .mc-avatar {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: linear-gradient(135deg, #fffbeb, #fef3c7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d97706;
    box-shadow: 0 4px 10px rgba(245, 158, 11, 0.15);
    flex-shrink: 0;
  }

  .mc-title {
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
    margin-bottom: 6px;
    line-height: 1.3;
  }

  .mc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mc-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .mc-badge.neutral { background: #f1f5f9; color: #475569; }
  .mc-badge.highlight { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }
  .mc-badge.outline { background: #fff; border: 1px solid #e2e8f0; color: #64748b; }

  .mc-contact {
    background: #f8fafc;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #f1f5f9;
  }

  .mc-contact-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #475569;
    font-weight: 700;
  }

  /* أزرار العمليات (أفقية ومريحة للضغط) */
  .mc-actions {
    display: flex;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px dashed #e2e8f0;
  }

  .mc-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 800;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }

  .mc-btn-edit {
    background: #f0fdf4;
    color: #16a34a;
  }
  .mc-btn-edit:active { background: #dcfce7; }

  .mc-btn-delete {
    background: #fef2f2;
    color: #dc2626;
  }
  .mc-btn-delete:active { background: #fee2e2; }
}
`;

export default function Children() {
  // تعريف دالة التنقل
  const navigate = useNavigate();

  // حالة البيانات الأساسية
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // قوائم الاختيار (Picklists)
  const [countries, setCountries] = useState([]);
  const [classes, setClasses] = useState([]);

  // حالة النموذج (Modal State)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    class: "",
    gender: "male",
    country_name: "", // اسم المدينة المدخل نصياً
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    notes: "",
  });

  // حالة حوار التأكيد (Confirm Delete State)
  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    text: "",
  });

  // تحميل البيانات الأولية وقوائم الاختيار عند التحميل
  useEffect(() => {
    loadData();
    loadPicklists();
  }, []);

  // دالة جلب بيانات الأطفال
  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("children_view") // جلب من الـ View لعرض اسم المدينة
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

  // دالة جلب قوائم الاختيار للمدن والصفوف
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

  // تصفية الأطفال بناءً على نص البحث (باستخدام useMemo للأداء)
  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children;
    const q = searchQuery.toLowerCase();
    return children.filter(
      (c) =>
        (c.id && String(c.id).includes(q)) || // البحث بالمعرف
        (c.name || "").toLowerCase().includes(q) || // البحث بالاسم
        (c.mother_phone || "").includes(q) || // البحث بهاتف الأم
        (c.father_phone || "").includes(q), // البحث بهاتف الأب
    );
  }, [children, searchQuery]);

  // فتح نموذج إضافة طفل جديد
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

  // فتح نموذج تعديل بيانات طفل موجود
  function openEditModal(child) {
    setEditingId(child.id);
    setFormData({
      name: child.name || "",
      age: child.age ?? "",
      class: child.class || "",
      gender: child.gender || "male",
      country_name: child.country || "", // من الـ View بنجيب الاسم
      mother_name: child.mother_name || "",
      mother_phone: child.mother_phone || "",
      father_name: child.father_name || "",
      father_phone: child.father_phone || "",
      notes: child.notes || "",
    });
    setIsModalOpen(true);
  }

  // دالة حفظ البيانات (إضافة أو تعديل)
  async function handleSave() {
    const name = formData.name.trim();
    const ageNum = Number(formData.age);

    if (!name) {
      alert("الرجاء إدخال اسم الطفل الرباعي.");
      return;
    }

    setSaving(true);
    try {
      // 1. إدارة قائمة المدن: الحصول على المعرف أو إنشاء مدينة جديدة
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

      // 2. إدارة قائمة الصفوف: إضافة الصف للقائمة إن لم يكن موجوداً
      const typedClass = formData.class.trim();
      if (typedClass) {
        const existingCl = classes.find((c) => c.name === typedClass);
        if (!existingCl) {
          await supabase.from("child_classes").insert([{ name: typedClass }]);
          // لا نحتاج لمعرف الصف هنا لأن جدول children يحفظ اسم الصف كقيمة نصية
        }
      }

      // 3. تحضير بيانات الطفل للحفظ
      const payload = {
        name,
        age: isNaN(ageNum) ? null : ageNum,
        class: typedClass || null, // اسم الصف كقيمة نصية
        gender: formData.gender,
        country_id: countryId, // معرف المدينة
        mother_name: formData.mother_name.trim() || null,
        mother_phone: formData.mother_phone.trim() || null,
        father_name: formData.father_name.trim() || null,
        father_phone: formData.father_phone.trim() || null,
        notes: formData.notes.trim() || null,
      };

      // 4. تنفيذ عملية الحفظ (تعديل أو إضافة)
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

      // 5. إغلاق النموذج وتحديث البيانات وقوائم الاختيار
      setIsModalOpen(false);
      loadData();
      loadPicklists(); // لتحديث القوائم بالمدن أو الصفوف الجديدة
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  // دالة حذف الطفل
  async function handleDelete(id) {
    try {
      const { error } = await supabase.from("children").delete().eq("id", id);
      if (error) {
        // التحقق من خطأ "Constraint" لوجود ارتباطات
        if (error.message.includes("foreign key constraint")) {
          alert("لا يمكن حذف الطفل لارتباطه بدفعات أو دورات مسجلة.");
        } else {
          throw error;
        }
      } else {
        loadData(); // تحديث البيانات بعد الحذف بنجاح
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء عملية الحذف.");
    }
  }

  // عرض شارة الجنس بتنسيق مخصص للديسكتوب
  const genderBadge = (g) => {
    if (g === "male") return <Badge variant="info">ذكر</Badge>;
    if (g === "female") return <Badge variant="warn">أنثى</Badge>;
    return "-";
  };

  return (
    <div className="page page--children" dir="rtl" lang="ar">
      <style>{CHILDREN_STYLES}</style>
      <div className="container">
        {/* رأس الصفحة */}
        <div className="children-header">
          <div className="children-title">الأطفال</div>
          <div className="children-subtitle desktop-only">
            <span style={{ color: "#cbd5e1" }}>|</span>
            <Users size={16} /> إدارة جميع الأطفال
          </div>
          {/* كبسة الإضافة العائمة context FAB - تعديل جديد للتثبيت والظهور الدائم */}
          <button
            className="mc-fab mobile-only" // New FAB, mobile only
            onClick={openAddModal}
            aria-label="Add Child"
          >
            <Plus size={20} />
          </button>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* الكرت الرئيسي للجدول والبحث */}
        <div className="children-card">
          {/* شريط الأدوات العلوي (البحث والإضافة) */}
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
            {/* إخفاء زر الإضافة العريض على الموبايل */}
            <button className="btn btn-add desktop-only" onClick={openAddModal}>
              <Plus size={18} /> إضافة طفل
            </button>
          </div>

          {/* المحتوى */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              جاري التحميل...
            </div>
          ) : filteredChildren.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              لا يوجد بيانات متطابقة.
            </div>
          ) : (
            <>
              {/* ==================== عرض الديسكتوب (الجدول) ==================== */}
              <div className="desktop-only" style={{ overflowX: "auto" }}>
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

              {/* ==================== عرض الموبايل (الكروت الفخمة المتباعدة) ==================== */}
              <div className="mobile-only mobile-child-list">
                {filteredChildren.map((child) => (
                  <div
                    key={child.id}
                    className="mc-card"
                    onClick={() => navigate(`/children/${child.id}`)}
                  >
                    {/* ترويسة الكرت (الاسم والصورة) */}
                    <div className="mc-header">
                      <div className="mc-avatar">
                        <UserRound size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="mc-title">{child.name}</div>
                        <div className="mc-badges">
                          <span className="mc-badge neutral">
                            <GraduationCap size={12} />{" "}
                            {child.class || "بدون صف"}
                          </span>
                          <span className="mc-badge highlight">
                            <Cake size={12} />{" "}
                            {child.age ? `${child.age} سنوات` : "بدون عمر"}
                          </span>
                          {child.country && (
                            <span className="mc-badge outline">
                              <MapPin size={12} /> {child.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* معلومات التواصل */}
                    {(child.mother_phone || child.father_phone) && (
                      <div className="mc-contact">
                        {child.mother_phone && (
                          <div className="mc-contact-item">
                            <Phone size={14} /> أم:{" "}
                            <span dir="ltr">{child.mother_phone}</span>
                          </div>
                        )}
                        {child.father_phone && (
                          <div className="mc-contact-item">
                            <Phone size={14} /> أب:{" "}
                            <span dir="ltr">{child.father_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div
                      className="mc-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="mc-btn mc-btn-edit"
                        onClick={() => openEditModal(child)}
                      >
                        <Pencil size={16} /> تعديل
                      </button>
                      <button
                        className="mc-btn mc-btn-delete"
                        onClick={() =>
                          setConfirm({
                            open: true,
                            id: child.id,
                            text: `هل أنت متأكد من حذف بيانات الطفل (${child.name})؟`,
                          })
                        }
                      >
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* نموذج الإضافة والتعديل */}
      <Modal
        open={isModalOpen}
        title={editingId ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
        onClose={() => !saving && setIsModalOpen(false)} // منع الإغلاق أثناء الحفظ
      >
        <div className="grid" style={{ padding: "10px 0" }}>
          {/* قسم البيانات الأساسية */}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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

          {/* قسم معلومات التواصل مع الأهل */}
          <div className="col-12" style={{ marginTop: 12 }}>
            <h4 className="form-section-title">
              <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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
                  style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
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

          {/* قسم الملاحظات */}
          <div className="col-12" style={{ marginTop: 12 }}>
            <div
              className="muted"
              style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
            >
              ملاحظات إضافية (اختياري)
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

          {/* أزرار الإجراءات في النموذج */}
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

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        open={confirm.open}
        title="تأكيد الحذف"
        message={confirm.text}
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        danger // تلوين الزر باللون الأحمر
        onCancel={() => setConfirm({ open: false, id: null, text: "" })}
        onConfirm={async () => {
          await handleDelete(confirm.id);
          setConfirm({ open: false, id: null, text: "" });
        }}
      />
    </div>
  );
}
