'use client';

import { useState, useMemo } from 'react';

type ReportType = 'inspections' | 'work_orders' | 'assets';

interface ReportRow {
  id: string;
  type: string;
  date: string;
  status: string;
  value: number;
}

const MOCK_DATA: ReportRow[] = [
  { id: '1', type: 'inspections', date: '2025-05-01', status: 'completed', value: 12 },
  { id: '2', type: 'inspections', date: '2025-05-02', status: 'completed', value: 8 },
  { id: '3', type: 'inspections', date: '2025-05-03', status: 'overdue', value: 3 },
  { id: '4', type: 'work_orders', date: '2025-05-01', status: 'completed', value: 5 },
  { id: '5', type: 'work_orders', date: '2025-05-02', status: 'in_progress', value: 4 },
  { id: '6', type: 'assets', date: '2025-05-01', status: 'active', value: 120 },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('inspections');
  const [startDate, setStartDate] = useState('2025-05-01');
  const [endDate, setEndDate] = useState('2025-05-31');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return MOCK_DATA.filter((d) => {
      if (d.type !== reportType) return false;
      if (d.date < startDate || d.date > endDate) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [reportType, startDate, endDate, statusFilter]);

  const total = useMemo(() => filtered.reduce((sum, d) => sum + d.value, 0), [filtered]);
  const maxVal = useMemo(() => Math.max(...filtered.map((d) => d.value), 1), [filtered]);

  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Date', 'Status', 'Value'];
    const rows = filtered.map((d) => [d.id, d.type, d.date, d.status, d.value].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <select className="mt-1 block w-full border rounded p-2" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              <option value="inspections">Inspections</option>
              <option value="work_orders">Work Orders</option>
              <option value="assets">Assets</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" className="mt-1 block w-full border rounded p-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" className="mt-1 block w-full border rounded p-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select className="mt-1 block w-full border rounded p-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="in_progress">In Progress</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Export CSV</button>
          <button onClick={exportPDF} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">Export PDF</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Summary: {total} records</h2>
        <div className="h-64 flex items-end gap-4 border-b border-l pb-2 pl-2">
          {filtered.map((d) => (
            <div key={d.id} className="flex flex-col items-center flex-1">
              <div className="text-xs text-gray-500 mb-1">{d.value}</div>
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(d.value / maxVal) * 100}%` }}
              />
              <div className="text-xs text-gray-600 mt-1 truncate w-full text-center">{d.date.slice(5)}</div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-gray-400">No data</div>}
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-medium text-gray-700">ID</th>
              <th className="p-3 text-sm font-medium text-gray-700">Date</th>
              <th className="p-3 text-sm font-medium text-gray-700">Status</th>
              <th className="p-3 text-sm font-medium text-gray-700 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{d.id}</td>
                <td className="p-3">{d.date}</td>
                <td className="p-3 capitalize">{d.status.replace('_', ' ')}</td>
                <td className="p-3 text-right">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
