"use client";

import { useState } from "react";

export function ExportControls({
  json,
  markdown,
  filenameBase,
}: {
  json: string;
  markdown: string;
  filenameBase: string;
}) {
  const [copied, setCopied] = useState(false);

  function download(content: string, ext: "md" | "json", mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download if clipboard permission is unavailable
      download(markdown, "md", "text/markdown;charset=utf-8");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => download(markdown, "md", "text/markdown;charset=utf-8")}
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition hover:bg-accent"
      >
        Download Markdown (.md)
      </button>
      <button
        type="button"
        onClick={() => download(json, "json", "application/json;charset=utf-8")}
        className="rounded-full border border-rule bg-paper-raised px-4 py-2 text-xs font-medium text-ink transition hover:bg-paper-deep"
      >
        Download JSON (.json)
      </button>
      <button
        type="button"
        onClick={copyMarkdown}
        className="rounded-full px-3 py-2 text-xs text-ink-soft transition hover:bg-paper-deep hover:text-ink"
      >
        {copied ? "Copied to clipboard" : "Copy Markdown"}
      </button>
    </div>
  );
}
