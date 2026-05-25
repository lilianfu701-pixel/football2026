import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MessagesPageClient from "./MessagesPageClient";

interface PageProps { params: Promise<{ locale: string }> }

export default async function MessagesPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Fetch ALL messages involving this user (for thread building + unread counts)
  const { data: allMsgs } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, is_read, created_at")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const msgs = allMsgs ?? [];

  // Build thread map: partnerId → { lastMsg, unreadCount }
  const threadMap = new Map<string, {
    lastMsg:     string;
    lastTime:    string;
    unreadCount: number;
    isMine:      boolean;
  }>();

  for (const m of msgs) {
    const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    if (!threadMap.has(partnerId)) {
      // First (= latest) message for this thread
      threadMap.set(partnerId, {
        lastMsg:     m.content,
        lastTime:    m.created_at,
        unreadCount: 0,
        isMine:      m.sender_id === user.id,
      });
    }
    // Count unread messages sent TO me from this partner
    if (m.receiver_id === user.id && !m.is_read) {
      const t = threadMap.get(partnerId)!;
      t.unreadCount++;
    }
  }

  // Fetch partner profiles
  const partnerIds = [...threadMap.keys()];
  const { data: profiles } = partnerIds.length
    ? await supabase.from("users").select("id, nickname, avatar_url").in("id", partnerIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Build threads array, sorted by last message time
  const threads = partnerIds
    .map((pid) => {
      const t  = threadMap.get(pid)!;
      const p  = profileMap.get(pid);
      return {
        partnerId:   pid,
        nickname:    p?.nickname  ?? "Unknown",
        avatar_url:  p?.avatar_url ?? null,
        lastMsg:     t.lastMsg,
        lastTime:    t.lastTime,
        unreadCount: t.unreadCount,
        isMine:      t.isMine,
      };
    })
    .sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

  return (
    <MessagesPageClient
      locale={locale}
      initialThreads={threads}
    />
  );
}
