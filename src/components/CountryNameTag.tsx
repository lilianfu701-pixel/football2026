"use client";

import { toIntlLocale } from "@/lib/countries";

interface Props {
  code: string;
  locale: string;
  className?: string;
}

export default function CountryNameTag({ code, locale, className }: Props) {
  if (!code || code === "UN") return null;
  let name = code;
  try {
    name = new Intl.DisplayNames([toIntlLocale(locale)], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    // fall back to raw code
  }
  return <span className={className}>{name}</span>;
}
