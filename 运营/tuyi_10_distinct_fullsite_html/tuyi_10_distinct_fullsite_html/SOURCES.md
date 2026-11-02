# 资料来源与核对日期

核对日期：2026-10-27。产品官网是本项目的一手资料；方法论来源仅使用英文官方或项目主页。

## 图译工坊一手资料

- 首页：<https://tuyigf.com/>。用于核对输入条件、单批语种上限、工作流描述、QA 边界和 CTA。
- 下载页：<https://tuyigf.com/download>。用于核对当前公开版本、操作系统和 Photoshop 实测范围。
- 隐私政策：<https://tuyigf.com/privacy>。用于核对文件本体、图层文本、路径、诊断数据、第三方 AI 和服务器位置的公开说明。
- 第三方处理方清单：<https://tuyigf.com/privacy/subprocessors>。正式发布前需重新核对当前名单。

## 对抗式审查与设计 QA 的英文资料

1. Promptfoo GitHub README, LLM evaluations and red teaming: <https://github.com/promptfoo/promptfoo/blob/main/README.md>
   - 用途：把宣传假设写成测试用例，保留失败结果，不以主观印象代替验证。
2. Promptfoo evaluation guidance: <https://github.com/promptfoo/promptfoo/blob/main/site/docs/getting-started.md>
   - 用途：通过明确 assertions 和正反例检查输出是否满足要求。
3. OWASP Threat Modeling Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html>
   - 用途：审查数据流、信任边界、存储、处理节点和外部实体。
4. US Federal Trade Commission, Policy Statement Regarding Advertising Substantiation: <https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation>
   - 用途：作为宣传主张证据审查的参考，尤其是直接与隐含的客观主张。具体适用法律需按目标市场确认。
5. W3C Web Content Accessibility Guidelines (WCAG) 2.2: <https://www.w3.org/TR/wcag/>
   - 用途：作为键盘操作、焦点可见、Reflow 和表单可访问性的检查依据。

## 使用边界

上述方法资料用于形成审查清单，不代表这些原型已通过正式安全审计、法律审查或 WCAG 合规认证。原型的静态检查结果见 `QA_REPORT.md`。
