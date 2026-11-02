# 字节包：工作台全流程第二轮（WB-UX-FLOW-20261029）

这个文件夹是第二轮改动的**自包含交付件**：谁拿到它，都能看清「改了什么」并能一键退回改动前的样子。

## 里面有什么

- `manifest.json` — 20 个写入目标的清单。每条带 `before`（动工前）和 `after`（动工后）的字节数与 sha256；`kind` 分两类：`modified`（改过的已有文件）与 `added`（这轮新建的文件）。
- `baseline/` — 18 个已有文件的**动工前原件**（逐字节复制）。这是唯一的还原来源。
- `round2.diff` — 16 个真变了的文件、65 个改动块的统一 diff（+581 / −108 行）。
- `restore.mjs` — 还原器，见下。

## 怎么还原

```bash
node restore.mjs --root <要还原的那棵树的根>            # 真还原
node restore.mjs --root <要还原的那棵树的根> --dry-run   # 只看会发生什么，不落盘
```

还原器只会：

1. 把 `modified` 的 18 个文件用 `baseline/` 里的原件覆盖回去；
2. 把 `added` 的 2 个新文件删掉（`src/lib/workbench/workbench-mode-preference.ts`、`tests/unit/workbench-mode-preference.test.ts`）；
3. 逐个核 sha256，对不上就 `exit 1` 并点名。

还原前会把目标树里的现件备份到 `pre-restore-<时间戳>/`（可用 `--backup-dir` 改位置），所以误操作也能反悔。任何路径解析后跑到 `--root` 之外，直接拒跑。

## 两条必须知道的

- **`execute-step.tsx` 的还原点是「第二轮动工前」，不是 HEAD**。这个文件同时带着别的会话 2026-10-27 的未提交改动（下载链接 D5 等），用 `git checkout` 或 HEAD 还原会把别人的活一起抹掉。
- **还原演练是在临时镜像树上做的**（`node tmp/rehearse-restore-20261029.mjs` 在容器根跑）：20 条目标全部命中、真工作树的 sha 演练前后零变化。不要在共享的 `worktrees/develop` 里试还原。

## 验过什么

- 还原演练 6 项断言全通过：还原 18 / 删除 2 / 失败 0；镜像树与 `baseline/` 逐字节一致 18/18；真树零改动。
- `--dry-run` 对真树跑过一次：退出码 0、真树 sha 不变。
