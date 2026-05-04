import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/templates";
import { render, stripSentinels, bodyContainsUnresolved } from "@/lib/engine";
import { validate } from "@/lib/validator";

export async function POST(req: Request) {
  try {
    const { templateId, values, flags } = await req.json();
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });
    const tpl = await loadTemplate(templateId);
    const r = render(tpl, { values: values || {}, flags: flags || {} });
    const missing = validate(tpl.config, values || {}, r.resolvedFlags, r.usedParams);
    const previewBody = stripSentinels(r.body);
    const previewSubject = stripSentinels(r.subject);
    return NextResponse.json({
      subject: previewSubject,
      body: previewBody,
      missing,
      usedParams: r.usedParams,
      resolvedFlags: r.resolvedFlags,
      hasUnresolved: missing.length > 0 || bodyContainsUnresolved(r.body) || bodyContainsUnresolved(r.subject),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Render failed" }, { status: 500 });
  }
}
