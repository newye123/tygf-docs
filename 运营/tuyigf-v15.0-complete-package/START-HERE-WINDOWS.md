# Windows 快速启动说明（V15.0）

## 运行前

- Windows 10 / 11，64 位。
- Python 3.11 或更新版本，并安装 Python Launcher（`py`）。
- 首次安装需要网络连接以下载依赖。
- 建议先用一份小型 PSD 测试，不要直接拿大型 PSB 做首次验证。

## 第一次使用

1. 解压完整项目 ZIP 到本机固定目录，例如 `D:\TuyiWorkshop\`。
2. 双击 `install-v15-local-agent.bat`。
3. 等待 FastAPI、psd-tools 和其它依赖安装完成。
4. 双击 `run-v15-local-agent.bat`。
5. 浏览器会自动打开本地扫描器。默认端口为 8765；如果被占用，程序会自动选择后续可用端口。
6. 点击「选择 PSD / PSB」，选择文件后点击「开始只读扫描」。
7. 扫描完成后查看文字图层清单，可导出 JSON 或 CSV。

## 文件安全

- 当前版本只读，不写回 PSD/PSB。
- 扫描时会在项目 `local-agent/data/scans/` 下保存一份任务副本。解析在独立 worker 进程运行，默认 20 分钟超时。
- 确认不再需要扫描记录时，可在界面中删除任务，任务副本会一并删除。
- 原始 PSD/PSB 不会被覆盖。任务副本在扫描前后进行 SHA-256 校验，副本变化时扫描任务会失败。
- 不要把本地 Agent 暴露到局域网或公网。

## 如果无法扫描

- 如果界面提示缺少 `psd-tools`，重新运行 `install-v15-local-agent.bat`。
- 如果 Python 版本过低，安装 Python 3.11+ 后重新安装依赖。
- 如果文件格式不支持，确认文件扩展名为 `.psd` 或 `.psb`，且文件头有效。
- 如果解析失败，保留错误信息与 PSD/PSB 副本，在 Photoshop 中确认文件可正常打开。
- 解析器结果仍需和 Photoshop 对照，不能把结构扫描成功当成版式验收。

## 当前版本能力边界

V15.0 只做 PSD/PSB 结构扫描。它尚未导入译文表、匹配图层、枚举 Windows 字体、连接 Photoshop、写入文字或导出 JPG/PNG。真实文件兼容性需要逐份对照 Photoshop 验证。
