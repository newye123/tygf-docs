# 英文品牌词两套方案对比（LayerLingo / TypeFerry）

时间：2026-10-18 22:4x · 树：worktrees/develop · 状态：等 Owner 拍名字，未动任何代码

## 结论

我建议用 LayerLingo，把握度七成。

拍板钥匙不是哪个词好听，是先卖给谁：
- 卖给自助上手的电商/平面设计师（您的第一指标是首跑成功率）——选 LayerLingo。听一遍就猜得出干什么，也拼得出来。
- 卖给本地化公司/印前供应商——选 TypeFerry。更像一件正经工具，调性压得住报价和发票抬头。

## 方案 A：LayerLingo（我推）

图层加语言，两个头音 L，类目命中最直接，几乎不用解释。四个音节有节奏，适合短视频开头报名。
域名 layerlingo.com 当天可注册（Verisign RDAP 实测返回 404，即未注册）。
要认的坑：lingo 偏口语，对着印前和本地化公司显得轻，报价页调性要靠版式拉回来；另外它和 Duolingo 同样以 lingo 结尾，商标近似初筛要盯这一条（我这轮没能核实）。

## 方案 B：TypeFerry（质感更沉）

type 指到排版，ferry 是摆渡，意象干净，对 B 端邮件与发票抬头压得住。
域名 typeferry.com 当天可注册（RDAP 404）。
要认的坑：语义不自动说明翻译或多语，首次触达的解释成本比 A 高一截；ferry 偏运送意象，若日后主打在文件里就地改字，名字会略偏；听写容易错成 Fery 或 Pherry。

## 两条筛名尺子（也是别的设计被筛掉的原因）

一、不用拼音。现英文名是 Tuyi Workshop（src/config/siteContentEn.ts 第 11、16、39 行，src/app/en/layout.tsx 第 27 行）。Tuyi 与途屹控股（tuyigroup.com，港股 01701）同拼音，而 10 月 16 日实测豆包把 tuyigf.com 判成仿冒它的钓鱼站、主动劝退用户，这是两个成因之一。拼音对英文买家还不可读、不可搜，AI 复测里品牌命中为零。

二、品牌词里不放 PSD 或 Photoshop。一是 Adobe 商标风险，二是把名字框死在一个格式（我们已经在做 PSB 面）。类目说明交给 tagline 那行 PSD multilingual delivery workbench。

## 成本实测

换站面英文品牌词很便宜：src 里七个文件十七处，真品牌串只有 brand.name、meta.title、首屏正文一句、OG alt、mailto 主题这几处；siteContentEn.ts 第 7 行的注释自己就写着「换名只改 brand.name 加 meta.title 两处」。其中四处是字体族名 Tuyigf Source Han Sans，那枚跟域名走，不动域名就不必碰。

对比：换中文名「图译工坊」是 383 处、跨 299 文件，贵二十倍。

## 换名不解的三件事

一、不解域名。tuyigf 里仍含 tuyi。要彻底切断就得连域名一起换，代价是 Google Search Console 与百度站长已提交的资产作废（ISSUES 第 119、131 条：百度验证本来就在抖）。
二、不解备案。无 ICP 备案仍是劝退的第一成因，那是路线 A（备案）对路线 B（第三方信源）的独立决策，挂着等您拍。
三、助手面是另一档成本。连本机安装包名与 Roaming/TYGF 数据目录一起换要真出一版 exe；具体同步文件数我这轮没实测，标未核实。

## 探针与可复跑口径

域名探针原式：curl 到 rdap.verisign.com/com/v1/domain/ 加域名。负控 qqzzxx-none-check8317.com 返回 404，正控 lexlayer.com 返回 200 且 2579 字节真 RDAP 体，说明探针标定过。注意：404 只代表域名未注册，不代表没人拿它做商标。

已被注册的候选（RDAP 200，只能去买）：lexlayer、typeport、layerglyph、lingualayer、translayer、wordrift、copyferry、leadline。
lingoglyph 与 reflowtype 域名虽空，但普通买家不会拼，淘汰。setglyph.com 探针返回 000，未核实。

## 待核事项

一、LayerLingo 与 TypeFerry 在 USPTO 与 EUIPO 第 42 类是否干净，我没查，改名前必须查。
二、换名后 GEO 基线要重测（GEO-BASELINE-RETEST 现挂 10 月 23 日复测比对，ledger 第 153 行）。
三、本轮只出方案，没有改任何代码，也没有改台账状态；名字定了再落 TASK_LOG 与 CHANGELOG。
