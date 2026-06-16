"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface OccupancyChartProps {
  data: { name: string; value: number; fill: string }[];
  loading?: boolean;
}

export default function OccupancyChart({ data, loading }: OccupancyChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse bg-slate-200 rounded-full w-48 h-48" />
      </div>
    );
  }

  if (data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No plot data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} plots`, name]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
