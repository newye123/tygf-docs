const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto('file:///F:/工具开发/图译工坊内测版/交付档案/执行方案/模拟方案_20261020_多对多工作台_每稿一表_v7.html', { waitUntil: 'domcontentloaded' });
const out = {};
const scanBanned = () => page.evaluate(() => {
  const m = document.body.innerText.match(/PhotoCraft|Photoshop|免\s?PS|引擎|来源绑定|读回校验|dev build|0\.7\.0/g);
  return m ? m.join(',') : null;
});

out.initialTables = (await page.textContent('#st-tables')).trim();
out.initialScanned = (await page.textContent('#st-scanned')).trim();
out.mxEmptyVisible = await page.isVisible('#mx-empty');
out.stripTableChip = (await page.textContent('#strip-table')).trim();
out.reviewLocked = await page.locator('#rail-review.locked').count();
out.subLine = (await page.textContent('.pghead .sub')).trim();
out.bannedInitial = await scanBanned();

await page.click('#tbtn-f1');
await page.waitForFunction(() => document.getElementById('tstat-f1').textContent.indexOf('已配表') === 0, null, { timeout: 8000 });
out.tablesAfterF1 = (await page.textContent('#st-tables')).trim();
out.tfsF1 = (await page.textContent('#tfs-f1')).trim();
out.mxsubF1 = (await page.textContent('#mxsub-f1')).trim();
out.cellF2StillNoTable = (await page.textContent('#cell-f2-ja')).trim();
out.mxSumPartial = (await page.textContent('#mx-sum')).trim();
out.reviewLockedAfterF1 = await page.locator('#rail-review.locked').count();

await page.click('#import-all-btn');
await page.waitForFunction(() => document.getElementById('st-tables').textContent.trim() === '4/4', null, { timeout: 15000 });
out.tablesAll = (await page.textContent('#st-tables')).trim();
out.cellF1Ja = (await page.textContent('#cell-f1-ja')).trim();
out.cellF2Ko = (await page.textContent('#cell-f2-ko')).trim();
out.cellF4ThBeforeScan = (await page.textContent('#cell-f4-th')).trim();
out.mxSumAfterTables = (await page.textContent('#mx-sum')).trim();

await page.click('#paste-btn');
await page.waitForFunction(() => document.getElementById('modal-paste').classList.contains('show'), null, { timeout: 5000 });
await page.click('#paste-add-ok');
await page.waitForSelector('#trow-f6', { timeout: 5000 });
out.tablesAfterAdd = (await page.textContent('#st-tables')).trim();
out.stripId = (await page.textContent('#strip-id')).trim();
out.tfsF6 = (await page.textContent('#tfs-f6')).trim();

await page.click('#import-all-btn');
await page.waitForFunction(() => document.getElementById('st-tables').textContent.trim() === '6/6', null, { timeout: 15000 });
await page.click('#scan-btn');
await page.waitForFunction(() => document.getElementById('st-scanned').textContent.trim() === '6/6', null, { timeout: 25000 });
out.mxSumAfterScan = (await page.textContent('#mx-sum')).trim();
out.cellF4ThAfterScan = (await page.textContent('#cell-f4-th')).trim();
out.bottomAfterScan = (await page.textContent('#bottom-action')).trim();

await page.click('#tbtn-f2');
await page.waitForFunction(() => document.getElementById('modal-replace').classList.contains('show'), null, { timeout: 5000 });
out.replaceTitle = (await page.textContent('#modal-replace .mtitle')).trim();
out.replaceDesc = (await page.textContent('#modal-replace .mdesc')).trim();
await page.click('#replace-cancel');
out.tablesAfterCancel = (await page.textContent('#st-tables')).trim();

await page.click('#tbtn-f2');
await page.waitForFunction(() => document.getElementById('modal-replace').classList.contains('show'), null, { timeout: 5000 });
await page.click('#replace-ok');
await page.waitForFunction(() => document.getElementById('tstat-f2').textContent.indexOf('待配表') === 0, null, { timeout: 5000 });
out.tablesAfterReplace = (await page.textContent('#st-tables')).trim();
out.cellF2KoAfterReplace = (await page.textContent('#cell-f2-ko')).trim();
out.cellF1KoAfterReplace = (await page.textContent('#cell-f1-ko')).trim();
out.reviewLockedAfterReplace = await page.locator('#rail-review.locked').count();
out.mxSumAfterReplace = (await page.textContent('#mx-sum')).trim();

await page.click('#tbtn-f2');
await page.waitForFunction(() => document.getElementById('st-tables').textContent.trim() === '6/6', null, { timeout: 8000 });
out.tablesReimported = (await page.textContent('#st-tables')).trim();

await page.click('#bottom-action');
await page.waitForFunction(() => document.getElementById('stage-review').classList.contains('on'), null, { timeout: 5000 });
await page.click('#detect-btn');
await page.waitForFunction(() => document.querySelectorAll('.dchip[data-s="wait"]').length === 0, null, { timeout: 30000 });
out.dchipWarn = await page.locator('.dchip[data-s="warn"]').count();
await page.click('#confirm-f2-ko');
await page.waitForFunction(() => document.querySelectorAll('.dchip[data-s="ok"]').length === 18, null, { timeout: 10000 });
out.dchipOk = await page.locator('.dchip[data-s="ok"]').count();

await page.click('#bottom-action');
await page.waitForFunction(() => document.getElementById('stage-reconcile').classList.contains('on'), null, { timeout: 5000 });
await page.click('#fix-f2');
await page.click('#fix-f4');
await page.waitForFunction(() => document.getElementById('step3-done').style.display === 'inline-flex', null, { timeout: 5000 });

await page.click('#bottom-action');
await page.waitForFunction(() => document.getElementById('stage-delivery').classList.contains('on'), null, { timeout: 5000 });
await page.check('#ack-check');
await page.waitForFunction(() => document.getElementById('exec-btn').disabled === false, null, { timeout: 5000 });
await page.click('#exec-btn');
await page.waitForFunction(() => document.getElementById('qrow-f3').getAttribute('data-s') === 'fail', null, { timeout: 30000 });
out.qstatF3 = (await page.textContent('#qstat-f3')).trim();
await page.click('#resume-btn');
await page.waitForFunction(() => document.getElementById('receipt').classList.contains('show'), null, { timeout: 30000 });
out.rcptTitle = (await page.textContent('#rcpt-title')).trim();
out.rcptMeta = (await page.textContent('#rcpt-meta')).trim();
out.rcptTotal = (await page.textContent('#rcpt-sum')).trim();
out.rcptCellsOk = await page.locator('.rcell[data-s="ok"]').count();
out.rcptPerDraftTables = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#rcpt-body tr'));
  return { rows: rows.length, has01: rows[0] ? rows[0].textContent.includes('01_首页_译文表.xlsx') : null, hasF3resume: rows.some(r => r.textContent.includes('续跑成功')) };
});
out.stDone = (await page.textContent('#st-done')).trim();

await page.click('#rail-materials');
await page.waitForFunction(() => document.getElementById('stage-materials').classList.contains('on'), null, { timeout: 5000 });
await page.click('#tbtn-f4');
await page.waitForFunction(() => document.getElementById('modal-replace').classList.contains('show'), null, { timeout: 5000 });
out.replaceTitleF4 = (await page.textContent('#modal-replace .mtitle')).trim();
await page.click('#replace-ok');
await page.waitForFunction(() => document.getElementById('tstat-f4').textContent.indexOf('待配表') === 0, null, { timeout: 5000 });
out.rcptAfterF4Replace = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#rcpt-body tr'));
  const r4 = rows.find(r => r.textContent.indexOf('04_弹窗.psd') >= 0);
  const r1 = rows.find(r => r.textContent.indexOf('01_首页.psd') >= 0);
  return {
    f4Stale: r4 ? r4.textContent.includes('待重跑') : null,
    f1Kept: r1 ? r1.textContent.includes('已完成') : null,
    cellsOkNow: document.querySelectorAll('.rcell[data-s="ok"]').length,
    tablesNow: document.getElementById('st-tables').textContent.trim()
  };
});
out.reviewLockedAfterF4Replace = await page.locator('#rail-review.locked').count();

out.bannedFinal = await scanBanned();
out.consoleErrors = errors;
return out;
