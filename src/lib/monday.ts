import type { MondayItem } from "./types";

const ENDPOINT = "https://api.monday.com/v2";

export async function fetchItem(itemId: string): Promise<MondayItem> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not set");

  const query = `
    query ($ids: [ID!]) {
      items (ids: $ids) {
        id
        name
        column_values {
          id
          type
          text
          value
        }
      }
    }
  `;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables: { ids: [itemId] } }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Monday API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Monday API error: ${JSON.stringify(json.errors)}`);

  const item = json.data?.items?.[0];
  if (!item) throw new Error(`Monday item not found: ${itemId}`);

  const columns: MondayItem["columns"] = {};
  for (const c of item.column_values || []) columns[c.id] = c;

  return { id: item.id, name: item.name, columns };
}

export function parseItemIdFromInput(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/pulses\/(\d+)/) || trimmed.match(/items\/(\d+)/) || trimmed.match(/(\d{6,})/);
  return match ? match[1] : trimmed;
}
