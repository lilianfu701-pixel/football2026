"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { countries } from "@/lib/countries";

interface ProfileData {
  username: string;
  country_code: string;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data } = await supabase
        .from("users")
        .select("username, country_code, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setUsername(data.username ?? "");
        if (data.country_code) {
          const c = countries.find(c => c.code === data.country_code);
          if (c) setSelectedCountry(c);
        }
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
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

    if (username.length < 3 || username.length > 20) {
      setError("Username must be 3-20 characters");
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
          username,
          country_code: selectedCountry?.code ?? profile?.country_code,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/profile`), 1500);
    });
  }

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
            <h1 className="text-xl font-bold">账号设置</h1>
            <p className="text-gray-500 text-xs">Profile Settings</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Avatar</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1E3A5F] flex items-center justify-center shrink-0">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-[#FFD700]">
                    {username[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white text-sm px-4 py-2 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-600 mt-1.5">Max 2MB, JPG/PNG</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Username</h3>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              required
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1.5">3-20 characters, shown publicly</p>
          </div>

          {/* Country */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Country</h3>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountryDrop(!showCountryDrop)}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-left text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors flex items-center justify-between"
              >
                <span className={selectedCountry ? "text-white" : "text-gray-600"}>
                  {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "Select country"}
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
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700] placeholder-gray-600"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl text-center">
              ✓ Profile updated! Redirecting...
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#FFD700] text-[#0A1628] font-bold py-3.5 rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
