export interface User {
  id: string
  email: string
  name: string
  tier: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface Team {
  id: string
  name: string
  owner_id: string
  plan: string
  created_at: string
}

export interface TeamMember {
  user_id: string
  team_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joined_at: string
  user?: User
}

export interface Project {
  id: string
  name: string
  team_id: string
  rule_set_default: string
  description?: string
  created_at: string
}

export interface Dataset {
  id: string
  name: string
  project_id: string
  s3_path: string
  format: string
  size_bytes: number
  feature_count: number
  detected_crs?: string
  bbox?: number[]
  geometry_types?: string[]
  status: string
  created_at: string
}

export interface ValidationJob {
  id: string
  dataset_id: string
  rule_set: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  overall_score?: number
  grade?: string
  progress_pct: number
  webhook_url?: string
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface ValidationResult {
  id: string
  job_id: string
  rule_id: string
  rule_name: string
  category: string
  status: string
  score: number
  issue_count: number
  details?: Record<string, unknown>
  created_at: string
}

export interface Issue {
  id: string
  result_id: string
  feature_id?: string
  feature_index?: number
  issue_type: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  coordinates?: number[]
  suggested_fix?: string
  created_at: string
}

export interface Webhook {
  id: string
  team_id: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  created_at: string
}

export interface RuleInfo {
  id: string
  name: string
  description: string
  category: string
  default_enabled: boolean
}

export interface RuleSetInfo {
  id: string
  name: string
  description: string
  rules: string[]
}

export interface ReportSummary {
  job_id: string
  overall_score: number
  grade: string
  total_issues: number
  issues_by_severity: Record<string, number>
  issues_by_category: Record<string, number>
  results: ValidationResult[]
}

export interface ValidationProgressEvent {
  job_id: string
  progress_pct: number
  status: string
  message?: string
}
