import { t } from '@/lib/i18n/t'
export type WorkbenchStage =
  | 'materials'
  | 'translation_review'
  | 'design_reconcile'
  | 'delivery'

export interface WorkbenchReadinessInput {
  translationCommitted: boolean
  designReady: boolean
  selectedLanguages: string[]
  languageDigests: Record<string, string>
  reviewedLanguageDigests: Record<string, string>
  reconcileCurrent: boolean
  /** 批量检查 isReady（A4）：全部语言当前 + 无失败/stale + 无阻断组 */
  reconcileReady: boolean
  /** Photoshop 是否已通过本地助手真实自动化检测；未提供时按 true 兼容旧调用。 */
  photoshopReady?: boolean
  /** 跨语言去重后的阻断组数（P0-C-2 唯一聚合器口径）；缺省按 0 处理 */
  blockingIssueCount?: number
}

export interface WorkbenchReadiness {
  reviewOpen: boolean
  allLanguagesReviewed: boolean
  reconcileOpen: boolean
  deliveryOpen: boolean
  nextStage: WorkbenchStage
}

export function deriveWorkbenchReadiness(
  input: WorkbenchReadinessInput,
): WorkbenchReadiness {
  const reviewOpen = input.translationCommitted
  const allLanguagesReviewed =
    input.selectedLanguages.length > 0 &&
    input.selectedLanguages.every(
      (language) =>
        Boolean(input.languageDigests[language]) &&
        input.reviewedLanguageDigests[language] === input.languageDigests[language],
    )
  const reconcileOpen = input.designReady && allLanguagesReviewed
  const reconcileComplete =
    reconcileOpen && input.reconcileCurrent && input.reconcileReady
  const photoshopReady = input.photoshopReady ?? true
  // 产品合同：Photoshop 就绪属于“设计稿校对”完成条件，不再拖到生成交付阶段才处理。
  const deliveryOpen = reconcileComplete && photoshopReady
  const nextStage: WorkbenchStage = !reviewOpen
    ? 'materials'
    : !allLanguagesReviewed
      ? 'translation_review'
      : !deliveryOpen
        ? 'design_reconcile'
        : 'delivery'

  return {
    reviewOpen,
    allLanguagesReviewed,
    reconcileOpen,
    deliveryOpen,
    nextStage,
  }
}

// ─── 工作台壳层派生（P1：单屏单阶段驾驶舱）──────────────────────────────────
// activeStage/completedStages/primaryAction/reason 唯一来源；UI 折叠与手动导航
// 不影响业务门禁（deliveryOpen 只由 deriveWorkbenchReadiness 推导）。
export type WorkbenchPrimaryAction =
  | 'prepare'
  | 'review'
  | 'check'
  | 'resolve'
  | 'generate'

export interface WorkbenchDerivedState {
  /** 建议的当前阶段（自动推进目标）；UI 可被 StageRail 手动覆盖 */
  activeStage: WorkbenchStage
  /** 已完成阶段（StageRail 打勾） */
  completedStages: WorkbenchStage[]
  /** 底部唯一主操作 */
  primaryAction: WorkbenchPrimaryAction
  /** 当前阶段锁定原因（未开放时的解释文案） */
  reason?: string
}

export function deriveWorkbenchState(
  input: WorkbenchReadinessInput,
): WorkbenchDerivedState {
  const r = deriveWorkbenchReadiness(input)
  const completedStages: WorkbenchStage[] = []
  if (input.translationCommitted) completedStages.push('materials')
  if (r.allLanguagesReviewed) completedStages.push('translation_review')
  if (r.deliveryOpen) completedStages.push('design_reconcile')

  const blocking = input.blockingIssueCount ?? 0
  let primaryAction: WorkbenchPrimaryAction
  let reason: string | undefined
  switch (r.nextStage) {
    case 'materials':
      primaryAction = 'prepare'
      break
    case 'translation_review':
      primaryAction = 'review'
      reason = input.translationCommitted ? undefined : t('导入译文表后开始审查')
      break
    case 'design_reconcile':
      primaryAction = blocking > 0 ? 'resolve' : 'check'
      reason = !r.reconcileOpen
        ? t('确认全部语言译文后开放与设计稿对账')
        : blocking > 0
          ? t('{count} 项需要确认', { count: blocking })
          : input.reconcileCurrent && input.reconcileReady && input.photoshopReady === false
            ? t('完成 Photoshop 检测')
            : input.reconcileCurrent
              ? undefined
              : t('开始设计稿校对')
      break
    case 'delivery':
      primaryAction = r.deliveryOpen ? 'generate' : 'check'
      reason = r.deliveryOpen
        ? undefined
        : t('解决必须处理项后开放生成')
      break
  }
  return { activeStage: r.nextStage, completedStages, primaryAction, reason }
}

