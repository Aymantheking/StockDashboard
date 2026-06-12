export type HighlightTarget = {
  targetPage: string
  targetSection?: string
  targetId?: number
}

export function isHighlightTarget(
  highlightTarget: HighlightTarget | null,
  targetPage: string,
  targetSection?: string,
  targetId?: number
) {
  if (!highlightTarget || highlightTarget.targetPage !== targetPage) {
    return false
  }

  if (targetSection && highlightTarget.targetSection !== targetSection) {
    return false
  }

  if (targetId !== undefined && highlightTarget.targetId !== targetId) {
    return false
  }

  return true
}
