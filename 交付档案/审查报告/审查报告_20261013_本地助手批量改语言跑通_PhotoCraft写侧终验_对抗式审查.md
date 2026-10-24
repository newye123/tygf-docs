# 对抗式审查：本地助手批量改语言「怎么跑通」——PhotoCraft 写侧终验与生产链实证

- 日期：2026-10-13
- 性质：只读审查 + 本机隔离实验（全部产物落在 `C:\Users\ivan\AppData\Local\Temp\opencode\pc-decide`，未改任何产品代码、未提交、未部署、未连库、未动 `F:\改语言\` 源件）
- 输入：`https://github.com/storytold/photocraft` 源码（`E:\安装包\photo开源项目代码\photocraft-main\photocraft-main`）＋已装机 `C:\Program Files\PhotoCraft\photocraft-cli.exe`（2026-10-11，67,313,528 B）＋图译工坊全量项目信息＋`项目现状_20261012_总进度与不走PS通道.html`
- 本机真机条件：Photoshop 2021 正在运行（`E:\Adobe\Adobe Photoshop 2021\Photoshop.exe`，HKLM `Photoshop.Application` 存在）

---

## 0. 一句话结论

**「本地助手 + 批量改语言」今天跑不通的瓶颈不在写侧算法，而在生产链三处实测故障（VERIFY_TIMEOUT 10 秒预算、票据/清单绑定、零产出零报告耦合）；写侧本身是健康的（本会话用真 PS 读回产品自己的产物：55 个文字层全是目标语言）。而「去掉 Photoshop、用 PhotoCraft 当写入后端」这条路，本会话用 6 组对照实验证死：PhotoCraft 改过文字的 PSD/PSB，真 Photoshop 2021 一律打不开（6/6），根因钉死到它重生成的 `Txt2` 文档资源块。**

---

## 1. 先回答「用户用本地助手怎么能跑通批量改语言」

分三层，每层都有本轮实测证据：

### 1.1 写侧：继续用真实 Photoshop（路线 C），它是健康的

本会话对照实验（同一台机器、同一个 Photoshop 2021、同一套 COM 读回方法）：

| 文件 | 谁写的 | PS 2021 打开 | 读回文字层 |
|---|---|---|---|
| `B级_Amazon-5857-A_图-8-祝叶子__JP.psb` | **产品自己上一批次产物**（PS DOM 路径） | OK | **55 层全部是日文目标语言**（`ケージ ×1`、`製品寸法: 62.4 × 45.4 × 109.5mm`…） |

这与 10-12 验收记录的结论一致（参照件 PS 打开即显示目标语言、55 层完整、0 层栅格化），并且**这次是独立复现**。⇒ 写侧不需要重建，需要的是让它别被生产链打断。

### 1.2 生产链：跑不通的真凶（按今天还吃不吃产出排序）

| # | 故障 | 现状（本轮实测 file:line） | 后果 |
|---|---|---|---|
| 1 | **VERIFY_TIMEOUT**：验票单跳预算 10s，跨太平洋链路常态超时 | `worktrees/develop/download/local-assistant/server.js:2276` `TICKET_VERIFY_ATTEMPT_TIMEOUT_MS = 10000` **仍是 10000**（25s 的修复只在 `worktrees/production` 未提交 WIP 里） | 10-12 当天：12 语种批次第 5 个语种 10 秒被拒，**整批中断、8 个语种从未执行、用户无任何报告** |
| 2 | 系统性拒绝曾把单语言失败放大成整批半死 | 已在 develop 修好：`src/lib/workbench/batch-error-policy.ts:41-45` 把 `VERIFY_TIMEOUT / BATCH_MANIFEST_BINDING_FAILED / BATCH_MANIFEST_BINDING_INVALID / SCRIPT_COMPONENT_STALE / INCOMPLETE_PROVENANCE` 列入 `SYSTEMIC_PRE_EXECUTION_CODES`（首拒即停批）；`:81` 又把 `VERIFY_TIMEOUT` 列入 `UNKNOWN_BATCH_OUTCOME_CODES`（禁止盲重跑、先对账） | **修复只在 develop；按 10-12 只读读数，生产站停在 09-19 基线 `eeb994c`/3.6.60，三周多的修复一个都没上生产**（本轮未复探两站，未再取证） |
| 3 | 零产出 ⇒ 零报告耦合（助手侧刻意不建空目录；网页侧 Recovery 10.4「设计过、文档写过、代码一天没实现」） | 见 10-12 诊断记录 §四-5（`generate.ts` 整模块零引用） | 「什么都没做」和「做砸了」在用户眼里一模一样 |
| 4 | 回执重放打本机 `::1:3000` 每 5 分钟一次 ECONNREFUSED（自 09-11 起，日志已 2 万行） | 开放 | 无产出损失但污染日志与界面 |
| 5 | 字体覆盖结论已测出但未接线（泰语是唯一硬约束语种；`glyph-coverage.js` 产品链路零引用、fontkit 在 devDependencies 且未装、从未打过第三方原生模块进 exe） | 开放 | 泰文等语种可能渲染成替代字体 |

**⇒ 「跑通」的动作清单**：① 把 `TICKET_VERIFY_ATTEMPT_TIMEOUT_MS` 抬到 25–30s（server.js 一处常量，随 3.7.16）；② 让 production 树里那份在飞 WIP（server.js 25s＋execute-step.tsx＋failure-report.ts）先收尾提交，别两路一起改；③ 部署 develop 已修好的批次策略 + 失败报告到生产站（属授权门，AGENTS.md 明令不得从 develop 直建生产）；④ 泰文按「逐层判该层字体覆盖不了该层目标文字才换」接线（结论已有，缺 fontkit 进 exe 的打包 spike）。

### 1.3 「不要 Photoshop」：本轮证死，附复测门

详见 §2–§4。**今天不能把它当备选路线写进任何计划**——它产出的是客户 Photoshop 打不开的文件。

---

## 2. PhotoCraft 是什么（源码 + 装机双查）

| 项 | 证据 |
|---|---|
| 身份 | Rust 重写的 Photoshop clone，storytold/photocraft；`crates/text` 描述自述 "Font database, text shaping/layout (parley) and text-layer rasterization"（`crates/text/Cargo.toml`）；`crates/psd` "Faithful, lossless reader and writer for Adobe Photoshop PSD (v1) and PSB (v2)" |
| 许可 | `Cargo.toml:9` `license = "MIT OR Apache-2.0"`；README:413 双许可。**闭源商用无阻塞**；ArtCraft 品牌资产不在许可内（`docs/brand/LICENSE-brand.txt`）。Cargo.lock 内未发现 GPL/AGPL 依赖 |
| 成熟度自述 | README:301 **"early alpha … not yet a Photoshop replacement for daily professional work"**；明确缺口含 "depth in typography" 与 plug-in 兼容 |
| 无头能力 | `apps/photocraft-cli/src/lib.rs:69-98` 子命令：`convert / info / run --cmd <id> --params <json> --out / batch --actions / droplet / commands / mcp / serve`（JSON-lines 控制协议）。`serve` 的 methods 含 `engine.execute, doc.open/save/render/inspect, batch` |
| 文字编辑 API | `crates/engine/src/type_cmds.rs:742` `type.edit`：`{"layer":id,"text":str}` 全量替换且**保留字符/段落样式**；`:924` `type.info` 读 text/runs/paragraphs/shape/transform/laid-out lines/bounds；`type_extra_cmds.rs:402` `type.updateAllTextLayers` 全层重排重渲染 |
| 写侧机制 | `crates/engine/src/type_cmds.rs:461-467` `refresh()`：改字后**重渲染像素 + `build_tysh` 重生 TySh**；`crates/io/src/psd_export.rs:570` 导出时用新 TySh；`psd_export.rs:1556-1595` 导出时**重生成文档级 `Txt2`** |
| 实测安装版 | `C:\Program Files\PhotoCraft\photocraft-cli.exe` 可用；`info/run` 对真实客户件 rc=0；`type.info` 输出 UTF-8 正常（`±`、`ü` 无乱码——之前 10-12 记录里的 `?` 是 PowerShell 管道转码，不是 CLI 问题） |

**Read 侧无问题**：PC 对真实来件的解析能力已被 10-12 批测证实（57 份/3525 层零违反），本会话复跑 `info` 两份大文件均 rc=0。

---

## 3. 决定性实验：PC 改过的文件，真 Photoshop 打不开

全部用真实客户件拷贝到 temp 后操作，源件只读。判据只有一个：**真 Photoshop 2021 能否打开**（COM `app.open`，`DisplayDialogs=NO`）。

### 3.1 六臂对照（文件：`1126 Amazon-SJ日本站-5275-高级A+-改语言x7`，97MB，243 层/80 文字层）

| # | 文件 | PC 做了什么 | PS 2021 打开 |
|---|---|---|---|
| 1 | `src33.psd` | —（原厂 PS 件） | **OK** |
| 2 | `converted33.psd` | `convert` 原样重存 | **OK** |
| 3 | `updated33.psd` | `type.updateAllTextLayers`（80 个 TySh **全部**由 PC 重生、文字不变） | **OK** |
| 4 | `edited33.psd` | `type.edit` 层 241 文字 `491.0 ± 10.0g` → `Gewicht: 491,0 g ± 10,0 g (1000 Stück)`（变长） | **FAIL**「常规 Photoshop 错误」 |
| 5 | `edit_same_len.psd` | 同层 → `Gewicht: 491`（**等长** 13 字符） | **FAIL** |
| 6 | `edit_short.psd` | 同层 → `Hi`（**更短**） | **FAIL** |
| 7 | `edited33.psb` | 同编辑、PSB 输出 | **FAIL**（错误码不同：打开选项不正确） |
| 8 | `fresh.psd` | PC 从零建文档 + `type.create` | **FAIL** |

### 3.2 泛化（第二个真实文件、不同字体）

`B级_Amazon-5857-A_图-8-祝叶子__JP.psb`（93MB，55 文字层，字体 Noto Sans Medium）：原件 PS **OK**；PC `type.edit` 层 173 `ID 5857` → `ID 5857-DE` 后 **FAIL**。⇒ 不是某个文件/字体偶发。

### 3.3 变量分离：只有 `Txt2` 块不同

对第 4 臂的失败文件做**原位等长**块替换（同一文件、同一偏移、同一块长 495,751 B，只换内容）：

| 变体 | `Txt2` 块内容 | PS 打开 |
|---|---|---|
| `edited33.psd` | PC 重生成的 Txt2 | **FAIL** |
| `edit_txt2zero.psd` | 同长度全零 | **FAIL**（证明 PS 严格解析 Txt2，也排除了「块长/偏移」因素） |
| `edit_txt2orig.psd` | **原厂 PS 写的 Txt2 + 补零** | **OK** |
| `edit_txt2flat.psd` | PC 的 Txt2 把 `\n\t` 原位换成空格 | **FAIL**（见 §4，PC 的 Txt2 不只是格式差） |

⇒ **根因 = PC 重生成的 `Txt2` 文档资源块，Photoshop 解析不了**。TySh/EngineData/像素都不是打不开的原因（原 Txt2 一换就能开）。

### 3.4 字节级差异

```
原厂 Txt2 头 64B:  20 2f 39 38 20 3c 3c 20 2f 30 20 37 ...   " /98 << /0 7 >> ..."
PC   Txt2 头 64B:  0a 0a 2f 39 38 0a 09 3c 3c 0a 09 09 2f 30 ...   "\n\n/98\n\t<<\n\t\t/0 ..."
```

- PC 用**换行 + Tab 缩进美化排版**（本轮统计：495,751 B 内含 31,893 个 `\n`、274,878 个 `\t`）；Photoshop 的 Txt2 是**纯空格分隔单行 DSL**。
- 但把 `\n\t` 全换成空格仍然 FAIL：PC 的 Txt2 块 **495,751 B vs 原厂 222,310 B（2.2 倍）**，内容组织方式也不同。⇒ 不是单纯空白符问题，是 `build_txt2` 的输出结构不对。
- 附带证据：`updated33.psd` 的 Txt2 与原厂 **sha 逐字节相同**（`37b5fcbd81eb`）——PC 在「文字没变」时保留原块，在「文字变了」时才重生成并产出坏块。这与 §3.1 的 OK/FAIL 分界完全吻合。

### 3.5 「保留原 Txt2」也不是解法（路线 A 的僵尸复发）

`edit_txt2orig.psd` 虽然 PS 能打开、画布像素也确实是新德文（本会话对比了原/新两张 PS 合成图：文字区 9.26% 通道差异 >24，新文字已渲染进像素），但 **`textItem.contents` 读回仍是旧文字 `491.0 ± 10.0g`**——PS 从 Txt2 取该层文字。⇒ 交付物文字层数据与像素不一致，用户一点进文字层就会翻回旧文。这正是 10-12 记录里路线 A「PS 直接丢弃新文字回退旧像素」的同款失败，只是延迟到用户点击时爆发。

### 3.6 附带风险：PC 的写侧不是无损重存

同一 97MB 文件：`convert` 原样重存后 97,221,180 → 95,612,740 B（**−1.6MB**）；10-11 那次 roundtrip 是 176MB → 264MB（**+88MB**）。两个方向都会变，说明它对未触碰内容做了重新编码。产品要求「源文件不出本机、不降级」，这条路即便打开问题修了也要重新做无损审计。

---

## 4. 对抗式质疑：我自己实验的弱点

| 质疑 | 处置 |
|---|---|
| 只测了 Photoshop 2021 | 分界由内容决定（§3.3 三变体同长度只换内容），不是版本特异性；但严格说未测 2024/2025。生产客户版本未知，需在部署前抽样复测 |
| PS 当时开着用户的文档，COM 失败会不会是实例状态 | 已排除：每臂都单独 `app.open`，原厂件与 PC 重存件在同会话稳定 OK，坏件稳定 FAIL；`pscheck2.ps1` 单独重试复现同样失败 |
| `DisplayDialogs=NO` 吞掉了字体缺失对话框导致假失败 | 部分排除：同文件原厂件在同样设置下 OK；且 PC 的字体警告是「用替代字体渲染但不中断」。**未完全排除**：若需要，可用 DisplayDialogs=ALL 单例复跑（有挂起风险，未做） |
| 「改的是 Auto-name 层，层名变化会不会才是原因」 | 未单独隔离。但 `edit_txt2orig` 保留了同样的改名且能打开 ⇒ 改名不是打不开的原因 |
| Txt2 根因只在一个文件上钉死 | 三变体同长度同偏移，因果链完整；但 PC 的 `build_txt2` 为什么产出 2.2 倍体积，**未逐行定位**（属上游 bug，向上游报告时代码位置：`crates/text/src/psd.rs` `build_txt2` / `crates/io/src/psd_export.rs:1576`） |
| 「PC 不能当生产者」是否推广到所有用途 | 不推广。只对「写客户 PSD/PSB 交付物」判死；扫描/预览/报价/参照物生产不受影响 |

---

## 5. 修正 10-12 现状报告的两条口径

1. §3.2/§8.1 说「PC 存的 PSD 在真 PS 里打开对不对没人验过」——**现在验了，答案是打不开**（6/6 编辑 + 1 从零文件 + 1 PSB）。该报告 §四「下一步二选一」的第 ① 项（补 PC 终验）可以结案。
2. §8.1 那条「未投递线索」`tmp/pc-roundtrip/ps_out.png` 的来历：本会话复跑同类链路时确认，**那张图极可能就是历史上某次人工用 PS 打开 PC 产物时留下的**——但现在有决定性证据表明那条链路在今天的新构建上不成立，不能拿它当「PS 验收通过」的旁证。

---

## 6. 那么「本地助手无 PS 也能批量改语言」到底怎么才有可能

按证据强度排序，三条都带**复测门**：

| 路线 | 判定 | 复测门 / 前置 |
|---|---|---|
| **A. 助手继续当编排器，PS 当写入器**（现状） | **可行，推荐**。跑不通的是生产链（§1.2），不是写侧 | 把 10s 抬到 25–30s、production WIP 收尾、develop 修复部署上生产（授权门） |
| **B. PC 当写入器** | **今天不可行**（§3） | 上游修复 `build_txt2` 后，用 §7 的命令原样复跑六臂；另需：泰文/日文排版（0.82/255 均值、最差 2.88 是日文件；泰文仅 1/4 份爆掉且是缺 `Adobe Thai` 字体）、无损重存审计、exe 侧写（`photocraft-cli.exe` 67MB 进安装包的 SHA 完整性门） |
| **C. 交付物改为合成图（PNG/JPG）** | 产品决策，不是工程绕路 | Owner 拍「交付物是否允许非 PSD」；若允许，PC 渲染均值 0.82/255 可接受，但泰文需先解决替代字体问题；且「可编辑文字层」这一卖点消失 |

**给工程侧的中间收益（不改变交付合同）**：PC 的 Read 侧是干净的，可把助手的**扫描/预览/报价**改为 PC（去掉「预览也要开 PS」的依赖），写侧仍留给 PS。这会改变扫描证据合同，须按 AGENTS.md 合同变更纪律四层同步 + 更新 `smoke-batch-row-contract` fixture，未跑 `test:batch-row-contract` 与 `test:trust-chain` 不得部署测试站。

---

## 7. 复跑命令（本会话原样使用，全部可复现）

```powershell
# 0) 隔离目录 + 真实客户件拷贝（源件只读）
$d = "C:\Users\ivan\AppData\Local\Temp\opencode\pc-decide"
Copy-Item "F:\改语言\完成的\1124 Amazon-SJ日本站-5275\1126 ...psd" "$d\src33.psd"

# 1) PC 读结构（UTF-16 输出注意：用 cmd /c 重定向保留 UTF-8）
& "C:\Program Files\PhotoCraft\photocraft-cli.exe" info "$d\src33.psd" --compact
& "C:\Program Files\PhotoCraft\photocraft-cli.exe" run "$d\src33.psd" --cmd type.info --params '{\"layer\":241}'

# 2) 六臂
& ... run "$d\src33.psd" --cmd type.updateAllTextLayers --out "$d\updated33.psd"
& ... run "$d\src33.psd" --cmd type.edit --params '{\"layer\":241,\"text\":\"Gewicht: 491\"}' --out "$d\edit_same_len.psd"
& ... run "$d\src33.psd" --cmd type.edit --params '{\"layer\":241,\"text\":\"Hi\"}' --out "$d\edit_short.psd"
& ... convert "$d\src33.psd" "$d\converted33.psd"

# 3) 真 PS 打开判据（COM，DisplayDialogs=NO，只开不存）
$ps = New-Object -ComObject Photoshop.Application; $ps.DisplayDialogs = 3
$doc = $ps.Open("$d\edited33.psd")   # 抛 COMException = 打不开

# 4) Txt2 三变体（原位等长替换）+ 读回
#    见本轮 tmp 脚本：tyshblocks.cjs / txt2patch.cjs / txt2flat.cjs / cmpcanvas.cjs
```

---

## 8. 本轮未做 / 未决

- 未定位 PC `build_txt2` 产出 2.2 倍体积的逐行原因（上游 bug 报告材料已备：头 64B hex 对照 + 三变体矩阵）。
- 未用 Photoshop 2024/2025 复测（本机在跑 2021；2024 已装未启）。
- 未开 `DisplayDialogs=ALL` 复跑（挂起风险）。
- 未动任何产品代码、未提交、未部署、未连库、未改 `F:\改语言\` 源件。
- 泰文语种在 PC 渲染下的硬约束（缺 `Adobe Thai` 时用替代字体但文件里仍声明 Adobe Thai）未在本轮复测，沿用 10-12 实测结论。

---

## 9. 结论

1. **「本地助手批量改语言」要跑通，动作在协调层不在写侧**：抬验票预算、停批策略上生产、补失败报告、再接字体覆盖。写侧继续用真实 Photoshop——本会话已独立复现「PS 打开产品自己的产物 = 55 层全是目标语言」。
2. **「去掉 Photoshop 用 PhotoCraft 写入」今天必须判死**：6/6 编辑产物真 PS 打不开，根因是 PC 重生成的 `Txt2`（换行+Tab 排版、2.2 倍体积）。这不是我们的 bug，也不该用「保留原 Txt2」糊弄——那只会把失败推迟到用户点击文字层。
3. 上游修 `build_txt2` 的那天，用 §7 的命令原样复跑六臂即可重新开题；在那之前，任何「无 PS 批量改语言」的排期都是把客户交付物押给一个 early-alpha 项目的待修 bug。
