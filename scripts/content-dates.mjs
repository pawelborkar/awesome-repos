// A first-time editorial page has a known content date even when the cache is absent.
export function contentModificationDate({previous,fingerprint,today,baseline,reviewed}) {
  if(previous?.hash===fingerprint)return previous.date;
  if(previous)return today;
  return /^\d{4}-\d{2}-\d{2}$/.test(reviewed||'') && reviewed<=today ? reviewed : baseline;
}
