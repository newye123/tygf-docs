// D13 扩展测试 — 种子脚本（一次性，测完即删）
// 与 tmp-seed-user.mjs 相同逻辑：在隔离库播种合法登录态 + 激活行，输出会话 cookie。
import { DatabaseSync } from 'node:sqlite'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const env = readFileSync('.env', 'utf8')
const secret = /^USER_AUTH_SECRET=(.*)$/m.exec(env)?.[1]?.trim()
if (!secret) throw new Error('读不到 USER_AUTH_SECRET')

const token = randomBytes(32).toString('base64url')
const tokenHash = createHash('sha256').update(token).digest('hex')

const db = new DatabaseSync('db/custom.db')
const now = new Date().toISOString()
const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
const actExp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()

db.exec(`DELETE FROM InviteCodeActivation WHERE inviteCodeId IN (SELECT id FROM InviteCode WHERE codeHash='seed-stub-hash')`)
db.exec(`DELETE FROM InviteCode WHERE codeHash='seed-stub-hash'`)
db.exec(`DELETE FROM LoginSession WHERE betaUserId='seeduser000000000000001'`)
db.exec(`DELETE FROM EmailCredential WHERE betaUserId='seeduser000000000000001'`)
db.exec(`DELETE FROM BetaUser WHERE id='seeduser000000000000001'`)

db.prepare(
  `INSERT INTO BetaUser (id, billingPrincipalId, name, contact, status, accessExpiresAt, deletedAt, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, 'active', NULL, NULL, ?, ?)`,
).run('seeduser000000000000001', 'bp-seed-0001', '真机验证账号', 'verify@example.com', now, now)

db.prepare(
  `INSERT INTO EmailCredential (id, betaUserId, email, passwordHash, emailVerifiedAt, passwordChangedAt, createdAt, updatedAt)
   VALUES (?, ?, ?, 'scrypt$seed$notused', ?, ?, ?, ?)`,
).run('seedcred00000000000001', 'seeduser000000000000001', 'verify@example.com', now, now, now, now)

db.prepare(
  `INSERT INTO LoginSession (id, betaUserId, tokenHash, deviceName, createdAt, lastSeenAt, expiresAt)
   VALUES (?, ?, ?, 'Playwright 真机验证', ?, ?, ?)`,
).run('seedsess00000000000001', 'seeduser000000000000001', tokenHash, now, now, exp)

db.prepare(
  `INSERT INTO InviteCode (id, codeHash, codePreview, status, maxActivations, activatedCount, expiresAt, trialDays, betaUserId, createdAt, updatedAt)
   VALUES (?, 'seed-stub-hash', 'TYGF-SEED-****', 'active', 1, 1, ?, 14, ?, ?, ?)`,
).run('seedcode00000000000001', actExp, 'seeduser000000000000001', now, now)

db.prepare(
  `INSERT INTO InviteCodeActivation (id, inviteCodeId, anonymousInstallId, appVersion, activatedAt, activationExpiresAt, accessTokenHash, bindingGeneration)
   VALUES (?, ?, 'stub-install-0001', '0.1', ?, ?, ?, 0)`,
).run('seedactv00000000000001', 'seedcode00000000000001', now, actExp, createHash('sha256').update('stub-beta-token').digest('hex'))

const payload = { t: token, exp: Date.now() + 30 * 24 * 3600 * 1000 }
const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
const sig = createHmac('sha256', secret).update(data).digest('base64url')

console.log(JSON.stringify({ cookie: `tygf_user_session=${data}.${sig}` }))
