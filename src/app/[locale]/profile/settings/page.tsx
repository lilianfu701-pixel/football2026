"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { countries } from "@/lib/countries";
import { PROFILE_REWARDS } from "@/lib/profileRewards";
import { lc } from "@/i18n/content";


interface ProfileData {
  nickname:         string;
  country_code:     string;
  avatar_url:       string | null;
  bio:              string | null;
  slogan:           string | null;
  gender:           string | null;
  birthday:         string | null;
  social_x:         string | null;
  social_telegram:  string | null;
  profile_rewards:  Record<string, boolean>;
}

/** GC reward badge shown next to each section title. */
function GcBadge({ fieldKey, rewarded, zh, locale }: { fieldKey: string; rewarded: boolean; zh: boolean; locale: string }) {
  const field = PROFILE_REWARDS.find((f) => f.key === fieldKey);
  if (!field) return null;
  if (rewarded) {
    return (
      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
        ✅ {lc(locale, "已领", "Claimed")} +{field.gc} GC
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-2 py-0.5 rounded-full">
      🪙 +{field.gc} GC
    </span>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nickname, setNickname] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [bio, setBio] = useState("");
  const [slogan, setSlogan] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [socialX, setSocialX] = useState("");
  const [socialTelegram, setSocialTelegram] = useState("");

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data } = await supabase
        .from("users")
        .select("nickname, country_code, avatar_url, bio, slogan, gender, birthday, social_x, social_telegram, profile_rewards")
        .eq("id", user.id)
        .single();

      if (data) {
        const d = data as ProfileData;
        setProfile(d);
        setNickname(d.nickname ?? "");
        setBio(d.bio ?? "");
        setSlogan(d.slogan ?? "");
        setGender(d.gender ?? "");
        setBirthday(d.birthday ?? "");
        setSocialX(d.social_x ?? "");
        setSocialTelegram(d.social_telegram ?? "");
        if (d.country_code) {
          const c = countries.find(c => c.code === d.country_code);
          if (c) setSelectedCountry(c);
        }
        if (d.avatar_url) setAvatarPreview(d.avatar_url);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countrySearch]);


  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setRewardMsg(null);

    if (nickname.length < 3 || nickname.length > 20) {
      setError(lc(locale, "用户名需 3-20 个字符", "Username must be 3-20 characters"));
      return;
    }

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = profile?.avatar_url ?? null;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          setError("Failed to upload avatar: " + uploadError.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("users")
        .update({
          nickname,
          country_code: (selectedCountry?.code ?? profile?.country_code ?? "US").slice(0, 2),
          avatar_url: avatarUrl,
          bio:              bio.trim()            || null,
          slogan:           slogan.trim()         || null,
          gender:           gender                || null,
          birthday:         birthday              || null,
          social_x:         socialX.trim()        || null,
          social_telegram:  socialTelegram.trim() || null,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Claim any newly earned GC rewards
      try {
        const res = await fetch("/api/profile/claim-rewards", { method: "POST" });
        const json = await res.json();
        if (json.awarded > 0) {
          setRewardMsg(
            zh
              ? `🎉 恭喜！完善资料获得 +${json.awarded.toLocaleString()} GC`
              : `🎉 Congrats! You earned +${json.awarded.toLocaleString()} GC for completing your profile`,
          );
        }
      } catch { /* ignore claim errors */ }

      setSuccess(true);
      // Invalidate Next.js router cache so leaderboard / profile pages re-fetch
      // fresh data from the server on the next navigation.
      router.refresh();
      setTimeout(() => router.push(`/${locale}/profile`), rewardMsg ? 3000 : 1500);
    });
  }

  const rewarded = profile?.profile_rewards ?? {};

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-16">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/${locale}/profile`}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{lc(locale, "账号设置", "Profile Settings")}</h1>
            <p className="text-gray-500 text-xs">
              {lc(locale, "完善资料赚取 GC 奖励", "Complete your profile to earn GC rewards")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* ── Avatar ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "头像", "Avatar")}
              </h3>
              <GcBadge fieldKey="avatar" rewarded={!!rewarded.avatar} zh={zh} locale={locale} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1E3A5F] flex items-center justify-center shrink-0">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-[#FFD700]">
                    {nickname[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white text-sm px-4 py-2 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {lc(locale, "上传照片", "Upload Photo")}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-600 mt-1.5">Max 2MB, JPG/PNG</p>
              </div>
            </div>
          </div>

          {/* ── Username ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              {lc(locale, "用户名", "Username")}
            </h3>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={3}
              maxLength={20}
              required
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1.5">{lc(locale, "3-20 个字符", "3-20 characters, shown publicly")}</p>
          </div>

          {/* ── Country ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "国家/地区", "Country")}
              </h3>
              <GcBadge fieldKey="country" rewarded={!!rewarded.country} zh={zh} locale={locale} />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountryDrop(!showCountryDrop)}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-left text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors flex items-center justify-between"
              >
                <span className={selectedCountry ? "text-white" : "text-gray-600"}>
                  {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : (lc(locale, "选择国家", "Select country"))}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCountryDrop && (
                <div className="absolute z-50 w-full mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-[#1E3A5F]">
                    <input
                      type="text"
                      placeholder={lc(locale, "搜索国家…", "Search country...")}
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700] placeholder-gray-600"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => { setSelectedCountry(country); setShowCountryDrop(false); setCountrySearch(""); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#1E3A5F] transition-colors flex items-center gap-3"
                      >
                        <span className="text-xl">{country.flag}</span>
                        <span>{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Bio ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "自我介绍", "Bio")}
              </h3>
              <GcBadge fieldKey="bio" rewarded={!!rewarded.bio} zh={zh} locale={locale} />
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={lc(locale, "介绍一下自己（至少 20 字）…", "Tell us about yourself (min 20 chars)…")}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600 resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">
              {bio.trim().length}/500 {lc(locale, "字", "chars")}
              {bio.trim().length > 0 && bio.trim().length < 20 && (
                <span className="text-[#FFD700] ml-2">
                  {zh ? `还需 ${20 - bio.trim().length} 字` : `${20 - bio.trim().length} more needed`}
                </span>
              )}
            </p>
          </div>

          {/* ── Slogan ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "格言", "Slogan")}
              </h3>
              <GcBadge fieldKey="slogan" rewarded={!!rewarded.slogan} zh={zh} locale={locale} />
            </div>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              maxLength={100}
              placeholder={lc(locale, "你的足球格言（至少 10 字）…", "Your football motto (min 10 chars)…")}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600"
            />
            <p className="text-xs text-gray-600 mt-1">
              {slogan.trim().length}/100
              {slogan.trim().length > 0 && slogan.trim().length < 10 && (
                <span className="text-[#FFD700] ml-2">
                  {zh ? `还需 ${10 - slogan.trim().length} 字` : `${10 - slogan.trim().length} more needed`}
                </span>
              )}
            </p>
          </div>

          {/* ── Gender ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "性别", "Gender")}
              </h3>
              <GcBadge fieldKey="gender" rewarded={!!rewarded.gender} zh={zh} locale={locale} />
            </div>
            <div className="flex gap-2">
              {([
                { value: "male",   labelEn: "Male",   labelZh: "男", icon: "♂️" },
                { value: "female", labelEn: "Female", labelZh: "女", icon: "♀️" },
                { value: "other",  labelEn: "Other",  labelZh: "其他", icon: "⚧️" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                    gender === opt.value
                      ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                      : "bg-[#0A1628] border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#2A4A7F]"
                  }`}
                >
                  {opt.icon} {zh ? opt.labelZh : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* ── Birthday ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {lc(locale, "生日", "Birthday")}
              </h3>
              <GcBadge fieldKey="birthday" rewarded={!!rewarded.birthday} zh={zh} locale={locale} />
            </div>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors [color-scheme:dark]"
            />
          </div>

          {/* ── Social Links ── */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              {lc(locale, "社交链接", "Social Links")}
            </h3>

            {/* Twitter / X */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Twitter / X</span>
                <GcBadge fieldKey="social_x" rewarded={!!rewarded.social_x} zh={zh} locale={locale} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">@</span>
                <input
                  type="text"
                  value={socialX}
                  onChange={(e) => setSocialX(e.target.value.replace(/^@/, ""))}
                  maxLength={50}
                  placeholder={lc(locale, "你的 X 用户名", "Your X handle")}
                  className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            {/* Telegram */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Telegram</span>
                <GcBadge fieldKey="social_telegram" rewarded={!!rewarded.social_telegram} zh={zh} locale={locale} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">@</span>
                <input
                  type="text"
                  value={socialTelegram}
                  onChange={(e) => setSocialTelegram(e.target.value.replace(/^@/, ""))}
                  maxLength={50}
                  placeholder={lc(locale, "你的 Telegram 用户名", "Your Telegram handle")}
                  className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          {/* ── Messages ── */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {rewardMsg && (
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm px-4 py-3 rounded-xl text-center font-bold">
              {rewardMsg}
            </div>
          )}
          {success && !rewardMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl text-center">
              {lc(locale, "✓ 资料已更新！跳转中…", "✓ Profile updated! Redirecting...")}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#FFD700] text-[#0A1628] font-bold py-3.5 rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50"
          >
            {isPending ? (lc(locale, "保存中…", "Saving...")) : (lc(locale, "保存", "Save Changes"))}
          </button>
        </form>
      </div>
    </div>
  );
}
