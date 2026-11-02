# Photoshop 实际输出质检接入执行报告

承接：Owner 要求把离线质检接入 Photoshop 实际输出，并让工作台和交付报告直接指出哪份稿、哪个图层需要复核。
方法：对抗式核对输出身份、测量边界与展示接缝；运行 13 组接入检查、既有回归和隔离 Photoshop 合成稿实测。
结论：源码已接通 Photoshop 重开结果、工作台与本机交付 HTML；缺字和缺字体仍明确未检测，助手新包尚未构建或安装。

VERDICT: CONCERNS

## 对你意味着什么

生成后，工作台会按来源稿、输出文件、语言和 Photoshop 图层显示问题原因；本机交付 HTML 也会逐份稿列出结果、图层位置和不能自动检查的项目。它是复核提示，不是视觉验收结论。

接入代码通过了隔离合成稿的真实 Photoshop 保存与重开测试。本地助手 3.7.30 安装包仍未生成，因此当前运行的旧安装包还不能提供这项新功能；没有发布或部署。

## 接入结果

- Photoshop 执行器在保存、关闭并重开最终 PSD 后，将回读到的文字与本次冻结的批准译文逐项对照；批准范围来自本次 Photoshop 扫描观测。随后对已发布的最终文件计算 SHA-256，并只在指纹与回读证据一致时汇总质检。证据：`worktrees/develop/download/local-assistant/v15-runner.js:101`、`:312`；扫描范围来源：`worktrees/develop/download/local-assistant/server.js:3112`、`:8166`。
- 缺文件、错指纹或证据身份不一致时，质检回到“未测量”，不会借用旧结果或显示假通过。缺少批准源范围时也不填零边界。证据：`worktrees/develop/download/local-assistant/production-quality.cjs:225`、`:241`、`:400`。
- 工作台状态链已传回净化后的摘要，画面显示来源稿、输出名、语言、图层编号和原因；同名稿按短路径区分，并且切换到另一组稿时不会把旧摘要贴到新稿上。来源原路径只用于浏览器组件内存中的稿件身份匹配，不显示、不持久化、不上传。证据：`worktrees/develop/download/local-assistant/attempt-runtime.js:135`、`worktrees/develop/src/lib/workbench/local-assistant-client.ts:1690`、`:1729`、`worktrees/develop/src/components/workbench/execute-step.tsx:450`、`:495`、`:3413`。
- 本机交付 HTML 按语言和输出文件列出问题、图层、原因及未检测项；明确提示这不是视觉验收。报告中的摘要会先与实际交付文件名对账。证据：`worktrees/develop/download/local-assistant/report-renderer.js:194`、`:588`。
- 质检摘要不进入本地生成回执或云端结算回执，也不改变结算摘要。证据：`worktrees/develop/download/local-assistant/receipts.js:51`；13 组 smoke 的第 10 组覆盖这一边界（`worktrees/develop/scripts/smoke-photoshop-output-quality.mjs:153`）。

## Photoshop 实测

用 Photoshop 22.0 打开独立合成源稿，执行保存、关闭、重开，仅读取合成文件中的文字图层，再对真实 PSD 文件计算摘要。测试前后已有文档数均为 1，Photoshop 进程未变化，临时文件在退出时清理。测试输出 SHA-256 为 `70a0b17e…fa06329fa`；回读文字与独立批准夹具一致，图层编号为 3。

本次状态为“未测量”是预期结果：文字边界和画布检查有实际测量，但 Photoshop 当前采证没有可靠的缺字与缺字体读数。报告明确列出这两项待人工查看。使用故意过期的指纹重查，结果仍是“未测量”，没有把旧证据算到新文件上。

实测入口：`worktrees/develop/scripts/smoke-photoshop-quality-live.mjs:21`、`:231`、`:288`。它不读取或修改原有用户文档正文。

## 测试结果

- `node scripts/smoke-photoshop-output-quality.mjs`：13 组接入检查通过，退出码 0；仅用合成字节，不打开用户文档。覆盖错指纹、缺范围、越界、交叠、未测项、同名稿身份、报告展示、回执隔离和重复运行。
- `node --experimental-strip-types --experimental-loader ./scripts/ts-path-loader.mjs scripts/smoke-production-quality.mjs`：18 组离线质检和学习安全检查通过，退出码 0；这是合成测试，不是 Photoshop 实测。
- `node scripts/smoke-photoshop-quality-live.mjs`：真实 Photoshop 隔离合成稿测试通过，退出码 0；文档数 1→1、PID 不变、过期指纹负控为“未测量”、临时产物已清理。
- `node scripts/smoke-v15-runner.mjs`、`node scripts/smoke-attempt-runtime.mjs`、`node scripts/smoke-report-coverage-honesty.mjs`、`node scripts/smoke-workbench-ui-contract.mjs`：均退出码 0。runner smoke 内部故意构造的报告写入失败日志仍出现，但测试本身通过。
- `npx vitest run tests/unit/multi-draft-stage-queue.test.ts`：6 项通过。
- `npx tsc --noEmit`：退出码 0。
- 定向 ESLint：退出码 0、0 errors、6 条无障碍标签 warning；warning 位于工作台其他现有控件。
- Node 语法检查：质检器、Photoshop runner、助手 server、运行状态和报告渲染器均退出码 0。

## 对抗式审查与自我修正

- **跨接缝探针，Survived: yes。** 输出摘要穿过 runner、助手终态、前端轮询和工作台后仍保留产物身份；诊断摘要不进入结算回执。负例由 13 组 smoke 检查。
- **需求反转，Survived: yes。** 去掉输出指纹、批准范围或有效证据时必须退为“未测量”；越界时点名具体图层，不允许缺测伪装成 0。见 smoke 第 2、3、4、8 组。
- **规模跳变，Survived: yes。** 30 个图层、每层 2 条未测项目时，总数仍为 30、未测数 30、finding 总数 60；界面最多展开 20 条并保留另外 40 条的数量提示。
- **重放探针，Survived: yes。** 相同输入重复检查结果完全一致，源产物字节不变。
- **推翻自己的结论：** 初版把“实际文件 SHA”留在“预期指纹不匹配”的记录里，可能让展示误以为证据已绑定；现改为身份不匹配时不带 SHA。初版还把质检摘要塞进本地回执对象，可能改变结算摘要；现把它移出回执，只随本机助手状态返回。批量恢复失败时的语言标签也改为优先采用恢复批次语言。
- **新增的一处接缝问题：** 多稿共用一个工作台执行卡，原先仅按语言与文件名区分结果，同名稿可能被覆盖或误贴；现在按来源稿身份区分，并使用现有短路径标签。该源稿身份只存在于浏览器内存。

## 逐项对账

- 预期译文：执行清单中的 `target_text`，与 Photoshop 重开得到的文字对照；没有从输出稿反抄预期（`v15-runner.js:101`）。
- 批准范围：由助手服务端保存的源稿扫描观测计算；缺少观测就记为未测（`server.js:3112`、`:8166`）。
- 输出身份：对最终文件实际算 SHA-256，并与发布流程给出的输出指纹比对（`production-quality.cjs:225`、`:241`）。
- 可见复核：工作台逐图层列原因；报告按输出文件逐行列结果；两处都明示尚未测量的项目（`execute-step.tsx:3413`、`report-renderer.js:588`）。
- 结算边界：质检摘要只用于提示，不随结算回执发送或参与回执摘要（`receipts.js:51`；`smoke-photoshop-output-quality.mjs:153`）。

## 仍未完成

- **本地助手新包待生成和安装。** 源码发布身份要求 3.7.30、`local-report-v3`、`renderer-v4`（`worktrees/develop/config/release-identity.json:2`），而现有本地 dist 仍是旧包。`node scripts/check-release-identity.cjs` 退出码 1，报告版本、文件名、build ID、schema、renderer 不匹配且缺少 `tygf-engine-setup-3.7.30.exe`。构建工具 `pkg`、`ISCC`、`csc` 均未在 PATH 找到；原 `build/dist` 还含 `.tygf_session`，本轮没有覆盖。
- 没有用真人 PSD 做完整工作台到 Photoshop 的人工验收；没有安装新助手，也没有部署两站。
- 缺字、缺字体、图形遮挡、语义正确性、完整图层清单仍无法可靠自动确认；没有漏检率、误报率或节省人工复核时间的真实数据。
- Graphify 命令不可用；按仓库要求改用源文件与运行结果核对。

## 建议下一步

推荐先在独立、空白的构建目录准备助手打包工具，再生成 3.7.30 安装包并通过发布身份检查；之后由 Owner 选择一个获准的真实样稿做完整工作台人工复核。完成前不把这项能力说成已安装、已部署或已减少人工复核。

## 本次未动什么

未读取或修改用户 PSD 正文；未覆盖现有 `build/dist`；未安装/发布助手，未推 GitHub、未部署测试站或生产站，未改变支付或学习自动应用开关，未处理历史待结批次。共享工作树保留并行未提交修改；未执行重置、清理、暂存或提交。

本轮开始时 `develop` 的 Git HEAD 为 `71529c7c10dae22db64305df042dd07d4392d9a1`。工作区仍有并行会话的未提交内容，因此本报告不代表这些现场已被提交或归属本任务。
