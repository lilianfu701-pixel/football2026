"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";
import { useState, useRef, useEffect } from "react";

interface TeamFilterProps {
  teams: string[];
  selectedTeams: string[];
  locale: string;
}

const STORAGE_KEY = "teamFilterOpen";

export default function TeamFilter({ teams, selectedTeams, locale }: TeamFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // After navigation re-mount: restore open state if we flagged it
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      sessionStorage.removeItem(STORAGE_KEY);
      setOpen(true);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function navigate(newTeams: string[], keepOpen: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (newTeams.length > 0) {
      params.set("teams", newTeams.join(","));
      params.delete("group");
    } else {
      params.delete("teams");
    }
    if (keepOpen) {
      // Flag before navigation so the re-mounted component reopens
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleTeam(team: string) {
    const next = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    navigate(next, true); // keep dropdown open
  }

  function clearAll() {
    navigate([], false); // close after clearing
    setOpen(false);
  }

  const count = selectedTeams.length;
  const label =
    locale === "zh"
      ? count > 0 ? `球队（${count}）` : "球队"
      : count > 0 ? `Team (${count})` : "Team";

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
          count > 0
            ? "border-[#7C6FE0]/70 bg-[#7C6FE0]/15 text-[#A89FF5]"
            : "border-[#1E3A5F] bg-[#0F2040] text-gray-300 hover:text-white hover:border-[#7C6FE0]/40"
        }`}
      >
        <span>{label}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-2.5 border-b border-[#1E3A5F] flex items-center justify-between">
            <span className="text-sm font-bold text-white">
              {locale === "zh" ? "球队" : "Team"}
            </span>
            {count > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {locale === "zh" ? "清除" : "Clear"}
              </button>
            )}
          </div>

          {/* All */}
          <button
            onClick={clearAll}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1E3A5F]/50 hover:text-white transition-colors"
          >
            <span className="flex-1 text-left">{locale === "zh" ? "全部" : "All"}</span>
            <Checkbox checked={count === 0} />
          </button>

          <div className="h-px bg-[#1E3A5F] mx-3" />

          {/* Team list */}
          <div className="max-h-72 overflow-y-auto">
            {teams.map((team) => {
              const isSelected = selectedTeams.includes(team);
              const flagUrl = getFlagUrl(team, 40);
              return (
                <button
                  key={team}
                  onClick={() => toggleTeam(team)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1E3A5F]/50 hover:text-white transition-colors"
                >
                  {flagUrl ? (
                    <div className="w-6 h-4 relative overflow-hidden rounded-sm shrink-0">
                      <Image src={flagUrl} alt={team} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-6 h-4 rounded-sm bg-[#1E3A5F] shrink-0" />
                  )}
                  <span className="flex-1 text-left leading-tight">{team}</span>
                  <Checkbox checked={isSelected} />
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
      checked ? "border-[#7C6FE0] bg-[#7C6FE0]" : "border-gray-500 bg-transparent"
    }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}
