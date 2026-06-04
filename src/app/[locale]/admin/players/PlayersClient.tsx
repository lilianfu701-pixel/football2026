"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PlayerRow {
  id:            number;
  static_id:     number | null;
  fd_id:         number | null;
  name:          string;
  name_zh:       string | null;
  team:          string;
  country_code:  string | null;
  position:      string | null;
  shirt_number:  number | null;
  club:          string | null;
  age:           number | null;
  date_of_birth: string | null;
  height_cm:     number | null;
  market_value:  string | null;
  photo_url:     string | null;
  bio_en:        string | null;
  bio_zh:        string | null;
  golden_boot:   boolean;
  golden_ball:   boolean;
  golden_glove:  boolean;
  best_young:    boolean;
}

interface Props {
  locale:          string;
  initialPlayers:  PlayerRow[];
  totalCount:      number;
  page:            number;
  pageSize:        number;
  initialQ:        string;
  initialTeam:     string;
  initialPosition: string;
  teams:           string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POS_META: Record<string, { label: string; zh: string; color: string }> = {
  GK:  { label: "GK",  zh: "门将", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  DF:  { label: "DF",  zh: "后卫", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  MF:  { label: "MF",  zh: "中场", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  FW:  { label: "FW",  zh: "前锋", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

const BLANK_PLAYER: Partial<PlayerRow> = {
  name: "", name_zh: "", team: "", country_code: "", position: "FW",
  shirt_number: null, club: "", age: null, market_value: "",
  photo_url: "", bio_en: "", bio_zh: "",
  golden_boot: false, golden_ball: false, golden_glove: false, best_young: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function PlayerAvatar({ player, size = 40 }: { player: PlayerRow; size?: number }) {
  if (player.photo_url) {
    return (
      <div className="relative shrink-0 rounded-full overflow-hidden border border-[#1E3A5F]"
        style={{ width: size, height: size }}>
        <Image src={player.photo_url} alt={player.name} fill className="object-cover" unoptimized />
      </div>
    );
  }
  const initials = player.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors: Record<string, string> = {
    GK: "from-yellow-600 to-yellow-800",
    DF: "from-blue-600 to-blue-900",
    MF: "from-green-600 to-green-900",
    FW: "from-red-600 to-red-900",
  };
  const grad = colors[player.position ?? "FW"] ?? "from-gray-600 to-gray-800";
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black border border-[#1E3A5F]`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
}

// ── Edit / Create modal ────────────────────────────────────────────────────────

function PlayerModal({
  locale,
  player,
  onClose,
  onSaved,
}: {
  locale: string;
  player: Partial<PlayerRow> | null;
  onClose: () => void;
  onSaved: (p: PlayerRow) => void;
}) {
  const zh   = locale === "zh";
  const isNew = !player?.id;
  const [form, setForm] = useState<Partial<PlayerRow>>(player ?? BLANK_PLAYER);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const set = (k: keyof PlayerRow, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { setErr(zh ? "姓名必填" : "Name is required"); return; }
    if (!form.team?.trim()) { setErr(zh ? "队伍必填" : "Team is required"); return; }
    setSaving(true);
    setErr("");
    try {
      const url    = isNew ? "/api/admin/players" : `/api/admin/players/${form.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { data?: PlayerRow; error?: string };
      if (!res.ok) { setErr(json.error ?? "Error"); return; }
      onSaved(json.data!);
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = "w-full bg-[#081020] border border-[#1E3A5F] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/50";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A5F]">
          <h2 className="font-black text-white">
            {isNew ? (zh ? "添加球员" : "Add Player") : (zh ? "编辑球员" : "Edit Player")}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {err && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{err}</p>}

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{zh ? "英文姓名 *" : "Name (EN) *"}</label>
              <input className={fieldCls} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "中文姓名" : "Name (ZH)"}</label>
              <input className={fieldCls} value={form.name_zh ?? ""} onChange={(e) => set("name_zh", e.target.value)} />
            </div>
          </div>

          {/* Team + position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{zh ? "国家队 *" : "Team *"}</label>
              <input className={fieldCls} value={form.team ?? ""} onChange={(e) => set("team", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "位置" : "Position"}</label>
              <select className={fieldCls} value={form.position ?? ""} onChange={(e) => set("position", e.target.value)}>
                <option value="">—</option>
                {Object.entries(POS_META).map(([k, v]) => (
                  <option key={k} value={k}>{k} · {v.zh}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Club + shirt */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{zh ? "现效力球队" : "Club"}</label>
              <input className={fieldCls} value={form.club ?? ""} onChange={(e) => set("club", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "号码" : "Shirt #"}</label>
              <input type="number" className={fieldCls} value={form.shirt_number ?? ""}
                onChange={(e) => set("shirt_number", e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
          </div>

          {/* Age + DOB + Height */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{zh ? "年龄" : "Age"}</label>
              <input type="number" className={fieldCls} value={form.age ?? ""}
                onChange={(e) => set("age", e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "生日" : "DOB"}</label>
              <input type="date" className={fieldCls} value={(form.date_of_birth ?? "").slice(0, 10)}
                onChange={(e) => set("date_of_birth", e.target.value || null)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "身高(cm)" : "Height(cm)"}</label>
              <input type="number" className={fieldCls} value={form.height_cm ?? ""}
                onChange={(e) => set("height_cm", e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
          </div>

          {/* Market value + country code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{zh ? "身价 (e.g. €75M)" : "Market Value"}</label>
              <input className={fieldCls} value={form.market_value ?? ""} onChange={(e) => set("market_value", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{zh ? "国旗代码 (e.g. fr)" : "Flag Code (ISO)"}</label>
              <input className={fieldCls} value={form.country_code ?? ""} onChange={(e) => set("country_code", e.target.value)} />
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <label className={labelCls}>{zh ? "头像 URL" : "Photo URL"}</label>
            <input className={fieldCls} placeholder="https://..." value={form.photo_url ?? ""}
              onChange={(e) => set("photo_url", e.target.value)} />
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls}>{zh ? "简介 (中文)" : "Bio (ZH)"}</label>
            <textarea rows={2} className={`${fieldCls} resize-none`} value={form.bio_zh ?? ""}
              onChange={(e) => set("bio_zh", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Bio (EN)</label>
            <textarea rows={2} className={`${fieldCls} resize-none`} value={form.bio_en ?? ""}
              onChange={(e) => set("bio_en", e.target.value)} />
          </div>

          {/* Award flags */}
          <div className="flex flex-wrap gap-3">
            {(["golden_boot", "golden_ball", "golden_glove", "best_young"] as const).map((flag) => {
              const labels: Record<typeof flag, string> = {
                golden_boot:  zh ? "🥾 金靴" : "🥾 Boot",
                golden_ball:  zh ? "🏆 金球" : "🏆 Ball",
                golden_glove: zh ? "🧤 金手套" : "🧤 Glove",
                best_young:   zh ? "🌟 最佳新秀" : "🌟 Best Young",
              };
              return (
                <label key={flag} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#FFD700]"
                    checked={!!(form[flag])}
                    onChange={(e) => set(flag, e.target.checked)} />
                  <span className="text-xs text-gray-400">{labels[flag]}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#1E3A5F]">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            {zh ? "取消" : "Cancel"}
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200] disabled:opacity-50 transition-colors">
            {saving ? "…" : (zh ? "保存" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PlayersClient({
  locale,
  initialPlayers,
  totalCount,
  page,
  pageSize,
  initialQ,
  initialTeam,
  initialPosition,
  teams,
}: Props) {
  const zh = locale === "zh";

  const [players,  setPlayers]  = useState<PlayerRow[]>(initialPlayers);
  const [total,    setTotal]    = useState(totalCount);
  const [loading,  setLoading]  = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState("");
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null | "new">(null);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Filter state (controlled locally, synced to URL on submit)
  const [q,   setQ]   = useState(initialQ);
  const [team, setTeam] = useState(initialTeam);
  const [pos,  setPos]  = useState(initialPosition);

  const search = useCallback(async (newQ: string, newTeam: string, newPos: string, newPage = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (newQ)    sp.set("q", newQ);
      if (newTeam) sp.set("team", newTeam);
      if (newPos)  sp.set("position", newPos);
      sp.set("page", String(newPage));

      const res  = await fetch(`/api/admin/players?${sp}`);
      const json = await res.json() as { data: PlayerRow[]; count: number };
      setPlayers(json.data ?? []);
      setTotal(json.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const doImport = async () => {
    setImporting(true);
    setImportMsg("");
    try {
      const res  = await fetch("/api/admin/players/import", { method: "POST" });
      const json = await res.json() as { static_inserted?: number; fd_enriched?: number; message?: string; error?: string };
      if (res.ok) {
        setImportMsg(json.message ?? `✓ Imported ${json.static_inserted ?? 0} players`);
        await search(q, team, pos, 1);
      } else {
        setImportMsg(`Error: ${json.error ?? "unknown"}`);
      }
    } finally {
      setImporting(false);
    }
  };

  const doEnrich = async (force: boolean) => {
    setEnriching(true);
    setEnrichMsg(zh ? "开始从维基百科回填…" : "Starting Wikipedia backfill…");
    let totalPhotos = 0;
    let totalBios = 0;
    let afterId = 0;
    let guard = 0; // safety cap on loop iterations
    try {
      while (guard++ < 50) {
        const res = await fetch("/api/admin/players/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force, afterId }),
        });
        const json = (await res.json()) as {
          updated_photos?: number;
          updated_bios?: number;
          remaining?: number;
          next_after_id?: number;
          done?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setEnrichMsg(`Error: ${json.error ?? "unknown"}`);
          break;
        }
        totalPhotos += json.updated_photos ?? 0;
        totalBios += json.updated_bios ?? 0;
        afterId = json.next_after_id ?? afterId;
        setEnrichMsg(
          zh
            ? `回填中… 已更新头像 ${totalPhotos}、简介 ${totalBios}，剩余 ${json.remaining ?? 0}`
            : `Enriching… photos ${totalPhotos}, bios ${totalBios}, remaining ${json.remaining ?? 0}`,
        );
        if (json.done) {
          setEnrichMsg(
            zh
              ? `✓ 完成！更新头像 ${totalPhotos} 张、简介 ${totalBios} 条`
              : `✓ Done! Updated ${totalPhotos} photos, ${totalBios} bios`,
          );
          break;
        }
      }
      await search(q, team, pos, page);
    } finally {
      setEnriching(false);
    }
  };

  const deletePlayer = async (id: number) => {
    const res = await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    if (res.ok) {
      startTransition(() => {
        setPlayers((prev) => prev.filter((p) => p.id !== id));
        setTotal((t) => t - 1);
      });
    }
    setDelConfirm(null);
  };

  const onSaved = (saved: PlayerRow) => {
    setPlayers((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx]  = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (editPlayer === "new") setTotal((t) => t + 1);
    setEditPlayer(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {/* Import banner */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {zh ? "🔄 从内置数据导入球员" : "🔄 Import players from built-in roster"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {zh
              ? "将 ~150 名 World Cup 2026 主要球员（含中文名）写入数据库，可重复执行（安全幂等）"
              : "Seeds ~150 WC 2026 players incl. Chinese names. Safe to re-run (upsert)."}
          </p>
          {importMsg && (
            <p className="text-xs text-green-400 mt-1">{importMsg}</p>
          )}
        </div>
        <button
          onClick={doImport}
          disabled={importing}
          className="px-4 py-2 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200] disabled:opacity-50 shrink-0">
          {importing ? (zh ? "导入中…" : "Importing…") : (zh ? "执行导入" : "Run Import")}
        </button>
      </div>

      {/* Wikipedia enrich banner */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {zh ? "🖼️ 从维基百科回填头像和简介" : "🖼️ Backfill photos & bios from Wikipedia"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {zh
              ? "自动抓取球员照片和中英文简介。仅补充空缺字段，不覆盖已手动编辑的内容。冷门球员可能无结果。"
              : "Auto-fetches player photos + EN/ZH bios. Fills only empty fields (won't overwrite manual edits). Less-known players may have no match."}
          </p>
          {enrichMsg && <p className="text-xs text-green-400 mt-1">{enrichMsg}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => doEnrich(false)}
            disabled={enriching || importing}
            className="px-4 py-2 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200] disabled:opacity-50">
            {enriching ? (zh ? "回填中…" : "Enriching…") : (zh ? "补全空缺" : "Fill Missing")}
          </button>
          <button
            onClick={() => doEnrich(true)}
            disabled={enriching || importing}
            title={zh ? "重新抓取全部（覆盖现有头像和简介）" : "Re-fetch all (overwrites existing)"}
            className="px-4 py-2 border border-[#FFD700]/40 text-[#FFD700] font-black rounded-xl text-sm hover:bg-[#FFD700]/10 disabled:opacity-50">
            {zh ? "全部重抓" : "Re-fetch All"}
          </button>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(q, team, pos)}
          placeholder={zh ? "搜索姓名 / 俱乐部…" : "Search name / club…"}
          className="flex-1 min-w-[160px] bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40"
        />
        <select
          value={team}
          onChange={(e) => { setTeam(e.target.value); search(q, e.target.value, pos); }}
          className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/40">
          <option value="">{zh ? "所有球队" : "All teams"}</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={pos}
          onChange={(e) => { setPos(e.target.value); search(q, team, e.target.value); }}
          className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/40">
          <option value="">{zh ? "所有位置" : "All positions"}</option>
          {Object.entries(POS_META).map(([k, v]) => (
            <option key={k} value={k}>{k} · {v.zh}</option>
          ))}
        </select>
        <button
          onClick={() => search(q, team, pos)}
          className="px-4 py-2.5 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200]">
          {zh ? "搜索" : "Search"}
        </button>
        <button
          onClick={() => setEditPlayer("new")}
          className="px-4 py-2.5 border border-[#FFD700]/40 text-[#FFD700] font-black rounded-xl text-sm hover:bg-[#FFD700]/10">
          + {zh ? "添加球员" : "Add Player"}
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500">
        {zh ? `找到 ${total} 名球员` : `${total} players found`}
        {loading && <span className="ml-2 text-gray-600">…</span>}
      </p>

      {/* Player list */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[#1E3A5F]/30">
          {players.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-500 text-sm">
                {zh ? "暂无球员数据，点击「执行导入」开始" : "No players yet — click Run Import above"}
              </p>
            </div>
          )}
          {players.map((p) => {
            const posMeta = POS_META[p.position ?? ""] ?? { label: "—", zh: "—", color: "text-gray-500" };
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                {/* Avatar */}
                <PlayerAvatar player={p} size={40} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">{p.name}</span>
                    {p.name_zh && (
                      <span className="text-xs text-gray-400">{p.name_zh}</span>
                    )}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${posMeta.color}`}>
                      {posMeta.label}
                    </span>
                    {p.shirt_number != null && (
                      <span className="text-[10px] text-gray-600">#{p.shirt_number}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {p.team}
                    {p.club ? ` · ${p.club}` : ""}
                    {p.age ? ` · ${p.age}岁` : ""}
                    {p.market_value ? ` · ${p.market_value}` : ""}
                  </p>
                  {/* Award badges */}
                  {(p.golden_boot || p.golden_ball || p.golden_glove || p.best_young) && (
                    <div className="flex gap-1 mt-1">
                      {p.golden_boot  && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 rounded">🥾</span>}
                      {p.golden_ball  && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 rounded">🏆</span>}
                      {p.golden_glove && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 rounded">🧤</span>}
                      {p.best_young   && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 rounded">🌟</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/${locale}/players/${p.id}`} target="_blank"
                    className="text-gray-600 hover:text-[#FFD700] text-xs px-2 py-1 rounded-lg border border-transparent hover:border-[#FFD700]/20 transition-all">
                    {zh ? "查看" : "View"}
                  </Link>
                  <button
                    onClick={() => setEditPlayer(p)}
                    className="text-gray-600 hover:text-white text-xs px-2 py-1 rounded-lg border border-transparent hover:border-[#1E3A5F] transition-all">
                    {zh ? "编辑" : "Edit"}
                  </button>
                  {delConfirm === p.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deletePlayer(p.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold">
                        {zh ? "确认" : "Confirm"}
                      </button>
                      <button onClick={() => setDelConfirm(null)}
                        className="text-[10px] text-gray-600 hover:text-gray-400">
                        {zh ? "取消" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDelConfirm(p.id)}
                      className="text-gray-700 hover:text-red-400 text-xs px-2 py-1 transition-colors">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p}
              onClick={() => search(q, team, pos, p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                p === page
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:border-[#FFD700]/40"
              }`}>
              {p}
            </button>
          ))}
          {totalPages > 10 && (
            <span className="text-xs text-gray-600">… {totalPages} pages</span>
          )}
        </div>
      )}

      {/* Edit / Create modal */}
      {editPlayer !== null && (
        <PlayerModal
          locale={locale}
          player={editPlayer === "new" ? { ...BLANK_PLAYER } : editPlayer}
          onClose={() => setEditPlayer(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
