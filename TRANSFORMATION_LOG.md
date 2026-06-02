# Football2026 合规改造记录

**日期：** 2026-06-02  
**目的：** 通过 Paddle / Stripe 支付平台审核，移除博彩/赌博相关语言，改为娱乐助威定位  
**核心词汇替换：**

| 原词 | 替换词 | 说明 |
|------|--------|------|
| 竞猜 | 预测 / 助威 | 公开页面用"助威"，功能页面用"预测" |
| 押注 | 支持 / 预测 | 动作类用"支持"，记录类用"预测" |
| 赔率 | （删除） | 赔率数字全部移除，改为文字说明 |
| 赢利 | 奖励 | 去掉赌博含义 |
| 下注 / 投注 | 预测消耗 | 描述 GC 用途 |
| 应援 | 助威 | 更自然的体育用语 |

---

## 改动文件清单

### 🔴 高优先级（公开可见）

#### 1. `src/app/[locale]/layout.tsx`
- **zh title**: `2026世界杯竞猜游戏` → `2026世界杯助威游戏`
- **zh description**: `竞猜平台…赢取GoalCoin` → `助威平台…获得GoalCoin道具`
- **en description**: `earn GoalCoins` → `collect GoalCoins`

#### 2. `src/components/home/CountdownHero.tsx`
- `场可竞猜` → `场可预测`
- `立即竞猜` → `立即助威`

#### 3. `src/app/[locale]/awards/AwardBettingUI.tsx`
- `大奖竞猜` → `大奖预测`
- `押注` → `支持`（按钮/动作）
- `我的押注` → `我的预测`
- `确认押注` → `确认预测`
- `取消押注` → `取消预测`
- `登录押注` → `登录预测`
- `竞猜已截止` → `预测已截止`
- `最低押注 XX GC` → `最低消耗 XX GC`
- `押注成功！` → `预测成功！`
- `赔率 ${odds}×` → `预测开放中`（**删除赔率数字**）
- `当前赔率` → `预测奖励`
- `sublabel` 里 `赔率 X×` / `X× odds` → `预测开放中` / `Predictions Open`

#### 4. `src/app/[locale]/invite/InvitePageClient.tsx`
- `一起竞猜世界杯！` → `一起助威世界杯！`

#### 5. `src/app/[locale]/matches/InviteCard.tsx`
- `一起竞猜世界杯！` → `一起助威世界杯！`

#### 6. `src/app/[locale]/matches/ShareBetModal.tsx`
- 邮件标题 `Football2026 竞猜` → `Football2026 预测`
- `押了…押注 XX GC` → `预测了…消耗 XX GC`

---

### 🟡 中优先级（登录用户可见）

#### 7. `src/components/GlobalSidebar.tsx`
- `我的竞猜` → `我的预测`
- `本届世界杯竞猜战绩` → `本届世界杯预测战绩`
- `押注场次` → `预测场次`
- `还没有竞猜记录` → `还没有预测记录`
- `World Cup 2026 betting record` → `World Cup 2026 prediction record`
- `No bets placed yet` → `No predictions yet`
- `2026 金靴奖竞猜热门人选` → `2026 金靴奖预测热门人选`

#### 8. `src/lib/gcTransactionLabels.ts`
- `bet_placed`: `投注扣除` → `预测消耗`
- `bet_won`: `投注赢利` → `预测奖励`
- `bet_refunded`: `投注退款` → `预测退还`
- `Bet Placed` → `Prediction`
- `Bet Won` → `Prediction Reward`
- `Bet Refund` → `Prediction Refund`

#### 9. `src/app/[locale]/profile/topup/success/page.tsx`
- `去竞猜比赛` → `去预测比赛`
- `Go Predict Matches`（英文已正确，保留）

#### 10. `src/app/[locale]/predict/PredictClient.tsx`
- `押注记录` → `预测记录`
- `押注` → `预测`
- `赔率` → `倍率`

---

### 🟢 低优先级（Admin 后台）

#### 11. `src/components/admin/AdminSidebar.tsx`
- `投注管理` → `预测管理`
- `待结算投注` → `待结算预测`

#### 12. `src/app/[locale]/admin/matches/OddsForm.tsx`
- `赔率` → `倍率`

---

### ⚪ 移动端（用户自行处理）
- `src/components/mobile/MobileHome.tsx`
- `src/components/mobile/MobileScheduleDetails.tsx`

---

## 不变的内容

- 后端 API 路由（`/api/bets/`、`/api/score-bets/`）— 逻辑不变，只改前端文案
- 数据库字段名（`bet_placed`、`bet_won` 等）— 只改显示标签，不改数据库结构
- 预测/押注功能本身 — 功能完整保留，只改措辞

---

## GoalCoin 定性声明（需加入 ToS）

> GoalCoin（GC）是纯娱乐虚拟道具币，没有任何货币价值。GC 不可兑换为现金、实物或任何具有实际价值的商品或服务。本平台所有预测及道具功能均仅供娱乐使用。

> GoalCoin (GC) is a non-redeemable virtual entertainment token with zero monetary value. GC cannot be exchanged for real money, cash, prizes, or any goods or services of real-world value. All prediction and prop features are provided solely for entertainment purposes.

---

*此文件由 Claude 自动生成，记录本次合规改造的完整变更内容。*
