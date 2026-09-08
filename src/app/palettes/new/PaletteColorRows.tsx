"use client";

import { useState } from "react";
import { Field, Select, TextInput } from "@/components/specimen";
import { COLOR_ROLES } from "@/lib/constants";

type Row = {
  id: number;
  name: string;
  hex: string;
  role: (typeof COLOR_ROLES)[number];
};

let nextRowId = 0;
function makeRow(): Row {
  nextRowId += 1;
  return { id: nextRowId, name: "", hex: "#000000", role: COLOR_ROLES[0] };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Local-state manager for the repeatable color-row inputs on the add-palette
 * form. Every row shares the same `name` attribute per field type
 * (color_name / color_hex / color_role) so the server action can zip the
 * three parallel FormData arrays back together by index — this component
 * only owns the client-side editing UX, not the submission shape.
 */
export function PaletteColorRows() {
  const [rows, setRows] = useState<Row[]>(() => [makeRow(), makeRow()]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((current) => [...current, makeRow()]);
  }

  function removeRow(id: number) {
    setRows((current) => (current.length <= 2 ? current : current.filter((r) => r.id !== id)));
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-2 items-end gap-3 border border-line bg-paper p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <label className="catalog-label text-2xs text-ink-soft">Pick</label>
            <input
              type="color"
              value={HEX_RE.test(row.hex) ? row.hex : "#000000"}
              onChange={(e) => updateRow(row.id, { hex: e.target.value })}
              aria-label={`Color ${index + 1} swatch picker`}
              className="h-10 w-14 cursor-pointer border border-line bg-paper p-0.5"
            />
          </div>

          <Field label="Name" required>
            <TextInput
              name="color_name"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              placeholder="e.g. Midnight"
              required
            />
          </Field>

          <Field label="Hex" required>
            <TextInput
              name="color_hex"
              value={row.hex}
              onChange={(e) => updateRow(row.id, { hex: e.target.value })}
              placeholder="#0b0e14"
              pattern="^#[0-9a-fA-F]{6}$"
              title="6-digit hex, e.g. #0b0e14"
              required
            />
          </Field>

          <Field label="Role" required>
            <Select
              name="color_role"
              value={row.role}
              onChange={(e) =>
                updateRow(row.id, { role: e.target.value as Row["role"] })
              }
              required
            >
              {COLOR_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </Field>

          <button
            type="button"
            onClick={() => removeRow(row.id)}
            disabled={rows.length <= 2}
            className="catalog-label col-span-2 border border-line px-3 py-2 text-3xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft sm:col-span-1"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="catalog-label self-start border border-line px-4 py-2 text-2xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        + Add color
      </button>
    </div>
  );
}
