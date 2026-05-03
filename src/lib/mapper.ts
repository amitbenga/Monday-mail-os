import type { MondayItem, TemplateConfig } from "./types";

/**
 * Each logical param (e.g. "course_manager", "start_date") is mapped to a Monday column id
 * via env vars of the form: MONDAY_COL_<UPPER_SNAKE_KEY>.
 *
 * Example: MONDAY_COL_COURSE_MANAGER=person, MONDAY_COL_START_DATE=date4
 *
 * The special key "name" reads item.name directly. Unmapped keys resolve to undefined,
 * which the validator will surface as missing if the param is required.
 */
function envKey(logical: string): string {
  return "MONDAY_COL_" + logical.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function readColumnText(item: MondayItem, columnId: string): string | undefined {
  const col = item.columns[columnId];
  if (!col) return undefined;
  const text = col.text;
  if (text === null || text === undefined || text === "") return undefined;
  return text;
}

export function mapItemToParams(item: MondayItem, config: TemplateConfig): {
  values: Record<string, string | undefined>;
  flags: Record<string, string | boolean | undefined>;
  unmappedKeys: string[];
} {
  const values: Record<string, string | undefined> = {};
  const flags: Record<string, string | boolean | undefined> = {};
  const unmapped: string[] = [];

  for (const [logical, spec] of Object.entries(config.params)) {
    if (spec.monday === "name") {
      values[logical] = item.name || undefined;
      continue;
    }
    const colId = process.env[envKey(spec.monday)];
    if (!colId) {
      unmapped.push(logical);
      values[logical] = undefined;
      continue;
    }
    values[logical] = readColumnText(item, colId);
  }

  for (const [flagKey, spec] of Object.entries(config.flags)) {
    if (spec.derived === "contact_name_not_empty") {
      flags[flagKey] = Boolean(values["contact_name"] && values["contact_name"].trim());
      continue;
    }
    if (!spec.monday) continue;
    const colId = process.env[envKey(spec.monday)];
    if (!colId) continue;
    const text = readColumnText(item, colId);
    if (text === undefined) continue;
    // Normalize common Hebrew labels for lesson format → english enum values
    const lower = text.trim().toLowerCase();
    if (text.includes("פרונט") || lower === "frontal") flags[flagKey] = "frontal";
    else if (text.includes("זום") || lower === "zoom") flags[flagKey] = "zoom";
    else flags[flagKey] = text;
  }

  return { values, flags, unmappedKeys: unmapped };
}
