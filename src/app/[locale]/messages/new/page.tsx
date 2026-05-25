import { redirect } from "next/navigation";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ to?: string }>;
}

export default async function NewMessagePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { to }     = await searchParams;
  // Redirect to conversation if target provided, otherwise to inbox
  if (to) redirect(`/${locale}/messages/${to}`);
  redirect(`/${locale}/messages`);
}
