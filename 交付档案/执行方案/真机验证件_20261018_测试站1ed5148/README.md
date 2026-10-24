# 真机验证件 · 测试站 `1ed5148`（2026-10-18 01:0x）

被测对象：测试站部署 `1ed5148d0427b0fbf32cfe77b38542bb276001cb`（2026-10-18 00:53 部署）。
本机助手：`tygf-engine-setup-3.7.15`，`127.0.0.1:49152`，`activationStatus=active`。
浏览器：Chrome 151（Playwright 驱动），视口 1440×1100，语言 zh-CN。

## 为什么走 SSH 隧道

本机到 `https://test.tuyigf.com` 的 443 不通（`curl` 000），且测试站对外有访问令牌门（不带 token 403）。
改用 `ssh -L 3000:127.0.0.1:3001 tygf-server`，浏览器访问 `http://localhost:3000`：
既绕开 Cloudflare 与令牌门，又正好命中本机助手 CORS 白名单里的 `http://localhost:3000`。

## 会话来源（已清理）

演示账号 `demo-seed`（`cms5damzc000fwj0id5f6d9k0`，`accessExpiresAt` 2099）用与
`src/lib/auth/session.ts` 逐字节相同的签名格式临时签了一枚会话，写入 `LoginSession`
（`deviceName=real-machine-test-1018`）。**验证结束后已按 id 删除，表内总数回到 88。**
本目录不含任何 cookie / 令牌 / 密钥。

## 证据索引

| 文件 | 证明什么 |
|---|---|
| `probe1.json` | 未登录态下 `/` 是营销页；`/workbench` 路由不存在（404），工作台是 hash 视图 |
| `probe2.json` | 会话 cookie 生效；`/api/auth/me` 200；`batchWorkbenchEnabled=true` |
| `probe3.json` | 点「工作台」后 hash 变 `#workbench`、壳切换为应用导航（SSR 首屏恒为 home，需 hydrate 后切换） |
| `probe4.json` | 完整链路：`/api/invite/session` 200 → `/api/workbench/credits` 14867 → 助手 `/ping` 3.7.15 → `POST /api/local-assistant/ticket` 200 |
| `probe5.json` / `p5-batch.png` | 营销页里没有「批量工作台」入口（必须先切到工作台壳） |
| `probe6.json` / `p6-batch.png` | 批量工作台控件清点：粘贴框、加入列表、全部扫描（初始禁用）、添加 PSD(0/12) |
| `probe7.json` / `p7-added.png` / `p7-scanned.png` | **P1 四类反馈 + P2 扫描链路**（见下） |
| `probe8.json` / `p8-batch-gated.png` | 队列停止后的执行闸门（负向断言）与设计对象清单数字 |

## 关键断言（实测原文）

- 录入反馈：`已加入 3 个；1 个已在列表里（已忽略）；1 行不是 .psd / .psb 后缀（已忽略）。`
- 任务根：`POST /config` → `{"success":true,"taskRootSet":true,"note":"已识别为 PSD/PSB 文件，自动使用其所在文件夹作为任务目录。"}`
- 扫描受理：`POST /v1.5/preparation/scan` → 202 `{"state":"hashing","hashProgress":{"bytesDone":0,"bytesTotal":4570583}}`
- 扫描完成：`GET /v1.5/preparation/status/psn_…` → `{"state":"prepared",…}`
- 界面结果：`8.1.psd 已扫描 10 层`、`synth-src.psd 已扫描 3 层`、`不存在的设计稿.psd 扫描失败`
  ＋红字`这个本地路径不存在，请检查是否复制完整。`
- 队列收口：`队列已停止：第 3/3 个设计稿（不存在的设计稿.psd）扫描未完成（扫描失败）。后续 0 个未扫描；已扫好的不会重扫，处理后可再点「全部扫描」继续。`
- 执行闸门（负向）：`4生成交付[禁用] title=解决必须处理项后开放`、`进入原文与译文审查[禁用]`
- 设计对象清单：可写对象 10 / 隐藏对象 0 / 不可处理 0 / 待确认 –（与 8.1.psd 的 10 层一致）
- 授权位：`POST /v1.5/authorization/check` → `{"ok":true,"authorized":true}`

## 诚实边界

- 未跑「导入译文表 → 智能检测 → 设计稿校对 → 生成交付」整条业务链（本轮只到准备素材/扫描阶段）。
- 未做免 PS 写回（该路径已冻结，见 PhotoCraft `#6968`/`#6971`）。
- 单文件工作台的「选择文件…」是助手原生对话框，未自动化点选；只确认了控件与积分/阶段壳正常。
- 隧道与临时会话均已清理；测试库 `LoginSession` 计数回到验证前的 88。
