/**
 * /forum/match/thread?match_id=X
 *
 * Server page: calls get_or_create_match_thread RPC (SECURITY DEFINER),
 * then redirects to the forum post. Shows a loading state briefly.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ match_id?: string }>;
}

export default async function MatchThreadRedirectPage({ params, searchParams }: PageProps) {
  const { locale }              = await params;
  const { match_id: matchIdStr } = await searchParams;
  const matchId = matchIdStr ? parseInt(matchIdStr, 10) : NaN;

  if (!matchId || isNaN(matchId)) notFound();

  const supabase = await createClient();

  const { data: postId, error } = await supabase
    .rpc("get_or_create_match_thread", { p_match_id: matchId });

  if (error || !postId) {
    // Fallback: go to forum match page
    redirect(`/${locale}/forum/match`);
  }

  redirect(`/${locale}/forum/thread/${postId}`);
}
