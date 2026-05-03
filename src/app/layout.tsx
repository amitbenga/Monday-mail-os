import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מדרסה — מייל פתיחה למורה",
  description: "Generate teacher opening email drafts from Monday.com items.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
