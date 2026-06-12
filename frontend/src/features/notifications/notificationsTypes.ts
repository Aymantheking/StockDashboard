export type NotificationItemSummary = {
  id: string
  type: string
  title: string
  description: string
  targetPage: string
  targetSection?: string
  targetId?: number
  actionable: boolean
  isRead?: boolean
  createdAt?: string
}

export type NotificationSummary = {
  totalUnread: number
  counts: {
    pendingUserVerifications: number
    pendingPartRequests: number
    pendingMissingItemRequests: number
    pendingPurchaseRequests: number
    pendingReturnConfirmations: number
    informationalUpdates: number
  }
  pendingUserVerifications: number
  pendingPartRequests: number
  pendingMissingItemRequests: number
  pendingPurchaseRequests: number
  pendingReturnConfirmations: number
  informationalUpdates: number
  items: NotificationItemSummary[]
}
