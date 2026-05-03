import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/templates";
import { render, bodyContainsUnresolved, stripSentinels } from "@/lib/engine";
import { validate } from "@/lib/validator";
import { getSession } from "@/lib/session";
import { createDraft } from "@/lib/gmail";

export async function POST(req: Request) {
  try {
    const { templateId, values, flags, to } = await req.json();
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

    const session = await getSession();
    if (!session.google?.refresh_token) {
      return NextResponse.json({ error: "Gmail account is not connected. Sign in first." }, { status: 401 });
    }

    const tpl = await loadTemplate(templateId);
    const r = render(tpl, { values: values || {}, flags: flags || {} });
    const missing = validate(tpl.config, values || {}, r.resolvedFlags, r.usedParams);

    if (missing.length > 0 || bodyContainsUnresolved(r.body) || bodyContainsUnresolved(r.subject)) {
      return NextResponse.json(
        {
          error: "Cannot create draft — required fields are missing.",
          missing,
        },
        { status: 422 }
      );
    }

    const subject = stripSentinels(r.subject);
    const body = stripSentinels(r.body);
    const draft = await createDraft(session, { to, subject, body });
    return NextResponse.json({ ok: true, draft });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Draft creation failed" }, { status: 500 });
  }
}
