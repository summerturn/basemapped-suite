'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Map,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileWarning,
} from 'lucide-react';
import api from '@/app/lib/api';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ColumnMapping {
  source: string;
  target: string;
}

interface ImportJob {
  jobId: string;
  status: string;
  progress: number;
  errors: string[];
}

const TARGET_COLUMNS = [
  { value: '', label: '— Skip —' },
  { value: 'external_id', label: 'External ID' },
  { value: 'asset_type_id', label: 'Asset Type ID' },
  { value: 'status', label: 'Status' },
  { value: 'lat', label: 'Latitude' },
  { value: 'lon', label: 'Longitude' },
  { value: 'material', label: 'Material' },
  { value: 'address', label: 'Address' },
  { value: 'install_date', label: 'Install Date' },
  { value: 'diameter_mm', label: 'Diameter (mm)' },
  { value: 'length_m', label: 'Length (m)' },
  { value: 'depth_m', label: 'Depth (m)' },
  { value: 'condition_rating', label: 'Condition Rating' },
];

export default function ImportModal({ open, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'shapefile'>('csv');
  const [preview, setPreview] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setMappings([]);
    setJob(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parsePreview = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6);
      const rows = lines.map((l) => l.split(',').map((c) => c.trim()));
      setPreview(rows);
      if (rows.length > 0) {
        const headers = rows[0];
        setMappings(
          headers.map((h) => {
            const lower = h.toLowerCase().replace(/\s+/g, '_');
            const match = TARGET_COLUMNS.find(
              (t) =>
                t.value &&
                (lower.includes(t.value.toLowerCase()) ||
                  t.value.toLowerCase().includes(lower))
            );
            return { source: h, target: match?.value || '' };
          })
        );
      }
    };
    reader.readAsText(f);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (!f) return;
      processFile(f);
    },
    []
  );

  const processFile = (f: File) => {
    setFile(f);
    if (f.name.endsWith('.csv')) {
      setFileType('csv');
      parsePreview(f);
    } else if (f.name.endsWith('.zip')) {
      setFileType('shapefile');
    }
  };

  const startImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint =
        fileType === 'csv'
          ? '/api/v1/assets/import/csv'
          : '/api/v1/assets/import/shapefile';
      const res = await api.post(endpoint, formData);
      if (!res.data.data.queued) {
        setJob({
          jobId: 'direct',
          status: 'completed',
          progress: 100,
          errors: res.data.data.errors.map((e: any) => e.message),
        });
        onSuccess?.();
      } else {
        setJob({
          jobId: String(res.data.data.jobId),
          status: 'queued',
          progress: 0,
          errors: [],
        });
        pollStatus(String(res.data.data.jobId));
      }
    } catch (err: any) {
      setJob({
        jobId: '',
        status: 'failed',
        progress: 0,
        errors: [err.response?.data?.error || err.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/v1/assets/import/${jobId}/status`);
        const data = res.data.data;
        setJob({
          jobId: data.jobId,
          status: data.status,
          progress: data.progress || 0,
          errors: data.failedReason ? [data.failedReason] : [],
        });
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'completed') onSuccess?.();
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const updateMapping = (index: number, target: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, target } : m))
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Import Assets</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {!file && !job && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports CSV and Shapefile (.zip)
            </p>
          </div>
        )}

        {file && !job && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {fileType === 'csv' ? (
                <FileSpreadsheet size={24} className="text-green-600" />
              ) : (
                <Map size={24} className="text-blue-600" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB · {fileType.toUpperCase()}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>

            {fileType === 'csv' && preview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Column Mapping Preview
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview[0].map((header, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-medium text-gray-700 border-b"
                          >
                            <div className="mb-1">{header}</div>
                            <select
                              value={mappings[i]?.target || ''}
                              onChange={(e) => updateMapping(i, e.target.value)}
                              className="w-full text-xs border rounded px-1 py-0.5"
                            >
                              {TARGET_COLUMNS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="px-3 py-1.5 text-gray-600 border-b truncate max-w-[120px]"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={startImport}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        )}

        {job && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {job.status === 'completed' ? (
                <CheckCircle2 size={24} className="text-green-600" />
              ) : job.status === 'failed' ? (
                <FileWarning size={24} className="text-red-600" />
              ) : (
                <Loader2 size={24} className="animate-spin text-primary-600" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {job.status === 'completed'
                    ? 'Import Complete'
                    : job.status === 'failed'
                    ? 'Import Failed'
                    : 'Import in Progress'}
                </p>
                <p className="text-xs text-gray-500">
                  {job.status === 'queued'
                    ? 'Waiting in queue...'
                    : job.status === 'active'
                    ? `Processing... ${job.progress}%`
                    : `Status: ${job.status}`}
                </p>
              </div>
            </div>

            {job.status !== 'completed' && job.status !== 'failed' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}

            {job.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Errors ({job.errors.length})
                  </span>
                </div>
                <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-auto">
                  {job.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {job.status === 'completed' || job.status === 'failed' ? (
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Import Another File
                </button>
              ) : null}
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
