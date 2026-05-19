import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import "../globals.css";

const geist = Geist({ subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("name"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = rtlLocales.includes(locale);

  // Get current user from Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get GC balance if logged in
  let gcBalance: number | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("gc_balance")
      .eq("id", user.id)
      .single();
    gcBalance = profile?.gc_balance;
  }

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <body className={geist.className}>
        <NextIntlClientProvider messages={messages}>
          <Navbar user={user} gcBalance={gcBalance} />
          <div className="pt-16">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
