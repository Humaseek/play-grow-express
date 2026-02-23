import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";

function badgeRun(status) {
  if (status === "active") return <Badge variant="ok">نشط</Badge>;
  if (status === "done") return <Badge variant="info">مكتمل</Badge>;
  return <Badge variant="danger">ملغاة</Badge>;
}

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChildDetails() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [child, setChild] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    const c = await supabase.from("children_view").select("*").eq("id", childId).single();
    if (c.error) {
      setError(c.error);
      setLoading(false);
      return;
    }
    setChild(c.data);

    const e = await supabase
      .from("child_enrollments_view")
      .select("*")
      .eq("child_id", childId)
      .order("run_id", { ascending: false });

    if (e.error) {
      setError(e.error);
      setLoading(false);
      return;
    }

    setEnrollments(e.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const totals = useMemo(() => {
    const agreed = enrollments.reduce((acc, r) => acc + Number(r.agreed_price || 0), 0);
    const paid = enrollments.reduce((acc, r) => acc + Number(r.paid_amount || 0), 0);
    const balance = enrollments.reduce((acc, r) => acc + Number(r.balance || 0), 0);
    return { agreed, paid, balance };
  }, [enrollments]);

  if (loading)
    return (
      <div className="container page page--children" dir="rtl" lang="ar">
        <div className="card">جارٍ التحميل...</div>
      </div>
    );

  if (!child)
    return (
      <div className="container page page--child-details" dir="rtl" lang="ar">
        <div className="card">الطفل غير موجود.</div>
      </div>
    );

  return (
    <div className="container" dir="rtl" lang="ar">
      <div className="topbar">
        <div>
          <div className="h1">{child.name}</div>
          <div className="muted">
            العمر: {child.age ?? "-"} • الصف: {child.class ?? "-"} • المدينة: {child.country ?? "-"}
          </div>
        </div>

        <div className="row">
          <button className="btn" onClick={() => navigate("/children")}>
            رجوع
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">إجمالي المتفق عليه</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(totals.agreed)}₪</div>
        </div>

        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">إجمالي المدفوع</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(totals.paid)}₪</div>
        </div>

        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">المتبقي</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(totals.balance)}₪</div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">الأم</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.mother_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <div className="muted">{child.mother_phone ?? "-"}</div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">الأب</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.father_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <div className="muted">{child.father_phone ?? "-"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h1">الاشتراكات</div>

        <hr className="sep" />

        {enrollments.length === 0 ? (
          <div className="muted">لا يوجد اشتراكات بعد.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الدورة</th>
                <th>الدفعة</th>
                <th>الحالة</th>
                <th>المتفق عليه (₪)</th>
                <th>المدفوع (₪)</th>
                <th>المتبقي (₪)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((r) => (
                <tr key={r.enrollment_id}>
                  <td style={{ fontWeight: 800 }}>{r.title}</td>
                  <td className="muted">{r.label}</td>
                  <td>{badgeRun(r.run_status)}</td>
                  <td>{fmtMoney(r.agreed_price)}₪</td>
                  <td>{fmtMoney(r.paid_amount)}₪</td>
                  <td>{fmtMoney(r.balance)}₪</td>
                  <td>
                    <button className="btn primary" onClick={() => navigate(`/runs/${r.run_id}`)}>
                      فتح
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
