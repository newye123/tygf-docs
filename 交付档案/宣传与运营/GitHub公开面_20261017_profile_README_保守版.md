# 图译工坊 · Tuyi Workshop

**把已有的译文，批量写进 PSD/PSB 的文字图层——交付仍可编辑的多语言设计源文件。它不做翻译。**

Batch-write **existing translations** into PSD/PSB text layers, keep every text layer editable, and deliver an auditable package. It does not translate.

## 它是什么

图译工坊（官网 [tuyigf.com](https://tuyigf.com)）是一个 **PSD/PSB 多语言落版工作台**：你提供设计稿与**已经定稿的译文**，本地助手驱动你本机的 Photoshop 逐图层写入，每处写入回读核对，产出可继续编辑的源文件和一份可复查报告。

服务的是长期做多语言设计交付的人：跨境品牌的详情页 / A+ / 主副图、条漫与同人本的多语言版本、产品说明书的多语种改版。

## 它不是什么

它**不是**图片翻译工具，也不是 ImageTrans。图片翻译那类工具解决「把图上的字翻成另一种语言」，产出是一张图；图译工坊解决「把设计稿改成多语言版本」，产出是可以继续编辑的源文件。输入是你**已有的译文**——我们不做翻译。

## 四步

1. 上传设计稿，导入或粘贴译文表，选目标语言——单批最多 **12 个**目标语种，逐语言连续执行
2. 本地助手驱动**本机 Photoshop**，把译文写进文字图层
3. 逐处回读核对：写得不一致的恢复原文；拿不准的（同一原文多种译法、可能溢出）停下来交给人决定
4. 交付：各语种 PSD（文字层保持可编辑）+ 导出图像 + 可复查报告

## 数据边界（如实说）

- 设计稿**文件本体**（.psd / .psb 的字节）与替换后导出的图像只在你本机处理，不上传；用于对账的文件摘要也在你本机计算。
- 会上传到云端的是：图层里的文字、表格中的原文与译文、排障信息等，用于报价、图层绑定、下发执行与结算；使用智能检测时，原文与当前译文会交给第三方 AI 模型服务审查。逐项列在[隐私政策](https://tuyigf.com/privacy)与[第三方处理方清单](https://tuyigf.com/privacy/subprocessors)。

## 运行环境

Windows ＋ 本机已安装的 Adobe Photoshop。当前只支持这一种组合。图像文字识别（OCR）未接入当前产品流程，本工作台处理的对象是译文表与文字图层。


## 交付检查清单

开工前自查与交付前复核用的可复查清单，见 [多语言设计稿交付检查清单（CHECKLIST.md）](./CHECKLIST.md)。里面包含图层体检、译文表、对账、执行三条硬规则、交付三件套，以及 Photoshop 查找替换／变量数据组／jsx 脚本／表格化插件／图片翻译这几类替代做法的能力边界对照。

## 状态与联系

产品处于内测阶段（邀请制）：在官网 [tuyigf.com](https://tuyigf.com) 提交申请，作者会逐一回复；有真实多语言改图项目、愿意反馈问题的用户优先。邮箱 [tuyi@tuyigf.com](mailto:tuyi@tuyigf.com)。本地助手安装包与安装步骤：[tuyigf.com/download](https://tuyigf.com/download)。

本仓库是公开文档面，不含源码，也不含任何客户素材。

---

**English.** Tuyi Workshop writes your existing translations back into PSD/PSB text layers on your own machine, reads back every write to verify it, and delivers editable source files plus a reviewable report. Up to 12 target languages per batch. The design files themselves never leave your machine; layer text, your source/target table entries and diagnostic data do go to the cloud for quoting, binding, execution and settlement — see the privacy policy on the site. It does not translate. Windows + local Adobe Photoshop required. Beta, invite-based: apply at tuyigf.com.
