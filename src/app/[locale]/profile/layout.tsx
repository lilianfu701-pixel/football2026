import { redirect }      from "next/navigation";
import { createClient }  from "@/lib/supabase/server";
import ProfileSidebar    from "@/components/profile/ProfileSidebar";

interface Props {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}

export default async function ProfileLayout({ children, params }: Props) {
  const { locale } = await params;
  const supabase   = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: me } = await supabase
    .from("users")
    .select("nickname, avatar_url, gc_balance, wealth_level")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <ProfileSidebar
          locale={locale}
          nickname={me?.nickname ?? ""}
          avatarUrl={me?.avatar_url ?? null}
          gcBalance={me?.gc_balance ?? 0}
        />
        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
