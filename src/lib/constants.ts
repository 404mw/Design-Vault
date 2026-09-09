// Fixed, controlled vocabularies. Never render these as free text inputs —
// the whole point is that page type and layout pattern do not rot the way
// free tags do.

export const PAGE_TYPES = [
  "landing",
  "pricing",
  "settings",
  "dashboard",
  "form",
  "onboarding",
  "empty state",
  "table",
  "auth",
  "error",
  "docs",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const LAYOUT_PATTERNS = [
  "split",
  "centred",
  "sidebar",
  "bento",
  "card grid",
  "full-bleed",
  "single column",
] as const;
export type LayoutPattern = (typeof LAYOUT_PATTERNS)[number];

export const VERDICTS = ["love", "hate"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const COMPONENT_TYPES = [
  "button",
  "card",
  "nav",
  "form",
  "modal",
  "table",
  "input",
  "badge",
  "tooltip",
  "dropdown",
  "pagination",
  "tabs",
  "accordion",
  "toast",
  "loader",
  "avatar",
  "other",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const COLOR_ROLES = [
  "any",
  "background",
  "surface",
  "text",
  "muted",
  "accent",
  "border",
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

export const LICENCES = ["free", "personal only", "commercial", "unknown"] as const;
export type Licence = (typeof LICENCES)[number];

export const MEDIA_TYPES = ["image", "video"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// Curated starting vocabulary shown as one-click pills on the "new screen"
// form, alongside whatever's already in the tags table. Purely a suggestion
// list — picking one or typing a new tag both write through the same tags
// table, so this list never needs to be kept in sync with what's actually
// been used.
export const PRESET_TAGS = [
  "minimal",
  "editorial",
  "bold-type",
  "brutalist",
  "glassmorphism",
  "dark-mode",
  "gradient",
  "illustrated",
  "data-dense",
  "playful",
  "monochrome",
  "grid-heavy",
  "motion",
  "skeuomorphic",
  "geometric",
] as const;
