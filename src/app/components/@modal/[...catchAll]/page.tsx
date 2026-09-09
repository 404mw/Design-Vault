// Catches every other path under /components (e.g. /components/new) that
// isn't the exact index and isn't the intercepted [id] route, so a
// Link-based navigation to any of them resolves the @modal slot to nothing
// rather than leaving whatever was last shown there — this is what was
// letting "+ New Component" navigation land on a stale/incorrect route.
export default function CatchAll() {
  return null;
}
