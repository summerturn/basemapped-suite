"use client";

import { useState } from "react";

interface ExportButtonsProps {
  csvUrl?: string;
  pdfUrl?: string;
}

export default function ExportButtons({ csvUrl, pdfUrl }: ExportButtonsProps) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const download = async (url: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("eternalmap_token") || sessionStorage.getItem("eternalmap_token");
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "x-tenant-id": "demo-tenant",
        },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {csvUrl && (
        <button
          onClick={() => download(csvUrl, "report.csv", setCsvLoading)}
          disabled={csvLoading}
          className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
        >
          {csvLoading ? "Downloading..." : "Export CSV"}
        </button>
      )}
      {pdfUrl && (
        <button
          onClick={() => download(pdfUrl, "report.pdf", setPdfLoading)}
          disabled={pdfLoading}
          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {pdfLoading ? "Downloading..." : "Export PDF"}
        </button>
      )}
    </div>
  );
}
