"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateMeta = { id: string; name: string };
type ParamSpec = { label: string; required: boolean; monday: string; requiredWhen?: string };
type FlagSpec = { label: string; monday?: string; values?: string[]; derived?: string };
type TemplateConfig = {
  id: string;
  name: string;
  subject: string;
  bodyFile: string;
  params: Record<string, ParamSpec>;
  flags: Record<string, FlagSpec>;
  conditions: Record<string, string>;
};

type AuthState = { connected: boolean; email: string | null };

export default function Page() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [itemInput, setItemInput] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ subject: string; body: string; missing: { key: string; label: string }[]; usedParams: string[] } | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [auth, setAuth] = useState<AuthState>({ connected: false, email: null });
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [unmapped, setUnmapped] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => setTemplates(d.templates || []));
    fetch("/api/auth/me").then(r => r.json()).then(setAuth);
    const url = new URL(window.location.href);
    if (url.searchParams.get("connected") === "1") setInfo("חשבון Gmail חובר בהצלחה.");
    if (url.searchParams.get("error")) setError("שגיאה בהתחברות לגוגל: " + url.searchParams.get("error"));
  }, []);

  useEffect(() => {
    if (!templateId) {
      setConfig(null);
      setValues({});
      setFlags({});
      setPreview(null);
      return;
    }
    fetch(`/api/templates?id=${encodeURIComponent(templateId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setConfig(d.config);
        setValues({});
        setFlags({});
        setPreview(null);
      });
  }, [templateId]);

  const fetchMonday = async () => {
    if (!templateId || !itemInput.trim()) return;
    setBusy("monday");
    setError("");
    setUnmapped([]);
    try {
      const r = await fetch(`/api/monday/${encodeURIComponent(itemInput.trim())}?template=${encodeURIComponent(templateId)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "שליפה מ-Monday נכשלה");
      setValues(prev => ({ ...prev, ...Object.fromEntries(Object.entries(d.values || {}).map(([k, v]) => [k, (v as string) ?? ""])) }));
      setFlags(prev => ({ ...prev, ...Object.fromEntries(Object.entries(d.flags || {}).map(([k, v]) => [k, String(v ?? "")])) }));
      setUnmapped(d.unmappedKeys || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const renderPreview = async () => {
    if (!templateId || !config) return;
    setBusy("render");
    setError("");
    try {
      const r = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, values, flags }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "טעינת תצוגה נכשלה");
      setPreview({ subject: d.subject, body: d.body, missing: d.missing || [], usedParams: d.usedParams || [] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  // auto-render whenever inputs change
  useEffect(() => {
    if (!config) return;
    const t = setTimeout(renderPreview, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, flags, config?.id]);

  const createDraft = async () => {
    if (!preview) return;
    if (preview.missing.length > 0) return;
    setBusy("draft");
    setError("");
    setInfo("");
    try {
      const r = await fetch("/api/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, values, flags, to: recipient }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "יצירת טיוטה נכשלה");
      setInfo("טיוטה נוצרה ב-Gmail בהצלחה. ניתן לפתוח אותה ב-Drafts.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ connected: false, email: null });
  };

  const flagControls = useMemo(() => {
    if (!config) return null;
    return (
      <div className="space-y-3">
        {Object.entries(config.flags).map(([key, spec]) => (
          <div key={key} className="field-row">
            <label className="text-sm text-gray-700">{spec.label}</label>
            {spec.values && spec.values.length > 0 ? (
              <select
                className="border rounded px-3 py-2 bg-white"
                value={flags[key] || ""}
                onChange={e => setFlags(f => ({ ...f, [key]: e.target.value }))}
              >
                <option value="">— בחר —</option>
                {spec.values.map(v => <option key={v} value={v}>{v === "frontal" ? "פרונטאלי" : v === "zoom" ? "זום" : v}</option>)}
              </select>
            ) : (
              <select
                className="border rounded px-3 py-2 bg-white"
                value={String(Boolean(flags[key] && flags[key] !== "false"))}
                onChange={e => setFlags(f => ({ ...f, [key]: e.target.value }))}
              >
                <option value="false">לא</option>
                <option value="true">כן</option>
              </select>
            )}
          </div>
        ))}
      </div>
    );
  }, [config, flags]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="מדרסה" className="h-12 w-auto" />
          <div>
            <h1 className="text-xl font-semibold text-madrasa-ink">מייל פתיחה למורה</h1>
            <p className="text-sm text-gray-500">יצירת טיוטה ב-Gmail מתוך פריט Monday.com</p>
          </div>
        </div>
        <div className="text-sm">
          {auth.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">מחובר: {auth.email}</span>
              <button onClick={onLogout} className="text-red-600 underline">התנתק</button>
            </div>
          ) : (
            <a href="/api/auth/google" className="bg-madrasa-blue hover:opacity-90 text-white px-3 py-2 rounded">חבר חשבון Gmail</a>
          )}
        </div>
      </header>

      {(error || info) && (
        <div className={`rounded p-3 text-sm ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {error || info}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="font-semibold text-lg">1. בחירת תבנית ופריט</h2>

          <div className="field-row">
            <label className="text-sm text-gray-700">תבנית</label>
            <select className="border rounded px-3 py-2 bg-white" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">— בחר תבנית —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="field-row">
            <label className="text-sm text-gray-700">פריט Monday (ID או קישור)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="border rounded px-3 py-2 flex-1"
                placeholder="לדוגמה: 1234567890 או קישור לפריט"
                value={itemInput}
                onChange={e => setItemInput(e.target.value)}
              />
              <button
                onClick={fetchMonday}
                disabled={!templateId || !itemInput.trim() || busy === "monday"}
                className="bg-madrasa-green text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {busy === "monday" ? "טוען..." : "שלוף נתונים"}
              </button>
            </div>
          </div>

          {unmapped.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
              שדות ללא מיפוי לעמודת Monday (מוגדרים ב-.env):
              <ul className="list-disc pr-5 mt-1">{unmapped.map(k => <li key={k}>{k}</li>)}</ul>
            </div>
          )}

          {config && (
            <>
              <h3 className="font-semibold mt-4">2. דגלים (פורמט / איש קשר)</h3>
              {flagControls}

              <h3 className="font-semibold mt-4">3. פרמטרים</h3>
              <div className="space-y-3">
                {Object.entries(config.params).map(([key, spec]) => {
                  const inUse = preview ? preview.usedParams.includes(key) : true;
                  const missing = preview?.missing.find(m => m.key === key);
                  return (
                    <div key={key} className={`field-row ${!inUse ? "opacity-40" : ""}`}>
                      <label className="text-sm text-gray-700">
                        {spec.label}
                        {spec.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        type="text"
                        className={`border rounded px-3 py-2 ${missing ? "border-red-400 bg-red-50" : ""}`}
                        value={values[key] || ""}
                        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                        placeholder={spec.monday === "name" ? "(שם הפריט מ-Monday)" : ""}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="font-semibold text-lg">4. תצוגה מקדימה</h2>

          {!config && <p className="text-gray-500 text-sm">בחר תבנית כדי להתחיל.</p>}

          {preview && (
            <>
              <div>
                <div className="text-xs text-gray-500 mb-1">נושא</div>
                <div className="border rounded px-3 py-2 bg-gray-50 font-medium">{preview.subject}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">גוף המייל</div>
                <div className="border rounded p-3 bg-gray-50 preview-body">{preview.body}</div>
              </div>

              {preview.missing.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">חסרים שדות חובה — לא ניתן ליצור טיוטה:</div>
                  <ul className="list-disc pr-5">
                    {preview.missing.map(m => <li key={m.key}>{m.label} ({m.key})</li>)}
                  </ul>
                </div>
              )}

              <div className="field-row">
                <label className="text-sm text-gray-700">שלח אל (אופציונלי)</label>
                <input
                  type="email"
                  className="border rounded px-3 py-2"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="teacher@example.com"
                />
              </div>

              <button
                onClick={createDraft}
                disabled={!auth.connected || preview.missing.length > 0 || busy === "draft"}
                className="bg-madrasa-green hover:opacity-90 text-white px-4 py-2 rounded w-full disabled:opacity-50"
                title={!auth.connected ? "חבר חשבון Gmail תחילה" : preview.missing.length > 0 ? "מלא את שדות החובה" : ""}
              >
                {busy === "draft" ? "יוצר טיוטה..." : "צור טיוטה ב-Gmail"}
              </button>

              {!auth.connected && (
                <p className="text-xs text-gray-500">יש להתחבר ל-Gmail כדי ליצור טיוטה.</p>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="text-xs text-gray-400 text-center pt-4">
        מדרסה — לומדים לתקשר. MVP — אין שליחה אוטומטית, אין עריכת תוכן, אין שליחה המונית.
      </footer>
    </main>
  );
}
