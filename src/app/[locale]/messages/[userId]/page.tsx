export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConversationClient from "./ConversationClient";

interface PageProps {
  params: Promise<{ locale: string; userId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { locale, userId } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  if (userId === user.id) redirect(`/${locale}/messages`);

  // Fetch partner profile
  const { data: partner } = await supabase.from("users")
    .select("id, nickname, avatar_url")
    .eq("id", userId)
    .single();
  if (!partner) redirect(`/${locale}/messages`);

  // Fetch messages and mark as read
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, is_read, created_at")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
    .order("created_at", { ascending: true });

  // Mark unread as read
  await supabase.from("messages")
    .update({ is_read: true })
    .eq("sender_id", userId)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  return (
    <ConversationClient
      locale={locale}
      zh={zh}
      myId={user.id}
      partner={partner}
      initialMessages={msgs ?? []}
    />
  );
}
