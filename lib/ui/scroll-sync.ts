export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export function syncedScrollTop(
  source: ScrollMetrics,
  target: ScrollMetrics
) {
  const sourceMax = Math.max(source.scrollHeight - source.clientHeight, 0);
  const targetMax = Math.max(target.scrollHeight - target.clientHeight, 0);

  if (sourceMax === 0 || targetMax === 0) return 0;

  const ratio = Math.min(Math.max(source.scrollTop / sourceMax, 0), 1);
  return ratio * targetMax;
}
