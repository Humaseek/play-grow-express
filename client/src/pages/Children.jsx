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

// --- تنسيقات CSS مدمجة مع إضافات الموبايل ---
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

/* ==========================================================================
   MOBILE RESPONSIVE TWEAKS FOR THIS PAGE
   ========================================================================== */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  .children-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }
  
  .search-wrapper {
    max-width: 100%;
  }
  
  .btn-add {
    justify-content: center;
    width: 100%;
  }

  .children-card {
    background: transparent;
    border: none;
    box-shadow: none;
  }
  
  .mobile-child-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 4px;
  }
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

  // عرض شارة الجنس بتنسيق مخصص
  const genderLabel = (g) => {
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
          <div className="children-subtitle">
            <span style={{ color: "#cbd5e1" }}>|</span>
            <Users size={16} /> إدارة جميع الأطفال
          </div>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* الكرت الرئيسي للجدول */}
        <div className="children-card">
          {/* شريط الأدوات العلوي (البحث والإضافة) */}
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
            <button className="btn btn-add" onClick={openAddModal}>
              <Plus size={18} /> إضافة طفل
            </button>
          </div>

          {/* المحتوى (جدول للديسكتوب / كروت للموبايل) */}
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

              {/* ==================== عرض الموبايل (كروت List Items) ==================== */}
              <div className="mobile-only mobile-child-list">
                {filteredChildren.map((child) => (
                  <div
                    key={child.id}
                    className="listItem clickCard hoverLift"
                    onClick={() => navigate(`/children/${child.id}`)}
                    style={{
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div className="listItem__main">
                      <div
                        className="listItem__icon"
                        style={{ background: "#fffbeb", color: "#f59e0b" }}
                      >
                        <UserRound size={20} />
                      </div>
                      <div>
                        <div
                          className="listItem__title"
                          style={{ fontSize: 16 }}
                        >
                          {child.name}
                        </div>
                        <div className="listItem__sub">
                          {child.class || "بدون صف"} •{" "}
                          {child.age ? `${child.age} سنوات` : "العمر غير محدد"}
                        </div>
                        {/* أرقام الهواتف على الموبايل بخط صغير */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginTop: "6px",
                          }}
                        >
                          {child.mother_phone && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Phone size={10} /> أم:{" "}
                              <span dir="ltr" style={{ fontWeight: "bold" }}>
                                {child.mother_phone}
                              </span>
                            </span>
                          )}
                          {child.father_phone && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Phone size={10} /> أب:{" "}
                              <span dir="ltr" style={{ fontWeight: "bold" }}>
                                {child.father_phone}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className="listItem__actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton soft onClick={() => openEditModal(child)}>
                        <Pencil size={16} />
                      </IconButton>
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
            <div className="grid">
              <div className="col-12">
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
              <div className="col-6">
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
              <div className="col-6">
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
              <div className="col-6">
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
              <div className="col-6">
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
          <div className="col-12">
            <h4 className="form-section-title">
              <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
            </h4>
            <div className="grid">
              <div className="col-6">
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
              <div className="col-6">
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
              <div className="col-6">
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
              <div className="col-6">
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
          <div className="col-12">
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
            className="col-12"
            style={{
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
