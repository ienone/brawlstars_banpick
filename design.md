# 荒野乱斗 (Brawl Stars) 专业 BP 系统 - 最终全量设计规范 (v1.0)

本项目旨在为《荒野乱斗》电竞赛事提供一个具备高视觉表现力、操作流畅、逻辑严密的 Ban-Pick (BP) 系统。

---

## 1. 核心功能详述 (Core Features)

### 1.1 身份、席位与安全 (Auth & Roles)
*   **登录系统**: 支持用户名 + 密码登录（由 PocketBase 处理持久化 Session）。
*   **席位管理 (Team-Based & Drag-and-Drop)**: 
    *   **角色分配**: 房间支持 10 个核心席位：蓝方 (3选手+2教练/替补) vs 红方 (3选手+2教练/替补)。
    *   **分队加入**: 房主生成两个唯一链接（红方链接 / 蓝方链接）。受邀者点击对应链接后，自动进入该方阵营。
    *   **房主调控**: 房主可在房间管理页通过 **拖拽 (Drag-and-Drop)** 轻松调整玩家位置（如：在选手与教练之间切换，或手动跨队交换玩家）。
    *   **教练推荐**: 教练推荐的英雄会本方对应选手的选择界面的对应英雄会突出显示并提示。
*   **认证选手保护**: 
    *   **Verified ID**: 管理员标记认证选手，注册时校验 Player Tag (#XXXX)，防止冒用知名选手 ID。

### 1.2 BP 流程与逻辑 (BP Logic Flow)
*   **预选逻辑 (Dual-Stage Pre-selection)**:
    1.  **Ban 后预选 (Shadow Pick)**: Ban 位结束后、正式开始 Pick 前，允许选手进行暗预选，仅本方可见。
    2.  **Pick 中预选 (Soft Lock)**: 进入 Pick 回合，点击英雄进入高亮态并显示“确认选择”按钮。此时列表仍可自由滚动，只有点击确认才正式锁定。
*   **推荐选择**： 教练/玩家可在预选阶段推荐队友选择英雄，推荐英雄的在选手界面突出显示，并显示谁推荐的。需要注意多人同时推荐同一英雄时的显示逻辑。
*   **超时处理**: 若选手在规定时间内未点击确认，系统自动选择：**用户当前的预选英雄 > 英雄列表第一个可用英雄**。
*   **赛制配置**: 支持一局定胜负 (BO1)、三局两胜 (BO3)、五局三胜 (BO5)。
*   **全局 BP模式选择 (Global Pick)**: BO3/5 模式下，前序对局已用英雄在当前局自动进入锁定状态。
*   **选边策略**: 房主可指定蓝方/红方先手（控制 1-2-2-1 的起始方）。

### 1.3 地图管理 (Map Management)
*   **多样化选图**: 
    *   **手动搜索**: 通过名称/模式过滤指定地图。
    *   **图池随机**: 房主选择预设图池（如 BSC 联赛图池、排位赛图池）或自定义勾选地图，系统自动随机抽取。
*   **高清展示**: 抽取的地图支持全屏查看高清战术分布图（通过 ESA 边缘加速加载）。

### 1.4 交互与视觉 (UI/UX - Material 3 Expressive)
*   **英雄筛选与排序**:
    *   支持按 **稀有度**（对应背景色）、**A-Z 字母** 排序。
    *   **智能搜索**: 支持中文名、英文名、拼音首字母模糊匹配。
*   **触屏适配**: 采用大点击域设计，预选态下不阻塞列表滑动，确保流畅感。
*   **日夜/横竖屏适配**: 横屏复刻游戏内 UI；竖屏采用垂直流式布局，顶部吸顶显示 BP 状态。
*   **动画效果 (GSAP)**: 英雄落位 Flip 动画、倒计时震动、预选态的流光扫光效果。

---

## 2. 数据库详细设计 (PocketBase / SQLite Schema)

### 2.1 `users` (用户与认证)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | ID | 唯一标识符 |
| `username` | Text | 登录用户名 |
| `password` | Password | 加密密码 |
| `player_tag` | Text | 游戏内 Tag (#XXXX) |
| `is_verified` | Bool | 是否为认证选手 |
| `role` | Select | `admin`, `user` |
| `avatar` | File | 用户头像 |

### 2.2 `brawlers` (英雄基础库)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `bid` | Int | 游戏内原始 ID |
| `name_cn` | Text | 中文名 |
| `name_en` | Text | 英文名 |
| `rarity` | Select | Legendary, Mythic, Epic, Super Rare, Rare, Common |
| `color` | Text | 稀有度对应的 Hex 颜色码 (如 #D8504E) |
| `image_url` | Text | 本地静态路径 (如 `/assets/brawlers/1600000.webp`) |

### 2.3 `maps` (地图库)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `mid` | Int | 游戏内原始 ID |
| `name` | Text | 地图名称 |
| `mode` | Select | Gem Grab, Brawl Ball, Bounty, Heist, Hot Zone, Knockout |
| `image_url` | Text | 地图高清大图路径 (如 `/assets/maps/2100000.webp`) |
| `is_active` | Bool | 是否在当前赛季图池中 |

### 2.4 `match_history` (对局历史)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | ID | 记录唯一标识 |
| `room_id` | Text | 来源房间 ID |
| `map_id` | Int | 对局地图 ID |
| `data_snapshot` | JSON | 包含双方阵容、禁位、选手名单、赛制配置的完整快照 |
| `created_at` | DateTime | 比赛完成时间 |

### 2.5 `rooms` (实时对局房间)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | ID | 房间唯一 ID |
| `host_id` | Relation | 指向 `users.id` |
| `blue_invite_code` | Text | 蓝方加入专用随机码 |
| `red_invite_code` | Text | 红方加入专用随机码 |
| `config` | JSON | `{ "bo": 3, "global_bp": true, "map_id": 101, "first_pick": "blue" }` |
| `seats` | JSON | `{ "blue": [uid1, uid2...], "red": [...], "coaches": { "blue": [], "red": [] } }` |
| `bp_state` | JSON | `{ "turn": 0, "bans": [], "picks": [], "pre_picks": {}, "status": "waiting" }` |
| `history_locks` | JSON | BO3/5 模式中已消耗的英雄 ID 数组 |

---

## 3. 状态转移流程设计 (State Machine)

### 3.1 房间生命周期
1.  **Waiting**: 房主配置赛制，选手通过链接入队，房主拖拽调整位置。
2.  **Ready**: 房主点击“开始”，锁定席位。
3.  **Ban Phase**: 按照 `1-1-1-1-1-1` 顺序进行，超时自动跳过或随机 Ban。
4.  **Pick Phase**: 按照 `1-2-2-1` 顺序，包含“暗预选”与“亮预选”逻辑。
5.  **Final Adjust**: 全部选完后，进入 30s 最终展示。
6.  **Finished**: 系统存入 `match_history`，房间转为只读历史。

---

## 4. 实现步骤设计 (Development Roadmap)

### 第一阶段：基础设施与数据准备
1.  **环境搭建**: 初始化 Vue 3 + Vite + Vuetify 3 项目。
2.  **数据抓取**: 编写 Python 脚本爬取 Brawlify，资源转为 WebP 格式。 (https://brawlify.com/brawlers/ https://brawlify.com/gamemodes/)
3.  **PocketBase 配置**: 创建 Collections 并设置权限。

### 第二阶段：核心交互与席位管理
1.  **用户系统**: 实现登录与认证选手防重逻辑。
2.  **房主控制台**: 实现地图随机池算法、房间链接生成。
3.  **席位分发**: 利用 `vuedraggable` 实现房主端的席位拖拽调整。

### 第三阶段：BP 实时逻辑 (Core BP Engine)
1.  **Pinia 状态机**: 处理 1-2-2-1 选人序列算法。
2.  **实时同步**: 接入 PocketBase SDK 监听 `rooms` 表变化。
3.  **预选系统**: 实现本方可见的暗预选逻辑及教练建议浮窗。

### 第四阶段：视觉增强与动效 (UI/UX)
1.  **GSAP 动画**: 实现英雄落位动画、倒计时震动效果。
2.  **M3 样式适配**: 完成响应式 CSS 布局。


> 注意最好要有完善覆盖的自动化测试流程，尽量提高测试覆盖率&覆盖各种错误情况
---

## 5. 部署架构 (Alibaba ESA 优化版)
*   **静态资源**: 全部缓存于 ESA 边缘节点，确保大陆访问图片秒开。
*   **动态 API**: 通过 ESA 协议优化回源至 PocketBase。
*   **安全**: ESA WAF 拦截恶意刷接口行为。
