import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";

function badgeRun(status) {
  if (status === "active") return <Badge variant="ok">فعّالة</Badge>;
  if (status === "done") return <Badge variant="info">منتهية</Badge>;
  return <Badge variant="danger">ملغاة</Badge>;
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

    const c = await supabase
      .from("children_view")
      .select("*")
      .eq("id", childId)
      .single();
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
  }, [childId]);

  const totals = useMemo(() => {
    const agreed = enrollments.reduce(
      (acc, r) => acc + Number(r.agreed_price || 0),
      0,
    );
    const paid = enrollments.reduce(
      (acc, r) => acc + Number(r.paid_amount || 0),
      0,
    );
    const balance = enrollments.reduce(
      (acc, r) => acc + Number(r.balance || 0),
      0,
    );
    return { agreed, paid, balance };
  }, [enrollments]);

  if (loading)
    return (
      <div className="container page page--children">
        <div className="card">جاري التحميل...</div>
      </div>
    );
  if (!child)
    return (
      <div className="container">
        <div className="card">الطفل غير موجود.</div>
      </div>
    );

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="h1">{child.name}</div>
          <div className="muted">
            عمر: {child.age} — صف: {child.class ?? "-"} — بلد:{" "}
            {child.country ?? "-"}
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
          <div className="muted">متفق عليه</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.agreed.toFixed(2)}
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">مدفوع</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.paid.toFixed(2)}
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">باقي</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">بيانات الأم</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.mother_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <a
              className="btn primary"
              href={child.mother_phone ? `tel:${child.mother_phone}` : "#"}
              onClick={(e) => {
                if (!child.mother_phone) {
                  e.preventDefault();
                  toast("لا يوجد رقم للأم.", "warn");
                }
              }}
            >
              اتصال بالأم
            </a>
            <div className="muted">{child.mother_phone ?? "-"}</div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">بيانات الأب</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.father_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <a
              className="btn primary"
              href={child.father_phone ? `tel:${child.father_phone}` : "#"}
              onClick={(e) => {
                if (!child.father_phone) {
                  e.preventDefault();
                  toast("لا يوجد رقم للأب.", "warn");
                }
              }}
            >
              اتصال بالأب
            </a>
            <div className="muted">{child.father_phone ?? "-"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h1">الدورات/الدفعات المسجل فيها</div>
        <div className="muted" style={{ marginTop: 6 }}>
          اضغط “فتح الدفعة” للذهاب مباشرة للحضور والدفع.
        </div>

        <hr className="sep" />

        {enrollments.length === 0 ? (
          <div className="muted">لا يوجد تسجيلات.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الدورة</th>
                <th>الدفعة</th>
                <th>حالة الدفعة</th>
                <th>متفق عليه</th>
                <th>مدفوع</th>
                <th>باقي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((r) => (
                <tr key={r.enrollment_id}>
                  <td style={{ fontWeight: 800 }}>{r.title}</td>
                  <td className="muted">{r.label}</td>
                  <td>{badgeRun(r.run_status)}</td>
                  <td>{Number(r.agreed_price).toFixed(2)}</td>
                  <td>{Number(r.paid_amount).toFixed(2)}</td>
                  <td>{Number(r.balance).toFixed(2)}</td>
                  <td>
                    <button
                      className="btn primary"
                      onClick={() => navigate(`/runs/${r.run_id}`)}
                    >
                      فتح الدفعة
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
