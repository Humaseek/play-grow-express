import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";

function badgeRun(status) {
  if (status === "active") return <Badge variant="ok">Active</Badge>;
  if (status === "done") return <Badge variant="info">Completed</Badge>;
  return <Badge variant="danger">Cancelled</Badge>;
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
        <div className="card">Loading...</div>
      </div>
    );
  if (!child)
    return (
      <div className="container page page--child-details">
        <div className="card">Child not found.</div>
      </div>
    );

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="h1">{child.name}</div>
          <div className="muted">
            Age: {child.age ?? "-"} • Class: {child.class ?? "-"} • Country:{" "}
            {child.country ?? "-"}
          </div>
        </div>

        <div className="row">
          <button className="btn" onClick={() => navigate("/children")}>
            Back
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">Agreed total</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.agreed.toFixed(2)}₪
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">Paid total</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.paid.toFixed(2)}₪
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">Balance</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.balance.toFixed(2)}₪
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">Mother</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.mother_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <div className="muted">{child.mother_phone ?? "-"}</div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="h1">Father</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {child.father_name ?? "-"}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <div className="muted">{child.father_phone ?? "-"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h1">Enrollments</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Courses and runs this child is enrolled in.
        </div>

        <hr className="sep" />

        {enrollments.length === 0 ? (
          <div className="muted">No enrollments yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Run</th>
                <th>Status</th>
                <th>Agreed (₪)</th>
                <th>Paid (₪)</th>
                <th>Balance (₪)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((r) => (
                <tr key={r.enrollment_id}>
                  <td style={{ fontWeight: 800 }}>{r.title}</td>
                  <td className="muted">{r.label}</td>
                  <td>{badgeRun(r.run_status)}</td>
                  <td>{Number(r.agreed_price).toFixed(2)}₪</td>
                  <td>{Number(r.paid_amount).toFixed(2)}₪</td>
                  <td>{Number(r.balance).toFixed(2)}₪</td>
                  <td>
                    <button
                      className="btn primary"
                      onClick={() => navigate(`/runs/${r.run_id}`)}
                    >
                      Open
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
