// Same-origin GET proxy for a remote image URL. Exists solely so the screen
// add/edit form's colour picker can read pixel data via canvas for a
// dragged-URL specimen (UploadDropzone captures only a remote URL, not file
// bytes, for a browser-tab drag) — a client-side fetch of that cross-origin
// image would be CORS-tainted for canvas reads; routing it through our own
// origin isn't. Mirrors saveUploadFromUrl's (src/lib/uploads.ts) "just fetch
// it" trust boundary — this app is single-user/local-first, not a public
// proxy — but adds the checks that matter for something serving bytes back
// to the browser: http(s) only, must actually be an image, size-capped.
const MAX_BYTES = 15 * 1024 * 1024; // generous for a saved screenshot, small enough to bound abuse

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new Response("Only http/https URLs are supported", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString());
  } catch {
    return new Response("Could not fetch that URL", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(`Upstream returned ${upstream.status}`, { status: 502 });
  }

  const contentType = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) {
    return new Response("URL did not return an image", { status: 415 });
  }

  const declaredLength = Number(upstream.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BYTES) {
    return new Response("Image too large", { status: 413 });
  }

  // Content-Length can lie (absent, or wrong) — enforce the cap on the
  // actual bytes as they arrive too, aborting the upstream fetch as soon as
  // it's exceeded rather than buffering an unbounded response first.
  if (!upstream.body) {
    return new Response("Empty response", { status: 502 });
  }
  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return new Response("Image too large", { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return new Response("Could not read that URL", { status: 502 });
  }

  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
