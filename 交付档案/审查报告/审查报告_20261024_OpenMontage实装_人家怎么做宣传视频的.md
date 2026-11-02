# OpenMontage 实装与拆解：人家是怎么做宣传视频的

- 日期：2026-10-24
- 对象：`https://github.com/calesthio/OpenMontage`（AGPL-3.0，71,396★，本地提交 `e01dbf4`，2026-10-23）
- 本机落地路径：`C:\Users\ivan\AppData\Local\Temp\OpenMontage`（临时目录，非仓库内）
- 结论类型：实装 + 方法拆解 + 可复用性判定（不是法律意见）

---

## 一、一句话结论

**他们做宣传视频不靠"一个神渲染器"，靠一套把"怎么拍"写成规程的流水线：先定调性，再定脚本，再定分镜，每过一关都要自检和人工点头，最后才渲染。**

对我们最值钱的不是它的代码，是它把"片子为什么像模板"这件事拆成了可执行的三件事：**调性三旋钮**、**模板/定制二选一**、**"这片子换别的产品也成立吗"的证伪题**。

另外，上次那个问题（"能不能把官网走一遍录下来"）在它这里有真答案：**能，而且是真录屏**——我用它写的 Playwright 配方，把 `https://tuyigf.com` 真录了 31.8 秒（1920×1080，红色光标可见，滚动生效）。

---

## 二、装了什么、跑到什么程度（本机实测）

| 项 | 实测结果 |
|---|---|
| Python 依赖 | venv（Python 3.13.1）+ 12 个核心包装好，`import` 全通 |
| 官方 PyPI | **失败**：`ProxyError 10054` / `SSLError`，换清华镜像后成功 |
| Remotion | `remotion-composer` 装 199 包，remotion 4.0.484 |
| 自带零键 demo | **渲染成功**：`focusflow-pitch.mp4`，22.55 秒，1920×1080，30fps，h264+aac，5,577,599 B |
| Chrome Headless Shell | **卡住**：113.3 MB 从 `storage.googleapis.com` 下载，3 分钟只到 18 MB，改用系统 Chrome（`--browser-executable`）绕过 |
| 工具注册表 | 155 个工具，本机 **37 可用 / 117 不可用 / 1 降级** |
| 流水线 | 13 份清单（`pipeline_defs/*.yaml`，其中 1 份是冒烟用，实际 12 条线） |
| 技能库 | `skills/` 157 个 md + `.agents/skills/` 579 个 md |
| 仓库体积 | 克隆 163 MB，装完依赖 603 MB |

注意"117 不可用"的含义：是**本机没装依赖或没有 key**，不是它产品只有 37 项能力。它把 100 多个外部服务（TTS、生图、生视频、修脸）都做成了可插拔工具，要用就得给 key 付钱。

### 跑通的两件东西

1. **零键 demo**：`projects/demos/renders/focusflow-pitch.mp4`（22.5 秒创业路演风）。抽帧看，是"深紫渐变 + 环形图 + 大数字"。
2. **官网真录屏**：`C:\Users\ivan\AppData\Local\Temp\om-record\site-walkthrough.mp4`（31.83 秒，955 帧，1080p，1.24 MB）。第 26 秒的帧里能看到红色圆点光标停在"01 / TIME COST"分段上——说明**滚动和光标注入都真的生效了**，不是静态截图拼的。

---

## 三、人家怎么做宣传视频（拆开看）

### 3.1 第一原则：所有片子必须走流水线

它写死在 `AGENT_GUIDE.md:49` 一条"Rule Zero"：**你要做视频，就必须先找到对应的流水线，读清单，跑预检，一阶段一阶段做**；禁止临时写脚本直接调工具。理由在同文件 `:68`：**"智能在技能里，不在即兴代码里"**。

这条对我们的直接意义：我们现在做片子是"想到哪做到哪"，出片质量和当天状态强相关；它是把"每类片子的拍法"固化成文件。

### 3.2 屏幕演示片（screen-demo）的两个模式

`pipeline_defs/screen-demo.yaml:22-42` 明确两条路：

- **真拍**（real_capture）：录真实桌面/浏览器；清单里必选工具是 `screen_recorder`（FFmpeg 抓屏），可选 Cap。它自己把 Playwright 录制只写在描述文字里（`:4-16`），**没进结构化 modes**，所以真拍这一档默认是"抓整块屏幕"。
- **合成**（synthetic_terminal）：终端动画用 Remotion 画，适合安装流程、命令演示——可复现、逐帧对齐旁白、不泄露隐私。

选哪条由"创意导演"在写 brief 时定。这个二分法对我们很有用：**该真录的（Photoshop 里真改一层）真录，能合成的（表格里的译文、进度条）合成**，别拿录屏去演可以画出来的东西。

### 3.3 七道工序，五道必须人点头

`screen-demo.yaml:77-239` 的七关是：`idea → script → scene_plan → assets → edit → compose → publish`。

其中 `idea / script / scene_plan / assets / publish` 五关 `human_approval_default: true`（`:85/:111/:134/:165/:239`），`edit / compose` 自动过（`:185/:217`）。批一次只管一关，早先说过"go ahead"不算数——这条写在 `AGENT_GUIDE.md:585-593`。

预算默认 1 美元、每关最多返修 3 次、整条线最多 10 分钟（`screen-demo.yaml:46-49`）。**给片子设"最多改三次"的硬上限**，是防止无限打磨的实用设计。

### 3.4 脚本不是文案，是"动作地图"

`skills/pipelines/screen-demo/script-director.md:29-48`：先把屏幕上发生的事标成一张表——时间点、动作类型、对象、重要度、建议处理方式（实时/加速/切掉/高亮/缩放）。然后 `:104-110` 的质检六问：

- 每个关键动作有没有时间点？
- 旁白和画面动作对不对齐？
- 该加速的死时间标了没有？
- 高亮是不是只给真正的注意力转移，而不是每次点击？
- 软件名、命令、界面元素名写对没有？
- 旁白够不够短？

速度表在 `:79-87`：关键点击/结果 **0.75–1.0x**；常规输入/导航 **1.5–2.0x**；安装、构建、加载 **3.0–6.0x**；纯等待直接 **cut**。并且明写"**不要把关键证据放在加速段里**"。

它还有一句反面清单（`:124-127`）：**"别解说着光标，要说结果"**——这句话可以直接当我们片子的审片标准。

### 3.5 画面：硬规格 + 缩放档位

短视频规格（`skills/creative/short-form.md`）：9:16 1080×1920、通用安全区 900×1400、底部 300–320px 死区、正文 42px+ 粗体、每 1–3 秒有一次视觉变化、20–40 剪/分、响度 −14 LUFS / −1 dBTP、120–140 BPM、字幕必做（85% 的人静音看）。

缩放（`skills/pipelines/screen-demo/scene-director.md:54-60`）：

| 场景 | 倍数 | 过渡 |
|---|---|---|
| 整页结果 | 1.0–1.3x | 先多给上下文，再决定下次缩放 |
| 终端/代码 | 1.5–2.2x | 保留足够周边上下文 |
| 小按钮/图标 | 2.0–3.0x | 带边距，让观众知道它在哪 |
| 弹窗 | 1.4–2.0x | 框整个弹窗，不要切一半 |

`skills/creative/screen-recording.md:67-76` 另给一版过渡参数：0.8 秒 ease-in-out、回到总览 0.6 秒；`:76` 的「同屏最多 2 个提示、提示在动作之前、高亮与缩放二选一」在 `scene-director.md:76-79` 有同样规定。

### 3.6 风格：不是一个风格，是一份可校验的文件

`styles/*.yaml` 是风格清单，比如 `premium-minimalist.yaml`（"投资人更新、专家讲解、产品叙事、高信任发布"）：

- 颜色：炭黑 `#111827`、钴蓝 `#2563EB`、底色 `#F9FAFB`，**不用装饰性渐变**
- 字体：Inter（标题 700 / 正文 400 / 统计数字 800×3.2 倍）
- 节奏：单场景最少停 **2.75 秒**、最多 **12 秒**；文字卡 **3.75 秒**；转场 **0.45 秒**
- 音乐音量 0.07、闪避阈值 −4 dB
- 质量规则：对比度 ≥4.5:1、同屏最多 2 个强调色、一帧只讲一件事、**动效用来揭示层级，不是加能量**

这套东西的价值在于：**风格从"形容词"变成了"能被审查的数字"**。审片时说"不够高级"没法改，说"单场景只停了 1.4 秒，低于 2.75 秒下限"就能改。

### 3.7 调性三旋钮 + "模板还是定制"

`skills/meta/taste-direction.md:8-45`：动手前先写一句设计判断（"投资人向 AI 发布：克制、可信，避开炒作视觉"），然后拧三个 1–10 的旋钮：

- `visual_variance`：低＝一套语法用到底；高＝每一拍换视觉语言
- `motion_intensity`：低＝安静长镜；高＝快切动效
- `information_density`：低＝一帧一个意思；高＝密集面板

`AGENT_GUIDE.md:143-146` 把成片分成两条路：

- **模板档（templated）**：拿现成场景块拼。快、便宜、稳——**"也是大多数片子看起来都一样的真正原因"**。
- **定制档（atelier）**：从零手写画面，"**复用引擎知识，绝不复用创意组件**"。营销片、发布片、品牌片**默认走定制档**。

收尾还有一道**区别性审查**（`:146`）："**这片子换成别家产品还成立吗？我是不是又用了自己做过的那个样子？**"

我认为这一条是整份文档里最该抄进我们流程的——它把"AI 味"变成了一个可以回答是/否的问题。

### 3.8 自检：不是"我觉得行"，是逐项过

`skills/pipelines/screen-demo/executive-producer.md:248-259` 有 G1–G7 七道闸 + 终检：

- 镜头规划后：每个裁剪区是不是真框住了目标 UI？裁剪区是否 ≥ 源分辨率 50%（防止放大糊）？
- 素材后：字幕会不会挡住关键内容？预算是否已花超 90%？
- 合成后：ffprobe 查时长/分辨率/编码；**界面文字在成片分辨率下还读得清吗**；压缩后文字抗锯齿有没有崩
- 终检：可读性、节奏、字幕、响度、预算对账

自检的写法（`skills/meta/reviewer.md:9-17`）用了三条硬规矩，简称 CHAI：

- **准**：每条问题必须指到具体字段、行号或某一帧；指不出来就是猜
- **全**：发现一个错，要把同类错全扫一遍再交，不许只报一个
- **可改**：每条"严重"必须附**具体怎么改**（给出替换文字/具体数值），给不出就只能标"待查"，不许当严重项

`reviewer.md:42` 甚至写死：**没带修改方案的严重问题，自动降级为"待查"**。

### 3.9 决策留痕：改主意必须追加，不许覆盖

`AGENT_GUIDE.md:117-137`：决策日志只能追加。换供应商、换声音、换渲染引擎，都要**新追加一条**，用同一个"类别+主题"覆盖旧条（页面显示为"已修订"），**不许偷偷改旧的，也不许改主题名**——改了主题名会被当成两个不同决策，两条都显示。

还有一条运行时锁：`AGENT_GUIDE.md:389` 规定渲染引擎在提案阶段锁定后一路不变，**"静默换引擎"被定为严重治理违规**（`pipeline_defs/animated-explainer.yaml:245`）。

---

## 四、一个诚实的反面证据

它自己渲染的零键 demo（`focusflow-pitch`，第 14 秒）就是**深紫渐变 + 环形图 + 大数字**——而它自己的风格清单把"generic AI-purple gradient backgrounds"写进了负面提示词（`styles/premium-minimalist.yaml:78`，`skills/meta/taste-direction.md:28`）。

这不是打脸，是印证它自己的判断：**默认档必然长得像模板**，所以它才要求"营销/发布片默认走定制档"。换句话说——**这套系统给的是方法，不是审美；照默认跑出来的东西，和我们现在的片子一个毛病。**

---

## 五、对我们意味着什么

### 5.1 建议直接拿走的 5 条（不涉及代码，纯方法）

| 条 | 内容 | 落到哪 |
|---|---|---|
| 1 | 三旋钮（视觉变化/动效强度/信息密度）先定，再动手 | 写进我们片子的开工检查 |
| 2 | 模板档 / 定制档二选一，营销片默认定制档 | 防止再出"一眼 AI"的片子 |
| 3 | 区别性审查："换别家产品还成立吗" | 成片验收加一问 |
| 4 | CHAI 三性 + 严重问题必须带修改方案 | 并入我们的对抗式审查规则 |
| 5 | 缩放/速度/安全区硬数字表 | 直接当审片尺子（8 个数字，可量） |

### 5.2 可以真用的能力

- **Playwright 真录屏**（已验证）：能把"我们真的在 PS 里改了一层"录下来，比截图板更真。上次 HyperFrames 只能截静态板，这一条补上了。
- **Remotion 合成**（已验证可渲染）：适合片子里"表格→逐语言落位"这类**可以画出来比录出来更清楚**的段落。

### 5.3 不建议接的

- **12 条流水线 + Backlot 看板**：对我们单人体量过重，且大量能力要 key 付费。
- **代码**：AGPL-3.0。用来出片没问题（内部使用不对外分发），但**任何代码搬进我们产品就是传染性开源**——只借方法，不搬代码。
- **它的 100+ 外部服务**：本机 117 项不可用就是证据，接一个配一个 key，性价比低。

### 5.4 三个国内网络坑（和上次 GSAP 是同一类）

1. 官方 PyPI 直连被重置 → 用清华镜像
2. Chrome Headless Shell 113 MB 从 Google 存储下载，3 分钟只到 18 MB → 用系统 Chrome 绕过
3. 它的 HyperFrames 路线仍引用 jsdelivr 上的 GSAP（上次已实测 23 处）→ 离线渲染前必须本地化

这三条合成一句：**它的默认配置在国内不保证能跑，得改三处。**

---

## 六、覆盖缺口（未核实）

- **完整流水线没跑**：七个阶段里至少四关要人工点头 + 大量要 key 的工具，本机只验证了"零键 demo 渲染"和"Playwright 录制配方"两件事。
- **Backlot 看板没试**：FastAPI 服务能起，但看板体验未评估。
- **117 个不可用工具**只代表本机环境，不代表它产品能力。
- **`/product-launch-video` 这个路由指向的 skill 目录不存在**：7 个文件引用、0 个目录（`find .agents -maxdepth 3 -type d -name "*launch*"` 空）。可能是上游发布遗漏，未向上游确认。
- **AGPL 结论是工程常识**（内部使用 vs 对外分发），不是法律意见；真要把它嵌进产品前需要法务确认。
- **录制脚本用的是系统 Chrome**，不是它的标准环境（Playwright 自带 Chromium）；换机器要重验。

---

## 七、可复跑命令（本会话实跑）

```bash
# 1) 克隆与依赖（官方 PyPI 不通时用镜像）
git clone --depth 1 https://github.com/calesthio/OpenMontage C:/Users/ivan/AppData/Local/Temp/OpenMontage
cd C:/Users/ivan/AppData/Local/Temp/OpenMontage
py -3 -m venv .venv
.venv/Scripts/python.exe -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple pyyaml pydantic jsonschema python-dotenv Pillow numpy requests fastapi uvicorn watchfiles websockets

# 2) 能力清点（155 工具 / 37 可用）
.venv/Scripts/python.exe -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.support_envelope(), indent=2))"

# 3) Remotion 依赖 + 零键 demo（绕过 Chrome 下载）
cd remotion-composer && npm install --registry=https://registry.npmmirror.com
npx remotion render src/index.tsx Explainer ../projects/demos/renders/focusflow-pitch.mp4 \
  --props=public/demo-props/focusflow-pitch.json --codec=h264 \
  --browser-executable="C:/Program Files/Google/Chrome/Application/chrome.exe"

# 4) 官网真录屏（照它 .agents/skills/playwright-recording/SKILL.md 的配方）
node C:/Users/ivan/AppData/Local/Temp/om-record/record-site.mjs
ffmpeg -i recordings/*.webm -vf "fps=30,scale=1920:1080" -c:v libx264 -crf 20 -pix_fmt yuv420p site-walkthrough.mp4
```

产物位置：

- 零键 demo：`C:\Users\ivan\AppData\Local\Temp\OpenMontage\projects\demos\renders\focusflow-pitch.mp4`
- 官网录屏：`C:\Users\ivan\AppData\Local\Temp\om-record\site-walkthrough.mp4`
- 抽帧证据：`C:\Users\ivan\AppData\Local\Temp\om-record\f-26.png`（光标 + 滚动后画面）、`C:\Users\ivan\AppData\Local\Temp\OpenMontage\demo-f2.png`（紫渐变环图）

---

## 八、下一步（建议只做第一条）

1. **把 5.1 的五条写进我们的片子开工/验收清单**（半天，零成本，直接减少"一眼 AI"）。
2. 若要真拍版宣传片：用已验证的 Playwright 配方录一段"真在 PS 里改一层"，替换现在片子里的示意段落（需 Owner 先定要不要做对外素材）。
3. 不接它的流水线；等真的要做系列内容、每天出片时再评估。
