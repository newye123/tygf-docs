#!/usr/bin/env node
// 官网流量日读数（只读）。2026-10-27 B1 落地后可用：nginx 日志新增 host= 与 rt=。
// 边界：只把聚合 awk 送上去跑，**本机只接收计数**（不取 IP、不取 UA、不取正文）；不写生产、不改配置。
// 自测跑的是同一份 awk（本机 GNU awk 与服务端同族），不是 JS 复刻件。
// 用法：node scripts/site-traffic-report.mjs [--json] [--quiet] [--self-test] [--log <path>]
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

// 可被 env 覆盖，便于负控（指到不存在的主机）与日后接测试站独立主机
const SSH_HOST = process.env.SITE_TRAFFIC_SSH_HOST || 'tygf-server'
// 大小写各给一个字符类：服务端 awk 可能是 mawk，不能依赖 gawk 的 IGNORECASE
const BOT_RE = 'Googlebot|Bingbot|[Bb]ot|[Bb][Oo][Tt]|[Ss]pider|[Cc]url|[Pp]ython|[Ss]crapy|[Cc]ensys|[Mm]asscan|[Hh]ttpx|[Nn]uclei|[Gg]o-http|[Jj]ava/|[Oo]khttp|GPTBot|ClaudeBot|Bytespider|Petalbot|Ahrefs|Semrush|[Dd]omraider|Zgrab|[Ff]eeds|[Ss]canner|PaloAlto|Lighthouse|[Cc]rawler'
const OWN_IP = '43.134.175.26'

// 唯一的聚合逻辑真源：远端读数与 --self-test 共用这一段
const AWK = `
awk -v botre="${BOT_RE}" -v own="${OWN_IP}" '
{
  hh = ""; rr = ""
  for (i = NF; i >= NF - 3 && i >= 1; i--) {
    if ($i ~ /^rt=/ && rr == "") rr = $i
    else if ($i ~ /^host=/ && hh == "") hh = $i
  }
  if (hh != "") { h = substr(hh, 6); known++ } else { h = "(no_host)"; legacy++ }
  if (h == "(no_host)") next
  isbot = ($0 ~ botre)
  if (isbot) uniqbot[h SUBSEP $1] = 1; else uniqhum[h SUBSEP $1] = 1
  if ($1 == own) selfhits[h]++
  hits[h]++
  if (($6 ~ /^"GET/ || $6 ~ /^"HEAD/) && ($7 == "/" || $7 == "/en")) {
    home[h]++
    if (!isbot) homehum[h SUBSEP $1] = 1
  }
  if ($6 ~ /^"GET/ && $7 ~ "^/download") dl[h]++
  if ($6 ~ /^"POST/ && $7 == "/api/beta-applications") post[h]++
  if (($7 == "/" || $7 == "/en") && rr != "") {
    v = substr(rr, 4) + 0
    if (v > rmax[h]) rmax[h] = v
    if (v > 2) rslow[h]++
    rcnt[h]++
  }
}
END {
  printf "meta legacy_no_host=%d new_format=%d\\n", legacy + 0, known + 0
  for (h in hits) {
    printf "site|%s|hits=%d|uniq_ip_human=%d|uniq_ip_bot=%d|home_hits=%d|home_uniq_human=%d|download_hits=%d|apply_posts=%d|self_ip_hits=%d|rt_max=%.3f|rt_gt2s=%d|rt_n=%d\\n", h, hits[h], cnt(uniqhum, h), cnt(uniqbot, h), home[h] + 0, cnt(homehum, h), dl[h] + 0, post[h] + 0, selfhits[h] + 0, rmax[h] + 0, rslow[h] + 0, rcnt[h] + 0
  }
}
function cnt(arr, h,   k, n) { n = 0; for (k in arr) { split(k, p, SUBSEP); if (p[1] == h) n++ } return n }
' "$LOG"
`

function shellScript(logPath) {
  return `set -u\nLOG='${logPath}'\n[ -f "$LOG" ] || { echo "LOG_MISSING $LOG"; exit 1; }\n${AWK}\n`
}

function parse(text) {
  const out = { legacyNoHost: 0, newFormat: 0, sites: {}, raw: text }
  for (const line of text.split('\n')) {
    const lm = line.match(/^meta legacy_no_host=(\d+) new_format=(\d+)$/)
    if (lm) { out.legacyNoHost = +lm[1]; out.newFormat = +lm[2]; continue }
    if (!line.startsWith('site|')) continue
    const parts = line.split('|')
    const s = { host: parts[1] }
    for (const kv of parts.slice(2)) { const i = kv.indexOf('='); s[kv.slice(0, i)] = kv.slice(i + 1) }
    out.sites[s.host] = s
  }
  return out
}

const FIXTURE = [
  '1.2.3.4 - - [27/Oct/2026:10:00:00 +0800] "GET / HTTP/1.1" 200 98000 "-" "Mozilla/5.0 Chrome/120" host=tuyigf.com rt=0.014',
  '1.2.3.4 - - [27/Oct/2026:10:00:01 +0800] "GET /en HTTP/1.1" 200 90000 "-" "Mozilla/5.0 Chrome/120" host=tuyigf.com rt=2.500',
  '5.6.7.8 - - [27/Oct/2026:10:00:02 +0800] "GET / HTTP/1.1" 200 98000 "-" "Python-urllib/3.11" host=tuyigf.com rt=0.010',
  '9.9.9.9 - - [27/Oct/2026:10:00:03 +0800] "GET /download HTTP/1.1" 200 5000 "https://tuyigf.com/" "Mozilla/5.0 Safari/537" host=tuyigf.com rt=0.020',
  '9.9.9.9 - - [27/Oct/2026:10:00:04 +0800] "POST /api/beta-applications HTTP/1.1" 201 100 "-" "Mozilla/5.0 Safari/537" host=tuyigf.com rt=0.030',
  '2.2.2.2 - - [27/Oct/2026:10:00:05 +0800] "GET / HTTP/1.1" 403 162 "-" "Mozilla/5.0 Edge/114" host=test.tuyigf.com rt=0.000',
  '43.134.175.26 - - [27/Oct/2026:10:00:07 +0800] "GET / HTTP/1.1" 200 98000 "-" "curl/8.5.0" host=tuyigf.com rt=0.001',
  '3.3.3.3 - - [27/Oct/2026:10:00:06 +0800] "GET /api/site/feature-flags HTTP/1.1" 200 445 "-" "Mozilla/5.0 Chrome/120"',
].join('\n') + '\n'

function runAwkOn(text, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tygf-traffic-st-'))
  const log = path.join(dir, tag + '.log')
  fs.writeFileSync(log, text, 'utf8')
  const script = shellScript(log.replace(/\\/g, '/'))
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8' })
  fs.rmSync(dir, { recursive: true, force: true })
  if (r.status !== 0) throw new Error('awk failed rc=' + r.status + ' ' + String(r.stderr).slice(0, 300))
  return parse(r.stdout)
}

function selfTest() {
  const g = (p, host, key) => p.sites[host]?.[key]
  const p = runAwkOn(FIXTURE, 'fixture')
  const prod = p.sites['tuyigf.com'] || {}
  const tst = p.sites['test.tuyigf.com'] || {}
  const cases = [
    // 先量"仪器有没有吃到数据"——0 行的 awk 会让下面所有断言一起假失败或假通过
    ['夹具 8 行中 7 行带 host ⇒ new_format=7', p.newFormat === 7 && p.legacyNoHost === 1],
    ['无 host= 的 1 行被排除出站点桶', p.legacyNoHost === 1],
    ['官网 hits=6（含自身 IP 那发）', prod.hits === '6'],
    ['官网真人 IP=2（1.2.3.4 与 9.9.9.9）', prod.uniq_ip_human === '2', prod.uniq_ip_human],
    ['官网爬虫 IP=2（Python-urllib 与 curl）', prod.uniq_ip_bot === '2', prod.uniq_ip_bot],
    ['首页命中=4（/ 与 /en）', prod.home_hits === '4', prod.home_hits],
    ['真人首页去重 IP=1', prod.home_uniq_human === '1', prod.home_uniq_human],
    ['下载页=1', prod.download_hits === '1', prod.download_hits],
    ['申请 POST=1', prod.apply_posts === '1', prod.apply_posts],
    ['rt 最大 2.500（含 /en）且 >2s 计 1', prod.rt_max === '2.500' && prod.rt_gt2s === '1', prod.rt_max + '/' + prod.rt_gt2s + '/n=' + prod.rt_n],
    ['服务器自身 IP 单列=1', prod.self_ip_hits === '1', prod.self_ip_hits],
    ['测试站独立成桶（B1 之前做不到）', tst.hits === '1' && tst.uniq_ip_human === '1'],
  ]
  // 负控：把 host= 抹掉 ⇒ 该行必须掉出站点桶，而不是被算进某个站
  const stripped = runAwkOn(FIXTURE.replace(' host=tuyigf.com rt=0.014', ''), 'neg1')
  cases.push(['负控：抹掉 host= 后该行不计入官网（hits 6→5）', g(stripped, 'tuyigf.com', 'hits') === '5' && stripped.legacyNoHost === 2])
  // 负控：把某条爬虫 UA 换成浏览器 UA ⇒ 真人 IP 必须**比基线多 1**、爬虫少 1。
  // 写成相对基线的断言，才不会在"探测器根本不认这类 UA"时巧合通过（本轮就抓到过一次）。
  const debot = runAwkOn(FIXTURE.replace('Python-urllib/3.11', 'Mozilla/5.0 Chrome/120'), 'neg2')
  cases.push([
    '负控：换掉一条爬虫 UA 后真人 IP 恰比基线 +1',
    Number(g(debot, 'tuyigf.com', 'uniq_ip_human')) === Number(prod.uniq_ip_human) + 1
      && Number(g(debot, 'tuyigf.com', 'uniq_ip_bot')) === Number(prod.uniq_ip_bot) - 1,
    `human ${prod.uniq_ip_human}→${g(debot, 'tuyigf.com', 'uniq_ip_human')} bot ${prod.uniq_ip_bot}→${g(debot, 'tuyigf.com', 'uniq_ip_bot')}`,
  ])
  // 负控：POST 路径改名 ⇒ 申请数必须归 0（不是沿用旧值）
  const nopost = runAwkOn(FIXTURE.replace('/api/beta-applications', '/api/renamed'), 'neg3')
  cases.push(['负控：改掉 POST 路径后 apply_posts 归 0', g(nopost, 'tuyigf.com', 'apply_posts') === '0'])

  let bad = 0
  for (const c of cases) {
    const [name, ok, actual] = c
    if (ok) console.log('ok   ' + name)
    else { bad++; console.log('FAIL ' + name + (actual === undefined ? '' : '  实得=' + actual)) }
  }
  console.log(bad === 0 ? `self-test: ${cases.length} 例全部通过` : `self-test: ${bad}/${cases.length} 例失败`)
  process.exit(bad === 0 ? 0 : 1)
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) return selfTest()
  const asJson = argv.includes('--json')
  const quiet = argv.includes('--quiet')
  const li = argv.indexOf('--log')
  const logPath = li >= 0 ? argv[li + 1] : '/var/log/nginx/access.log'
  const remote = li >= 0

  const script = shellScript(logPath)
  let r
  if (remote) {
    r = spawnSync('bash', ['-c', script], { encoding: 'utf8' })
  } else {
    r = spawnSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', SSH_HOST, 'sudo -n bash -s'], { input: script, encoding: 'utf8' })
  }
  if (r.status !== 0) {
    console.log('SITE-TRAFFIC UNAVAILABLE rc=' + r.status + ' ' + String(r.stderr || r.stdout || '').trim().slice(0, 160))
    process.exit(1)
  }
  const data = parse(r.stdout)
  const prod = data.sites['tuyigf.com']
  const test = data.sites['test.tuyigf.com']
  if (asJson) { console.log(JSON.stringify(data)); return }
  if (quiet) { console.log('SITE-TRAFFIC ok new_format=' + data.newFormat + ' legacy=' + data.legacyNoHost); return }

  console.log(`官网流量日读数（nginx 当日累计，只读聚合，本机不含 IP）`)
  if (!prod) {
    console.log(`  暂无带 host= 的行 ⇒ B1 之后还没有新流量（或已轮转）。旧格式 ${data.legacyNoHost} 行不计入。`)
  } else {
    console.log(`  官网：真人候选 IP ${prod.uniq_ip_human}｜爬虫 IP ${prod.uniq_ip_bot}｜首页命中 ${prod.home_hits}（真人首页 IP ${prod.home_uniq_human}）｜下载页 ${prod.download_hits}｜申请提交 ${prod.apply_posts}｜首页最慢 ${prod.rt_max}s（>2s ${prod.rt_gt2s} 次）`)
    if (prod.self_ip_hits !== '0') console.log(`    其中 ${prod.self_ip_hits} 次来自服务器自身 IP（健康检查），已单列、未计入真人候选的判定外`)
  }
  if (test) console.log(`  内测站：命中 ${test.hits}｜真人候选 IP ${test.uniq_ip_human}｜申请提交 ${test.apply_posts}（403 为其既有门禁）`)
  console.log(`  覆盖诚实性：${data.legacyNoHost} 行无 host=（B1 之前的历史），未计入任何站点`)
}

main()
