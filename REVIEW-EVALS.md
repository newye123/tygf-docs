# REVIEW-EVALS — 逃逸到生产的缺陷与本该拦住它的那一层

> 用法：任何「审查没拦住、生产真出事」的缺陷追加一行。修改审查技能、清单或评审 prompt 后用本表全部案例重放打分：命中数上升且干净改动上的有害误报不增加，才保留改动。

| 日期 | 缺陷类别 | 落点 file:line | 本应哪一层拦住 | 为什么没拦住 |
|---|---|---|---|---|
| 2026-09-14，2026-10-20 复发 | 跨层合同不一致（行标识白名单两侧各写各的） | src/lib/workbench/workbench-revision.ts:28 ＋ download/local-assistant/execution-manifest.js:168 | 出包前的「浏览器产出 对 助手校验」同判门 | 该门不存在：grep -rl 白名单正则 scripts/ 得 0 文件；既有夹具全用生成形态 id（smoke-execution-manifest.mjs:150 等），用户可控串从未进用例 |
| 2026-10-20 | 可观测面失效而无人察觉（排障快照恒 503、目录自 09-17 零文件） | deploy/deploy-release.sh:244（ProtectSystem=strict 未放行 support-bundles） | 部署脚本的写路径能力自证：上站后真实写一次并回读文件数 | 部署只检 HTTP 200；route.ts:68-70 把异常吞掉不记日志，无信号可检 |
| 2026-11-01 | 归因错标（只抄门的输出文本，没读豁免白名单） | scripts/smoke-release-consistency.mjs:269-274 | 本应"测试证据"层拦住 | 复现了 rc 却没复现 rc 的判定路径 |

## 干净改动探针（与命中率一起看，防审查自增）

- 2026-10-20 本轮：对「新增守卫＋文案＋部署脚本可写路径」这一改动，审查产出 9 条 findings，若照改会造成危害的条数＝1（放宽服务端形状闸），已驳回并记录理由。
