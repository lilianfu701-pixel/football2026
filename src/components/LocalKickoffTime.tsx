"use client";

import { toIntlLocale } from "@/lib/countries";

interface Props {
  iso: string;
  locale: string;
  mode?: "datetime" | "time";
}

/**
 * Client-side kickoff time formatter.
 *
 * Server Components run on Vercel (UTC) so `toLocaleTimeString` always produces
 * UTC output.  This client component renders in the *browser*, picking up the
 * visitor's local timezone automatically.
 *
 * `suppressHydrationWarning` silences the expected mismatch between the
 * server-rendered UTC string and the client-rendered local string.
 */
export default function LocalKickoffTime({ iso, locale, mode = "datetime" }: Props) {
  const dt = new Date(iso);
  const intl = toIntlLocale(locale);

  const timeStr = dt.toLocaleTimeString(intl, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (mode === "time") {
    return <span suppressHydrationWarning>{timeStr}</span>;
  }

  const dateStr = dt.toLocaleDateString(intl, {
    month: "short",
    day: "numeric",
  });

  return <span suppressHydrationWarning>{dateStr} {timeStr}</span>;
}
