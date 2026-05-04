export type ParamSpec = {
  label: string;
  required: boolean;
  monday: string;
  requiredWhen?: string;
};

export type FlagSpec = {
  label: string;
  monday?: string;
  values?: string[];
  derived?: string;
};

export type TemplateConfig = {
  id: string;
  name: string;
  subject: string;
  bodyFile: string;
  params: Record<string, ParamSpec>;
  flags: Record<string, FlagSpec>;
  conditions: Record<string, string>;
};

export type RenderInput = {
  values: Record<string, string | undefined>;
  flags: Record<string, string | boolean | undefined>;
};

export type MissingField = {
  key: string;
  label: string;
};

export type RenderResult = {
  subject: string;
  body: string;
  missing: MissingField[];
  usedParams: string[];
  resolvedFlags: Record<string, boolean>;
};

export type MondayItem = {
  id: string;
  name: string;
  columns: Record<string, { id: string; type: string; text: string | null; value: string | null }>;
};
