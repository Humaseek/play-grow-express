import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const {
  PORT = "3000",
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: "1mb" }));

// Serve static UI
app.use(express.static("public"));

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- helpers ----------
function parseMetaFromClassLevel(classLevel) {
  const raw = String(classLevel ?? "");
  const t = raw.replace(/^\uFEFF/, "").trim();
  if (!t.startsWith("PGMETA:")) return null;

  const jsonPart = t.slice("PGMETA:".length).trim();
  try {
    const meta = JSON.parse(jsonPart);
    return meta && typeof meta === "object" ? meta : null;
  } catch {
    // Sometimes stored with escaped quotes
    try {
      const meta = JSON.parse(jsonPart.replaceAll('\\"', '"'));
      return meta && typeof meta === "object" ? meta : null;
    } catch {
      return null;
    }
  }
}

function calcAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const d = new Date(dobStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0) age = 0;
  return age;
}

function normalizeChildRow(row) {
  // Prefer real columns; fallback to PGMETA in class_level
  const meta = parseMetaFromClassLevel(row.class_level);

  const dob =
    row.date_of_birth ??
    meta?.date_of_birth ??
    meta?.dob ??
    null;

  const classLevel =
    (row.class_level && !String(row.class_level).trim().startsWith("PGMETA:"))
      ? row.class_level
      : (meta?.class_level ?? meta?.class ?? null);

  const age =
    (row.age ?? null) ??
    calcAgeFromDob(dob);

  return {
    id: row.id,
    name: row.full_name ?? meta?.name ?? "",
    date_of_birth: dob,
    class_level: classLevel,
    age,
    gender: row.gender ?? meta?.gender ?? null,
    country: row.country ?? meta?.country ?? null,
    mother_name: row.mother_name ?? meta?.mother_name ?? null,
    mother_phone: row.mother_phone ?? meta?.mother_phone ?? null,
    father_name: row.father_name ?? meta?.father_name ?? null,
    father_phone: row.father_phone ?? meta?.father_phone ?? null,
    created_at: row.created_at,
  };
}

async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1];

    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = userData.user.id;

    // Check role in profiles (service role bypasses RLS)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single();

    if (profErr) {
      return res.status(500).json({ error: "Failed to read profiles", details: profErr.message });
    }

    if (profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden (not admin)" });
    }

    req.user = { id: userId, email: userData.user.email, full_name: profile.full_name };
    next();
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e?.message || e) });
  }
}

// ---------- API ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/me", requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get("/api/children", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("children")
    .select("id, full_name, created_at, age, class_level, date_of_birth, gender, country, mother_name, mother_phone, father_name, father_phone")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ rows: (data || []).map(normalizeChildRow) });
});

app.post("/api/children", requireAdmin, async (req, res) => {
  const body = req.body || {};

  const full_name = String(body.name ?? "").trim();
  if (!full_name) return res.status(400).json({ error: "name is required" });

  const date_of_birth = body.date_of_birth ? String(body.date_of_birth) : null;
  const class_level = body.class_level ? String(body.class_level).trim() : null;

  let age = body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age);
  if (age !== null && Number.isNaN(age)) age = null;
  if (date_of_birth && (age === null)) age = calcAgeFromDob(date_of_birth);

  const payload = {
    full_name,
    date_of_birth,
    class_level,
    age,
    gender: body.gender ? String(body.gender) : null,
    country: body.country ? String(body.country).trim() : null,
    mother_name: body.mother_name ? String(body.mother_name).trim() : null,
    mother_phone: body.mother_phone ? String(body.mother_phone).trim() : null,
    father_name: body.father_name ? String(body.father_name).trim() : null,
    father_phone: body.father_phone ? String(body.father_phone).trim() : null,
  };

  const { data, error } = await supabaseAdmin.from("children").insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, row: normalizeChildRow(data) });
});

app.put("/api/children/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};

  const full_name = String(body.name ?? "").trim();
  if (!full_name) return res.status(400).json({ error: "name is required" });

  const date_of_birth = body.date_of_birth ? String(body.date_of_birth) : null;
  const class_level = body.class_level ? String(body.class_level).trim() : null;

  let age = body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age);
  if (age !== null && Number.isNaN(age)) age = null;
  if (date_of_birth && (age === null)) age = calcAgeFromDob(date_of_birth);

  const payload = {
    full_name,
    date_of_birth,
    class_level,
    age,
    gender: body.gender ? String(body.gender) : null,
    country: body.country ? String(body.country).trim() : null,
    mother_name: body.mother_name ? String(body.mother_name).trim() : null,
    mother_phone: body.mother_phone ? String(body.mother_phone).trim() : null,
    father_name: body.father_name ? String(body.father_name).trim() : null,
    father_phone: body.father_phone ? String(body.father_phone).trim() : null,
  };

  const { data, error } = await supabaseAdmin.from("children").update(payload).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, row: normalizeChildRow(data) });
});

app.delete("/api/children/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;

  const { error } = await supabaseAdmin.from("children").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// SPA fallback (optional)
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.listen(Number(PORT), () => {
  console.log(`Play-Grow Express running on http://localhost:${PORT}`);
  console.log(`Serving UI from /public and API at /api/*`);
});
