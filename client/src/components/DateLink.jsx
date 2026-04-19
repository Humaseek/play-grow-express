import { useNavigate } from "react-router-dom";

/**
 * Displays a date as a clickable link to /calendar/:date.
 * Shows formatted date (DD/MM/YYYY) + Arabic day name below.
 * Accepts ISO date "YYYY-MM-DD" or datetime "YYYY-MM-DDTHH:mm:ssZ".
 */
export default function DateLink({ date, style }) {
  const navigate = useNavigate();
  if (!date) return <span>—</span>;

  const iso = String(date).slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = iso.split("-");
  const formatted = `${d}/${m}/${y}`;
  const dayName = new Intl.DateTimeFormat("ar", { weekday: "long" }).format(
    new Date(`${iso}T12:00:00`),
  );

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/calendar/${iso}`);
      }}
      title={`عرض تفاصيل ${dayName}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 1,
        cursor: "pointer",
        borderRadius: 8,
        padding: "3px 6px",
        transition: "background 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,172,71,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontWeight: 700, fontSize: "inherit", lineHeight: 1.3 }}>{formatted}</span>
      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, lineHeight: 1.2 }}>{dayName}</span>
    </span>
  );
}
