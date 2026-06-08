/**
 * Human-readable labels for `gc_transactions.type` values.
 *
 * Centralised here so the profile overview, the full transaction history page,
 * and the admin finance view all stay in sync.
 */
export type GcTransactionType =
  | "topup"
  | "daily_checkin"
  | "welcome_bonus"
  | "bet_placed"
  | "bet_won"
  | "bet_refunded"
  | "share_reward"
  | "forum_post"
  | "forum_like"
  | "admin_award"
  | "admin_deduct"
  | "transfer_sent"
  | "transfer_received"
  | "profile_reward";

const LABELS_ZH: Record<string, string> = {
  topup:             "充值",
  daily_checkin:     "每日签到",
  welcome_bonus:     "新人奖励",
  bet_placed:        "预测消耗",
  bet_won:           "预测奖励",
  bet_refunded:      "预测退还",
  share_reward:      "分享奖励",
  forum_post:        "发帖奖励",
  forum_like:        "点赞奖励",
  admin_award:       "管理员奖励",
  admin_deduct:      "管理员扣除",
  transfer_sent:     "转出 GC",
  transfer_received: "收到 GC",
  profile_reward:    "资料奖励",
};

const LABELS_EN: Record<string, string> = {
  topup:             "Top Up",
  daily_checkin:     "Daily Check-in",
  welcome_bonus:     "Welcome Bonus",
  bet_placed:        "Prediction",
  bet_won:           "Prediction Reward",
  bet_refunded:      "Prediction Refund",
  share_reward:      "Share Reward",
  forum_post:        "Forum Post",
  forum_like:        "Forum Like",
  admin_award:       "Admin Award",
  admin_deduct:      "Admin Deduct",
  transfer_sent:     "GC Sent",
  transfer_received: "GC Received",
  profile_reward:    "Profile Reward",
};

const LABELS_ES: Record<string, string> = {
  topup:             "Recarga",
  daily_checkin:     "Registro diario",
  welcome_bonus:     "Bono de bienvenida",
  bet_placed:        "Predicción",
  bet_won:           "Recompensa de predicción",
  bet_refunded:      "Reembolso de predicción",
  share_reward:      "Recompensa por compartir",
  forum_post:        "Publicación del foro",
  forum_like:        "Me gusta del foro",
  admin_award:       "Bonificación de administrador",
  admin_deduct:      "Deducción de administrador",
  transfer_sent:     "GC enviados",
  transfer_received: "GC recibidos",
  profile_reward:    "Recompensa de perfil",
};

/**
 * Returns the localized label for a transaction type, falling back to the raw
 * type string for any unmapped value.
 */
export function gcTransactionLabel(type: string, locale: string): string {
  const labels = locale === "zh" ? LABELS_ZH : locale === "es" ? LABELS_ES : LABELS_EN;
  return labels[type] ?? type;
}
