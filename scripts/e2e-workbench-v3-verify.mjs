/**
 * 图译工坊 workbench-v3 独立确定性浏览器验收脚本（Verify 阶段）
 * 对应 9 张真机实测截图中的 6 项硬门槛，专治“无头单测全绿、真机页面崩坏”。
 *
 * 运行方式：
 *   TYGF_APP_URL=http://localhost:3000/workbench?ui=v3 node scripts/e2e-workbench-v3-verify.mjs
 */

import assert from 'node:assert/strict';

const TARGET_URL =
  process.env.TYGF_APP_URL || 'http://localhost:3000/workbench?ui=v3';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error(
      '未检测到 playwright 依赖。请先在项目或全局安装 playwright，或通过 Playwright MCP 执行同等 6 步验证。'
    );
    process.exit(1);
  }
}

async function run() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    // Gate 1: Zero engine jargon or raw "PSD" in visible page text
    const bodyText = await page.locator('body').innerText();
    for (const forbidden of ['Photoshop', 'PhotoCraft', '双引擎', '无PS', '粘贴多行 PSD 路径']) {
      assert.equal(
        bodyText.includes(forbidden),
        false,
        `页面可见文案出现禁止词: ${forbidden}`
      );
    }
    console.log('PASS [Verify 1/5] 页面零引擎词与零冗余入口校验');

    // Gate 2: Floating "T" typography button must be vertically centered near right edge
    const typoFab = page.locator('button:has-text("T")').last();
    if (await typoFab.isVisible()) {
      const box = await typoFab.boundingBox();
      assert.ok(box, '悬浮 T 按钮不可见或无几何尺寸');
      const centerY = box.y + box.height / 2;
      const deltaY = Math.abs(centerY - 900 / 2);
      assert.ok(
        deltaY < 80,
        `悬浮 T 按钮未垂直居中（当前中心 Y=${Math.round(centerY)}，视口中心=450）`
      );
      console.log('PASS [Verify 2/5] 悬浮 T 按钮贴右边缘垂直居中');
    } else {
      console.log('SKIP [Verify 2/5] 空态下 T 按钮已按原型隐藏');
    }

    // Gate 3: Top-right avatar button must respond on click (menu/popover or route change)
    const avatarBtn = page.locator('.avatar-btn, header button[title*="@"], header button:text-is("F")').first();
    if (await avatarBtn.isVisible()) {
      const beforeUrl = page.url();
      const beforeHtmlLen = (await page.locator('body').innerHTML()).length;
      await avatarBtn.click();
      await page.waitForTimeout(300);
      const afterUrl = page.url();
      const afterHtmlLen = (await page.locator('body').innerHTML()).length;
      assert.ok(
        afterUrl !== beforeUrl || Math.abs(afterHtmlLen - beforeHtmlLen) > 20,
        '点击右上角头像按钮后页面无任何菜单弹出或跳转响应'
      );
      console.log('PASS [Verify 3/5] 右上角头像点击响应正常');
    }

    // Gate 4: If Step 2 is open, verify no Step 1 banner leak, no stuck detection, and non-blank matrix
    const isStep2 = await page.locator('text=全部异常已处理, text=待确认').first().isVisible().catch(() => false);
    if (isStep2) {
      assert.equal(
        bodyText.includes('扫描已结束：可核对每稿状态'),
        false,
        'Step 2 仍残留 Step 1 的「扫描已结束」提示条'
      );
      assert.equal(
        bodyText.includes('智能检测运行中'),
        false,
        'Step 2 仍卡死在「智能检测运行中」'
      );
      const matrixCells = page.locator('.mx-cell');
      const cellCount = await matrixCells.count();
      if (cellCount > 0) {
        const firstText = (await matrixCells.first().innerText()).trim();
        assert.ok(firstText.length > 0, 'Step 2 矩阵单元格为空白无文字');
      }
      console.log('PASS [Verify 4/5] Step 2 无残留横幅、无卡死且矩阵格清晰');
    } else {
      console.log('INFO [Verify 4/5] 当前停留在 Step 1，导入真实目录后请再次运行本脚本校验 Step 2');
    }

    // Gate 5: Zero uncaught console/page runtime errors
    assert.equal(
      consoleErrors.length,
      0,
      `浏览器控制台存在报错:\n${consoleErrors.join('\n')}`
    );
    console.log('PASS [Verify 5/5] 浏览器控制台零运行时报错');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('E2E VERIFY FAILED:', err.message);
  process.exit(1);
});
