// Catches every other path under /screens (e.g. /screens/new) that isn't
// the exact index and isn't the intercepted [id] route, so a Link-based
// navigation to any of them resolves the @modal slot to nothing rather than
// leaving whatever was last shown there — this is what was letting
// "+ New Specimen" navigation land on a stale/incorrect route.
export default function CatchAll() {
  return null;
}
