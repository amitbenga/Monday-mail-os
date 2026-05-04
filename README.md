# Monday-mail-os — Teacher opening email draft MVP

A focused tool for [Madrasa](https://madrasafree.com) staff: pick a Monday.com
course item, pick one of four predefined Hebrew templates, preview the result,
and create a draft in your personal Gmail.

## Core rules

- **Template text is source-of-truth.** The app does not write, improve,
  rewrite, or edit copy. It only replaces placeholders and shows/hides
  predefined blocks.
- **No unresolved placeholders are ever rendered.** If a required field is
  empty, the app shows exactly which field is missing and blocks draft
  creation.
- **Gmail drafts only.** No automatic sending, no bulk sending, no analytics.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Hebrew RTL UI
- Monday.com GraphQL v2 API
- Gmail API (`gmail.compose` scope) via Google OAuth
- Iron-session for the OAuth refresh-token cookie

## Project layout

```
templates/
  index.json                     # registry of available templates
  <id>/
    config.json                  # subject, params, flags, conditions
    body.txt                     # Hebrew body — source of truth
src/
  lib/
    engine.ts                    # placeholder + {{#if}} renderer
    validator.ts                 # required-field check (post-conditional)
    monday.ts                    # GraphQL fetch
    mapper.ts                    # Monday columns -> normalized params
    gmail.ts                     # OAuth + draft creation
    session.ts                   # iron-session config
    templates.ts                 # template loader
    types.ts
  app/
    api/templates                # list / load templates
    api/monday/[itemId]          # fetch + map a Monday item
    api/render                   # render preview + validate
    api/gmail/draft              # create Gmail draft (blocks if missing)
    api/auth/google              # OAuth start / callback / me / logout
    page.tsx                     # single-page flow
```

## Templates

| id                  | label                                          |
|---------------------|------------------------------------------------|
| `course`            | קורסים — מייל פתיחה למורה                      |
| `practice-extended` | קבוצות תרגול — תרגול בתוך קורס מורחב           |
| `practice-gym`      | תרגול חדר כושר — ארבעה מפגשים                  |
| `private-lessons`   | שיעורים פרטיים                                 |

To edit copy, edit `templates/<id>/body.txt`. To add a new placeholder, add it
to `config.json` and reference it as `{{key}}` in the body.

### Template syntax

- `{{key}}` — replaced with the param value.
- `{{#if condition}} ... {{/if}}` — block included only if the condition is
  truthy. Conditions are named in `config.json` under `conditions`, e.g.
  `is_zoom: "lesson_format == 'zoom'"`. Bare flag names are also supported.
- `{{#unless condition}} ... {{/unless}}` — inverse.

When a block is hidden, surrounding blank lines are collapsed so the rendered
email reads cleanly.

## Validation

For each template, the engine evaluates conditions first, then `validator.ts`
checks only the params that are actually referenced after conditional pruning.
A param marked with `requiredWhen: "is_zoom"` is required only when the
condition is true.

If anything required is missing, the UI shows the list of missing fields and
the **Create draft** button is disabled. The `/api/gmail/draft` endpoint also
enforces this server-side and returns HTTP 422 with the missing list.

## Monday mapping

Logical keys (`course_manager`, `start_date`, …) are mapped to Monday column
IDs via env vars of the form `MONDAY_COL_<UPPER_SNAKE_KEY>`. The reserved
value `name` reads `item.name` directly.

For the `lesson_format` flag the mapper normalizes the column's display text:
"פרונטאלי" / "frontal" → `frontal`, and "זום" / "zoom" → `zoom`.

If a key has no env mapping, the app surfaces it as "unmapped" so the user
knows to fill it in manually before creating the draft.

## Setup

1. `cp .env.example .env.local` and fill in:
   - `SESSION_PASSWORD` — at least 32 random characters.
   - `MONDAY_API_TOKEN` — personal API token from monday.com.
   - `MONDAY_COL_*` — your board's column IDs for each logical key.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` —
     OAuth credentials from Google Cloud Console with the
     `https://www.googleapis.com/auth/gmail.compose` scope enabled.
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`, click **Connect Gmail**, then enter a Monday
   item ID and pick a template.

## What this app does NOT do

- Automatic sending
- Bulk sending
- AI rewriting / improving copy
- Editing template copy through the UI
- Analytics or reporting
- General CRM / email-platform features
- Maintaining its own Monday sync database
