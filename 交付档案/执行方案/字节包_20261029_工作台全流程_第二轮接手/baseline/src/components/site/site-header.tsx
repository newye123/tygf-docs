'use client'

import { useView, type AppView } from '@/components/site/view-context'
import { useSiteContent } from '@/components/site/site-content-context'
import { DownloadAssistantEntry } from '@/components/workbench/download-assistant-entry'
import { featureFlags } from '@/config/featureFlags'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Layers, Menu, X } from 'lucide-react'
import { useState } from 'react'

// batchWorkbenchEnabled 已不再在此使用（见 navItems 注释）：门控移到 app-shell 的
// WorkbenchView batchMode 分支与 view-context 的 allowBatch，导航侧不再表达这个维度。
export function SiteHeader() {
  const { view, setView } = useView()
  const siteContent = useSiteContent()
  const [open, setOpen] = useState(false)

  // 2026-10-18：不再有「批量工作台」这个并列入口。
  // 单稿 / 多稿是同一个工作台里的两种模式，由 workbench-view.tsx 页内的分段切换器切换
  // （Owner 明确否掉两个并列导航项：看起来像两个功能）。
  // 'batch' 目标本身保留，供旧书签 #batch 直达；是否开放仍由服务端合并开关门控。
  const navItems: { label: string; target: AppView; show: boolean }[] = [
    { label: '首页', target: 'home', show: true },
    { label: '工作台', target: 'workbench', show: featureFlags.showWorkbenchEntry },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 group"
          aria-label="返回首页"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Layers className="h-5 w-5" />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight">{siteContent.brand.name}</span>
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-600 dark:text-amber-400">
                V1.5
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground">{siteContent.brand.version}</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.filter((n) => n.show).map((n) => (
            <Button
              key={n.target}
              variant={view === n.target ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView(n.target)}
            >
              {n.label}
            </Button>
          ))}
          {/* 首页锚点导航（仅首页显示） */}
          {view === 'home' &&
            (
              [
                { id: 'how', label: '工作方式' },
                { id: 'queue', label: '待你决定' },
                { id: 'report', label: '执行报告' },
                { id: 'boundary', label: '能力边界' },
                { id: 'faq', label: '常见问题' },
              ] as const
            ).map((anchor) => (
              <Button
                key={anchor.id}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() =>
                  document
                    .getElementById(anchor.id)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                {anchor.label}
              </Button>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            {/* 2026-10-22：EN 的去处按当前视图分流。
                原因（Owner 实测）：在工作台里点 EN 会落到英文营销首页，那里既没有登录入口、
                也没有工作台 —— 这就是"选了英文版怎么还是没有登录入口"的真实路径。
                现在：首页态 → /en（营销页）；工作台/批量态 → /en/workbench（英文工作台）。 */}
            <Link
              href={view === 'home' ? '/en' : '/en/workbench'}
              hrefLang="en"
              aria-label="English version"
            >
              EN
            </Link>
          </Button>
          <DownloadAssistantEntry />
          <Button
            size="sm"
            onClick={() => setView('workbench')}
            className="hidden sm:inline-flex"
          >
            进入工作台
          </Button>
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            onClick={() => setOpen((v) => !v)}
            aria-label="菜单"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {navItems.filter((n) => n.show).map((n) => (
              <Button
                key={n.target}
                variant={view === n.target ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => { setView(n.target); setOpen(false) }}
              >
                {n.label}
              </Button>
            ))}
            {view === 'home' &&
              (
                [
                  { id: 'how', label: '工作方式' },
                  { id: 'queue', label: '待你决定' },
                  { id: 'report', label: '执行报告' },
                  { id: 'boundary', label: '能力边界' },
                  { id: 'faq', label: '常见问题' },
                ] as const
              ).map((anchor) => (
                <Button
                  key={anchor.id}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    document
                      .getElementById(anchor.id)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    setOpen(false)
                  }}
                >
                  {anchor.label}
                </Button>
              ))}
          </div>
        </div>
      )}
    </header>
  )
}
