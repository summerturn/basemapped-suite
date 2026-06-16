"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AssertionBreakdown } from "@/types";

interface AssertionBreakdownChartProps {
  data: AssertionBreakdown[];
  height?: number;
}

const LABEL_MAP: Record<string, string> = {
  coordinate_precision: "Coord Precision",
  spatial_relationship: "Spatial Rel",
  bounding_box: "Bounding Box",
  geojson_validity: "GeoJSON",
  crs_check: "CRS Check",
  topology: "Topology",
  distance: "Distance",
  area: "Area",
  custom: "Custom",
};

export function AssertionBreakdownChart({ data, height = 300 }: AssertionBreakdownChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    name: LABEL_MAP[d.type] || d.type,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend />
        <Bar dataKey="pass" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
        <Bar dataKey="fail" stackId="a" fill="#ef4444" />
        <Bar dataKey="skip" stackId="a" fill="#eab308" />
        <Bar dataKey="error" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
