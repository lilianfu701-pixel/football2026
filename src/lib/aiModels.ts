/** Shared config for all AI-model prediction features */

export interface AiPrediction {
  home: number;
  away: number;
}

export type AiPredictions = Partial<Record<AiModelKey, AiPrediction>>;

export type AiModelKey = "chatgpt" | "claude" | "gemini" | "deepseek" | "qwen";

export interface AiModelDef {
  key:   AiModelKey;
  name:  string;
  color: string;   // accent colour for this model
  bg:    string;   // subtle background tint
  logo:  string;   // emoji fallback — swap for <Image> if you have SVG assets
}

export const AI_MODELS: AiModelDef[] = [
  { key: "chatgpt",  name: "ChatGPT",  color: "#10A37F", bg: "#10A37F14", logo: "🤖" },
  { key: "claude",   name: "Claude",   color: "#CC785C", bg: "#CC785C14", logo: "🧠" },
  { key: "gemini",   name: "Gemini",   color: "#4285F4", bg: "#4285F414", logo: "✨" },
  { key: "deepseek", name: "DeepSeek", color: "#4D6BFE", bg: "#4D6BFE14", logo: "🔍" },
  { key: "qwen",     name: "Qwen",     color: "#FF6A00", bg: "#FF6A0014", logo: "🌟" },
];
