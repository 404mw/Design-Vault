import type { ReactNode } from "react";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="catalog-label text-2xs text-ink-soft">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full border border-line bg-paper px-3 py-2 font-serif text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="catalog-label border border-ink bg-ink px-5 py-2.5 text-2xs text-paper transition-colors hover:bg-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
    >
      {children}
    </button>
  );
}

/** Required verdict selector — rendered as two stamp-styled radio choices, never a dropdown, so the required judgment stays visible rather than hidden in a select. */
export function VerdictField({ name, required = true }: { name: string; required?: boolean }) {
  return (
    <div className="flex gap-3">
      {(["love", "hate"] as const).map((v) => (
        <label
          key={v}
          className="catalog-label flex flex-1 cursor-pointer items-center justify-center gap-2 border border-line px-4 py-3 text-2xs text-ink-soft has-[:checked]:border-accent has-[:checked]:text-ink"
        >
          <input type="radio" name={name} value={v} required={required} className="sr-only" />
          {v === "love" ? "Love — keep" : "Hate — reject"}
        </label>
      ))}
    </div>
  );
}
