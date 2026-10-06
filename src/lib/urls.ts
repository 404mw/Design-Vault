/** Returns the URL only if it parses and uses http(s); otherwise null. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export const SOURCE_URL_ERROR = "Source URL must start with http:// or https://.";
