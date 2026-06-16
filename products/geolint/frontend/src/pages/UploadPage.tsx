import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { UploadCloud, File, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import client from '../api/client'

const FORMATS = ['geojson', 'shp', 'kml', 'gpkg', 'csv']

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState('geojson')
  const [crs, setCrs] = useState('')
  const [projectId, setProjectId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      const ext = acceptedFiles[0].name.split('.').pop()?.toLowerCase() || ''
      if (FORMATS.includes(ext)) setFormat(ext)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.geojson'],
      'application/zip': ['.zip', '.shp'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
      'application/geopackage+sqlite3': ['.gpkg'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId || '00000000-0000-0000-0000-000000000000')

    try {
      await client.post('/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      toast.success('Upload complete!')
      setFile(null)
      setProgress(0)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Upload Dataset</h1>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? 'border-accent bg-accent/5'
            : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto mb-3 text-accent" size={40} />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the file here' : 'Drag & drop a file, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          GeoJSON, Shapefile, KML, GeoPackage, CSV
        </p>
      </div>

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <File size={20} className="text-accent" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
            <X size={18} />
          </button>
        </motion.div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">CRS Hint (optional)</label>
          <input
            type="text"
            value={crs}
            onChange={(e) => setCrs(e.target.value)}
            placeholder="EPSG:4326"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select project...</option>
            <option value="00000000-0000-0000-0000-000000000000">Default Project</option>
          </select>
        </div>

        {uploading && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{progress}% uploaded</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {uploading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
          {uploading ? 'Uploading...' : 'Start Upload'}
        </button>
      </div>
    </div>
  )
}
