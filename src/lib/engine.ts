import type { TemplateConfig } from "./types";

type Ctx = {
  values: Record<string, string | undefined>;
  flags: Record<string, boolean>;
};

type Node =
  | { kind: "text"; text: string }
  | { kind: "var"; name: string }
  | { kind: "if"; cond: string; children: Node[] }
  | { kind: "unless"; cond: string; children: Node[] };

const TAG = /\{\{\s*(#if|#unless)\s+([^}]*?)\s*\}\}|\{\{\s*\/(if|unless)\s*\}\}|\{\{\s*([\w.]+)\s*\}\}/g;

type Token =
  | { t: "text"; v: string }
  | { t: "var"; v: string }
  | { t: "open"; kind: "if" | "unless"; cond: string }
  | { t: "close"; kind: "if" | "unless" };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    if (m.index! > last) out.push({ t: "text", v: src.slice(last, m.index!) });
    if (m[1] === "#if" || m[1] === "#unless") {
      out.push({ t: "open", kind: m[1].slice(1) as "if" | "unless", cond: m[2] });
    } else if (m[3] === "if" || m[3] === "unless") {
      out.push({ t: "close", kind: m[3] as "if" | "unless" });
    } else if (m[4]) {
      out.push({ t: "var", v: m[4] });
    }
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

function parse(tokens: Token[]): Node[] {
  let i = 0;
  function parseUntil(stop?: "if" | "unless"): Node[] {
    const nodes: Node[] = [];
    while (i < tokens.length) {
      const tk = tokens[i];
      if (tk.t === "close") {
        if (stop && tk.kind === stop) { i++; return nodes; }
        throw new Error(`Unexpected closing tag {{/${tk.kind}}}`);
      }
      i++;
      if (tk.t === "text") nodes.push({ kind: "text", text: tk.v });
      else if (tk.t === "var") nodes.push({ kind: "var", name: tk.v });
      else if (tk.t === "open") {
        const children = parseUntil(tk.kind);
        nodes.push({ kind: tk.kind, cond: tk.cond, children });
      }
    }
    if (stop) throw new Error(`Missing closing tag {{/${stop}}}`);
    return nodes;
  }
  return parseUntil();
}

function evalCondition(expr: string, ctx: Ctx, conditions: Record<string, string>, seen: Set<string> = new Set()): boolean {
  const trimmed = expr.trim();
  if (trimmed in conditions && !seen.has(trimmed)) {
    const next = new Set(seen);
    next.add(trimmed);
    return evalCondition(conditions[trimmed], ctx, conditions, next);
  }
  const eq = trimmed.match(/^([\w.]+)\s*==\s*(.+)$/);
  if (eq) {
    const key = eq[1];
    let rhs = eq[2].trim();
    if ((rhs.startsWith("'") && rhs.endsWith("'")) || (rhs.startsWith('"') && rhs.endsWith('"'))) {
      rhs = rhs.slice(1, -1);
    }
    if (rhs === "true") return Boolean(ctx.flags[key]);
    if (rhs === "false") return !ctx.flags[key];
    const lhs =
      ctx.values[key] !== undefined && ctx.values[key] !== ""
        ? String(ctx.values[key])
        : key in ctx.flags
        ? String(ctx.flags[key])
        : "";
    return lhs === rhs;
  }
  return (
    Boolean(ctx.flags[trimmed]) ||
    (ctx.values[trimmed] !== undefined && ctx.values[trimmed] !== "")
  );
}

function renderNodes(
  nodes: Node[],
  ctx: Ctx,
  conditions: Record<string, string>,
  missing: Set<string>,
  usedParams: Set<string>
): string {
  let out = "";
  for (const n of nodes) {
    if (n.kind === "text") {
      out += n.text;
    } else if (n.kind === "var") {
      usedParams.add(n.name);
      const v = ctx.values[n.name];
      if (v === undefined || v === null || v === "") {
        missing.add(n.name);
        out += `�MISSING:${n.name}�`;
      } else {
        out += String(v);
      }
    } else if (n.kind === "if" || n.kind === "unless") {
      const truthy = evalCondition(n.cond, ctx, conditions);
      const include = n.kind === "if" ? truthy : !truthy;
      if (include) {
        out += renderNodes(n.children, ctx, conditions, missing, usedParams);
      }
    }
  }
  return out;
}

function tidy(s: string): string {
  // Collapse 3+ consecutive newlines (caused by hidden blocks) to 2.
  // Trim trailing whitespace on each line and trim outer whitespace.
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");
}

export function render(
  template: { config: TemplateConfig; body: string },
  input: { values: Record<string, string | undefined>; flags: Record<string, string | boolean | undefined> }
): { subject: string; body: string; missingInBody: string[]; usedParams: string[]; resolvedFlags: Record<string, boolean> } {
  const flagsBool: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(input.flags)) {
    flagsBool[k] = Boolean(v) && v !== "false";
  }
  const ctxValues: Record<string, string | undefined> = { ...input.values };
  for (const [k, v] of Object.entries(input.flags)) {
    if (typeof v === "string") ctxValues[k] = v;
  }
  const ctx: Ctx = { values: ctxValues, flags: flagsBool };

  const subjAst = parse(tokenize(template.config.subject));
  const bodyAst = parse(tokenize(template.body));

  const subjMissing = new Set<string>();
  const bodyMissing = new Set<string>();
  const used = new Set<string>();

  const subjectRaw = renderNodes(subjAst, ctx, template.config.conditions, subjMissing, used);
  const bodyRaw = renderNodes(bodyAst, ctx, template.config.conditions, bodyMissing, used);

  const resolvedFlags: Record<string, boolean> = {};
  for (const cn of Object.keys(template.config.conditions)) {
    resolvedFlags[cn] = evalCondition(cn, ctx, template.config.conditions);
  }

  return {
    subject: tidy(subjectRaw).replace(/\n+/g, " "),
    body: tidy(bodyRaw),
    missingInBody: Array.from(new Set([...subjMissing, ...bodyMissing])),
    usedParams: Array.from(used),
    resolvedFlags,
  };
}

export function bodyContainsUnresolved(text: string): boolean {
  return /�MISSING:[\w.]+/.test(text);
}

export function stripSentinels(text: string): string {
  return text.replace(/�MISSING:[\w.]+�/g, "");
}
