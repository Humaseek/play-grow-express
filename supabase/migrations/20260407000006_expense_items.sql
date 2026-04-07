-- جدول المنتجات/الآخر مرتبط بالفئة
CREATE TABLE IF NOT EXISTS "public"."expense_items" (
  "id"         bigserial PRIMARY KEY,
  "name"       text NOT NULL,
  "category"   text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, category)
);

ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON "public"."expense_items" FOR ALL USING (true) WITH CHECK (true);

-- إضافة عمود item لجدول المصاريف
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "item" text;
