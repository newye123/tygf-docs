# 审查报告 · GitHub 上有没有"把官网走一遍录下来再剪辑"的视频 Skill

- **审查对象**：Owner 提问——"github 上有没有专门做视频的 SKILL，直接把我们的官网走一遍录下来然后剪辑？"
- **日期**：2026-10-24
- **方法**：GitHub API 检索 → 读 SKILL.md / 参考文档 / 许可证原文 → **在本机真跑**（抓取官网 + 渲染一条 demo 片）
- **证据等级**：A＝本会话实跑读数；B＝对方文档/页面原文；C＝转述；D＝推断

---

## VERDICT：有，而且本机已经跑通；但它"录"的是截图，不是录屏，也没有登录/点击能力

一句话结论：**你要的"走一遍官网"这件事，HyperFrames 有一个官方命令 `npx hyperframes capture <url>` 专门做；但它做的是滚动扫全页、截一组 1920×1080 图 + 抽设计 token / 字体 / 文案，然后用 HTML 时间轴把这些静帧重新编排成视频。它不是屏幕录像，也不能替你点按钮、填表、走登录后的界面。**

对我们的直接含义：**公开官网能拍，产品里的真实操作演示拍不到**（执行入口在登录后，`capture` 没有任何 cookie / 脚本 / 点击参数）。

---

## 一、找到了什么

| 名称 | 星 | 许可证 | 形态 | 判定 |
|---|---:|---|---|---|
| **heygen-com/hyperframes**（官方） | 70,916 | **Apache-2.0** | 一套 agent skill（`/hyperframes`、`/hyperframes-cli`、`/hyperframes-registry`、`/media-use`）+ CLI | **能用，可商用**。官网抓取能力就在主 skill 里（`capture` + `references/film.md`） |
| Sunwood-ai-labs/website-to-hyperframes-skill | 0 | **无 LICENSE（404）** | 第三方 Codex skill，7 步：抓站 → DESIGN.md → 脚本 → 分镜 → 配音 → 合成 → 校验 | **不能整段抄**（无许可证＝保留所有权利）。流程值得照着重写 |
| heygen-com/website-to-hyperframes-demo | 73 | **无 LICENSE（404）** | 上面那个流程的成品宣传片工程（41.8 秒，11 段真实站点录片） | 只当参考片看，工程不能复用 |
| suntay44/motionable | 10 | MIT（LICENSE 原文确认） | Claude Code 插件，从仓库/网站/截图生成 15–30 秒片 | **macOS only**，本机 Windows 用不了 |
| akramania/buat-video-motion-grafik | 3 | 无 LICENSE（404） | ChatGPT/Codex 视频工具箱（5000+ 素材/预设） | 素材库性质，与"走官网"无关 |

**要点纠正**：官方**没有**单独发布一个"官网转视频" skill。官方分销清单只有核心四件（`/hyperframes`、`/hyperframes-cli`、`/hyperframes-registry`、`/media-use`）+ 按需三件（`/figma`、`/slideshow`、`/remotion-to-hyperframes`）〔B，`skills/hyperframes/references/skill-lifecycle.md`〕。官网转视频是主 skill 里的一个命令，不是独立 skill。

`npx hyperframes init` 在本机跑完后，这四个官方 skill 已出现在本会话的可用 skill 列表里〔A〕。

---

## 二、它到底怎么"走一遍官网"

`capture --help` 的全部参数只有：URL、输出目录、`--skip-assets`、`--skip-vision`、`--max-screenshots`、`--timeout`、`--capture-budget`、`--json`、以及视频下载模式的 `--video/--index/--video-url/--list`〔A〕。

**没有** cookie、登录、点击、输入、等待选择器、脚本注入这一类参数。所以：

- 只能抓**公开页面**；
- 页面上的滚动动画会在滚动过程里被逐屏截下来（`scroll-000.png`…，相邻约 30% 重叠）；
- `full-page.png` 是滚动结束后、把 sticky/fixed 元素转成 static 再拍的整页 1x 大图（页面高于 16384 px 时跳过，只能用 `scroll-*.png`）〔B，`references/film.md`〕；
- 官方文档自己写明：**"把页面用 HTML 重建会偏离真实布局；要展示站点原样就用它的截图，只重建会动的那部分"**〔B〕。

所以"然后剪辑"的正确理解是：**不是拖时间轴剪录像，而是用截下来的真实像素 + HTML/CSS/GSAP 在时间轴上重新编排**，最后 `render` 逐帧渲成 MP4。可编辑面是 `npx hyperframes preview`（本地网页 Studio，默认 3002 端口，时间轴可拖）〔A，`preview --help`〕。

---

## 三、本机实跑证据

### 3.1 环境自检 `npx hyperframes doctor`（EXIT=0）

| 项 | 读数 |
|---|---|
| 版本 | 0.8.191（npm，许可证 Apache-2.0，16 个依赖，解包约 22.7 MB） |
| Node | v24.13.0 win32 x64 |
| CPU / 内存 / 磁盘 | 16 核 i5-13400 / 31.8 GB / 53.5 GB 可用 |
| FFmpeg / FFprobe | 9.0.1-full_build（gyan.dev） |
| Chrome | 系统 Chrome 已就位 |
| 缺的（均为可选） | whisper-cpp、Kokoro TTS、MusicGen；Docker 未启动 |

### 3.2 抓我们的官网 `npx hyperframes capture https://tuyigf.com`（EXIT=0）

```
ok: true │ HTTP 200 │ 标题：图译工坊｜PS 批量改语言：把已有译文写进 PSD 文字图层（单批 12 语种）
screenshots: 13（scroll-000 … scroll-100）+ full-page.png（1,191,750 B）
detectedSections: 12 │ 可见文案 215 行 │ page.html 32,322 B │ tokens.json 28,997 B
fonts: Tuyigf Source Han Sans（可变字体，100–900；设计稿用到 400/600/700/800）
animations: CDP 142 个 / 滚动目标 25 个 / canvas 0
assets: 2（另有 1 个资产 unavailable）
```

首屏截图实看：像素级还原，导航、主标题、右侧那张"图层/译文表"的产品示意图全部在，中文字体正确。

**读法**：我们的官网是 CSS 驱动、几乎没有图片资产（assets 只有 2），所以 capture 对我们的价值是**截图 + 设计 token + 文案清单**，不是素材库。

### 3.3 自测出片 `npx hyperframes render --quality draft`（EXIT=0）

```
300 帧 / 10.0 秒 / 23.0 秒出片 / 截图采集模式 / 硬件 GPU / 5 进程
产物：hf-demo_2026-10-24_13-09-22.mp4（22,160 B）
阶段耗时：setup 5.6s · compile 2.4s · capture 14.1s · encode 0.1s · assemble 0.2s
```

### 3.4 对照：我们现有的片

```
v4-animatic-16x9.mp4  4,938,313 B  1920×1080  30fps  1140 帧  38.000000 秒
v4-animatic-9x16.mp4  4,972,284 B  1080×1920  30fps  1140 帧  38.000000 秒
```

**速度不能直接比**：HyperFrames 是 `--quality draft` + 5 进程 + 硬件 GPU，我们的是单进程 CRF 19。按单帧摊销大约 0.047 秒 vs 0.102 秒，但**档位不同，不能把这个当"快一倍"的结论**〔A/D〕。

---

## 四、对我们意味着什么

**能做的**

1. **官网真实像素进片**：我们第 1 镜右侧那张"图层/译文表"目前是自己画的示意；capture 能直接给出官网真实截图，更经得起"这是不是真的"。
2. **设计一致性有据可依**：品牌色、字体（可变 100–900）、板块数、CTA 文案，一次抓全，不靠我肉眼抄。
3. **你可以自己拖时间轴**：`preview` 起本地 Studio。

**不能做的**

1. **产品内真实操作演示**：登录后的执行界面抓不到（capture 无登录/点击参数）。这条与我们已有的硬约束一致——产品内执行入口要云端票据、真机跑批要 Owner 登录。
2. **"录屏式"的鼠标点击过程**：它没有录制交互的能力；镜头里的"点击"要靠 HTML 动画演出来（我们现有的 animatic 就是这么做的）。

**一个必须提前说的坑**

HyperFrames 的模板和文档默认从 `cdn.jsdelivr.net` 加载 GSAP（CLI 包内 23 处命中，`dist/docs/gsap.md:8`）〔A〕。国内网络下这会直接卡住或渲出没有动画的片。**我们现有渲染器不依赖外网**（纯 CSS + `window.seek`），这是它现在的一个真实优势；要用 HyperFrames 就必须把 GSAP 本地化。

---

## 五、该不该换现有的渲染链

**建议：不整体迁移，做三件局部接入。**

| 选项 | 代价 | 收益 | 判断 |
|---|---|---|---|
| 整体迁到 HyperFrames | 现有 11 镜分镜要改写成它的契约（`data-start`/`data-duration`、禁用 `Date.now()`、字体必须本地 `@font-face`、动画必须走 GSAP 时间轴）；GSAP 本地化；多一层 CLI 依赖 | 5 进程渲染、`lint/check/snapshot/inspect` 审片工具链、可拖 Studio、官网一键抓取 | **暂不迁** |
| 只借 `capture` 抓素材 | 很低（一条命令，1 分钟） | 官网真实截图 + token + 文案 | **做** |
| 借 `snapshot` 思路补审片 | 低 | 逐帧快照复核，比现在靠肉眼抽帧稳 | **做** |
| 9:16 拆条时用 `preview` 当时间轴 | 低 | 你能直接拖 | **可做** |

**唯一值得整体迁移的触发条件**：你希望"自己拖时间轴改片"成为常态，而不是每次让我改 HTML 再重渲。

---

## 六、覆盖缺口（未核实项，别当结论引用）

- HyperFrames **桌面 App**（`hyperframes open`）在 Windows 上能不能装：**未核实**。我实测可用的是浏览器 Studio（`preview`）。
- 只抓了 `tuyigf.com` 一个站；没有验证它对 SPA / 需要滚动的长页 / 登录后页面（后者按参数判断不可能）的边界。
- 渲染对比用的是 `--quality draft`，没有和我们的 CRF 19 做同档对比。
- capture 的 AI 图像描述（`--skip-vision` 未开时需要 `OPENROUTER_API_KEY`/`GEMINI_API_KEY`）没用；本次抓取在无 key 情况下完成。
- 没有验证 `preview` Studio 的实际交互手感（时间轴拖动、元素选中）——只确认命令与端口存在。
- 第三方 7 步 skill（Sunwood）只读了 SKILL.md 与 step-1，其余 6 步未逐篇读。

---

## 七、复跑方式

```bash
# 环境自检
npx -y hyperframes@0.8.191 doctor

# 抓官网（只读，一次约 1 分钟）
npx -y hyperframes@0.8.191 capture https://tuyigf.com -o ./cap-tuyigf --json

# 建工程并渲一条 demo
npx -y hyperframes@0.8.191 init hf-demo --skip-skills
cd hf-demo && npx -y hyperframes@0.8.191 render --quality draft

# 起本地 Studio（时间轴可拖）
npx -y hyperframes@0.8.191 preview --port 3002
```

本次产物留在 `C:\Users\ivan\AppData\Local\Temp\video-skill-probe\`（临时目录）：`cap-tuyigf/`（官网抓取）、`hf-demo/renders/`（自测片）、`*.json`（检索与许可证原始响应）。

---

*证据：hyperframes 0.8.191 实跑（doctor / capture / render / --help 全部 EXIT=0）；仓库元数据与许可证经 GitHub API 直取；星数、推送时间、许可证为 2026-10-24 13:0x 读数。*
