export type Project = {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  settings: Record<string, unknown>;
  schedule_enabled: boolean;
  schedule_interval_minutes: number;
  schedule_next_run_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type OverviewFinding = {
  id: number;
  category: string;
  severity: string;
  title: string;
  description: string;
  locked: boolean;
};

export type ProjectOverview = {
  project: Pick<Project, "id" | "name" | "website_url">;
  plan: "free" | "starter" | "pro" | "max";

  latest_scan: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    score: number | null;
    url: string;
    environment: string | null;
    started_at: string | null;
    finished_at: string | null;
  } | null;
  score: number | null;
  risk_level: string;
  total_findings: number;
  severity_counts: Record<string, number>;
  category_scores: Record<string, number>;
  category_counts?: Record<string, number>;
  findings: OverviewFinding[];
  locked_findings: number;

  has_scan: boolean;
  scan_available: boolean;
  scan_limit_reached: boolean;
  setup: {
    website_url_configured: boolean;
    schedule_enabled: boolean;
  };
  failed_scanners?: number;
  coverage_score?: number;
  global_score?: number | null;
};

export type CompetitorBenchmark = {
  id: string;
  label: string;
  url: string;
  score: number | null;
  status: "queued" | "running" | "completed" | "failed";
  last_scanned_at: string | null;
};

export type RoiProfile = {
  monthly_sessions: number;
  average_order_value: number;
  conversion_rate: number;
  currency: string;
  lcp_delay_seconds: number;
  estimated_conversion_loss_percent: number;
  estimated_monthly_revenue_at_risk: number;
  methodology: "directional_estimate";
};

export type ScanHistoryItem = {
  scan_id: string;
  scan_type: string;
  scan_scope?: string | null;
  status: "queued" | "running" | "completed" | "failed";
  score: number | null;
  finished_at: string | null;
};

export type FindingRetest = {
  id: number;
  finding_id: number;
  scan_id: string;
  retested_by_user_id?: string | null;
  status: "resolved" | "persisting" | "target_unreachable" | "error";
  http_status_code: number | null;
  response_time_ms: number | null;
  message: string;
  evidence?: Record<string, unknown>;
  created_at: string;
};

export type FindingItem = {
  id: number;
  title: string;
  category: string;
  severity: string;
  description: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  confidence?: number;
  remediation_prompt?: string;
  triage_status?: "open" | "in_progress" | "accepted_risk" | "false_positive" | "resolved";
  triage_note?: string | null;
  triaged_at?: string | null;
  triaged_by_user_id?: string | null;
  last_retested_at?: string | null;
  retests?: FindingRetest[];
};

export type FindingRetestProp = {
  id?: number;
  finding_id?: number;
  scan_id?: string;
  retested_by_user_id?: string | null;
  status?: "resolved" | "persisting" | "target_unreachable" | "error" | string;
  http_status_code?: number | null;
  response_time_ms?: number | null;
  message?: string;
  evidence?: Record<string, unknown>;
  created_at?: string;
};

export type FindingProp = {
  id?: number | string;
  title?: string;
  category?: string;
  severity?: string;
  description?: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  confidence?: number;
  remediation_prompt?: string;
  triage_status?: "open" | "in_progress" | "accepted_risk" | "false_positive" | "resolved";
  triage_note?: string | null;
  triaged_at?: string | null;
  triaged_by_user_id?: string | null;
  last_retested_at?: string | null;
  retests?: FindingRetestProp[] | any[];
};





export type FindingRetestResponse = {
  finding_id: number;
  retest_status: "resolved" | "persisting" | "target_unreachable" | "error";
  triage_status: string;
  http_status_code: number | null;
  response_time_ms: number | null;
  message: string;
  tested_at: string;
  evidence?: Record<string, unknown>;
};

export type ScanDetail = {
  id: string;
  url: string;
  project_id: string | null;
  environment: string | null;
  scan_type: string;
  status: "queued" | "running" | "completed" | "failed";
  overall_score: number | null;
  started_at: string | null;
  finished_at: string | null;
  findings: FindingItem[];
  progress: { total_scanners: number; completed_scanners: number; failed_scanners: number; current_scanner: string | null } | null;
  scanner_runs: Array<{ scanner_name: string; category: string; status: string; findings_count: number; error: string | null }>;
};


export type ScanDiff = {
  scan_id: string;
  previous_scan_id: string | null;
  comparison: {
    score_delta: number | null;
    regression_detected: boolean;
    new_findings: Array<{ scanner_name: string; title: string; severity: string }>;
    fixed_findings: Array<{ scanner_name: string; title: string; severity: string }>;
    unchanged_findings: Array<{ scanner_name: string; title: string; severity: string }>;
  } | null;
};

export type ProjectSchedule = {
  enabled: boolean;
  interval_minutes: number;
  environment: "production" | "staging" | "preview";
  next_run_at: string | null;
};

export type ProjectWebhook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProviderConnection = {
  id: string;
  provider: string;
  configured: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProjectActivity = {
  type: "finding" | "uptime_incident";
  severity: string;
  title: string;
  category: string;
  occurred_at: string | null;
  status?: string | null;
};

export type ReportShare = {
  id: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

export type BillingPlan = {
  id: "free" | "starter" | "pro" | "max";
  name: string;
  projects: number | null;
  scans_per_month: number | null;
  api_keys: number | null;
  features: string[];
};

export type BillingAccount = {
  plan: "free" | "starter" | "pro" | "max";
  status: string;
  dodo_customer_configured: boolean;
  subscription_configured: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage_scans: number;
  usage_limit: number | null;
};

export type SeoPreviewData = {
  url: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonical: string | null;
  favicon: string | null;
  fetchedAt: string;
};

