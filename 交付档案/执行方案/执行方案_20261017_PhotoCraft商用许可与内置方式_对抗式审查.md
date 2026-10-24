# 执行方案：PhotoCraft 商用许可核验 + 内置进本地助手安装包（对抗式审查 2026-10-17）

**直接回答您的两个问题：**

1. **内置方式**——是的，内置进我们本地助手的安装包，作为助手目录里的一个引擎文件随包一次装完，用户不需要单独再装 PhotoCraft，界面也不出现它的名字。落点在 `installer.iss`（助手安装包脚本）里新增两条安装条目 + 一个许可目录，细节见 §三。
2. **能不能直接商用**——**能**。上游是 `MIT OR Apache-2.0` 双许可（二选一由我们定），商用、修改、闭源、收费都不被禁止，且不要求我们开源自己的改动。但"直接拿来"不等于"扔进包里就走"：**有 6 条必须做的合规动作和 3 条禁区**，其中最容易翻车的是"隐藏品牌＝可以不提它"这个念头——不行，许可文本必须随包分发。全部结论都有本轮实测坐标，见 §一。

风险评级：**可以商用（高把握，已闭合）**。依赖闭包 **345 个 crate 已逐只核验完毕**（脚本 `tmp/pc-license-scan.sh`，结果 `tmp/pcdeps-licenses.tsv`）：**零 copyleft 阻断**——唯一带 copyleft 选项的是 `r-efi`（`MIT OR Apache-2.0 OR LGPL-2.1-or-later`，三选一，我们取 MIT/Apache 即无 LGPL 义务），且**没有任何一只 crate 的 GPL/LGPL 是唯一选项**。

---

## 一、许可取证（本轮实测，逐条给坐标）

1. **上游身份**：`github.com/storytold/photocraft`（public），组织 ArtCraft Team，联系人域名 getartcraft.com。许可文件由上游提交 `cf93edc9`（作者 Brandon Thomas，2026-10-04，提交名就叫 "Licensing: MIT OR Apache-2.0 files, NOTICE, ArtCraft brand terms, attribution"）加入——**不是我们自己写的**。

2. **许可证没被动过（字节级验证）**：我们 fork 的 git blob 与最初下载的原始快照逐一对齐——`LICENSE-MIT` 两边同哈希 `0accf067631245c6f174a6863dc408e3f99ddb79`、`NOTICE` 同 `0b2eedb19760b0552983988ff62e62e7eb3d687f`、`LICENSE-APACHE` 同 `598f87f072f66e2269dd6919292b2934dbb20492`。（直接对工作树文件算哈希会得不同值，那是 CRLF 造成的环境差，不是内容差；必须用 `git show HEAD:<file>` 取 blob 再算。）

3. **许可覆盖全仓**：workspace 根 `Cargo.toml:9` 写 `license = "MIT OR Apache-2.0"`，28 个成员 crate/应用全部是 `license.workspace = true`（实测 `crates/*/Cargo.toml`、`apps/*/Cargo.toml` 无一例外）⇒ 不存在"某个子模块许可不同"的暗坑。

4. **二选一怎么选（建议选 Apache-2.0）**：Apache 多给我们一条**明示专利授权**（以及对方滥用专利时的终止保护），代价是两条机械义务——§4(b) 在我们改过的文件里放"变更声明"、§4(d) 分发时必须复现 `NOTICE` 文本。MIT 没有这两条义务但也没有专利授权。我们已经有两处真实改动（`crates/io/src/psd_export.rs`/`crates/text/src/psd.rs`/`engine_data.rs` 那条链上的补丁），变更声明顺手就写。

5. **商标条款反而是帮我们的**：`docs/brand/LICENSE-brand.txt` 有专节"Forks and modified versions"，原文要求——分发修改版**必须移除 ArtCraft Marks（或替换成自己的）**，不得称 ArtCraft、不得呈现为 ArtCraft 产品；并且**允许**用纯文本说明"本产品基于 ArtCraft 团队的 PhotoCraft"。而 `docs/brand/` 目录里每一个文件都被定义为 ArtCraft Marks（实测 9 个：`artcraft-logo*` 与 `artcraft-mark*` 的 png/svg）。⇒ 您要求的"用户不用知道 PhotoCraft 的存在"不但合法，方向和上游条款完全一致：他们要的是别挂他们的牌子。另外反向确认：`ui-egui`（品牌资源所在 crate）**不在 CLI 依赖闭包内**，实测我们的 exe 里 grep `ArtCraft` 命中 **0** ⇒ 商标文件根本没进我们的二进制，干净。

6. **依赖面（商用最大的隐性风险，已做两层取证）**：
   - 算出真实闭包：`Cargo.lock` 共 **729** 个包，但我们要发布的只有 CLI 那棵树——从 `apps/photocraft-cli` 沿 Cargo.lock 依赖边做闭包，得 **395** 个包，其中 registry crate **373** 个（唯一名 **345**），自有 workspace crate 22 个（脚本 `tmp/pc-closure.mjs`，产物 `tmp/pcdeps-crates.txt`）。
   - 逐只许可核验（**已跑完，345/345**）：按名查 crates.io 的 license 字段落 `tmp/pcdeps-licenses.tsv`。分布前几名：`MIT OR Apache-2.0` 154、`MIT` 60、`Apache-2.0 OR MIT` 23、`Unicode-3.0` 22、`MIT/Apache-2.0` 19、`Apache-2.0 WITH LLVM-exception OR …` 16、`BSD-3-Clause` 8、`Apache-2.0` 5、`BSD-2-Clause` 3、`Zlib` 3。**严格 copyleft 命中只有 1 只**：`r-efi`，且是"OR"三选一（取 MIT/Apache 即免除 LGPL）；`LGPL/GPL 为唯一选项`的形制 **0 只**。crates.io 标 `non-standard` 的 1 只（`av1-grain`）我单独下载 crate 包读了原文＝**BSD-2-Clause**（`rav1e` 亦实测 `BSD-2-Clause`），商用可用、须保留版权声明。
   - 方法诚实标注：闭包是从 `Cargo.lock` 的依赖边算的，Cargo.lock 会列入**未启用的可选依赖** ⇒ 这 345 只是**上界（过估计）**，真实出厂件的依赖只少不多；对许可审查而言过估计是安全方向。
   - 结构性旁证（已到手，且很有分量）：他们自己的设计文档 `docs/architecture.md:579` 明写"候选依赖里有 LGPL（rawler）和 GPL-or-commercial（Slint），选 MIT/Apache 会限制我们能用的依赖"——即上游是**带着许可约束挑依赖的**；实测 `crates/raw/Cargo.toml:17-27` 用纯 Rust 自研 Adobe DNG 解码（flate2 + zune-jpeg），**没有引 rawler**；全仓所有 `Cargo.toml` grep `rawler|slint|qt|ffmpeg|libvips` 命中 **0**。`ATTRIBUTION.md` 还规定"第三方素材必须是宽松许可且许可文本随件"。
   - 结论（已闭合）：**依赖面零 copyleft 阻断**，商用成立；唯二要在清单里记一笔的是 `r-efi`（声明我们取 MIT/Apache 选项）与 22 只 `Unicode-3.0`（ICU4X 系，须保留其版权声明）。

7. **二进制里真带进去的第三方材料（最容易漏的一条）**：
   - 4 只字体被**无条件内嵌**进 exe：`crates/text/build.rs`（deflate 后 `include_bytes!`）+ `crates/text/src/fonts.rs:26-40`（Inter-Regular/Medium/SemiBold + JetBrainsMono-Regular，注释自述"OFL; licences in assets/fonts"）。⇒ 我们必须随包附 `assets/fonts/OFL-Inter.txt` 与 `OFL-JetBrainsMono.txt`（SIL OFL 1.1 要求许可文本与版权声明随字体副本分发）。注意 OFL 还禁止**改字体名**（保留名约束）——我们不能把 Inter 改名成"图译字体"。
   - SCOWL 英文词表也被内嵌：`crates/text/src/spell.rs:16` `static WORDS_GZ = include_bytes!(...en_US-scowl-50.txt.gz)` ⇒ 许可原文允许"use, copy, modify, distribute and **sell** … for any purpose"，条件是版权与许可声明随副本出现（须附 `assets/dict/LICENSE-SCOWL.txt`）。
   - 自家 ICC 色彩档 `crates/cms/src/builtin.rs:247` 内嵌，随主许可，无额外义务。
   - GUI 才用的图标里有一只 `CC BY 3.0`（`assets/icons/LICENSE-noun-magnetic-lasso.txt`）——不在我们的 exe 内（同 ui-egui 排除逻辑），**不进清单**；但这条要靠"我们只打 CLI"这个纪律长期成立才继续为真，所以 §三 把许可 bundle 做成构建产物自动核对，而不是人手挑。

---

## 二、对抗式审查（商用这件事会怎么翻车）

- **L-1（阻断级）"藏起来就不用提"是错的。** MIT/Apache 的义务挂在"分发副本"上，不挂在品牌上。我们可以让用户永远看不到 PhotoCraft 三个字（合法、且上游商标条款乐见），但许可文本、版权行、NOTICE 必须随安装包分发，并在产品内给一个"开源许可"入口。当前站内**没有**这个面：实测 `worktrees/develop/src/app/(zh)/` 只有 `privacy / terms / download / pack / survey / auth / admin`；且记忆里提到的法律文案单源 `src/config/legalDocs.ts` 在 develop **不存在**（`ls` 报 No such file，现文案在 `src/config/siteContent.ts`）。⇒ 出厂同笔必须新建开源许可页，否则就是又一桩"文档与代码相反"（LEGAL-1 前例）。
- **L-2（重）改名不是可选项而是义务。** 见 §一 第 5 条：分发修改版必须移除 ArtCraft Marks。落地建议把引擎文件改名成中性名（`tygf-engine.exe`），进程名/日志/错误文案一律不出现 PhotoCraft，界面只说"内置排版引擎"。
- **L-3（重）我们的补丁目前是公开的。** 实测 GitHub API：`newye123/photocraft` 为 `"private": false`、`"visibility": "public"`、`"fork": true`。⇒ 两处让 PSD 能被真 PS 打开的补丁（commit `f0e8d40`）任何竞品都能直接拿走。要独占就得脱离 fork 网络（GitHub 不允许把 public fork 直接转 private；可行做法是把代码复制成一个**非 fork 的独立仓**，许可允许这么做，只要保留许可文本与声明，然后迁 CI）。这是商业决策，不是合规要求——我把代价摆出来给您选。
- **L-4（重）OFL 字体名不可改**，且不得单独售卖字体；随包必须带 OFL 文本。我们 exe 已内嵌 ⇒ 这是硬约束。
- **L-5（中，本条为对我自己上一版的更正）专利敞口被我写重了。** 原写"HEIF/HEVC 有专利池，MIT/Apache 不覆盖专利"方向没错，但**实测范围比那小**：`crates/heif/src/*.rs` grep `hevc|h265|h264|avc` 命中 **0**，依赖闭包里 `hevc|x265|dav1d` 命中 **0**——AV1 路径走纯 Rust `rav1e`（实测许可 `BSD-2-Clause`），而 AV1 本身按 AOM 条款是免版税的。⇒ 结论改成：**这一项不构成阻断**，但首版对外仍只承诺 PSD/PSB 文字层——理由是"我们只验过它"（质量与证据边界），不是专利。
- **L-6（中）质量责任全归我们。** 许可文本明示 NO WARRANTY，且上游 README 自述早期 alpha、"尚不是日常专业工作的 PS 替代"。我们把补丁版内置并向客户收费，出了问题对方只能找我们。⇒ 上一轮的 F-1/F-2（引擎身份闸、哈希强制）才是真防线，本轮方案不替代它，必须一起做。
- **L-7（中）上游若将来改许可。** 我们把版本钉在 `f0e8d40` + `--locked` 构建，已出厂件不受影响；但**每次升引擎都要重扫许可**，所以 §三 把许可扫描做成 CI 门而不是人工。

---

## 三、内置落地方案（一次装完，用户不见品牌）

**形态**：单安装包，不新增任何"再装一个 PhotoCraft"的步骤。

1. **文件落位**：`installer.iss` 新增两条 Source——`dist\bin\tygf-engine.exe`（由 `photocraft-cli.exe` 改名）装到 `{app}\bin\`；`licenses\**` 装到 `{app}\licenses\`。许可 bundle 内容：`LICENSE-MIT`、`LICENSE-APACHE`、`NOTICE`、`ATTRIBUTION.md`、`OFL-Inter.txt`、`OFL-JetBrainsMono.txt`、`LICENSE-SCOWL.txt`，加我们自己生成的一份《第三方开源组件清单》（含组件、许可、版本、上游地址、我们的变更说明）。清单**由构建脚本从许可扫描结果自动生成**，不手抄。
2. **运行时寻址**：`pcExePath` 不再读用户配置，改为固定 `BUNDLED_DIR\bin\tygf-engine.exe`；`pcExeSha256` 出厂钉值并**缺值即拒**（接上一轮第 2 段）。这样用户改本机 JSON 也换不掉引擎，同时满足 L-1 的"我们分发的那个副本"身份可核验。
3. **对外话术与界面**：界面只说"本次由内置排版引擎处理（未调用 Photoshop）"，禁出现 PhotoCraft/ArtCraft 与其任何图形；"基于 ArtCraft 团队的 PhotoCraft"这句只写在开源许可页与随包 NOTICE 复现里（上游明确允许的说法）。
4. **构建与身份**：继续 GitHub Actions 云构建（本机免 Rust）。每次产出**构建清单** `{上游 commit, 我们的补丁 commit, Cargo.lock sha256, exe sha256, 许可 bundle sha256}`，随包并写进发布记录；运行时 `--version` + sha256 现算回写回执（修上一轮 F-1）。若选 L-3 独占路线，则另建非 fork 独立仓并把 workflow 迁过去——这一步要您点头才做。
5. **体积与更新**：exe 43,341,312 B ⇒ 安装包从 ~12.5 MB 涨到量级 ~56 MB（未压缩口径）；Inno Setup LZMA 实际压缩后待实测再定对外说法，**不要把没量过的数当结论**。自动更新面（记忆：自动更新已获您批准但不进当前窗）要把引擎体积计入下载成本。
6. **法务面同笔更新**：新增开源许可页（站内 + 助手关于页）；隐私面**不需要**新增第三方处理方条目（引擎全程本地、依赖闭包内无 HTTP 客户端：实测只有 `tokio`，无 reqwest/hyper/ureq/rustls；exe 内 URL 串扫描只见 XMP/PSD 命名空间常量与噪声片段，无遥测端点）——但这条"文件不出本机"的主张要把这两项实测证据一起入档，别只写结论。

**验收判据（可复跑）**：安装包内 `licenses\` 7 类文件齐、且与上游快照字节一致；`{app}\bin\tygf-engine.exe` 哈希等于构建清单；扫描后 exe 内 grep `ArtCraft` 命中 0；运行时无 PS 机器上助手能报"内置引擎就绪"；开源许可页在站内可达且列出全部内嵌组件（含 OFL 字体与 SCOWL 词表）；许可扫描已跑完（345/345，`tmp/pcdeps-licenses.tsv`，零 copyleft 阻断）——**升引擎版本时该扫描必须重跑**，且清单里要显式记录 `r-efi` 取的许可选项与 22 只 `Unicode-3.0` 组件的版权声明保留义务。

---

## 四、要您拍的三句

1. **独占不独占**：把补丁迁到非 fork 私有仓（别人拿不到我们的 PS 兼容修复，代价＝脱离上游更新流、自己维护全量源码），还是继续用 public fork（能白嫖上游后续修复，代价＝补丁公开可见）？我推荐**先继续 public fork 出厂**（这条链现在最缺的是能用，不是护城河），迁独立仓留到引擎真的成为卖点时再做。
2. **体积换体验**：接受安装包从 ~12.5 MB 涨到量级 ~56 MB（一次装完、用户零感知）？不接受就退回"让用户自装引擎 + 我们只校验哈希并如实报缺件"。我推荐**接受**——您说的"用户不用知道"只有内置这条路线能成立。
3. **对外承诺范围**：首版只承诺 PSD/PSB 文字层，不把 HEIF/RAW 写进任何文案、也不开那些入口。理由已按 L-5 更正改写：**不是因为专利（实测无 HEVC 解码、AV1 免版税），而是因为那些路径我们一次都没验过**——承诺范围只能等于证据范围。我推荐**照此收窄**。

您点头后，我按"§三 的 1-2 条 + 上一轮第 2 段（身份闸）"先开工，许可 bundle 和开源许可页与代码同笔出，不分两次。

— 报告人：Qoder（本会话）｜2026-10-17 16:25:45 追补定稿（钟点为本会话 `date` 实测回显）｜依赖逐只核验已跑完（345/345，零 copyleft 阻断），判定不变；L-5 已按实测自我更正
