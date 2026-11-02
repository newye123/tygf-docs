'use client'

// 第 1 步的入口态（2026-10-23 Owner 令）：
// 批量页不再先过多选卡；没有文件夹时直接显示第二层，里面是一张和单稿工作台
// 同款的文件夹入口卡（路径输入 + 选择文件夹 + 读取文件夹 + 只读预扫描）。
// 「选择文件夹」和单稿「选择文件」一样走 Windows 原生选择框；页内选择器只留在
// 旧的「逐稿手动导入…」经典界面里兜底。
//
// 这里只负责输入与展示；文件夹读取、loading/error 全部由 WorkbenchView 的
// loadStageFolder 统一管理，避免状态留在被隐藏的第一层组件里。

import { useEffect, useState } from 'react'

import { FolderOpen, Loader2, Save, Search } from 'lucide-react'

import { t } from '@/lib/i18n/t'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSiteCopy } from '@/lib/workbench/site-copy'

export interface StageFolderGateProps {
  initialPath?: string
  loading: boolean
  picking: boolean
  error: string | null
  onPickFolder: () => void
  onReadFolder: (path: string) => void
  onShowClassic: () => void
}

export function StageFolderGate({
  initialPath = '',
  loading,
  picking,
  error,
  onPickFolder,
  onReadFolder,
  onShowClassic,
}: StageFolderGateProps) {
  const copy = useSiteCopy('workbench').step1.folderGate
  const [path, setPath] = useState(initialPath)
  const busy = loading || picking

  useEffect(() => {
    setPath(initialPath)
  }, [initialPath])

  const read = () => {
    if (busy) return
    onReadFolder(path)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-start gap-2">
          <Search className="mt-0.5 h-4 w-4 text-teal-600" />
          <div>
            <p className="text-sm font-semibold">{copy.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').trim().replace(/^["']|["']$/g, '')
              if (!pasted || busy) return
              setPath(pasted)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                read()
              }
            }}
            spellCheck={false}
            placeholder={copy.pathPlaceholder}
            className="font-mono text-xs"
            aria-label={copy.pathPlaceholder}
          />
          <Button type="button" onClick={onPickFolder} disabled={busy} variant="outline" className="h-10 shrink-0">
            <FolderOpen className="h-4 w-4" />
            {copy.pick}
          </Button>
          <Button
            type="button"
            onClick={read}
            disabled={busy || !path.trim()}
            className="h-10 shrink-0 bg-teal-600 text-white hover:bg-teal-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {copy.read}
          </Button>
        </div>

        {picking && (
          <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {copy.picking}
          </p>
        )}
        {loading && (
          <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {copy.reading}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs leading-relaxed text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <p role="status" className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {copy.afterScanHint}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {copy.notes.map((note) => (
            <span key={note} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {note}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-[11.5px]">
          <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={onShowClassic}>
            {copy.classic}
          </button>
        </div>
      </div>
    </div>
  )
}
