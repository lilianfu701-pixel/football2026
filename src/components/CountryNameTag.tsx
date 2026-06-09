"use client";

import { useState, useEffect } from "react";
import { toIntlLocale } from "@/lib/countries";

interface Props {
  code: string;
  locale: string;
  className?: string;
}

export default function CountryNameTag({ code, locale, className }: Props) {
  // Initialize with the raw code so SSR output matches the initial client render
  // (avoids hydration mismatch with Vercel small-icu returning English names server-side).
  // useEffect fires after hydration and resolves the localized name in the browser.
  const [name, setName] = useState(code);

  useEffect(() => {
    if (!code || code === "UN") return;
    try {
      const resolved =
        new Intl.DisplayNames([toIntlLocale(locale)], { type: "region" }).of(
          code.toUpperCase()
        ) ?? code;
      setName(resolved);
    } catch {
      // fall back to raw code already set
    }
  }, [code, locale]);

  if (!code || code === "UN") return null;
  return <span className={className}>{name}</span>;
}
