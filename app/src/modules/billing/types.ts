export type PlanTier = "free" | "starter" | "pro" | "max";
export type BillingInterval = "monthly" | "quarterly" | "annual";
export type BillingCycleType = "monthly" | "quarterly" | "annually";
export type PlanTierType = "free" | "starter" | "pro" | "business";

export interface PlanBillingDetails {
  price_id: string;
  amount: number;
}

export interface PlanConfig {
  name: string;
  description: string;
  billing_cycles: Record<BillingCycleType, PlanBillingDetails>;
}

export interface BillingPlan {
  id: PlanTier;
  name: string;
  projects: number | null;
  scans_per_month: number | null;
  api_keys: number | null;
  features: string[];
}

export interface BillingAccount {
  plan: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "inactive" | string;
  dodo_customer_configured: boolean;
  subscription_configured: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage_scans: number;
  usage_limit: number | null;
}

export interface CheckoutRequest {
  plan?: Exclude<PlanTier, "free">;
  price_id?: string;
  interval?: BillingCycleType;
}

export interface CheckoutResponse {
  checkout_url: string;
  url: string;
}

export interface PortalResponse {
  portal_url: string;
}

export const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  mcp_server: {
    label: "MCP Server Integration",
    description: "Connect AI coding agents (Cursor, Claude, Antigravity) directly via Model Context Protocol.",
  },
  preview_finding_details: {
    label: "Basic Finding Previews",
    description: "Overview of detected security risks and severity rankings.",
  },
  full_finding_details: {
    label: "Full Finding Explanations & Evidence",
    description: "Raw HTTP request/response proofs, DOM snippets, and CVSS ratings.",
  },
  basic_security_tests: {
    label: "Standard Attack Surface Probes",
    description: "Header checks, TLS verification, and public exposure scanning.",
  },
  active_security_tests: {
    label: "Active Deep Security Tests",
    description: "Comprehensive multi-vector vulnerability checks.",
  },
  pdf_export: {
    label: "Executive PDF Reports",
    description: "Export full compliance and audit reports with 1-click.",
  },
  remediation_guidance: {
    label: "Actionable Code & Config Diffs",
    description: "Before/after code remediation snippets with one-click patches.",
  },
  daily_monitoring: {
    label: "Daily Automated Monitoring",
    description: "Scheduled daily surface scans with regression alerts.",
  },
  live_threat_detection: {
    label: "24/7 Heartbeat & Threat Alerts",
    description: "Instant webhook notifications for downtime and new vulnerabilities.",
  },
  custom_monitoring: {
    label: "Custom Scan Intervals",
    description: "Set custom hourly or per-commit audit schedules.",
  },
  team_seats: {
    label: "Multi-Seat Team Access",
    description: "Collaborative team workspaces and role-based permissions.",
  },
  white_label_reports: {
    label: "White-Label Reports",
    description: "Custom branding and logo exports for client presentations.",
  },
  client_workspaces: {
    label: "Dedicated Client Workspaces",
    description: "Isolated environments for managing multiple customer domains.",
  },
  commercial_use: {
    label: "Commercial & Agency License",
    description: "Full commercial usage rights for security audits and client billing.",
  },
  dedicated_support: {
    label: "Priority Engineering Support",
    description: "Direct engineering slack channel and SLA response times.",
  },
};
