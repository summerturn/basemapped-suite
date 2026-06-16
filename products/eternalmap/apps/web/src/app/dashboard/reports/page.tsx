"use client";

import { useEffect, useState } from "react";
import OccupancyChart from "../../../components/reports/OccupancyChart";
import ReportViewer from "../../../components/reports/ReportViewer";
import ExportButtons from "../../../components/reports/ExportButtons";

interface OccupancyRow {
  section_id: string;
  section_name: string;
  total_plots: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  occupancy_rate: number;
}

export default function ReportsPage() {
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("eternalmap_token") || sessionStorage.getItem("eternalmap_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/occupancy`, {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "x-tenant-id": "demo-tenant",
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOccupancy(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPlots = occupancy.reduce((s, r) => s + r.total_plots, 0);
  const totalOccupied = occupancy.reduce((s, r) => s + r.occupied, 0);
  const totalAvailable = occupancy.reduce((s, r) => s + r.available, 0);
  const totalReserved = occupancy.reduce((s, r) => s + r.reserved, 0);

  const chartData = [
    { name: "Available", value: totalAvailable, fill: "#10b981" },
    { name: "Occupied", value: totalOccupied, fill: "#6366f1" },
    { name: "Reserved", value: totalReserved, fill: "#f59e0b" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports Dashboard</h1>
        <ExportButtons
          csvUrl={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/occupancy/export/csv`}
          pdfUrl={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/occupancy/export/pdf`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Plots</p>
          <p className="text-3xl font-bold text-slate-800">{totalPlots}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Occupied</p>
          <p className="text-3xl font-bold text-indigo-600">{totalOccupied}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Available</p>
          <p className="text-3xl font-bold text-emerald-600">{totalAvailable}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Occupancy Overview</h2>
          <OccupancyChart data={chartData} loading={loading} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Occupancy by Section</h2>
          <ReportViewer data={occupancy} loading={loading} />
        </div>
      </div>
    </div>
  );
}
