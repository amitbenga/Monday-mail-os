import { NextResponse } from "next/server";
import { listTemplates, loadTemplate } from "@/lib/templates";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    try {
      const { config, body } = await loadTemplate(id);
      return NextResponse.json({ config, body });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Failed to load template" }, { status: 404 });
    }
  }
  const templates = await listTemplates();
  return NextResponse.json({ templates });
}
