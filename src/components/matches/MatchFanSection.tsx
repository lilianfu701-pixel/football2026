"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Marker, type GeoFeature } from "react-simple-maps";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import ShareButtons from "@/components/forum/ShareButtons";

const GEO_URL = "/countries-110m.json";

const centroidMap = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, c]));
const A2_NAMES    = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, { en: c.en, zh: c.zh }]));

// ── Map projection helpers ────────────────────────────────────────────────────
// Exact Equal-Earth projection matching react-simple-maps:
//   projectionConfig={{ scale: 147, center: [10, 10] }}, width=800, height=400
//
// Pipeline: pre-rotate([-10°,-10°,0°]) → equalEarthRaw → scale(147) → translate(400,200)
// This is identical to d3-geo's geoEqualEarth().scale(147).center([10,10]).translate([400,200])

const _DEG   = Math.PI / 180;
const _EE_A1 = 1.340264, _EE_A2 = -0.081106, _EE_A3 = 0.000893, _EE_A4 = 0.003796;
const _EE_M  = Math.sqrt(3) / 2;   // √3/2

// Pre-computed trig for rotation([-10°, -10°, 0°])
const _cosDp = Math.cos(-10 * _DEG);   //  cos(10°)
const _sinDp = Math.sin(-10 * _DEG);   // -sin(10°)

/** d3-geo rotationPhiGamma(-10°, 0°) applied after longitude shift of -10° */
function _preRotate(lngDeg: number, latDeg: number): [number, number] {
  const lambda = lngDeg * _DEG - 10 * _DEG;   // longitude rotation by -10°
  const phi    = latDeg * _DEG;
  const cosPhi = Math.cos(phi);
  const x = Math.cos(lambda) * cosPhi;
  const y = Math.sin(lambda) * cosPhi;
  const z = Math.sin(phi);
  const k = z * _cosDp + x * _sinDp;
  return [
    Math.atan2(y, x * _cosDp - z * _sinDp),
    Math.asin(Math.max(-1, Math.min(1, k))),
  ];
}

/** Equal-Earth raw projection (Šavrič, Patterson, Jenny 2018) */
function _equalEarthRaw(λ: number, φ: number): [number, number] {
  const l  = Math.asin(_EE_M * Math.sin(φ));
  const l2 = l * l, l4 = l2 * l2, l6 = l4 * l2;
  const denom = _EE_M * (9 * _EE_A4 * l6 + 7 * _EE_A3 * l4 + 3 * _EE_A2 * l2 + _EE_A1);
  return [
    λ * Math.cos(l) / denom,
    l * (_EE_A4 * l6 + _EE_A3 * l4 + _EE_A2 * l2 + _EE_A1),
  ];
}

/** Convert geographic coordinates to CSS % position on the map div */
function coordsToMapPercent(lng: number, lat: number): { x: number; y: number } {
  const [λr, φr] = _preRotate(lng, lat);
  const [rx, ry] = _equalEarthRaw(λr, φr);
  // scale=147, translate=[400,200], SVG 800×400 → CSS %
  return {
    x: Math.max(1, Math.min(99, (rx * 147 + 400) / 8)),
    y: Math.max(1, Math.min(99, (-ry * 147 + 200) / 4)),
  };
}

// ── Jitter (same as original) ─────────────────────────────────────────────────
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function jitteredCoords(
  baseLng: number, baseLat: number,
  code: string, idx: number, total: number
): [number, number] {
  const spread = Math.min(2.5 + Math.sqrt(total) * 0.7, 9);
  const c0 = code.charCodeAt(0) * 0.01;
  const c1 = (code.charCodeAt(1) ?? 65) * 0.01;
  return [
    baseLng + (pseudoRand(idx * 1.618 + c0) - 0.5) * spread * 1.5,
    baseLat + (pseudoRand(idx * 2.718 + c1) - 0.5) * spread,
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CountryVote {
  country_code: string;
  dominant: "home" | "neutral" | "away";
  home: number; neutral: number; away: number; total: number;
}
interface VoterDot {
  coords:    [number, number];
  side:      "home" | "away";
  country:   string;
  isPrecise?: boolean;   // true = real lat/lng, false = country-centroid jitter
}
interface TooltipState {
  x: number; y: number;
  country: string;
  home: number; away: number;
}
type PropType = "firework" | "goal" | "rally" | "boo";

const PROP_COSTS: Record<PropType, string> = {
  firework: "50K",
  goal:     "100K",
  rally:    "200K",
  boo:      "50K",
};

interface FireworkItem {
  id:           string;
  country_code: string;
  lat:          number;
  lng:          number;
  color:        string;
  username:     string;
  prop_type:    PropType;
  isSelf?:      boolean;   // true = current user's own launch → bigger effect
  // pre-computed particles so they don't shift on re-render
  particles:    { tx: number; ty: number; r: number; size: number; shape?: "circle" | "heart" }[];
}

interface GlobalEffect {
  id:       string;
  type:     PropType;
  color:    string;
  username: string;
}

function propEmoji(t: PropType): string {
  return t === "firework" ? "🎆" : t === "goal" ? "⚽" : t === "rally" ? "💙" : "😤";
}

interface TeamColors { primary: string; secondary: string; }

interface Props {
  matchId:    number;
  homeTeam:   string;
  awayTeam:   string;
  homeColors: TeamColors;
  awayColors: TeamColors;
  zh?:        boolean;
  loggedIn?:  boolean;
  canPersistProps?: boolean;
  userVote?:  "home" | "neutral" | "away" | null;
  showCurrentUserMarker?: boolean;
  mobileAudioUnlock?: boolean;
  /** When true, hides the vote buttons section (map + share only) */
  hideVote?: boolean;
  /** Server-rendered initial vote counts — seeds the vote buttons before the first API reload */
  initialVotes?: { home: number; neutral: number; away: number };
}

const MAX_DOTS_PER_COUNTRY = 60;
const FIREWORK_CHANNEL     = (id: number) => `fireworks:match-${id}`;

// ── Inject CSS keyframes once ─────────────────────────────────────────────────
function injectFireworkStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("gc-fw-styles")) return;
  const s = document.createElement("style");
  s.id = "gc-fw-styles";
  s.textContent = `
    @keyframes gc-fw-rocket {
      0%   { transform: translate(-50%,-50%) scale(1.4); opacity:1; }
      65%  { transform: translate(-50%,calc(-50% - 30px)) scale(0.6); opacity:1; }
      100% { transform: translate(-50%,calc(-50% - 36px)) scale(0); opacity:0; }
    }
    @keyframes gc-fw-particle {
      0%   { transform: translate(-50%,-50%) scale(1); opacity:1; }
      70%  { opacity:.75; }
      100% { transform: translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(.15); opacity:0; }
    }
    @keyframes gc-fw-label {
      0%   { opacity:0; transform:translateX(-50%) translateY(4px); }
      18%  { opacity:1; }
      65%  { opacity:1; transform:translateX(-50%) translateY(-10px); }
      100% { opacity:0; transform:translateX(-50%) translateY(-16px); }
    }
    /* 🔥 Blaze — fire particles rise upward */
    @keyframes gc-fw-blaze {
      0%   { transform: translate(calc(-50% + var(--tx)), -50%) scale(1.2); opacity:1; }
      60%  { opacity:.8; }
      100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity:0; }
    }
    /* 💙 Rally — hearts float up slowly */
    @keyframes gc-fw-heart {
      0%   { opacity:0; transform: translate(calc(-50% + var(--tx)), -50%) scale(0.6); }
      15%  { opacity:1; transform: translate(calc(-50% + var(--tx)), calc(-50% - 4px)) scale(1.1); }
      100% { opacity:0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.7); }
    }
    /* 😤 Boo — fast red burst */
    @keyframes gc-fw-boo {
      0%   { transform: translate(-50%,-50%) scale(1.5); opacity:1; }
      100% { transform: translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0); opacity:0; }
    }
    /* 💢 Boo label pop */
    @keyframes gc-fw-boo-pop {
      0%   { opacity:0; transform:translateX(-50%) scale(0.3); }
      20%  { opacity:1; transform:translateX(-50%) scale(1.4); }
      45%  { transform:translateX(-50%) scale(1); }
      100% { opacity:0; transform:translateX(-50%) scale(0.8) translateY(-8px); }
    }

    /* ── BIG variants (own launches) ── */
    @keyframes gc-fw-rocket-big {
      0%   { transform: translate(-50%,-50%) scale(2.8); opacity:1; }
      65%  { transform: translate(-50%,calc(-50% - 60px)) scale(1); opacity:1; }
      100% { transform: translate(-50%,calc(-50% - 72px)) scale(0); opacity:0; }
    }
    @keyframes gc-fw-particle-big {
      0%   { transform: translate(-50%,-50%) scale(1.4); opacity:1; }
      70%  { opacity:.8; }
      100% { transform: translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(.1); opacity:0; }
    }
    @keyframes gc-fw-blaze-big {
      0%   { transform: translate(calc(-50% + var(--tx)), -50%) scale(1.8); opacity:1; }
      60%  { opacity:.9; }
      100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity:0; }
    }
    @keyframes gc-fw-heart-big {
      0%   { opacity:0; transform: translate(calc(-50% + var(--tx)), -50%) scale(0.6); }
      15%  { opacity:1; transform: translate(calc(-50% + var(--tx)), calc(-50% - 6px)) scale(1.5); }
      100% { opacity:0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); }
    }
    @keyframes gc-fw-boo-big {
      0%   { transform: translate(-50%,-50%) scale(2.2); opacity:1; }
      100% { transform: translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0); opacity:0; }
    }
    @keyframes gc-fw-boo-pop-big {
      0%   { opacity:0; transform:translateX(-50%) scale(0.3); }
      20%  { opacity:1; transform:translateX(-50%) scale(2.4); }
      45%  { transform:translateX(-50%) scale(1.8); }
      100% { opacity:0; transform:translateX(-50%) scale(1.2) translateY(-18px); }
    }
    @keyframes gc-fw-label-big {
      0%   { opacity:0; transform:translateX(-50%) translateY(4px) scale(0.8); }
      18%  { opacity:1; transform:translateX(-50%) translateY(-6px) scale(1.3); }
      65%  { opacity:1; transform:translateX(-50%) translateY(-20px) scale(1.2); }
      100% { opacity:0; transform:translateX(-50%) translateY(-32px) scale(1); }
    }

    /* ── Global effect keyframes (full-map, own launches) ── */

    /* 礼花 ARC: shoot down toward earth → peak scale at mid → land & dim */
    @keyframes gc-fw-shoot {
      0% {
        transform: translate(0, 0) scale(0.15);
        opacity: 0;
        animation-timing-function: ease-out;
      }
      6% {
        opacity: 1;
        animation-timing-function: ease-out;
      }
      40% {
        transform: translate(var(--ax), var(--py)) scale(1.4);
        opacity: 1;
        animation-timing-function: ease-in;
      }
      82% {
        opacity: 0.35;
        animation-timing-function: ease-in;
      }
      100% {
        transform: translate(var(--lx), var(--ly)) scale(0.12);
        opacity: 0;
      }
    }

    /* 礼花: core flash — radial glow expands then fades */
    @keyframes gc-gfw-flash {
      0%   { transform:translate(-50%,-50%) scale(0);   opacity:1; }
      25%  { transform:translate(-50%,-50%) scale(1);   opacity:0.9; }
      100% { transform:translate(-50%,-50%) scale(1.6); opacity:0; }
    }
    /* 礼花: small burst rocket */
    @keyframes gc-gfw-rkt {
      0%   { transform:translate(-50%,-50%) scale(1.8); opacity:1; }
      60%  { transform:translate(-50%,calc(-50% - 16px)) scale(0.6); opacity:1; }
      100% { transform:translate(-50%,calc(-50% - 22px)) scale(0); opacity:0; }
    }
    /* 礼花: burst particles */
    @keyframes gc-gfw-prt {
      0%   { transform:translate(-50%,-50%) scale(1.1); opacity:1; }
      70%  { opacity:0.7; }
      100% { transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0); opacity:0; }
    }

    /* 进球: soccer ball flies across entire map (left/top animated) */
    @keyframes gc-gball-fly {
      0%   { left:8%;  top:70%; transform:rotate(0deg)   scale(2);   opacity:0; }
      5%   { left:8%;  top:70%; opacity:1; }
      25%  { left:30%; top:42%; transform:rotate(150deg) scale(2.2); opacity:1; }
      50%  { left:52%; top:18%; transform:rotate(300deg) scale(2.5); opacity:1; }
      72%  { left:70%; top:28%; transform:rotate(420deg) scale(2.2); opacity:1; }
      90%  { left:85%; top:52%; transform:rotate(500deg) scale(1.8); opacity:0.8; }
      100% { left:90%; top:64%; transform:rotate(540deg) scale(1);   opacity:0; }
    }

    /* Rally: stadium waves converge, then short ribbons rise like a supporters' surge. */
    @keyframes gc-rally-wave-left {
      0%   { transform:translateX(-112%) skewX(-12deg); opacity:0; }
      16%  { opacity:0.78; }
      72%  { transform:translateX(18%) skewX(-4deg); opacity:0.66; }
      100% { transform:translateX(45%) skewX(0deg); opacity:0; }
    }
    @keyframes gc-rally-wave-right {
      0%   { transform:translateX(112%) skewX(12deg); opacity:0; }
      16%  { opacity:0.78; }
      72%  { transform:translateX(-18%) skewX(4deg); opacity:0.66; }
      100% { transform:translateX(-45%) skewX(0deg); opacity:0; }
    }
    @keyframes gc-rally-confetti-left {
      0%   { bottom:-8%; transform:translateX(0) rotate(0deg) scale(0.6); opacity:0; }
      12%  { opacity:1; }
      100% { bottom:94%; transform:translateX(-34px) rotate(-620deg) scale(1); opacity:0; }
    }
    @keyframes gc-rally-confetti-right {
      0%   { bottom:-8%; transform:translateX(0) rotate(0deg) scale(0.6); opacity:0; }
      12%  { opacity:1; }
      100% { bottom:94%; transform:translateX(34px) rotate(620deg) scale(1); opacity:0; }
    }
    @keyframes gc-rally-ring {
      0%   { transform:translate(-50%,-50%) scale(0.28); opacity:0.72; }
      100% { transform:translate(-50%,-50%) scale(2.35); opacity:0; }
    }
    @keyframes gc-rally-pulse {
      0%   { transform:translate(-50%,-50%) scale(0.55); opacity:0; }
      22%  { opacity:1; }
      58%  { transform:translate(-50%,-50%) scale(1.12); opacity:1; }
      100% { transform:translate(-50%,-50%) scale(1.34); opacity:0; }
    }

    /* 嘘声: toilet paper thrown from edges toward center */
    @keyframes gc-tp-fromleft {
      0%   { transform:translateX(0)     rotate(0deg)    scale(1.2); opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:0.9; }
      100% { transform:translateX(42vw)  rotate(540deg)  scale(0.5); opacity:0; }
    }
    @keyframes gc-tp-fromright {
      0%   { transform:translateX(0)     rotate(0deg)    scale(1.2); opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:0.9; }
      100% { transform:translateX(-42vw) rotate(-540deg) scale(0.5); opacity:0; }
    }
    @keyframes gc-tp-fromtop {
      0%   { transform:translateY(0)     rotate(0deg)    scale(1.2); opacity:0; }
      8%   { opacity:1; }
      85%  { opacity:0.9; }
      100% { transform:translateY(28vh)  rotate(360deg)  scale(0.5); opacity:0; }
    }
  `;
  document.head.appendChild(s);
}

// ── Build FireworkItem particles deterministically ────────────────────────────
function buildParticles(color: string) {
  return Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist  = 22 + (i % 3) * 9;           // 22 / 31 / 40 px
    const isWhite = i % 4 === 0;
    return {
      tx:   Math.round(Math.cos(angle) * dist),
      ty:   Math.round(Math.sin(angle) * dist),
      r:    isWhite ? 0xffffff : parseInt(color.slice(1), 16),
      size: i % 2 === 0 ? 4 : 3,
    };
  });
}

// ⚽ Goal: gold/white star-burst shooting upward
const GOAL_PALETTE = [0xFFD700, 0xFFEC6E, 0xFFFFFF, 0xFFA500, 0xFFD700];
function buildGoalParticles() {
  return Array.from({ length: 14 }, (_, i) => ({
    tx:    Math.round(Math.cos(i * 1.05) * 12),  // ±12 px horizontal wobble
    ty:    -(30 + (i % 4) * 10),                 // -30 / -40 / -50 / -60 (upward)
    r:     GOAL_PALETTE[i % GOAL_PALETTE.length],
    size:  i % 3 === 0 ? 6 : 3,
  }));
}

// 💙 Rally: hearts float gently upward
function buildRallyParticles(color: string) {
  return Array.from({ length: 6 }, (_, i) => ({
    tx:    Math.round((i - 2.5) * 9),            // spread: -22 to +22 px
    ty:    -(38 + (i % 3) * 14),                 // -38 / -52 / -66
    r:     parseInt(color.slice(1), 16),
    size:  13,
    shape: "heart" as const,
  }));
}

// 😤 Boo: fast chaotic red burst
function buildBooParticles() {
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
    const dist  = 32 + (i % 3) * 13;            // 32 / 45 / 58 px
    const isDark = i % 3 === 0;
    return {
      tx:    Math.round(Math.cos(angle) * dist),
      ty:    Math.round(Math.sin(angle) * dist),
      r:     isDark ? 0x7F1D1D : 0xEF4444,
      size:  i % 2 === 0 ? 5 : 3,
    };
  });
}

function buildPropParticles(type: PropType, color: string, big = false) {
  if (!big) {
    if (type === "goal")  return buildGoalParticles();
    if (type === "rally") return buildRallyParticles(color);
    if (type === "boo")   return buildBooParticles();
    return buildParticles(color);
  }
  // ── BIG variants (2× scale, more particles) ──────────────────────────────
  if (type === "goal") {
    return Array.from({ length: 24 }, (_, i) => ({
      tx:   Math.round(Math.cos(i * 0.8) * 22),
      ty:   -(70 + (i % 4) * 20),
      r:    GOAL_PALETTE[i % GOAL_PALETTE.length],
      size: i % 3 === 0 ? 10 : 6,
    }));
  }
  if (type === "rally") {
    return Array.from({ length: 10 }, (_, i) => ({
      tx:    Math.round((i - 4.5) * 14),
      ty:    -(80 + (i % 3) * 24),
      r:     parseInt(color.slice(1), 16),
      size:  22,
      shape: "heart" as const,
    }));
  }
  if (type === "boo") {
    return Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + (i % 2) * 0.2;
      const dist  = 60 + (i % 3) * 24;
      return {
        tx:   Math.round(Math.cos(angle) * dist),
        ty:   Math.round(Math.sin(angle) * dist),
        r:    i % 3 === 0 ? 0x7F1D1D : 0xEF4444,
        size: i % 2 === 0 ? 9 : 6,
      };
    });
  }
  // firework big
  return Array.from({ length: 24 }, (_, i) => {
    const angle   = (i / 24) * Math.PI * 2;
    const dist    = 50 + (i % 3) * 20;
    const isWhite = i % 4 === 0;
    return {
      tx:   Math.round(Math.cos(angle) * dist),
      ty:   Math.round(Math.sin(angle) * dist),
      r:    isWhite ? 0xffffff : parseInt(color.slice(1), 16),
      size: i % 2 === 0 ? 8 : 5,
    };
  });
}

// ── Firework spread: 130 particles radiate from map centre ───────────────────
// Indices  0–119 : long-range (midR 12–28 vw, landR +6–18 vw)
// Indices 120–129: short-range bright fill — plug the hollow at the origin
//                  (midR 0–8 vw, landR +1–6 vw, larger & brighter yellow)
const FW_SHOOT_PRT = Array.from({ length: 130 }, (_, i) => {
  const angle = pseudoRand(i * 3.71) * Math.PI * 2;
  if (i >= 120) {
    // Close-range fill — covers the blank centre left by the long-range group
    const midR  = pseudoRand(i * 7.33) * 8;                // 0–8 vw
    const landR = midR + 1 + pseudoRand(i * 5.17) * 5;     // 1–6 vw extra
    return {
      ax:    +(Math.cos(angle) * midR).toFixed(2),
      py:    +(Math.sin(angle) * midR * 0.5).toFixed(2),
      lx:    +(Math.cos(angle) * landR).toFixed(2),
      ly:    +(Math.sin(angle) * landR * 0.5).toFixed(2),
      delay: pseudoRand(i * 11.13) * 0.3,
      dur:   3.0 + pseudoRand(i * 13.91) * 1.5,
      size:  6   + Math.round(pseudoRand(i * 5.37) * 4),   // 6–10 px (larger)
    };
  }
  const midR  = 12 + pseudoRand(i * 7.33) * 16;            // 12–28 vw
  const landR = midR + 6 + pseudoRand(i * 5.17) * 12;      // +6–18 vw
  return {
    ax:    +(Math.cos(angle) * midR).toFixed(2),
    py:    +(Math.sin(angle) * midR * 0.5).toFixed(2),
    lx:    +(Math.cos(angle) * landR).toFixed(2),
    ly:    +(Math.sin(angle) * landR * 0.5).toFixed(2),
    delay: pseudoRand(i * 11.13) * 0.5,
    dur:   4.0 + pseudoRand(i * 13.91) * 2.0,
    size:  4   + Math.round(pseudoRand(i * 5.37) * 5),
  };
});

// Local rally confetti palette. Remote rally particles intentionally stay unchanged.
const STREAMER_PALETTE = [
  "#FFD700","#FF6B6B","#4FC3F7","#81C784","#FF8A65",
  "#CE93D8","#80DEEA","#FFCC80","#F48FB1","#AED581",
];
const RALLY_CONFETTI = Array.from({ length: 34 }, (_, i) => ({
  x:    5 + pseudoRand(i * 5.91) * 90,
  w:    4 + (i % 3),
  h:    13 + (i % 4) * 4,
  del:  0.28 + (i % 11) * 0.07,
  dur:  2.35 + (i % 5) * 0.16,
  anim: i % 2 === 0 ? "gc-rally-confetti-left" : "gc-rally-confetti-right",
}));

// Toilet paper items: 4 from left, 4 from right, 4 from top → toward center
const TP_DATA = [
  { anim:"gc-tp-fromleft",  x:"-5%",  y:"15%", del:0.00 },
  { anim:"gc-tp-fromleft",  x:"-5%",  y:"35%", del:0.15 },
  { anim:"gc-tp-fromleft",  x:"-5%",  y:"55%", del:0.08 },
  { anim:"gc-tp-fromleft",  x:"-5%",  y:"72%", del:0.22 },
  { anim:"gc-tp-fromright", x:"105%", y:"22%", del:0.05 },
  { anim:"gc-tp-fromright", x:"105%", y:"44%", del:0.18 },
  { anim:"gc-tp-fromright", x:"105%", y:"62%", del:0.10 },
  { anim:"gc-tp-fromright", x:"105%", y:"80%", del:0.25 },
  { anim:"gc-tp-fromtop",   x:"18%",  y:"-5%", del:0.03 },
  { anim:"gc-tp-fromtop",   x:"38%",  y:"-5%", del:0.12 },
  { anim:"gc-tp-fromtop",   x:"60%",  y:"-5%", del:0.07 },
  { anim:"gc-tp-fromtop",   x:"78%",  y:"-5%", del:0.20 },
];

// ── Audio file paths (public/icons/levels/*.wav) ──────────────────────────────
const PROP_SOUND_URLS: Record<PropType, string> = {
  firework: "/icons/levels/LH.wav",
  goal:     "/icons/levels/goal.wav",
  rally:    "/icons/levels/JY.wav",
  boo:      "/icons/levels/XX.wav",
};

// ── Web Audio engine ──────────────────────────────────────────────────────────
// AudioContext is created synchronously inside the user-gesture handler (getAC),
// so it starts in "running" state on Chrome/Safari/Firefox.
//
// Mobile (iOS Safari) notes:
//  - WAV files are large (750 KB–1.2 MB). On slow connections, fetch + decode
//    takes 2–5 s, by which time iOS may have auto-suspended the context.
//    Fix: pre-fetch raw bytes on mount (_rawCache) so only decodeAudioData
//    (~50 ms) remains at tap time.
//  - On older iOS, source.start() on a suspended AudioContext may not register
//    as a user-gesture audio interaction. Fix: double-unlock pattern — play the
//    silent buffer both immediately AND after ctx.resume() resolves.

let _ac: AudioContext | null = null;
let _audioUnlockPromise: Promise<void> | null = null;

function getAC(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!_ac || _ac.state === "closed") _ac = new AudioContextConstructor();
    return _ac;
  } catch { return null; }
}

/** Play a 1-sample silent buffer — the minimal iOS Safari audio-unlock gesture. */
function _playSilence(ctx: AudioContext): void {
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
    src.onended = () => src.disconnect();
  } catch { /* ignore */ }
}

function unlockPropAudio(): void {
  const ctx = getAC();
  if (!ctx) return;

  if (ctx.state === "running") {
    // Context already running — one silent buffer is enough.
    _playSilence(ctx);
    _audioUnlockPromise = Promise.resolve();
  } else {
    // Suspended (older iOS or first gesture): double-unlock pattern.
    // Call both resume() and start() synchronously within the gesture so iOS
    // registers the interaction regardless of which signal it needs.
    _playSilence(ctx);                    // attempt 1 — on suspended ctx (some iOS accept it)
    const p = ctx.resume().then(() => {
      _playSilence(ctx);                  // attempt 2 — after confirmed running
    }).catch(() => undefined);
    _audioUnlockPromise = p.then(() => undefined);
  }
}

// Module-level decoded-audio cache (survives re-renders / remounts)
const _audioCache = new Map<PropType, AudioBuffer>();
// Module-level raw-bytes cache (pre-fetched on mobile mount, freed after decode)
const _rawCache   = new Map<PropType, ArrayBuffer>();

/** Pre-fetch WAV bytes on mobile mount so the first tap only needs decodeAudioData. */
async function prefetchPropAudio(): Promise<void> {
  for (const [propType, url] of Object.entries(PROP_SOUND_URLS) as [PropType, string][]) {
    if (_audioCache.has(propType) || _rawCache.has(propType)) continue;
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) continue;
      _rawCache.set(propType, await res.arrayBuffer());
    } catch { /* non-critical — will fetch on-demand if this fails */ }
  }
}

/**
 * Play a prop sound. Self-contained:
 *  - waits for the AudioContext unlock to complete
 *  - uses pre-fetched raw bytes (_rawCache) on mobile; falls back to fetch
 *  - decoded AudioBuffer is cached forever after first use
 */
async function playPropSound(type: PropType, volume = 0.85): Promise<void> {
  try {
    const ctx = getAC();
    if (!ctx) return;
    if (_audioUnlockPromise) await _audioUnlockPromise;
    if (ctx.state === "suspended") await ctx.resume();

    if (!_audioCache.has(type)) {
      // Fast path: use pre-fetched bytes; slow path: fetch now
      let arr: ArrayBuffer;
      if (_rawCache.has(type)) {
        arr = _rawCache.get(type)!;
        _rawCache.delete(type);           // free after decode
      } else {
        const res = await fetch(PROP_SOUND_URLS[type]);
        if (!res.ok) { console.warn("[sound] fetch failed:", PROP_SOUND_URLS[type], res.status); return; }
        arr = await res.arrayBuffer();
      }
      const buf = await ctx.decodeAudioData(arr);
      _audioCache.set(type, buf);
    }

    const buf = _audioCache.get(type)!;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch (e) {
    console.warn("[sound] error:", type, e);
  }
}

// Append 2-digit hex opacity to a 6-digit hex color: hexOp("#FF0000", 0.15) → "#FF000026"
function hexOp(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MatchFanSection({ matchId, homeTeam, awayTeam, homeColors, awayColors, zh, loggedIn, canPersistProps = true, userVote, showCurrentUserMarker = false, mobileAudioUnlock = false, hideVote = false, initialVotes }: Props) {
  const locale = useLocale();
  const [dots,      setDots]      = useState<VoterDot[]>([]);
  const [totals,    setTotals]    = useState({ home: 0, neutral: 0, away: 0 });
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [fireworks, setFireworks] = useState<FireworkItem[]>([]);
  const [launching, setLaunching] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);
  const [propToast,     setPropToast]     = useState<string | null>(null);
  const [globalEffects, setGlobalEffects] = useState<GlobalEffect[]>([]);
  // Only show the user's marker after the browser returns a real position.
  const [userMapPos,       setUserMapPos]       = useState<{ x: number; y: number } | null>(null);
  const [locationStatus,   setLocationStatus]   = useState<"idle" | "locating" | "ready" | "unavailable">("idle");

  // Per-user state resolved client-side. The desktop match page is statically
  // generated and passes loggedIn=false / userVote=null, so props (fireworks
  // etc.) would stay locked even for a logged-in fan. Recover the real state
  // from the user-state endpoint and prefer it when the props are evaluated.
  const [clientLoggedIn, setClientLoggedIn] = useState(false);
  const [clientVote,     setClientVote]     = useState<"home" | "neutral" | "away" | null>(null);
  const effectiveLoggedIn = loggedIn || clientLoggedIn;
  const effectiveUserVote = userVote ?? clientVote;

  const locationWatchRef = useRef<number | null>(null);
  const currentVoteRef  = useRef<"home" | "neutral" | "away" | null>(null);
  const channelRef    = useRef<RealtimeChannel | null>(null);
  const lastLaunchRef = useRef<number>(0);
  const [channelReady,  setChannelReady]  = useState(false);
  const [cooldownLeft,  setCooldownLeft]  = useState(0);   // seconds remaining
  const [soundOn,       setSoundOn]       = useState(true);
  const soundOnRef    = useRef(true);   // stable ref so the realtime callback reads latest value

  // ── Vote section state ────────────────────────────────────────────────────
  const [voting,   setVoting]   = useState(false);
  const [voteData, setVoteData] = useState(initialVotes ?? { home: 0, neutral: 0, away: 0 });

  const FIREWORK_COOLDOWN = 10; // seconds between launches

  // Inject CSS once
  useEffect(() => { injectFireworkStyles(); }, []);

  // Pre-fetch WAV bytes on mobile mount so first tap only needs decodeAudioData (~50 ms)
  // instead of fetch + decode (potentially 2–5 s on slow connections).
  useEffect(() => {
    if (!mobileAudioUnlock) return;
    void prefetchPropAudio();
  }, [mobileAudioUnlock]);

  const requestUserLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    if (locationWatchRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    setLocationStatus("locating");
    locationWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = coordsToMapPercent(coords.longitude, coords.latitude);
        setUserMapPos(pos);
        setLocationStatus("ready");
      },
      () => {
        if (locationWatchRef.current != null) {
          navigator.geolocation.clearWatch(locationWatchRef.current);
          locationWatchRef.current = null;
        }
        setUserMapPos(null);
        setLocationStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 300_000 },
    );
  }, []);

  // Resolve and keep the user's geographic position updated on mobile only.
  useEffect(() => {
    if (!showCurrentUserMarker) return;
    requestUserLocation();
    return () => {
      if (typeof navigator !== "undefined" && navigator.geolocation && locationWatchRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [requestUserLocation, showCurrentUserMarker]);

  // (Audio is loaded on first play — no preload needed)

  // Keep soundOnRef in sync
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  // Keep currentVoteRef in sync so geolocation callbacks never use a stale vote
  useEffect(() => { currentVoteRef.current = clientVote; }, [clientVote]);

  // Fetch fan votes (extracted so a fresh vote elsewhere can trigger a reload)
  const loadCountryVotes = useCallback(() => {
    fetch(`/api/match-votes-by-country?match_id=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        // ── Precise dots: fans who shared their geolocation ──────────────────
        interface PreciseDotRaw { vote: "home" | "away"; lat: number; lng: number; country_code: string; }
        const preciseDots: VoterDot[] = ((d.dots ?? []) as PreciseDotRaw[]).map((r) => ({
          coords:    [r.lng, r.lat] as [number, number],
          side:      r.vote,
          country:   r.country_code,
          isPrecise: true,
        }));
        // Track how many precise dots exist per country+side (avoid double-counting)
        const preciseByCountry = new Map<string, { home: number; away: number }>();
        for (const dot of preciseDots) {
          const t = preciseByCountry.get(dot.country) ?? { home: 0, away: 0 };
          t[dot.side as "home" | "away"]++;
          preciseByCountry.set(dot.country, t);
        }
        // ── Jittered dots: remaining fans without precise coordinates ─────────
        const jitteredDots: VoterDot[] = [];
        for (const cv of (d.countries ?? []) as CountryVote[]) {
          const centroid = centroidMap.get(cv.country_code);
          if (!centroid) continue;
          const pc = preciseByCountry.get(cv.country_code) ?? { home: 0, away: 0 };
          const homeCap = Math.min(Math.max(0, cv.home - pc.home), MAX_DOTS_PER_COUNTRY);
          const awayCap = Math.min(Math.max(0, cv.away - pc.away), MAX_DOTS_PER_COUNTRY);
          const totalForSpread = cv.home + cv.away;
          for (let i = 0; i < homeCap; i++)
            jitteredDots.push({ coords: jitteredCoords(centroid.lng, centroid.lat, cv.country_code + "H", i, totalForSpread), side: "home",  country: cv.country_code });
          for (let i = 0; i < awayCap; i++)
            jitteredDots.push({ coords: jitteredCoords(centroid.lng, centroid.lat, cv.country_code + "A", i, totalForSpread), side: "away",  country: cv.country_code });
        }
        setDots([...preciseDots, ...jitteredDots]);
        const t = d.totals ?? { home: 0, neutral: 0, away: 0 };
        setTotals(t);
        setVoteData(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  // ── Vote handler — also triggers geolocation prompt on the first team vote ─
  async function handleVote(vote: "home" | "neutral" | "away") {
    if (!effectiveLoggedIn || voting) return;
    setVoting(true);

    const oldVote     = effectiveUserVote;
    const isFirstVote = oldVote === null;

    // Optimistic update
    const newVoteData = { ...voteData };
    if (oldVote && oldVote !== vote && oldVote in newVoteData) {
      newVoteData[oldVote as keyof typeof newVoteData]--;
    }
    if (oldVote !== vote) newVoteData[vote]++;
    setVoteData(newVoteData);
    setClientVote(vote);
    currentVoteRef.current = vote; // sync immediately before async geolocation callback

    try {
      const res = await fetch("/api/match-vote", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, vote }),
      });
      if (!res.ok) {
        // Revert optimistic update
        setVoteData(voteData);
        setClientVote(oldVote);
        currentVoteRef.current = oldVote;
        return;
      }
      // Let the map reload (picked up by the match-vote-changed listener below)
      window.dispatchEvent(new CustomEvent("match-vote-changed", { detail: { matchId, vote } }));

      // On the very first team vote, prompt for precise location once
      if (isFirstVote && vote !== "neutral" &&
          typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            // Use currentVoteRef to avoid overwriting a vote the user just changed.
            // The closure `vote` is stale if the user switched teams before geolocation resolved.
            const liveVote = currentVoteRef.current;
            if (!liveVote || liveVote === "neutral") return;
            await fetch("/api/match-vote", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ match_id: matchId, vote: liveVote, lat: coords.latitude, lng: coords.longitude }),
            });
            loadCountryVotes(); // refresh map to show the precise dot immediately
          },
          () => { /* location denied — vote is already saved without coords */ },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
      }
    } catch {
      setVoteData(voteData);
      setClientVote(oldVote);
      currentVoteRef.current = oldVote;
    } finally {
      setVoting(false);
    }
  }

  useEffect(() => { loadCountryVotes(); }, [loadCountryVotes]);

  // Recover the logged-in user's real state on a statically-generated page.
  useEffect(() => {
    fetch(`/api/matches/${matchId}/user-state`)
      .then((r) => r.json())
      .then((d: { myVote: "home" | "neutral" | "away" | null; userId: string | null }) => {
        if (d.userId) {
          setClientLoggedIn(true);
          setClientVote(d.myVote);
        }
      })
      .catch(() => {});
  }, [matchId]);

  // A vote cast elsewhere on the page (e.g. the MatchHero support bar) is
  // already persisted server-side, so reload the country aggregate to make the
  // new vote appear on the map immediately — no full page reload needed. Also
  // adopt the new vote locally so the props unlock right away.
  useEffect(() => {
    function onVoteChanged(e: Event) {
      const detail = (e as CustomEvent<{ matchId: string | number; vote?: "home" | "neutral" | "away" }>).detail;
      if (detail && String(detail.matchId) === String(matchId)) {
        if (detail.vote) setClientVote(detail.vote);
        loadCountryVotes();
      }
    }
    window.addEventListener("match-vote-changed", onVoteChanged);
    return () => window.removeEventListener("match-vote-changed", onVoteChanged);
  }, [matchId, loadCountryVotes]);

  // Supabase Realtime: receive any prop from others
  const spawnFirework = useCallback((
    payload:   Omit<FireworkItem, "particles">,
    withSound: boolean,
    isSelf:    boolean,
  ) => {
    const type = payload.prop_type ?? "firework";

    if (isSelf) {
      // Own launches → full-globe overlay effect
      const gid   = `ge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const glife =
        type === "firework" ? 5500 :
        type === "goal"     ? 5000 :
        type === "rally"    ? 5500 : 3800;
      setGlobalEffects((prev) => [...prev, { id: gid, type, color: payload.color, username: payload.username }]);
      setTimeout(() => setGlobalEffects((prev) => prev.filter((e) => e.id !== gid)), glife);
      if (withSound) void playPropSound(type);
      return;
    }

    // Others → normal localised effect, no sound
    const fw: FireworkItem = {
      ...payload,
      prop_type: type,
      isSelf:    false,
      particles: buildPropParticles(type, payload.color, false),
    };
    const lifetime =
      type === "boo"   ? 1800 :
      type === "rally" ? 3200 :
      type === "goal"  ? 3000 : 2800;
    setFireworks((prev) => [...prev, fw]);
    setTimeout(() => setFireworks((prev) => prev.filter((f) => f.id !== fw.id)), lifetime);
  }, []);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(FIREWORK_CHANNEL(matchId))
      .on("broadcast", { event: "fw" }, ({ payload }: { payload: Omit<FireworkItem, "particles"> }) => {
        // Others' effects: never play sound, normal size
        spawnFirework(payload, false, false);
      })
      .subscribe((status) => {
        setChannelReady(status === "SUBSCRIBED");
      });
    channelRef.current = ch;
    return () => {
      setChannelReady(false);
      sb.removeChannel(ch);
    };
  }, [matchId, spawnFirework]);

  // ── Launch any prop ─────────────────────────────────────────────────────────
  async function launchFirework(propType: PropType = "firework") {
    if (launching || !effectiveLoggedIn) return;
    // Block neutral or unvoted users
    if (!effectiveUserVote || effectiveUserVote === "neutral") {
      setPropError(lc(locale, "请先选择支持的队伍才能使用道具", "Please support a team first to use props"));
      return;
    }
    const now     = Date.now();
    const elapsed = (now - lastLaunchRef.current) / 1000;
    if (elapsed < FIREWORK_COOLDOWN) {
      setCooldownLeft(Math.ceil(FIREWORK_COOLDOWN - elapsed));
      return;
    }
    // Mobile browsers require an audio source to start inside the user gesture.
    if (mobileAudioUnlock && soundOn) unlockPropAudio();
    else getAC();
    setLaunching(true);
    setPropError(null);
    try {
      if (!canPersistProps) {
        const color = effectiveUserVote === "away" ? awayColors.primary : homeColors.primary;
        const localPayload: Omit<FireworkItem, "particles"> = {
          id: `local-${matchId}-${Date.now()}`,
          country_code: "US",
          lat: 20,
          lng: 10,
          color,
          username: lc(locale, "我", "Me"),
          prop_type: propType,
          isSelf: true,
        };

        lastLaunchRef.current = Date.now();
        setCooldownLeft(FIREWORK_COOLDOWN);
        const tick = setInterval(() => {
          setCooldownLeft((prev) => {
            if (prev <= 1) { clearInterval(tick); return 0; }
            return prev - 1;
          });
        }, 1000);

        spawnFirework(localPayload, soundOn, true);
        const toastMsg = zh
          ? (propType === "firework" ? "礼花升空！" : propType === "goal" ? "进球！" : propType === "rally" ? "加油！" : "嘘声！")
          : (propType === "firework" ? "Fireworks launched!" : propType === "goal" ? "GOAL!" : propType === "rally" ? "Rally!" : "Boo!");
        setPropToast(toastMsg);
        setTimeout(() => setPropToast(null), 2500);
        return;
      }

      const res  = await fetch("/api/match-props/fireworks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, prop_type: propType }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "neutral_vote") {
          setPropError(lc(locale, "请先选择支持的队伍才能使用道具", "Please support a team first to use props"));
        } else if (data.error === "insufficient_gc") {
          setPropError(lc(locale, "GC 余额不足", "Insufficient GoalCoins"));
        } else {
          setPropError(data.message ?? data.error ?? (lc(locale, "操作失败", "Failed")));
        }
        return;
      }
      // Record launch time & start cooldown countdown
      lastLaunchRef.current = Date.now();
      setCooldownLeft(FIREWORK_COOLDOWN);
      const tick = setInterval(() => {
        setCooldownLeft((prev) => {
          if (prev <= 1) { clearInterval(tick); return 0; }
          return prev - 1;
        });
      }, 1000);

      // Show locally with global effect + sound (if not muted)
      spawnFirework(data.payload, soundOn, true);
      // Toast
      const toastMsg = zh
        ? (propType === "firework" ? "🎆 礼花升空！" : propType === "goal" ? "⚽ 进球！" : propType === "rally" ? "💙 加油！" : "😤 嘘——！")
        : (propType === "firework" ? "🎆 Fireworks launched!" : propType === "goal" ? "⚽ GOAL!" : propType === "rally" ? "💙 Rally!" : "😤 Boo!");
      setPropToast(toastMsg);
      setTimeout(() => setPropToast(null), 2500);
      // Broadcast to others (only when channel is confirmed SUBSCRIBED)
      if (channelReady && channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "fw", payload: data.payload });
      }
    } catch {
      setPropError(lc(locale, "网络错误", "Network error"));
    } finally {
      setLaunching(false);
    }
  }

  // ── Tooltip helpers ─────────────────────────────────────────────────────────
  const countryTotals = new Map<string, { home: number; away: number }>();
  for (const d of dots) {
    const t = countryTotals.get(d.country) ?? { home: 0, away: 0 };
    t[d.side]++;
    countryTotals.set(d.country, t);
  }

  const mapTotal     = totals.home + totals.away;
  const countryCount = new Set(dots.map((d) => d.country)).size;
  const voteTotal    = voteData.home + voteData.neutral + voteData.away;
  const votePct      = (n: number) => voteTotal > 0 ? Math.round((n / voteTotal) * 100) : 0;

  function handleDotEnter(e: React.MouseEvent<SVGCircleElement>, dot: VoterDot) {
    const rect = (e.currentTarget.closest("[data-map]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    const ct = countryTotals.get(dot.country) ?? { home: 0, away: 0 };
    const names = A2_NAMES.get(dot.country);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      country: names ? (zh ? names.zh : names.en) : dot.country,
      home: ct.home,
      away: ct.away,
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">
      <div className="px-5 pt-4 pb-5">

        {/* ── Fan Support Vote ──────────────────────────────────────────────── */}
        {!hideVote && <div className="mb-4 pb-4 border-b border-[#1E3A5F]/60">
          <p className="text-xs font-bold text-gray-400 mb-2.5 text-center">
            {zh
              ? `⚡ 你支持谁？${voteTotal > 0 ? ` · ${voteTotal} 人投票` : ""}`
              : `⚡ Who do you support?${voteTotal > 0 ? ` · ${voteTotal} votes` : ""}`}
          </p>
          <div className="flex gap-2">
            {/* Home */}
            <button
              onClick={() => handleVote("home")}
              disabled={!effectiveLoggedIn || voting}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
              style={effectiveUserVote === "home" ? {
                backgroundColor: hexOp(homeColors.primary, 0.15),
                borderColor:     hexOp(homeColors.primary, 0.65),
                color:           homeColors.primary,
              } : { backgroundColor: "#0A1628", borderColor: "#1E3A5F", color: "#9CA3AF" }}
            >
              <div className="flex justify-center mb-0.5">
                <img src={getFlagUrl(homeTeam, 40)} alt={homeTeam} className="w-6 h-4 object-cover rounded-[2px]" />
              </div>
              <div>{zh ? `支持${getTeamDisplayName(homeTeam, "zh")}` : getTeamDisplayName(homeTeam, locale)}</div>
              {voteTotal > 0 && (
                <div className="mt-1">
                  <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${votePct(voteData.home)}%`, backgroundColor: homeColors.primary }} />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">{voteData.home} ({votePct(voteData.home)}%)</span>
                </div>
              )}
            </button>

            {/* Neutral */}
            <button
              onClick={() => handleVote("neutral")}
              disabled={!effectiveLoggedIn || voting}
              className={`flex-[0.7] py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                effectiveUserVote === "neutral"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : "bg-[#0A1628] border-[#1E3A5F] text-gray-400"
              }`}
            >
              <div className="text-base leading-none mb-0.5">🤝</div>
              <div>{lc(locale, "中立", "Neutral")}</div>
              {voteTotal > 0 && (
                <div className="mt-1">
                  <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-3">
                    <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${votePct(voteData.neutral)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">{voteData.neutral} ({votePct(voteData.neutral)}%)</span>
                </div>
              )}
            </button>

            {/* Away */}
            <button
              onClick={() => handleVote("away")}
              disabled={!effectiveLoggedIn || voting}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
              style={effectiveUserVote === "away" ? {
                backgroundColor: hexOp(awayColors.primary, 0.15),
                borderColor:     hexOp(awayColors.primary, 0.65),
                color:           awayColors.primary,
              } : { backgroundColor: "#0A1628", borderColor: "#1E3A5F", color: "#9CA3AF" }}
            >
              <div className="flex justify-center mb-0.5">
                <img src={getFlagUrl(awayTeam, 40)} alt={awayTeam} className="w-6 h-4 object-cover rounded-[2px]" />
              </div>
              <div>{zh ? `支持${getTeamDisplayName(awayTeam, "zh")}` : getTeamDisplayName(awayTeam, locale)}</div>
              {voteTotal > 0 && (
                <div className="mt-1">
                  <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${votePct(voteData.away)}%`, backgroundColor: awayColors.primary }} />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">{voteData.away} ({votePct(voteData.away)}%)</span>
                </div>
              )}
            </button>
          </div>
          {!effectiveLoggedIn && (
            <p className="text-[10px] text-gray-600 text-center mt-1.5">
              {lc(locale, "登录后参与投票", "Login to vote")}
            </p>
          )}
        </div>}

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-200">
            🌍 {lc(locale, "全球球迷支持地图", "Global Fan Support Map")}
          </h3>
          <span className="text-xs text-gray-500">
            {mapTotal > 0
              ? (zh ? `${mapTotal} 人 · ${countryCount} 个国家` : `${mapTotal} fans · ${countryCount} countries`)
              : (lc(locale, "暂无投票", "No votes yet"))}
          </span>
        </div>

        {/* Legend — home left, away right, no counts until there's enough data */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block ring-1"
              style={{
                backgroundColor: homeColors.primary,
                boxShadow: `0 0 0 1.5px ${homeColors.secondary}55`,
              }}
            />
            <span className="text-xs text-gray-400">{zh ? `支持 ${homeTeam}` : homeTeam}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{zh ? `支持 ${awayTeam}` : awayTeam}</span>
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{
                backgroundColor: awayColors.primary,
                boxShadow: `0 0 0 1.5px ${awayColors.secondary}55`,
              }}
            />
          </div>
        </div>

        {showCurrentUserMarker && (userVote === "home" || userVote === "away") && !userMapPos && (
          <button
            type="button"
            onClick={requestUserLocation}
            disabled={locationStatus === "locating"}
            className="mb-3 rounded-md border border-[#FFD700]/35 bg-[#FFD700]/10 px-2 py-1 text-[11px] font-bold text-[#FFD700] disabled:opacity-60"
          >
            {locationStatus === "locating"
              ? (lc(locale, "正在定位…", "Locating…"))
              : (lc(locale, "允许定位后显示我的位置", "Allow location to show my position"))}
          </button>
        )}
        {showCurrentUserMarker && (userVote === "home" || userVote === "away") && userMapPos && (
          <p className="mb-3 text-[11px] font-bold text-emerald-300">
            {lc(locale, "已获取当前位置", "Current location detected")}
          </p>
        )}

        {/* Map */}
        <div
          data-map
          className="relative w-full rounded-xl overflow-hidden"
          style={{ paddingBottom: "50%", background: "#0a1525" }}
          onMouseLeave={() => setTooltip(null)}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-600 text-xs animate-pulse">
                {lc(locale, "地图加载中…", "Loading…")}
              </span>
            </div>
          ) : (
            <div className="absolute inset-0">
              <ComposableMap
                projectionConfig={{ scale: 147, center: [10, 10] }}
                width={800} height={400}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: GeoFeature[] }) =>
                    geographies.map((geo: GeoFeature) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#111d30"
                        stroke="#1a2d4a"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover:   { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {dots.map((dot, i) => {
                  const tc       = dot.side === "home" ? homeColors : awayColors;
                  const twoColor = tc.secondary !== tc.primary;
                  return (
                    <Marker key={i} coordinates={dot.coords}>
                      <g
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => handleDotEnter(e as unknown as React.MouseEvent<SVGCircleElement>, dot)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {/* Outer circle — secondary color ring area */}
                        <circle
                          r={twoColor ? 5.2 : 3.8}
                          fill={twoColor ? tc.secondary : tc.primary}
                          fillOpacity={twoColor ? 0.62 : 0.85}
                        />
                        {/* Inner core — primary color */}
                        {twoColor && (
                          <circle
                            r={3.0}
                            fill={tc.primary}
                            fillOpacity={0.95}
                          />
                        )}
                      </g>
                    </Marker>
                  );
                })}
              </ComposableMap>

              {showCurrentUserMarker && userMapPos && (userVote === "home" || userVote === "away") && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${userMapPos.x}%`, top: `${userMapPos.y}%`, zIndex: 25 }}
                >
                  <span
                    className="absolute -inset-2 rounded-full animate-ping"
                    style={{ backgroundColor: userVote === "home" ? homeColors.primary : awayColors.primary, opacity: 0.42 }}
                  />
                  <span
                    className="relative block h-3 w-3 rounded-full border border-white/80"
                    style={{
                      backgroundColor: userVote === "home" ? homeColors.primary : awayColors.primary,
                      boxShadow: `0 0 12px 4px ${userVote === "home" ? homeColors.primary : awayColors.primary}99`,
                    }}
                  />
                </div>
              )}

              {/* ── Props overlay (fireworks / blaze / rally / boo) ─────────── */}
              {fireworks.map((fw) => {
                const pos   = coordsToMapPercent(fw.lng, fw.lat);
                const type  = fw.prop_type ?? "firework";
                const big   = !!fw.isSelf;

                // Per-type animation name + timing (big vs normal)
                const particleAnim = (i: number) => {
                  if (big) {
                    if (type === "firework") return `gc-fw-particle-big 1.8s ease-out ${0.45 + i * 0.025}s forwards`;
                    if (type === "goal")     return `gc-fw-blaze-big    2.2s ease-out ${i * 0.05}s forwards`;
                    if (type === "rally")    return `gc-fw-heart-big    3.0s ease-out ${i * 0.12}s forwards`;
                    /* boo */                return `gc-fw-boo-big      1.1s ease-out  ${i * 0.02}s forwards`;
                  }
                  if (type === "firework") return `gc-fw-particle 1.3s ease-out ${0.45 + i * 0.025}s forwards`;
                  if (type === "goal")     return `gc-fw-blaze    1.7s ease-out ${i * 0.05}s forwards`;
                  if (type === "rally")    return `gc-fw-heart    2.2s ease-out ${i * 0.12}s forwards`;
                  /* boo */                return `gc-fw-boo      0.85s ease-out ${i * 0.02}s forwards`;
                };

                return (
                  <div
                    key={fw.id}
                    className="pointer-events-none absolute"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: big ? 40 : 30 }}
                  >
                    {/* Username label */}
                    <div style={{
                      position:    "absolute",
                      bottom:      "calc(100% + 4px)",
                      left:        "50%",
                      fontSize:    big ? 13 : 10,
                      fontWeight:  900,
                      color:       fw.color,
                      whiteSpace:  "nowrap",
                      textShadow:  "0 1px 6px rgba(0,0,0,0.95)",
                      animation:   big ? "gc-fw-label-big 3s ease-out forwards" : "gc-fw-label 2.5s ease-out forwards",
                      pointerEvents: "none",
                    }}>
                      {fw.username} {propEmoji(type)}
                    </div>

                    {/* Rocket — firework only */}
                    {type === "firework" && (
                      <div style={{
                        width:        big ? 14 : 8,
                        height:       big ? 14 : 8,
                        borderRadius: "50%",
                        background:   fw.color,
                        boxShadow:    big
                          ? `0 0 16px 5px ${fw.color}cc, 0 0 32px 8px ${fw.color}66`
                          : `0 0 8px 2px ${fw.color}99`,
                        position:     "absolute",
                        left:         0,
                        top:          0,
                        animation:    big ? "gc-fw-rocket-big 0.7s ease-out forwards" : "gc-fw-rocket 0.55s ease-out forwards",
                      }} />
                    )}

                    {/* 💢 Boo emoji pop */}
                    {type === "boo" && (
                      <div style={{
                        position:    "absolute",
                        left:        "50%",
                        top:         0,
                        fontSize:    big ? 32 : 18,
                        animation:   big ? "gc-fw-boo-pop-big 1.4s ease-out forwards" : "gc-fw-boo-pop 1s ease-out forwards",
                        opacity:     0,
                        pointerEvents: "none",
                      }}>💢</div>
                    )}

                    {/* Particles */}
                    {fw.particles.map((p, i) => {
                      const hex = `#${p.r.toString(16).padStart(6, "0")}`;
                      const base: React.CSSProperties = {
                        "--tx":      `${p.tx}px`,
                        "--ty":      `${p.ty}px`,
                        position:   "absolute",
                        left:        0,
                        top:         0,
                        animation:   particleAnim(i),
                        opacity:     0,
                      } as React.CSSProperties;

                      if (p.shape === "heart") {
                        return (
                          <div key={i} style={{ ...base, fontSize: p.size, color: hex, lineHeight: 1 }}>
                            ♥
                          </div>
                        );
                      }
                      return (
                        <div key={i} style={{
                          ...base,
                          width:        p.size,
                          height:       p.size,
                          borderRadius: "50%",
                          background:   hex,
                          boxShadow:    big ? `0 0 6px 2px ${hex}` : `0 0 3px ${hex}`,
                        }} />
                      );
                    })}
                  </div>
                );
              })}

              {/* ── Global effects overlay (own launches — full map) ─────── */}
              {globalEffects.map((ge) => {
                const col = ge.color;
                return (
                  <div key={ge.id} className="pointer-events-none absolute inset-0" style={{ zIndex: 50 }}>

                    {/* Username badge centred at top */}
                    <div style={{
                      position:   "absolute",
                      left:       "50%",
                      top:        "5%",
                      transform:  "translateX(-50%)",
                      fontSize:   14,
                      fontWeight: 900,
                      color:      col,
                      textShadow: "0 1px 8px rgba(0,0,0,0.95)",
                      whiteSpace: "nowrap",
                      animation:  "gc-fw-label-big 4s ease-out forwards",
                      zIndex:     55,
                    }}>
                      {ge.username} {propEmoji(ge.type)}
                    </div>

                    {/* ── 礼花: 100 gold particles shoot from user's location → globe ── */}
                    {ge.type === "firework" && (() => {
                      const ox = 50;   // map centre — particles origin
                      const oy = 50;
                      const fx = userMapPos?.x ?? 50;  // flash at user's geolocation when available
                      const fy = userMapPos?.y ?? 50;
                      return (
                        <>
                          {/* Launch flash at user's location */}
                          <div style={{
                            position:     "absolute",
                            left:         `${fx}%`,
                            top:          `${fy}%`,
                            width:        120,
                            height:       120,
                            marginLeft:   -60,
                            marginTop:    -60,
                            borderRadius: "50%",
                            background:   "radial-gradient(circle, #ffffffcc 0%, #FFD700aa 35%, #FFD70033 65%, transparent 80%)",
                            opacity:      0,
                            animation:    "gc-gfw-flash 1.0s ease-out 0s forwards",
                            zIndex:       54,
                          }} />
                          {/* 130 gold particles (120 long-range + 10 short-range centre fill) */}
                          {FW_SHOOT_PRT.map((p, pi) => {
                            const isClose = pi >= 120;
                            const isWhite = !isClose && pi % 12 === 0;
                            // Short-range: pure bright yellow; long-range: gold / warm white
                            const pc = isClose ? "#FFE500" : (isWhite ? "#fff8c0" : "#FFD700");
                            const s  = p.size;
                            const shadow = isClose
                              ? `0 0 ${Math.round((s + 4) * 0.34)}px ${Math.round((s + 2) * 0.34)}px ${pc}, 0 0 ${Math.round((s * 2 + 4) * 0.34)}px ${Math.round(s * 0.34)}px ${pc}88`
                              : `0 0 ${s + 2}px ${Math.ceil(s / 2)}px ${pc}88`;
                            return (
                              <div key={pi} style={{
                                "--ax": `${p.ax}vw`,
                                "--py": `${p.py}vw`,
                                "--lx": `${p.lx}vw`,
                                "--ly": `${p.ly}vw`,
                                position:     "absolute",
                                left:         `${ox}%`,
                                top:          `${oy}%`,
                                width:        s,
                                height:       s,
                                marginLeft:   -s / 2,
                                marginTop:    -s / 2,
                                borderRadius: "50%",
                                background:   pc,
                                boxShadow:    shadow,
                                opacity:      0,
                                animation:    `gc-fw-shoot ${p.dur}s linear ${p.delay}s forwards`,
                              } as React.CSSProperties} />
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* ── 进球: soccer ball flies across the full map ── */}
                    {ge.type === "goal" && (
                      <>
                        {/* Trail copies — appear behind ball via animation delay */}
                        {[0.35, 0.65, 1.0, 1.45].map((d, ti) => (
                          <div key={ti} style={{
                            position:      "absolute",
                            left:          0,
                            top:           0,
                            fontSize:      `${2.2 - ti * 0.28}rem`,
                            lineHeight:    1,
                            opacity:       0,
                            animation:     `gc-gball-fly 4.5s ease-in-out ${d}s forwards`,
                            filter:        `blur(${ti * 0.7 + 0.4}px)`,
                            pointerEvents: "none",
                          }}>⚽</div>
                        ))}
                        {/* Main ball */}
                        <div style={{
                          position:      "absolute",
                          left:          0,
                          top:           0,
                          fontSize:      "2.8rem",
                          lineHeight:    1,
                          opacity:       0,
                          animation:     "gc-gball-fly 4.5s ease-in-out forwards",
                          filter:        "drop-shadow(0 0 8px #FFD700) drop-shadow(0 0 18px #FF8C00)",
                          zIndex:        2,
                          pointerEvents: "none",
                        }}>⚽</div>
                        {/* Subtle golden radial flash */}
                        <div style={{
                          position:  "absolute",
                          inset:     0,
                          background:"radial-gradient(ellipse at center, #FFD70012 0%, transparent 70%)",
                          animation: "gc-fw-label 3.5s ease-out 0.3s forwards",
                          opacity:   0,
                        }} />
                        {/* Gooooooooooal! text — appears after ball starts flying */}
                        <div style={{
                          position:      "absolute",
                          left:          "50%",
                          top:           "46%",
                          color:         "#FFD700",
                          fontSize:      "clamp(1.4rem, 5.5vw, 2.8rem)",
                          fontWeight:    900,
                          lineHeight:    1,
                          letterSpacing: "0.04em",
                          textShadow:    "0 0 10px #FFD700, 0 0 26px #FF8C00, 0 0 44px #FFD700aa",
                          whiteSpace:    "nowrap",
                          opacity:       0,
                          animation:     "gc-rally-pulse 3.2s ease-out 1.0s forwards",
                          pointerEvents: "none",
                        }}>
                          Gooooooooooal!
                        </div>
                      </>
                    )}

                    {/* ── Rally: local-only stadium wave, rising ribbons and center pulse ── */}
                    {ge.type === "rally" && (
                      <>
                        {[0, 1, 2].map((layer) => (
                          <div key={`left-${layer}`} style={{
                            position:   "absolute",
                            left:       "-42%",
                            top:        `${30 + layer * 13}%`,
                            width:      "78%",
                            height:     `${18 - layer * 2}%`,
                            borderRadius:"0 999px 999px 0",
                            background: `linear-gradient(90deg, transparent, ${layer === 1 ? "#FFD700cc" : `${col}cc`}, transparent)`,
                            filter:     `blur(${layer === 1 ? 0.5 : 1.4}px)`,
                            opacity:    0,
                            animation:  `gc-rally-wave-left ${2.05 + layer * 0.22}s ease-out ${layer * 0.14}s forwards`,
                          }} />
                        ))}
                        {[0, 1, 2].map((layer) => (
                          <div key={`right-${layer}`} style={{
                            position:   "absolute",
                            right:      "-42%",
                            top:        `${30 + layer * 13}%`,
                            width:      "78%",
                            height:     `${18 - layer * 2}%`,
                            borderRadius:"999px 0 0 999px",
                            background: `linear-gradient(270deg, transparent, ${layer === 1 ? "#FFD700cc" : `${col}cc`}, transparent)`,
                            filter:     `blur(${layer === 1 ? 0.5 : 1.4}px)`,
                            opacity:    0,
                            animation:  `gc-rally-wave-right ${2.05 + layer * 0.22}s ease-out ${layer * 0.14}s forwards`,
                          }} />
                        ))}
                        {[0, 0.34, 0.68].map((delay, ri) => (
                          <div key={`ring-${ri}`} style={{
                            position:    "absolute",
                            left:        "50%",
                            top:         "52%",
                            width:       "24%",
                            aspectRatio: "1",
                            borderRadius:"50%",
                            border:      `${ri === 1 ? 3 : 2}px solid ${ri === 1 ? "#FFD700" : col}`,
                            boxShadow:   `0 0 18px ${ri === 1 ? "#FFD700aa" : `${col}aa`}`,
                            opacity:     0,
                            animation:   `gc-rally-ring 1.85s ease-out ${0.45 + delay}s forwards`,
                          }} />
                        ))}
                        <div style={{
                          position:      "absolute",
                          left:          "50%",
                          top:           "52%",
                          color:         "#fff",
                          fontSize:      "clamp(1.2rem, 5vw, 2.35rem)",
                          fontWeight:    900,
                          lineHeight:    1,
                          letterSpacing: "0.08em",
                          textShadow:    `0 0 8px ${col}, 0 0 18px ${col}, 0 0 28px #FFD700`,
                          whiteSpace:    "nowrap",
                          opacity:       0,
                          animation:     "gc-rally-pulse 2.1s ease-out 0.55s forwards",
                        }}>
                          Come On!
                        </div>
                        {RALLY_CONFETTI.map((s, si) => (
                          <div key={`confetti-${si}`} style={{
                            position:     "absolute",
                            left:         `${s.x}%`,
                            bottom:       "-8%",
                            width:        s.w,
                            height:       s.h,
                            background:   si % 3 === 0 ? col : STREAMER_PALETTE[si % STREAMER_PALETTE.length],
                            borderRadius: 2,
                            opacity:      0,
                            boxShadow:    si % 5 === 0 ? "0 0 6px #FFD700aa" : "none",
                            animation:    `${s.anim} ${s.dur}s ease-out ${s.del}s forwards`,
                          }} />
                        ))}
                      </>
                    )}

                    {/* ── 嘘声: 🧻 toilet paper from all edges → center ── */}
                    {ge.type === "boo" && TP_DATA.map((tp, ti) => (
                      <div key={ti} style={{
                        position:      "absolute",
                        left:          tp.x,
                        top:           tp.y,
                        fontSize:      "1.6rem",
                        lineHeight:    1,
                        opacity:       0,
                        animation:     `${tp.anim} ${2.2 + (ti % 3) * 0.2}s ease-in-out ${tp.del}s forwards`,
                        pointerEvents: "none",
                      }}>🧻</div>
                    ))}

                  </div>
                );
              })}

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute pointer-events-none z-20 bg-[#0A1628]/95 border border-[#1E3A5F] text-white text-xs px-3 py-2 rounded-xl shadow-xl whitespace-nowrap"
                  style={{
                    left: `${Math.min(tooltip.x + 10, 62)}%`,
                    top: Math.max(tooltip.y - 48, 4),
                  }}
                >
                  <p className="font-bold mb-1">{tooltip.country}</p>
                  {tooltip.home > 0 && (
                    <p style={{ color: homeColors.primary }}>
                      {zh ? `支持 ${homeTeam}` : homeTeam}: <span className="font-black">{tooltip.home}</span>
                    </p>
                  )}
                  {tooltip.away > 0 && (
                    <p style={{ color: awayColors.primary }}>
                      {zh ? `支持 ${awayTeam}` : awayTeam}: <span className="font-black">{tooltip.away}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Country breakdown */}
        {mapTotal > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wide" style={{ color: homeColors.primary + "99" }}>
                {zh ? `支持 ${homeTeam}` : homeTeam}
              </p>
              {[...countryTotals.entries()]
                .filter(([, t]) => t.home > 0)
                .sort((a, b) => b[1].home - a[1].home)
                .slice(0, 4)
                .map(([code, t]) => {
                  const n = A2_NAMES.get(code);
                  return (
                    <div key={code} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-gray-400">{n ? (zh ? n.zh : n.en) : code}</span>
                      <span className="font-black" style={{ color: homeColors.primary }}>{t.home}</span>
                    </div>
                  );
                })}
            </div>
            <div>
              <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wide" style={{ color: awayColors.primary + "99" }}>
                {zh ? `支持 ${awayTeam}` : awayTeam}
              </p>
              {[...countryTotals.entries()]
                .filter(([, t]) => t.away > 0)
                .sort((a, b) => b[1].away - a[1].away)
                .slice(0, 4)
                .map(([code, t]) => {
                  const n = A2_NAMES.get(code);
                  return (
                    <div key={code} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-gray-400">{n ? (zh ? n.zh : n.en) : code}</span>
                      <span className="font-black" style={{ color: awayColors.primary }}>{t.away}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── 道具 Props bar ──────────────────────────────────────────────────── */}
        <div className="mt-4 pt-3.5 border-t border-[#1E3A5F]/60">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                🎮 {lc(locale, "道具", "Props")}
              </h4>
              {/* Realtime channel indicator */}
              <span
                title={channelReady ? (lc(locale, "实时连接中", "Live connected")) : (lc(locale, "连接中…", "Connecting…"))}
                className={`w-1.5 h-1.5 rounded-full inline-block transition-colors ${
                  channelReady ? "bg-green-500 shadow-[0_0_4px_#22c55e]" : "bg-gray-600"
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              {propToast && (
                <span className="text-[11px] font-black text-green-400 animate-pulse">
                  {propToast}
                </span>
              )}
              {/* Sound toggle */}
              <button
                onClick={() => setSoundOn((v) => !v)}
                title={soundOn ? (lc(locale, "点击静音", "Mute sounds")) : (lc(locale, "点击开声", "Unmute sounds"))}
                className="text-base leading-none text-gray-500 hover:text-gray-300 transition-colors select-none"
              >
                {soundOn ? "🔊" : "🔇"}
              </button>
            </div>
          </div>

          {/* Neutral / unvoted lock notice */}
          {effectiveLoggedIn && (!effectiveUserVote || effectiveUserVote === "neutral") && (
            <div className="mb-2.5 flex items-center gap-2 bg-[#1A2D4A] border border-[#FFD700]/20 rounded-xl px-3 py-2">
              <span className="text-sm shrink-0">⚠️</span>
              <p className="text-[11px] text-[#FFD700]/80 leading-snug">
                {lc(locale, "道具仅限支持某一方的球迷使用，请先在上方选择支持队伍", "Props are for fans who support a team. Please vote for a side above.")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { type: "firework" as PropType, emoji: "🎆", zh: "礼花",   en: "Firework" },
                { type: "goal"     as PropType, emoji: "⚽", zh: "进球",   en: "Goal"     },
                { type: "rally"    as PropType, emoji: "💙", zh: "加油",   en: "Rally"    },
                { type: "boo"      as PropType, emoji: "😤", zh: "嘘声",   en: "Boo"      },
              ] as { type: PropType; emoji: string; zh: string; en: string }[]
            ).map((prop) => {
              const hasSide  = effectiveLoggedIn && (effectiveUserVote === "home" || effectiveUserVote === "away");
              const canUse   = hasSide && !launching && cooldownLeft === 0;
              const isBoo    = prop.type === "boo";
              const borderOn = isBoo ? "border-red-500/50 hover:border-red-500 hover:bg-red-500/10"
                                     : "border-[#FFD700]/50 hover:border-[#FFD700] hover:bg-[#FFD700]/10";
              const disabledTitle = !effectiveLoggedIn
                ? (lc(locale, "登录后使用", "Login to use"))
                : (!effectiveUserVote || effectiveUserVote === "neutral")
                  ? (lc(locale, "请先选择支持队伍", "Support a team first"))
                  : undefined;
              return (
                <button
                  key={prop.type}
                  onClick={() => launchFirework(prop.type)}
                  disabled={!canUse}
                  title={disabledTitle}
                  className={`
                    relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border-2 transition-all select-none
                    ${canUse ? `${borderOn} active:scale-95 cursor-pointer` : "border-[#1E3A5F] opacity-40 cursor-not-allowed"}
                  `}
                >
                  {launching ? (
                    <span className="text-2xl animate-spin">✨</span>
                  ) : cooldownLeft > 0 ? (
                    <span className="text-xl leading-none font-black text-gray-500">{cooldownLeft}</span>
                  ) : (
                    <span className="text-2xl">{prop.emoji}</span>
                  )}
                  <span className="text-[11px] font-bold text-gray-300">{zh ? prop.zh : prop.en}</span>
                  <span className={`text-[9px] font-bold ${isBoo ? "text-red-400/70" : "text-[#FFD700]/60"}`}>
                    {PROP_COSTS[prop.type]} GC
                  </span>
                </button>
              );
            })}
          </div>

          {propError && (
            <p className="text-[11px] text-red-400 mt-2 font-bold">{propError}</p>
          )}

          {!effectiveLoggedIn && (
            <p className="text-[10px] text-gray-600 mt-2">
              {lc(locale, "登录后可使用道具", "Login to use props")}
            </p>
          )}
        </div>

        {/* ── Embed & Share ─────────────────────────────────────────────────── */}
        <div className="mt-4 pt-3.5 border-t border-[#1E3A5F]/60">
          <div className="mb-2.5">
            <h4 className="text-sm font-bold text-gray-200">
              🔗 {lc(locale, "嵌入球迷地图 · 赚 GoalCoin", "Embed Fan Map · Earn GoalCoin")}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {lc(locale, "分享嵌入代码，让你的粉丝在任何平台看到实时球迷地图", "Share the embed code so fans can view this live map on any platform")}
            </p>
          </div>
          {/* Embed code preview */}
          <div className="mb-3 rounded-lg bg-[#080F1F] border border-[#1E3A5F]/80 px-3 py-2 font-mono text-[10px] text-[#7DD3FC] leading-relaxed select-all break-all">
            {`<iframe src="https://www.football2026.net/embed/fan-map/${matchId}" width="100%" height="500" frameborder="0" allowtransparency="true"></iframe>`}
          </div>
          <ShareButtons
            title={`${getTeamDisplayName(homeTeam, "en")} vs ${getTeamDisplayName(awayTeam, "en")}`}
            locale={locale}
            zh={zh}
            username={null}
            embedCode={`<iframe src="https://www.football2026.net/embed/fan-map/${matchId}" width="100%" height="500" frameborder="0" allowtransparency="true"></iframe>`}
          />
        </div>

      </div>
    </div>
  );
}
