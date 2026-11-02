import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BatchWorkspaceEmpty } from '@/components/workbench/batch-workspace-empty'
import { StageFolderGate } from '@/components/workbench/stage-folder-gate'

afterEach(cleanup)

const props = { loading: false, picking: false, error: null, onPickFolder: vi.fn(), onReadFolder: vi.fn(), onShowClassic: vi.fn() }
describe('空批次素材入口', () => {
  it('直接呈现素材选择，不显示开发视图、历史对照或零值仪表', () => {
    render(<BatchWorkspaceEmpty><StageFolderGate {...props} /></BatchWorkspaceEmpty>)
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.getByRole('button', { name: '选择文件夹…' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: '工作台视图' })).toBeNull()
    expect(screen.queryByText('现状对照（图一）')).toBeNull()
    expect(screen.queryByText('0 设计稿')).toBeNull()
  })
  it('输入路径不会自动读取，只有明确点击才发起读取', () => {
    const read = vi.fn()
    render(<BatchWorkspaceEmpty><StageFolderGate {...props} onReadFolder={read} /></BatchWorkspaceEmpty>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'C:/drafts' } })
    expect(read).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '扫描并自动配对' }))
    expect(read).toHaveBeenCalledWith('C:/drafts')
  })
})
