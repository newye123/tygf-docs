## 2026-10-07 10:1x 指针：主干 `2a5b980`（对 `origin/develop` **未推＝4**）／测试站仍 `6fa6bb9`（合入未部署）／生产 `eeb994c`；本批范围按兵部取证收窄【总控长 `bffb0b95`】

- **做到哪里**（10:11:34 现读）：develop HEAD `2a5b980`、分支 develop、`origin/develop..HEAD`＝**4**（未推）、`git status --porcelain`＝**1**（只剩受保护现场 `AI_MEMORY/ISSUES.md`）。今日已合四笔：`4ddfa59` 09:53 礼部对外文本 R2、`a03b8d0` 09:54 P0（未接走 attempt 改按批次年龄＋规模预算，新终态码 `NEVER_DISPATCHED`，固定 5 分钟钟一字未删）、`60205cf` 10:04 与 `2a5b980` 10:06（3.7.6 安装器的 `.gitignore` 例外＋安装包进跟踪）。
- **两站现读**（10:10:02 同拍）：测试站 BOUND `6fa6bb9`／期望助手 **3.7.6**（409 B）＝**合进去的这四笔还没上站**；生产 BOUND `eeb994c`／3.6.60（424 B）＝未动。3.7.6 安装包可达（本手 00:18 区间请求 206；总控 00:11:59 报 200／盘上 12,396,783 B）；本拍拉整包 25 秒超时 `curl rc=28`＝本机出口慢，**不是 404**。
- **今天最重要的一个转向**（兵部 `0ecb1d0a` 10:00 回包 ⓪-2）：10-05 那批未受理的六枚，助手日志给出的真 code 族是 **清单绑定 409×3／就绪扫描 422×1／票据重放 403×1／证据不可达 503×1**，而 `ASSISTANT_BUSY`／`busy_gate`／`attempt_lock` 在该 13 分钟窗内**计数全 0** ⇒ 「助手忙」没发生过 ⇒ **忙等预算那一刀（A1／A2）对本批零作用**，两处前端改动不做。新落点＝`BATCH_MANIFEST_BINDING_FAILED` 同批连中三次，与 `smoke-v3-batch-flow.mjs:33` 的"语言级"断言相冲，建议先开**只读定性单**再谈动码。
- **分工现状**（Owner 10:1x「来吧」）：唯一签发口＝总控 `4ffb89ca`；总控长转记账·审计·复验路由·5857 对账线。会话身份与角色见 `总控/名册_会话与角色_20261007.md`（标题不可信，认这张表）。
- **下一步（等 Owner 明令，不自行放宽）**：push 这 4 笔＋部署测试站属高风险动作，笼统授权不覆盖 ⇒ 需 Owner 一句；部完 Web 面即可验 P0，助手侧本批不动。

## 2026-09-27 11:5x 指针：主干 `b72df7e`（对 `origin/develop` 未推＝**1**）／测试站 `d9bbcc7`／生产 `eeb994c`；对外主张仍冻结，下一步等 Owner 一句【总控长 `bffb0b95`】

- **做到哪里**：昨夜修复批次①②③已落 develop `b72df7e`（committer 23:28:50，3 文件 171+/3−，同拍 `git show -s --format=%ci HEAD` 现读）。**push 现境＝未推 1 枚（就是这一笔）**；另有一枚常被写错的数：`origin/main..HEAD`＝**82** 是 **develop 领先生产主线的发版缺口**（`origin/main` 现指 `cf926b8`，09-20；remote-tracking ref 最后更新 09-26 23:09:16，本窗未 fetch），**不是积压**。把 `origin/main..HEAD` 称作"未推"这一旧写法属标签错，更正入账见 `总控/官制.md:1505`（该行自带引文，复跑计数会加数——按规矩只核命中行号）。
- **两站现读**（10:14:56 同拍探，`/api/runtime-provenance`）：测试站 BOUND `d9bbcc7`／3.7.3（416 B）、生产 BOUND `eeb994c`／3.6.60（424 B）。⇒ 本册原第 3 行"已部署测试站 `d24d2b0`＋push 积压全量清零"已被今日读数取代——那半句在其 09-26 18:1x 当时成立，判**过期**、不判假账，旧行不删。
- **下一步（等 Owner，不自行放宽）**：`repo:check` 合入格 `总控/待投递指令.md:793` 行首现挂「销·等 Owner 一句」；Owner 一句"今天动 develop"⇒ 签发手改回待投＋同拍留钟，载体投构建槽，约 4 分钟出逐门 rc 与耗时（**6→7 门的总耗时至今无数＝开窗计划的必需项**）。在此之前：对外主张冻结、生产不动、不 push、不部署、不跑 `--apply`。

# CURRENT_STATUS.md — 图译工坊当前状态

## 2026-09-26 18:1x 指针：**修复批次统一交付并已部署测试站 `d24d2b0`＋push GitHub（积压全量清零）**

- Owner 亲测批次卡住（「重新执行/取消退积分」无反应）⇒ 当日两轮修复五笔：`8f1a0bb` 执行步三处静默拦截改如实提示、`8f19d0a` **门禁解锁（tsconfig/eslint 排 tmp：tsc 574s OOM→53s rc=0、lint 1500 假红→rc=0）**、`d6f60fe`+`d24d2b0` UIUX 对抗审查八处（导航落错层/忽略行两击确认/幻影面板文案六处/无超时请求/两 title）、`9418cac` **#111 引信拆除**（cleanup-review-snapshots 缺省只数+--apply 才删；拆前实测服务器零调度引用）＋ **#118 账号标识向前脱敏**（develop 5 处+容器根 7 处）。
- **push**：`cf926b8..d24d2b0 → origin/develop`（GitHub 同步，历史性首次全量）。**部署**：RELAX 合法路径（detached 干净树→preflight 六门 PASS→出包→ssh 部署），备份 `deploy-20260926_181115-d24d2b0c88c3`；公网 provenance **BOUND/d24d2b0**、latest 200/3.7.3。坑留痕：checkout 脚本 CRLF 须转 LF 才能服务器 bash 执行。
- 测试站现跑：Web `d24d2b0`（含 UIUX 修复）＋助手 3.7.3。Owner 验收路径：登录→工作台四步（注意「重新配置」新文案与忽略行两击确认）。
- **下一步在 Owner/复验手**：①五笔挂号待复验（队列件名 `GATE-UNLOCK-TMP`/`UIUX-ADVERSARIAL-8`/`FUSE-111-DESENS-118`/`EXEC-STEP-SILENT-BLOCK`）；②P1 批次运行页（事件流水+逐语言重试入口，审查#1 完整修法）；③**批次级「整批取消退回」路由仍等 Owner 拍结算口径**（未执行释放/进行中核对/承诺时效）；④#127 秘密归档与 #125 支付 flag 运行态门禁仍未处置。

## 历史指针（已移档，勿在本文件重写）

- 09-12 至 09-24 各日期指针节（原文 163 行中的 141 行）→ 见 `AI_MEMORY/records/CURRENT_STATUS-历史指针_2026-09-12至09-24.md`；本文件只留当轮指针与现状。
## 一句话状态

> **T-0112 官网首页 v5.6 已上线测试站（2026-09-09/10，两轮）**：Owner 指定 mock（`docs/官网定位调整/图译工坊_模拟首页_v5.6_无句末标点_思源黑体.html`）已完整落地并部署——`home-view.tsx` 重写为 v5.6 八区块、`home-v16.css`→`home-v17.css`（作用域化）、真实申请表保留。第一轮 `442526e`→`41e58ee`（9/9），第二轮 9 处截图评审修复 `58f5855`→`ee6add0`（9/10，含品牌「图」字标恢复、4 处 section-lead 换行、try 左栏联系方式块；合并时吞并了并行 T-0107 3.6.27 的 develop 推进）。验证全绿（tsc/lint/trust-chain/row-contract + 本地与公网多视口零溢出 + 公网 9 处断言）。**遗留**：①页面写「最多 12 语种」但代码上限 10（Owner 裁决按 mock，产品待追平）；②思源黑体走 jsdelivr CDN，上线前需自托管。详见 TASK_LOG T-0112 / HANDOFF。
> **T-0107 时序修复 3.6.30 候选已打包（2026-09-10，4a69ba9，本地未 push 未 deploy）**：对抗审查实锤启动预取误入 5 分钟定时器 + /ping 竞态 + kick 依据内存态 + manifest 非原子写，已全修并加 /ping phase 与浏览器有界等待一次；11 场景对抗测试全绿；安装包 SHA 3997086E...B39。待 Owner 测试机 P0 取证 + 部署授权。前序：3.6.29 诊断增强已部署（fc1884e）：Owner 装完 3.6.28 实机仍报「版本不兼容（unknown/unknown）」。服务器取证：**3.6.28 曾于 09:56:20 成功分发 5 脚本（exeSha=c3a137f6…，云端 200）**→ 云端链路健康，嫌疑排序=旧引擎进程占 49152 / 客户端缓存写坏（杀软）/ ping 竞态。3.6.29 加诊断：/ping 暴露 `scriptDistributionStatus`（lastRefreshAt/lastError/逐脚本 sha8|MISSING）+ 降级 kick 重试 + 浏览器报错文案附诊断摘要。**待 Owner：退托盘/结束引擎进程（或重启）后装 3.6.29；再报错直接截图（文案含诊断）**。
> **T-0107 全部上线 + 实机热修（2026-09-10）**：测试站 `0dca91c`→`fc1884e`，助手 **3.6.29**（v15-script-distribution-diag-20260910-r2，SHA 1461EDF4…F405）。**Owner 最新指引：重装 3.6.28**（3.6.26/3.6.27 的脚本分发在实机失败：installId 缺失 400 + 单 origin + 旧残留抢先——已三修：路由放宽 installId/多 origin 刷新/候选序缓存优先+unknown 跳过+自愈刷新）。exe 零明文（JSX 云端分发+pkg bytecode+MachineGuid 硬失败+完整性锚点/删除自证/会话 ACL/v3 AAD）+ 自攻脚本 CLEAN。未实施：法务条款（待产品审阅）、Phase 3（永久搁置）；残余：运行时内存提取不可防（方案 #100）。**T-0111 Golden 序列仍待 Owner 真机**（1/5/8/12 逐级 + 断网恢复 + WRITE_DONE 重启 + 多显示器 picker）。
> **闸已开（2026-09-09，Owner 指示「直接开放合量改语言」）**：测试站 TYGF_EXECUTION_ENABLED 0→1，实测探针穿过执行闸（receipt 探针 503→400 参数校验）。批量能力三件套齐：TYGF_ENVIRONMENT=test + BATCH_EXECUTION_MODE=canary + batchBillingV3Enabled 默认 true（canary 白名单空=全部已激活设备）。**旧助手 3.6.23 会被 P1 身份门 fail-closed 拒绝（提示升级 3.6.24）——属设计行为**。跳过原 Golden 逐级方案=Owner 授权覆盖；历史 15/17 批次裁决仍待 dry-run 审计（不阻塞新批次：legacy 键保持 NULL 不占位）。
> **待批**：官网文案直改 B 方案（`docs/records/20260908_官网文案直改_B方案_执行方案.md`，Content Studio V1 上加前端直改层，估 4 工作日）。
> **未破案**：12 语言批次卡死——云端分类已完成（卡死语言跨 ES/NL/SV/DE，非 DE 特有；根因=执行链机制：PS 挂起+助手内存态+回执断链），本方案 P3/P4/P5 即根因修复；等 Owner 测试机 `.execution` 取证补充现场细节。

> **T-0065 方案待批（2026-09-06 深夜）**：供应商双语 CSV 跑不通根因=修复算子单一+segmentSpan=6<实际段长+缺译/空原文无排除出路；解法=Gale-Church DP 对齐器+五算子 TypedRepairPlan+EXCLUDED 四层同步。文档 `docs/records/20260906_bilingual_align_qa_plan.md`（100 向量）。~~待 Owner 批准~~ → C1 已执行。

> **T-0064 C1 已落地（2026-09-06 晚二）**：Account-First 云端身份解析已部署测试站 `647184a`——换浏览器/清缓存不再要求重输邀请码（登录会话 fallback + 助手 token 权威化 + 客户端规范 ID 采纳）。验证全绿；无会话 403 fail-closed 实测。**待 Owner 验收**：换浏览器登录→工作台应零输码直达。排队：C2 助手自持持久 ID、C3 登录自动激活新机、P1 每日积分。develop ahead 29 未推送（push 需 Owner 授权）。

> **T-0063 收口（2026-09-06 晚）**：P0-A 修复已部署（云端缺 digest → `ATTEMPT_EVIDENCE_REQUIRED` + "请升级助手"文案，`348de03`/`314df9d`）；68 积分守恒 **PASS**（4 次 −68/+68 全配对 user_cancelled，余额 888，零残留）；P0-B 定位=服务端 60s 超时从未触发、499 为客户端断开，已加 abort 传播+耗时提示。待 Owner：新电脑重装 3.6.21 助手；ISSUES #34 生产野进程 / #35 清理 cron 处置授权。

> **TEST_AUTH_MAIL_GOLDEN_PASS 达成（2026-09-06 凌晨）**：邮件登录链路全闭环（T-0061）——注册验证邮件真实送达、点链接验证成功、登录成功、忘记密码+新密码重登成功（Owner 实测）。四层根因修复：HtmlBody 参数不存在（模板模式重写 b6f98e0）、区域 ap-singapore+intl 端点（7c3bd03）、模板被拒=变量携完整链接→固定域名版过审（71676/71677，Status=0）、双斜杠链接（8400b65）。key 门真身=源站 nginx，已豁免 /auth/verify+/auth/reset（其余 403 保留）。测试站现部署 8400b65。附带：Owner 走完 Batch-1 Web-only 人工验收（执行被 Kill Switch 正确拦截）。遗留：Yt 策略还原、废密钥禁用、BetaUser 窗口无 admin 端点（手改过一次 DB，旧值已备份）。
>
> **下一任务 T-0062（Owner 已指示）**：开放全量语言执行测试——走 Wave 1 Execution 开放前置链。

> **TEST_BATCH_1_WEB_ONLY_LIVE 达成（2026-09-05）**：Batch-1 Web-only Kill Switch 已部署测试站 `f962c64`（BATCH_1_SOURCE_SHA=`3cb32f7`，merge=`fee8391`，import 修复=`f962c64`）。`TYGF_EXECUTION_ENABLED=0` fail-closed：20 边界 503 EXECUTION_DISABLED（服务器实测）、capabilities executionEnabled=false、verify 查询语义 valid:false。ETIMEDOUT 根因 #33（journal fsync）修复=两 harness 90s+WAL。运行验证：BATCH1_EXECUTION_KILL_SWITCH_PASS、Test DB preflight 数据零丢失（BF=3/RDE=208）、公网带 key 200/无 key 403。Owner 裁决 Test DB 历史残留（1270 冻结/22 attempt）可容忍留待清理。

> **多窗口并行注意**：develop 在 9/01-9/05 间被多窗口推进（3.6.17-3.6.21、content studio、runtime provenance 等），本轮 batch1 基于 72267fd 干净分叉。`localAssistant.ts` 曾用 createRequire 被浏览器 chunk 打包炸 build（Turbopack panic），已改回 ESM `with { type: 'json' }`——**客户端组件禁用 node:module**，此教训记录在案。

> **UX #25 与本轮报告合同均已覆盖**：执行确认页计费明细默认折叠；票据/授权错误保留真实 `message/code`；“本地助手未运行”仅用于 ping 离线；失败报告使用红色中文原因，不伪造未生成文件。

> **发布安全态保持不变**：3.6.16 不覆盖；本轮未触碰 `main`、生产站、支付 flag、历史批次。无 key 的 `/download` 保护策略不变。

## 进行中事项

1. **助手安装绑定与 3.6.17 发布收口**：代码、离线 smoke、测试站预检、远端部署与公网回读已完成。
2. **测试机真人验收**：覆盖安装 3.6.17 后验证连接、扫描、智能检测、单语言、双语言、失败报告与失败结算；未知状态不得自动重跑。
3. **批次完成率与按语言计费**：代码 smoke 已绿，真实跨层/Photoshop E2E 仍是批量入口的证据门。
4. **支付上线收口与用户追认**：支付 flag、`BATCH_EXECUTION_READY`、Owner 退款 API、支付宝资质仍按既有红线处理。

## 下一步建议顺序

1. 测试机覆盖安装 3.6.17，完成人真人 Windows/Photoshop 验收；未完成前保持 `BATCH_EXECUTION_READY=false`。
2. 记录测试站 3.6.17 的版本、build、schema、renderer、安装包 SHA 和批次证据，确认网页与本地报告一致。
3. 对现有悬挂批次只读核对；未知账务状态不猜、不重跑、不直接改积分。
4. A5 协议/支付宝资质与生产上线流程继续由用户逐项批准。

## 历史验证基线（已移档）

- "最近验证基线（2026-08-30）"节（22 行）→ 同上档案文件；现行验证基线以 `AGENTS.md` 末节与最近一次门读数件为准。
## 关键路径速查

- 唯一活动目录：worktrees/v1.5-trust-chain（分支 codex/v1.5-trust-chain）
- 主线方案：docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md
- 批次闭环方案：docs/图译工坊_本地多语言批次执行闭环解决方案_20260824.md
- 批次 v3 对抗式执行文档：docs/图译工坊_批次v3行身份证据与结算闭环_对抗式执行文档_20260825.md
- 第 4 步与 HTML 报告恢复文档：docs/图译工坊_V1.5第4步与HTML报告样式恢复_对抗式执行文档_20260825.md
- 中文报告与多语言解锁方案：docs/图译工坊_V1.5多语言解锁与中文执行报告_对抗式方案_20260825.md
- 接力入口：docs/HANDOFF.md 与 docs/records/
- 记忆系统：AI_MEMORY/

## 快速重启检查单

- 读 AGENTS.md → 本文件 → HANDOFF.md 最近记录 → git log/status 比对
- 坑：只改 v1.5-trust-chain；graphify 空壳勿依赖；6 支付 flag 保持 false；BATCH_EXECUTION_READY=true 待追认；禁止 reset/checkout/clean/restore/force-push；密钥禁明文；测试站需 ?key=
