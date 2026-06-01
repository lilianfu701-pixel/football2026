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
  bet_placed:        "投注扣除",
  bet_won:           "投注赢利",
  bet_refunded:      "投注退款",
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
  bet_placed:        "Bet Placed",
  bet_won:           "Bet Won",
  bet_refunded:      "Bet Refund",
  share_reward:      "Share Reward",
  forum_post:        "Forum Post",
  forum_like:        "Forum Like",
  admin_award:       "Admin Award",
  admin_deduct:      "Admin Deduct",
  transfer_sent:     "GC Sent",
  transfer_received: "GC Received",
  profile_reward:    "Profile Reward",
};

/**
 * Returns the localized label for a transaction type, falling back to the raw
 * type string for any unmapped value.
 */
export function gcTransactionLabel(type: string, zh: boolean): string {
  const labels = zh ? LABELS_ZH : LABELS_EN;
  return labels[type] ?? type;
}
