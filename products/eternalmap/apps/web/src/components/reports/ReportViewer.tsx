"use client";

interface ReportViewerProps {
  data: Record<string, any>[];
  loading?: boolean;
  summaryCards?: { label: string; value: string | number }[];
}

export default function ReportViewer({ data, loading, summaryCards }: ReportViewerProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return <div className="text-slate-400 text-sm">No data to display</div>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="space-y-4">
      {summaryCards && (
        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-lg font-semibold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th key={col} className="text-left py-2 px-3 text-slate-500 font-medium uppercase text-xs tracking-wider">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col} className="py-2 px-3 text-slate-700">
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
