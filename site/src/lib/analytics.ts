type Search = { search_id: string; trigger: string; result_count: number; duration_ms: number; has_query: boolean; active_filter_count: number; sort: string; category?: string; resource_type?: string; technology?: string; level?: string };
type Resource = { resource_key: string; source: string; resource_category?: string; resource_type?: string; search_id?: string; result_position?: number };
export interface AnalyticsEvents {
  resource_searched: Search;
  search_failed: { search_id: string; trigger: string; failure_type: string; duration_ms: number };
  resource_selected: Resource;
  resource_opened: Resource;
  collection_opened: { collection_slug: string; resource_count: number; source: string };
  resource_filter_changed: { category: string; resource_type: string; technology: string; level: string; sort: string; has_query: boolean; result_count: number };
  resource_view_changed: { view: string };
  theme_changed: { theme: string };
  contribution_guide_opened: { source: string };
}
export function track<K extends keyof AnalyticsEvents>(event: K, properties: AnalyticsEvents[K]) {
  try { window.awesomeAnalytics?.capture(event, properties); } catch {}
}
export function captureSearchFailure() {
  try { window.awesomeAnalytics?.exception('catalog_search', 'search_unavailable'); } catch {}
}
