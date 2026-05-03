import type { TemplateConfig, MissingField } from "./types";

export function validate(
  config: TemplateConfig,
  values: Record<string, string | undefined>,
  resolvedFlags: Record<string, boolean>,
  usedParams: string[]
): MissingField[] {
  const missing: MissingField[] = [];
  const used = new Set(usedParams);

  for (const [key, spec] of Object.entries(config.params)) {
    // Only validate params that were actually referenced (after conditional evaluation).
    if (!used.has(key)) continue;

    const value = values[key];
    const filled = value !== undefined && value !== null && String(value).trim() !== "";

    let required = spec.required;
    if (spec.requiredWhen) {
      required = required && Boolean(resolvedFlags[spec.requiredWhen]);
    }

    if (required && !filled) {
      missing.push({ key, label: spec.label });
    }
  }

  return missing;
}
