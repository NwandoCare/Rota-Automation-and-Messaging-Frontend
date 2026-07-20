import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './keys'
import type {
  DashboardStats,
  Me,
  MessagePreviewResponse,
  SendMessagesRequest,
  SendMessagesResponse,
  SubmitChangesRequest,
  SubmitChangesResponse,
  WallChartData,
} from './types'

export function useMe(enabled = true) {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<Me>('/me'),
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useDashboard(date: string) {
  return useQuery({
    queryKey: keys.dashboard(date),
    queryFn: () => api.get<DashboardStats>(`/dashboard?date=${date}`),
  })
}

export function useWallChart(date: string, area: string) {
  return useQuery({
    queryKey: keys.wallchart(date, area),
    queryFn: () => api.get<WallChartData>(`/wallchart?date=${date}&area=${area}`),
  })
}

export function useSubmitChanges() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitChangesRequest) =>
      api.post<SubmitChangesResponse>('/changes', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.wallchartRoot })
      void qc.invalidateQueries({ queryKey: keys.dashboardRoot })
    },
  })
}

export function useMessagePreview(changeId: string | null) {
  return useQuery({
    queryKey: keys.messagePreview(changeId ?? 'none'),
    queryFn: () =>
      api.get<MessagePreviewResponse>(`/changes/${changeId}/messages/preview`),
    enabled: changeId !== null,
  })
}

export function useSendMessages(changeId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SendMessagesRequest) =>
      api.post<SendMessagesResponse>(`/changes/${changeId}/messages/send`, body),
    // No server push (OneTouch offers no webhooks and we run without a
    // WebSocket layer) — refresh by invalidating queries after the send.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.wallchartRoot })
      void qc.invalidateQueries({ queryKey: keys.dashboardRoot })
    },
  })
}
