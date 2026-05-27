import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

interface Props {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const supabase   = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: me } = await supabase
    .from("users")
    .select("is_admin, nickname, avatar_url")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) redirect(`/${locale}`);

  return (
    <div className="flex min-h-screen bg-[#0A1628]">
      <AdminSidebar locale={locale} admin={{ nickname: me.nickname, avatar_url: me.avatar_url }} />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
