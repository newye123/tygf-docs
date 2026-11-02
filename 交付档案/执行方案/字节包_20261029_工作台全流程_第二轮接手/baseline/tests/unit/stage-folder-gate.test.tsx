// 第 1 步入口态与手动选表的渲染冒烟：
// 不点浏览器也能抓到「空态卡没渲染/手动选表没出口」这类回归。
// 运行：npx vitest run tests/unit/stage-folder-gate.test.tsx

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StageFolderGate } from '@/components/workbench/stage-folder-gate'
import { TablePickerDialog } from '@/components/workbench/table-picker-dialog'

describe('第 1 步入口态', () => {
  it('显示单稿样式的文件夹入口，进度/错误可见', () => {
    const html = renderToStaticMarkup(
      React.createElement(StageFolderGate, {
        initialPath: 'E:\\工作内容\\完成的',
        loading: false,
        picking: false,
        error: '这个文件夹读不了，请换一个。',
        onPickFolder: () => {},
        onReadFolder: () => {},
        onShowClassic: () => {},
      }),
    )
    expect(html).toContain('选择设计稿文件夹')
    expect(html).toContain('选择文件夹…')
    expect(html).toContain('扫描并自动配对')
    expect(html).toContain('这个文件夹读不了')
    expect(html).toContain('逐稿手动导入')
    expect(html).not.toContain('准备素材')
    expect(html).not.toContain('这一版你会看到什么不一样')
    expect(html).not.toContain('顶栏两张新卡')
    expect(html).toContain('只读预扫描')
    expect(html).toContain('子文件夹最多 6 层')
    expect(html).toContain('本批最多 12 个稿')
    expect(html).toContain('扫完还要点一次「读全部表头」')
  })
})

describe('手动选表弹窗', () => {
  it('列出文件夹里的表，并标明已被谁使用', () => {
    const html = renderToStaticMarkup(
      React.createElement(TablePickerDialog, {
        open: true,
        tables: [
          { path: 'C:\\t\\5857.xlsx', relPath: '5857.xlsx', ext: 'xlsx', dir: '' },
          { path: 'C:\\t\\6896.xlsx', relPath: '6896.xlsx', ext: 'xlsx', dir: '' },
        ],
        usedBy: { 'C:\\t\\5857.xlsx': '5857-主图.psb' },
        onClose: () => {},
        onPick: () => {},
        onShowClassic: () => {},
      }),
    )
    expect(html).toContain('选择这张稿的译文表')
    expect(html).toContain('5857.xlsx')
    expect(html).toContain('已给 5857-主图.psb')
    expect(html).toContain('6896.xlsx')
  })
})
