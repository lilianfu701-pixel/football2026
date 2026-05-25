"use client";

import { useGcBalance } from "@/context/GcBalance";
import { formatGc } from "@/lib/levels";

export default function SidebarGcBalance({ zh }: { zh: boolean }) {
  const { balance } = useGcBalance();
  return (
    <span className="text-[#FFD700] font-black text-base">{formatGc(balance)}</span>
  );
}
