import { NextResponse } from "next/server";
import { fetchItem, parseItemIdFromInput } from "@/lib/monday";
import { loadTemplate } from "@/lib/templates";
import { mapItemToParams } from "@/lib/mapper";

export async function GET(req: Request, { params }: { params: { itemId: string } }) {
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("template");
  const itemId = parseItemIdFromInput(decodeURIComponent(params.itemId));

  try {
    const item = await fetchItem(itemId);
    if (!templateId) {
      return NextResponse.json({ item });
    }
    const tpl = await loadTemplate(templateId);
    const mapped = mapItemToParams(item, tpl.config);
    return NextResponse.json({ item, ...mapped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Monday fetch failed" }, { status: 502 });
  }
}
