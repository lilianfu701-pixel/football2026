/**
 * Profile-completion reward configuration.
 * Each field the user fills earns GC — once per field, tracked in `users.profile_rewards`.
 */

export interface RewardField {
  key:       string;
  labelEn:   string;
  labelZh:   string;
  gc:        number;
  /** Return true when the field is considered "filled". */
  isFilled:  (profile: Record<string, unknown>) => boolean;
}

export const PROFILE_REWARDS: RewardField[] = [
  {
    key: "avatar",    labelEn: "Avatar",         labelZh: "头像",
    gc: 500,
    isFilled: (p) => typeof p.avatar_url === "string" && (p.avatar_url as string).length > 0,
  },
  {
    key: "country",   labelEn: "Country",        labelZh: "国家/地区",
    gc: 200,
    isFilled: (p) => typeof p.country_code === "string" && (p.country_code as string).length >= 2,
  },
  {
    key: "bio",       labelEn: "Bio",            labelZh: "自我介绍",
    gc: 300,
    isFilled: (p) => typeof p.bio === "string" && (p.bio as string).trim().length >= 20,
  },
  {
    key: "favorite_team", labelEn: "Favorite Team", labelZh: "支持球队",
    gc: 500,
    isFilled: (p) => typeof p.favorite_team === "string" && (p.favorite_team as string).trim().length > 0,
  },
  {
    key: "slogan",    labelEn: "Slogan",         labelZh: "格言",
    gc: 200,
    isFilled: (p) => typeof p.slogan === "string" && (p.slogan as string).trim().length >= 10,
  },
  {
    key: "gender",    labelEn: "Gender",          labelZh: "性别",
    gc: 100,
    isFilled: (p) => typeof p.gender === "string" && ["male", "female", "other"].includes(p.gender as string),
  },
  {
    key: "birthday",  labelEn: "Birthday",        labelZh: "生日",
    gc: 200,
    isFilled: (p) => !!p.birthday,
  },
  {
    key: "social_x",  labelEn: "Twitter / X",     labelZh: "Twitter / X",
    gc: 300,
    isFilled: (p) => typeof p.social_x === "string" && (p.social_x as string).trim().length > 0,
  },
  {
    key: "social_telegram", labelEn: "Telegram",  labelZh: "Telegram",
    gc: 300,
    isFilled: (p) => typeof p.social_telegram === "string" && (p.social_telegram as string).trim().length > 0,
  },
];

/** Bonus GC when ALL 9 fields are filled. */
export const ALL_COMPLETE_BONUS = 1_000;

/** Sum of per-field rewards + bonus. */
export const MAX_TOTAL_REWARD =
  PROFILE_REWARDS.reduce((s, f) => s + f.gc, 0) + ALL_COMPLETE_BONUS;   // 3,600

/**
 * Compute which fields are newly filled (not yet rewarded) and how much GC to award.
 * Returns the list of newly-completed field keys and the total GC to add.
 */
export function computeNewRewards(
  profile: Record<string, unknown>,
  alreadyRewarded: Record<string, boolean>,
): { newKeys: string[]; gcTotal: number } {
  const newKeys: string[] = [];
  let gcTotal = 0;

  for (const field of PROFILE_REWARDS) {
    if (alreadyRewarded[field.key]) continue;          // already rewarded
    if (!field.isFilled(profile)) continue;             // not yet filled
    newKeys.push(field.key);
    gcTotal += field.gc;
  }

  // All-complete milestone bonus
  const allDone = PROFILE_REWARDS.every(
    (f) => alreadyRewarded[f.key] || newKeys.includes(f.key),
  );
  if (allDone && !alreadyRewarded["__all_complete"]) {
    newKeys.push("__all_complete");
    gcTotal += ALL_COMPLETE_BONUS;
  }

  return { newKeys, gcTotal };
}
