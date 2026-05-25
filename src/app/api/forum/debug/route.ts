import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const accessToken  = process.env.SUPABASE_ACCESS_TOKEN!;
  const projectRef   = supabaseUrl.replace("https://", "").split(".")[0];
  const apiUrl       = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  async function sql(query: string) {
    const res = await fetch(apiUrl, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    try { return { ok: res.ok, data: JSON.parse(text) }; }
    catch { return { ok: res.ok, data: text }; }
  }

  // 1. Get columns of public.users
  const colsRes = await sql(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `);

  // 2. Sample one row from public.users
  const sampleRes = await sql(`SELECT * FROM public.users LIMIT 1`);

  // 3. Check FK constraints pointing to public.users
  const fkRes = await sql(`
    SELECT tc.table_name, kcu.column_name, ccu.table_schema, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public' AND ccu.table_name = 'users'
  `);

  return NextResponse.json({
    users_columns:  colsRes,
    users_sample:   sampleRes,
    fk_constraints: fkRes,
  });
}
