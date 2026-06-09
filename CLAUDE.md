# Football2026 — CLAUDE.md

> 项目说明文档，供 Claude Code 或新接手的开发者快速上手。
> 最后更新：2026-06-08（葡萄牙语本地化完成）
>
> **维护约定**：用户说"更新md" → Claude 更新此文件并 `git push origin main`。

---

## 一、技术栈

| 层 | 技术 |
|---|---|
| 框架 | **Next.js 16.2.6** (App Router, `src/proxy.ts` 替代 `middleware.ts`) |
| UI 库 | **React 19**, **Tailwind CSS 4** |
| 语言 | **TypeScript 5** |
| 后端/数据库 | **Supabase** (PostgreSQL + Auth + Storage) |
| 国际化 | **next-intl 4.12** — 12 个 locale |
| 富文本编辑器 | **Tiptap 3** |
| 图表 | **Recharts 3** |
| 地图 | **react-simple-maps 3**, world-atlas |
| 支付 | **Paddle** (主要), PayPal, Stripe, NowPayments (USDT), Xunhupay |
| 邮件 | **Resend** |
| 部署 | **Vercel** (push to `main` 自动部署，无传统服务器) |
| 包管理 | **pnpm** |
| 字体 | Geist (Google Fonts) |

---

## 二、目录结构

```
goalcoin2026/
├── src/
│   ├── proxy.ts                # ⚠️ Next.js 16 中间件（替代 middleware.ts）
│   │                           #    处理：mobile UA 重定向、OAuth 容错、Supabase session 刷新、intl 路由
│   ├── app/
│   │   ├── layout.tsx          # 根布局（仅 html/body 壳）
│   │   ├── page.tsx            # 根重定向（→ /[locale]）
│   │   ├── globals.css
│   │   ├── [locale]/           # 所有带 locale 前缀的桌面页面
│   │   │   ├── layout.tsx      # locale 布局：Navbar + Sidebar + Footer + GcBalanceProvider
│   │   │   ├── page.tsx        # 首页（比赛列表 + 球迷地图）
│   │   │   ├── auth/           # 桌面端登录/注册/忘记密码
│   │   │   │   ├── actions.ts  # Server Actions: signIn/signUp/signOut/signInWithGoogle/Facebook
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── forgot-password/page.tsx
│   │   │   ├── matches/        # 赛事列表 + [id] 比赛详情
│   │   │   ├── predict/        # 预测中心
│   │   │   ├── leaderboard/    # 排行榜
│   │   │   ├── forum/          # 社区论坛（含 auto-translate 功能）
│   │   │   ├── profile/        # 个人主页 + settings + topup + transactions + [userId]
│   │   │   ├── missions/       # 任务中心
│   │   │   ├── rewards/        # 奖励兑换
│   │   │   ├── invite/         # 邀请好友（referral）
│   │   │   ├── feed/           # 社交动态
│   │   │   ├── messages/       # 私信
│   │   │   ├── notifications/  # 通知
│   │   │   ├── players/        # 球员资料（308 名球员）
│   │   │   ├── teams/          # 球队资料
│   │   │   ├── schedule/       # 赛程
│   │   │   ├── awards/         # 颁奖预测（金球奖等）
│   │   │   ├── admin/          # 管理后台（is_admin 限制）
│   │   │   │   ├── users/      # 用户管理 + 内联 GC 工具
│   │   │   │   ├── matches/    # 比分录入 + 赔率 + AI 预测
│   │   │   │   ├── bets/       # 投注管理
│   │   │   │   ├── finance/    # 充值审核
│   │   │   │   ├── forum/      # 帖子管理
│   │   │   │   ├── players/    # 球员管理
│   │   │   │   └── reports/    # 举报处理
│   │   │   └── m/              # ⚠️ 移动端 PWA（用户自己维护，不要碰）
│   │   │       ├── page.tsx    # 移动端首页（MobileHome）
│   │   │       ├── login/      # 移动端独立登录
│   │   │       └── register/   # 移动端独立注册
│   │   ├── auth/
│   │   │   └── callback/       # OAuth 回调（重要！被 proxy matcher 排除在外）
│   │   └── api/
│   │       ├── navbar/         # GET — 为静态/ISR 页补充 auth 状态
│   │       ├── topup/          # 充值入口（checkout + paddle/paypal/usdt/xunhupay/verify）
│   │       ├── webhooks/       # 支付回调（nowpayments/paddle/stripe/xunhupay）
│   │       ├── cron/sync-scores  # 每日 00:00 UTC 同步比分
│   │       ├── match-vote/     # 投票 API
│   │       ├── bets/, score-bets/  # 竞猜 API
│   │       ├── forum/          # 论坛 CRUD + auto-translate
│   │       ├── gc-balance/     # GC 余额查询
│   │       ├── og/             # OG 图片动态生成
│   │       ├── mobile/         # ⚠️ 移动端专用 API（用户维护）
│   │       └── ...
│   ├── components/
│   │   ├── Navbar.tsx          # 顶部导航（客户端组件，静态页靠 /api/navbar 补充 auth）
│   │   ├── GlobalSidebar.tsx   # 左侧边栏（签到、GC 余额、快速入口等）
│   │   ├── SidebarLayout.tsx   # 桌面布局：内容 + 侧边栏
│   │   ├── SiteFooter.tsx      # 底部版权
│   │   ├── ProfileCompletion.tsx  # 资料完善度组件
│   │   ├── DailyCheckin.tsx    # 每日签到
│   │   ├── NotificationBell.tsx
│   │   ├── UserFollowButton.tsx
│   │   ├── SidebarGcBalance.tsx
│   │   ├── mobile/             # ⚠️⚠️ 移动端组件（用户自维护，绝对不要修改）
│   │   │   ├── MobileHome.tsx
│   │   │   ├── MobileInstallPrompt.tsx
│   │   │   ├── MobilePwaRegister.tsx
│   │   │   ├── MobileScheduleDetails.tsx
│   │   │   ├── mobileAuth.ts   # 包含 MOBILE_OAUTH_NEXT_COOKIE 常量（proxy.ts 内联同名常量）
│   │   │   └── ...
│   │   ├── profile/, matches/, forum/, admin/, home/, players/, layout/, ui/
│   ├── i18n/
│   │   ├── routing.ts          # 12 个 locale，localeDetection: false，as-needed 前缀
│   │   ├── request.ts          # next-intl getRequestConfig
│   │   ├── navigation.ts       # 类型化 Link/useRouter
│   │   ├── content.ts          # lc(locale, zh, en) — 双语内联 + JSON 字典翻译
│   │   └── content/
│   │       ├── es.json         # 西班牙语翻译字典（key = 英文字符串）
│   │       ├── fr.json         # 法语
│   │       └── de.json         # 德语
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # createBrowserClient（共享 .football2026.net domain cookie）
│   │   │   ├── server.ts       # createServerClient（cookies() + shared options）
│   │   │   └── cookieOptions.ts  # 生产环境 domain=.football2026.net
│   │   ├── levels.ts           # 财富等级（0 Beggar → 11+ 高等级）
│   │   ├── profileRewards.ts   # 资料完善奖励配置（9 字段 + 全完奖励，最高 36,000 GC）
│   │   ├── inviteMilestones.ts # 邀请里程碑（1/3/10/25/50 人，每人 50万 GC）
│   │   ├── forumRewards.ts     # 论坛发帖/点赞奖励
│   │   ├── paddle.ts, paypal.ts, stripe.ts, nowpayments.ts, tron.ts, xunhupay.ts
│   │   ├── email/              # Resend 邮件模板（欢迎 / GC 发放 / 预测获奖）
│   │   └── utils.ts, countries.ts, teamColors.ts, scoreOdds.ts, groupStandings.ts ...
│   └── context/
│       └── GcBalance.tsx       # 全局 GC 余额 Context（客户端，供 Navbar 实时更新）
├── messages/
│   ├── en.json                 # next-intl 英文消息（nav/auth/等 key）
│   └── zh.json                 # 中文消息
├── supabase/
│   └── migrations/             # SQL 迁移文件（当前 049 个，001–049）
├── scripts/                    # 一次性工具脚本（migrate.mjs, sync-scores.mjs 等）
├── public/
│   ├── icons/levels/           # 等级徽章图片 + favicon + logo
│   ├── mobile-install/         # PWA 安装引导图片
│   └── sw.js                   # Service Worker（移动端 PWA）
├── next.config.ts              # withNextIntl 包装，remotePatterns 图片白名单
├── vercel.json                 # Cron: sync-scores 每日 00:00 UTC
└── tsconfig.json
```

---

## 三、常用命令

```bash
# 本地开发
pnpm dev               # 启动 http://localhost:3000

# 构建 / 生产
pnpm build             # 生产构建（验证类型 + 静态生成）
pnpm start             # 本地运行生产包

# 数据库迁移（需要 SUPABASE_SERVICE_ROLE_KEY 环境变量）
pnpm migrate           # 运行 scripts/migrate.mjs

# 类型检查
npx tsc --noEmit       # 全量类型检查（无副作用）

# 部署（唯一正确方式）
git add <files>
git commit -m "feat/fix: ..."
git push origin main   # Vercel 自动构建 + 部署，1–3 分钟上线

# 更新此文档（用户说"更新md"时执行）
# → Claude 更新 CLAUDE.md → git add CLAUDE.md → git commit → git push
```

> ⚠️ **没有传统服务器**，不要 `ssh` 或 `pm2`。改代码 → commit → `git push` → Vercel 自动部署。

---

## 四、域名 & 路由架构

| 域名 | 用途 |
|---|---|
| `football2026.net` / `www.football2026.net` | 桌面端主站 |
| `m.football2026.net` | 移动端 PWA（同一 Next.js 应用，通过 proxy rewrite 到 `/[locale]/m`） |

**路由前缀规则**（`localePrefix: { mode: "as-needed" }`）：
- 英文（默认语言）：`/`、`/matches`（**无前缀**）
- 其他语言：`/zh/`、`/es/`、`/fr/`、`/de/`、`/pt/`、`/ru/`、`/ar/`、`/ja/`、`/ko/`、`/vi/`、`/id/`

**`localeDetection: false`**：locale 完全由 URL 决定，不读浏览器 `Accept-Language`。访问 `/` 的中文浏览器也获得英文页面。

**移动端跳转**（`src/proxy.ts` 中 `getDeviceResponse`）：
- 检测到 Mobile UA → 302 redirect 到 `m.football2026.net/[locale]/m`
- 在任意 URL 加 `?desktop=1` → 写入 `site_view=desktop` cookie → 此后该浏览器不再强制跳移动端

**proxy.ts 中间件处理顺序**：
1. `getDesktopOverrideResponse` — `?desktop=1` 设 cookie 并 redirect 去掉参数
2. `getMobileOAuthCodeResponse` — 移动端 OAuth `?code=` 转发到移动 callback
   - **⚠️ 只在移动端信号时触发**：host=`m.football2026.net` 或带 `football2026_mobile_oauth_next` cookie
   - 无移动信号时（桌面 OAuth）直接 return null，交给步骤 3 处理
3. `getDesktopOAuthCodeResponse` — 桌面端 `?code=` 落在首页时容错转发到 `/auth/callback`
4. Supabase session 刷新
5. `getDeviceResponse` — Mobile UA redirect
6. `intlMiddleware` — next-intl 路由处理

---

## 五、国际化 (i18n)

### 双重翻译系统

**系统 1 — next-intl**（`messages/*.json`）：用于通过 `useTranslations(namespace)` 调用的字符串（nav、auth 等命名空间）。目前只有 `en.json` + `zh.json`，其他语言降级英文。

**系统 2 — `lc()` 函数**（`src/i18n/content.ts`）：用于代码中内联双语字符串：
```typescript
import { lc } from "@/i18n/content";

lc(locale, "中文原文", "English string")
// locale="zh" → "中文原文"
// locale="en" → "English string"
// locale="es" → content/es.json["English string"] 或降级 "English string"
```
`content/<locale>.json` 以**英文字符串**作为 key，对应语言译文作为 value。

### 当前翻译完成度

| 语言 | 完成度 | 备注 |
|---|---|---|
| zh 中文 | ✅ 完整 | 原始语言 |
| en 英文 | ✅ 完整 | 默认语言 |
| es 西班牙语 | ~80% | `content/es.json` 覆盖主要 UI |
| fr 法语 | ~80% | `content/fr.json` 覆盖主要 UI |
| de 德语 | ✅ 完整 | `content/de.json` + `messages/de.json` 全覆盖，国家名 Intl.DisplayNames |
| pt 葡萄牙语 | ✅ 完整 | `content/pt.json` + `messages/pt.json` 全覆盖，巴西葡语，国家名 Intl.DisplayNames |
| ru/ar/ja/ko/vi/id | 降级英文 | `content/<locale>.json` 尚未创建 |

**添加新语言**：创建 `src/i18n/content/<locale>.json`（key = 英文原文，value = 译文；在 `content.ts` 的 `DICTS` 中注册）+ `messages/<locale>.json`（next-intl nav/auth/hero 字符串）。同时在 `profile/page.tsx` 的财富等级进度字符串和荣誉等级字符串中添加对应 locale 的本地化文案，并在日期格式化函数中补充 `toLocaleDateString` 的 locale 映射。

**国家名本地化**：`src/lib/countries.ts` 提供 `toIntlLocale(locale)` 和 `getLocalizedCountryName(code, locale)` 工具函数，通过 `Intl.DisplayNames` 返回本地化国家名（已覆盖 de/fr/es/zh 等所有 12 个 locale）。注册页和设置页的国家下拉列表会自动显示目标语言的国家名。

**⚠️ 修改英文文案时**：同步更新 `content/es.json`、`fr.json`、`de.json` 中对应的 key（key 是英文字符串本身）。

---

## 六、认证架构

```
[桌面端] /[locale]/auth/login  →  Server Action signIn()  →  window.location.href (整页跳转)
[桌面端] Google/Facebook OAuth →  /auth/callback?locale=&next=/  →  /${locale}
[移动端] /[locale]/m/login      →  独立 actions.ts（用户维护）
[移动端] OAuth                  →  /auth/callback?mobile=1&...  →  m.football2026.net
```

**Cookie 共享**：`domain=.football2026.net`，主站与 `m` 子域共享同一 session。

**⚠️ Supabase 后台必须配置**（Redirect URLs 白名单）：
- `https://www.football2026.net/auth/callback`
- `https://m.football2026.net/auth/callback`

（未配置时 Supabase 降级到 Site URL `/`，`?code=` 落在首页，proxy 有容错转发但应治本。）

**登录/退出后 header 刷新规则**：
- 登录成功 → `window.location.href`（整页跳转），**不能** 用 `router.push`（软导航导致 Navbar 不刷新）
- 退出成功 → `window.location.href`（同上），`signOut()` 调用加了 try/catch 防止 stale token 阻断

**静态/ISR 页 auth 水合**：
- 静态页的 Server Component 拿到 `user = null`（设计如此，不是 bug）
- `Navbar.tsx` 在 `user===null` 时自动 fetch `/api/navbar` 获取实际登录状态
- `loggedIn`、`myVote`、GC 余额等用户状态**必须客户端自取**

---

## 七、GC (GoalCoin) 经济体系

| 来源 | 数量 |
|---|---|
| 注册 / 首次登录初始化 | 100,000,000 GC |
| 每日签到 | 按等级（Beggar 10K → 高等级更多） |
| 预测获胜 | 投注额 × 赔率 |
| 邀请好友（双方各得） | 500,000 GC |
| 邀请里程碑 | 50K–1,000K（3/10/25/50 人） |
| 资料完善（最高） | 36,000 GC（9 字段各奖励 + 全完 10K 奖励） |
| 论坛互动 | 发帖/点赞 |
| 管理员直接发放 | 无限制（Admin 面板内联工具） |

**财富等级**（`src/lib/levels.ts`）：根据 `gc_balance` 确定等级（Beggar → Common → ... → 高等级），影响每日签到收益和显示的徽章图标。

---

## 八、支付系统

| 渠道 | 入口 | 备注 |
|---|---|---|
| Paddle | `/api/topup/paddle` + `/api/webhooks/paddle` | 主力，MoR 代收税，已在生产配置 |
| PayPal | `/api/topup/paypal` + `/api/webhooks/...` | 备选 |
| NowPayments (USDT) | `/api/topup/usdt` | 加密货币，自动监链 |
| Xunhupay | `/api/topup/xunhupay` + `/api/webhooks/xunhupay` | 国内支付 |
| Stripe | `/api/webhooks/stripe` | 已集成备用 |

---

## 九、数据库（Supabase PostgreSQL）

迁移文件：`supabase/migrations/` — 当前 **049** 个（`001_init.sql` → `049_users_profile_update_policy.sql`）

**关键表**（部分）：

| 表 | 关键字段 |
|---|---|
| `users` | id, gc_balance, gc_total, nickname, avatar_url, is_admin, country_code, profile_rewards(jsonb), referred_by, welcome_email_sent |
| `matches` | id, home_team, away_team, home_score, away_score, status, match_time, odds(jsonb) |
| `match_votes` | user_id, match_id, vote (home/draw/away) |
| `bets` | user_id, match_id, amount, predicted_winner, result, payout |
| `score_bets` | user_id, match_id, home_score, away_score, amount |
| `gc_transactions` | user_id, amount, type, description, created_at |
| `forum_threads` | id, title, content, author_id, category, likes |
| `messages` | sender_id, receiver_id, content, is_read |
| `referrals` | referrer_id, referred_id, reward_given |
| `players` | id, name, team, position, photo_url (308 人) |
| `daily_checkins` | user_id, checked_at, gc_earned |
| `topup_orders` | id, user_id, amount_usd, gc_amount, status, provider |

**常用 RPC 函数**：
- `process_referral(new_user_id, referrer_name)` — 邀请奖励，幂等
- `award_profile_gc(user_id, new_keys, gc_amount)` — 资料完善奖励

---

## 十、Cron 任务

| 任务 | 频率 | 端点 |
|---|---|---|
| 同步比分 | 每日 00:00 UTC | `GET /api/cron/sync-scores` |

配置在 `vercel.json`，由 Vercel Cron 自动触发。

---

## 十一、当前进度 & 近期提交

```
feat: add Portuguese (pt) localization across all pages  ← 最新
feat: complete German (de) localization across all pages
63df9ce fix: stop desktop OAuth logins being hijacked to mobile site
8b92e49 docs: add CLAUDE.md project onboarding guide
704245b fix: repair desktop login/logout auth flow and header sync
2161e21 fix: localize Navbar menus for all languages via lc()
7f46eef fix: disable browser locale detection so unprefixed URLs always serve English
1dab0b6 fix: localize level names and remove redundant subtitles on profile page
500b28c feat: add German (de) localization across web UI
5199570 feat: add French (fr) localization and redesign forum auto-translation
d889ef8 feat: localize schedule page and sidebar for Spanish (es)
94277e8 fix: refresh header GC balance after admin self-award
eeb0011 feat: localize teams and personal dashboard for Spanish (es)
85778fa fix: hydrate navbar auth state on static/ISR pages
d6dd6e6 feat: add Spanish (es) localization across web UI
a9fa4b2 fix: PayPal 按钮语言跟随站点 locale
5c96fc7 fix: Paddle checkout locale 代码改为 zh-Hans
```

### 未提交的工作（用户维护部分）
- `src/components/mobile/**` — 用户持续开发中，多处未提交（**不要碰**）
- `src/components/ProfileCompletion.tsx` — i18n 修改（zh → lc()）尚未提交（待用户决定）

### 已知待办
1. **Supabase Redirect URLs 白名单**（必做，治本 OAuth 回调）
   - 添加 `https://www.football2026.net/auth/callback`
   - 添加 `https://m.football2026.net/auth/callback`
2. **ProfileCompletion.tsx 提交 + 补 es/fr/de 译文**：缺 "Favorite Team"、"Twitter / X"、"Telegram" 三条
3. **ru/ar/ja/ko/vi/id 翻译 JSON 文件**（当前这 6 语言均降级英文；pt 已完成）

---

## 十二、注意事项 & 禁区

### 🚫 绝对禁止
| 禁止事项 | 原因 |
|---|---|
| 修改 `src/components/mobile/**` 任何文件 | 用户自维护，不接受 AI 修改 |
| 创建 `src/middleware.ts` | 与 `src/proxy.ts` 冲突，Next.js 16 报错 |
| 把 `localeDetection` 写到 `createIntlMiddleware()` 第二参数 | next-intl v4 只接受单参，配置应在 `defineRouting()` |
| 提交 `.env`、Service Key、支付 API Key | 安全，绝对禁止 |

### ⚠️ 容易踩坑的地方

**1. `user` 在静态页恒为 null**
```typescript
// [locale]/layout.tsx 的 user 在静态生成页是 null，这是设计
// 不要在服务端依赖 user 来决定页面内容——客户端 fetch 才是正确做法
```

**2. 软导航不刷新 Navbar**
```typescript
// ❌ 错误：软导航，Navbar 持久化不重拉
router.push(`/${locale}`);
// ✅ 正确：整页跳转，Navbar 重新 fetch /api/navbar
window.location.href = `/${locale}`;
```

**3. lc() 的 key 是英文字符串**
```typescript
// 改了英文文案后必须同步更新 content/es.json、fr.json、de.json 的 key
lc(locale, "中文", "New English text")  // ← 同步更新 3 个 JSON 文件里 "New English text" 这个 key
```

**4. de.json 德语书名号**
- 正确：`„text"` = U+201E + U+201C（右双引号）
- 错误：`„text"` = U+201E + U+0022（ASCII 双引号，会导致 JSON 解析失败）

**5. GC 初始化**
- `layout.tsx` 首次加载时若 `gc_balance === null` 自动补 100M — 这对 OAuth 注册用户是必要的

**6. proxy.ts 里的 `MOBILE_OAUTH_NEXT_COOKIE` 常量**
```typescript
// src/proxy.ts 第 8 行：
const MOBILE_OAUTH_NEXT_COOKIE = "football2026_mobile_oauth_next";
// 与 src/components/mobile/mobileAuth.ts 中同名常量保持一致
// 移动端登录页设置此 cookie → proxy 据此区分桌面/移动端 OAuth 流
```

**7. `auth/callback` 被 proxy matcher 排除**
```typescript
// vercel/Next.js 16 proxy matcher：
matcher: "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)"
// /auth/callback 不经过 proxy，直接命中 Route Handler
```

**8. 桌面 OAuth 被错误路由到移动端（已修复，了解原因）**
- `getMobileOAuthCodeResponse` 现在只在移动端信号存在时才触发（m 域名 or mobile cookie）
- 桌面 Google/Facebook 登录的 `?code=` 回落到 www 首页时，由 `getDesktopOAuthCodeResponse` 处理
- 根治方案：在 Supabase 后台配置 Redirect URLs 白名单（见待办 #1）

---

## 十三、移动端架构说明

移动端 (`m.football2026.net`) 是**同一个 Next.js 应用**的不同路由，通过 `proxy.ts` 处理：

```
Mobile UA 访问 www.football2026.net  →  proxy redirect  →  m.football2026.net/[locale]/m
m.football2026.net/[locale]          →  proxy rewrite   →  /[locale]/m（MobileHome 页面）
```

**移动端独立路由**（用户自维护）：
```
/[locale]/m/         →  src/app/[locale]/m/page.tsx        (MobileHome)
/[locale]/m/login/   →  src/app/[locale]/m/login/page.tsx
/[locale]/m/register →  src/app/[locale]/m/register/page.tsx
```

**桌面/移动端 auth 对比**：
| | 桌面 | 移动 |
|---|---|---|
| 登录页 | `/[locale]/auth/login` | `/[locale]/m/login` |
| 注册页 | `/[locale]/auth/register` | `/[locale]/m/register` |
| OAuth 回调 | `/auth/callback`（无 mobile=1） | `/auth/callback?mobile=1` |
| Actions | `src/app/[locale]/auth/actions.ts` | `src/app/[locale]/m/login/actions.ts` |

---

## 十四、环境变量（在 Vercel 后台配置）

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # 仅服务端/迁移脚本

# 邮件
RESEND_API_KEY=

# 支付
PADDLE_API_KEY=                    # ⚠️ 历史上曾在聊天中泄露，确认已在 Paddle 后台 Revoke 并重新生成
PADDLE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
NOWPAYMENTS_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# 其他
XUNHUPAY_APP_ID=
XUNHUPAY_APP_SECRET=
```

---

*此文件由 Claude Code 维护，反映截至 2026-06-08 的项目真实状态。*
