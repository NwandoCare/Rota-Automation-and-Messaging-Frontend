/**
 * Query-key factory. Root strings ("wallchart", "dashboard") double as the
 * invalidation keys carried by WS InvalidateEvent — keep them in sync with
 * the backend.
 */
export const keys = {
  me: ['me'] as const,
  dashboard: (date: string) => ['dashboard', date] as const,
  dashboardRoot: ['dashboard'] as const,
  wallchart: (date: string, area: string) => ['wallchart', date, area] as const,
  wallchartRoot: ['wallchart'] as const,
  messagePreview: (changeId: string) => ['message-preview', changeId] as const,
}
