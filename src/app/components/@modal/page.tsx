// Matches the exact index route (/components) within the @modal slot so a
// Link-based navigation back to it (e.g. after closing the modal, or the
// grid's own filter/search form resubmitting to /components) resolves the
// slot to nothing instead of leaving stale modal state behind.
export default function Page() {
  return null;
}
