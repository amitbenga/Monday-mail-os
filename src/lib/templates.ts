import { promises as fs } from "fs";
import path from "path";
import type { TemplateConfig } from "./types";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

export async function listTemplates(): Promise<{ id: string; name: string }[]> {
  const raw = await fs.readFile(path.join(TEMPLATES_DIR, "index.json"), "utf8");
  return JSON.parse(raw).templates;
}

export async function loadTemplate(id: string): Promise<{ config: TemplateConfig; body: string }> {
  const safe = id.replace(/[^a-z0-9_-]/gi, "");
  if (!safe || safe !== id) throw new Error(`Invalid template id: ${id}`);
  const dir = path.join(TEMPLATES_DIR, safe);
  const config: TemplateConfig = JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8"));
  const body = await fs.readFile(path.join(dir, config.bodyFile), "utf8");
  return { config, body };
}
