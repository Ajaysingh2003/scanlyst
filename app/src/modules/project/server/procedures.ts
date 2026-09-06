import axios from "axios";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import type { BillingAccount, BillingPlan, CompetitorBenchmark, FindingItem, FindingRetest, FindingRetestResponse, Project, ProjectActivity, ProjectOverview, ProjectSchedule, ProjectWebhook, ProviderConnection, ReportShare, RoiProfile, ScanDetail, ScanDiff, ScanHistoryItem, SeoPreviewData } from "@/modules/project/types";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseHtmlSeoMetadata(html: string, baseUrl: string): SeoPreviewData {
  const getMeta = (propOrName: string): string | null => {
    const reg = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${propOrName}["'][^>]*content=["']([^"']*)["']`, "i");
    const m = html.match(reg);
    if (m) return decodeHtmlEntities(m[1].trim());

    const regReverse = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${propOrName}["']`, "i");
    const mRev = html.match(regReverse);
    if (mRev) return decodeHtmlEntities(mRev[1].trim());
    return null;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

  const description = getMeta("description");
  const ogTitle = getMeta("og:title") || getMeta("twitter:title") || title;
  const ogDescription = getMeta("og:description") || getMeta("twitter:description") || description;
  let ogImage = getMeta("og:image") || getMeta("twitter:image");

  if (ogImage && !/^https?:\/\//i.test(ogImage)) {
    try {
      ogImage = new URL(ogImage, baseUrl).toString();
    } catch {}
  }

  const canonicalMatch =
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  let canonical = canonicalMatch ? canonicalMatch[1].trim() : null;
  if (canonical && !/^https?:\/\//i.test(canonical)) {
    try {
      canonical = new URL(canonical, baseUrl).toString();
    } catch {}
  }

  let favicon = null;
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']*)["']/i);
  if (iconMatch) {
    const favHref = iconMatch[1].trim();
    try {
      favicon = new URL(favHref, baseUrl).toString();
    } catch {
      favicon = favHref;
    }
  }

  return {
    url: baseUrl,
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    canonical,
    favicon,
    fetchedAt: new Date().toISOString(),
  };
}


const projectsApi = () => {
  const base = (process.env.BASE_API || "http://localhost:8000").replace(/\/$/, "");
  return `${base.endsWith("/api") ? base : `${base}/api`}/v1/projects`;
};

const scansApi = () => {
  const base = (process.env.BASE_API || "http://localhost:8000").replace(/\/$/, "");
  return `${base.endsWith("/api") ? base : `${base}/api`}/v1/scans`;
};

const billingApi = () => {
  const base = (process.env.BASE_API || "http://localhost:8000").replace(/\/$/, "");
  return `${base.endsWith("/api") ? base : `${base}/api`}/v1/billing`;
};

const securityScansApi = () => {
  const base = (process.env.BASE_API || "http://localhost:8000").replace(/\/$/, "");
  return `${base.endsWith("/api") ? base : `${base}/api`}/v1`;
};

const headers = async () => ({
  Authorization: `Bearer ${(await cookies()).get("access_token")?.value || ""}`,
});

const projectError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    const status = error.response?.status;
    const code: TRPCError["code"] = status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BAD_REQUEST";
    throw new TRPCError({ code, message: typeof detail === "string" ? detail : fallback });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback });
};

const websiteUrlSchema = z
  .string()
  .trim()
  .min(1, "Website URL is required")
  .transform((val) => {
    if (!/^https?:\/\//i.test(val)) {
      return `https://${val}`;
    }
    return val;
  })
  .pipe(
    z.string().url({
      message: "Please enter a valid website domain or URL (e.g. example.com or https://example.com)",
    })
  );

const projectInput = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  website_url: websiteUrlSchema,
});

export const projectRouter = createTRPCRouter({
  list: baseProcedure.query(async (): Promise<Project[]> => {
    try {
      const response = await axios.get<{ data: Project[] }>(projectsApi(), { headers: await headers() });
      return response.data.data || [];
    } catch (error) {
      return projectError(error, "Could not load projects");
    }
  }),

  create: baseProcedure.input(projectInput).mutation(async ({ input }): Promise<Project> => {
    try {
      const response = await axios.post<{ data: Project }>(projectsApi(), {
        ...input,
      }, { headers: await headers() });
      return response.data.data;
    } catch (error) {
      return projectError(error, "Could not create project");
    }
  }),

  update: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    name: z.string().trim().min(1).max(120).optional(),
    schedule_enabled: z.boolean().optional(),
    schedule_interval_minutes: z.number().int().min(60).max(43200).optional(),
  })).mutation(async ({ input }): Promise<Project> => {
    try {
      const { project_id, ...changes } = input;
      const response = await axios.patch<{ data: Project }>(`${projectsApi()}/${project_id}`, {
        ...changes,
      }, { headers: await headers() });
      return response.data.data;
    } catch (error) {
      return projectError(error, "Could not update project settings");
    }
  }),

  overview: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ProjectOverview> => {
    try {
      const response = await axios.get<{ data: ProjectOverview }>(`${projectsApi()}/${input.project_id}/overview`, { headers: await headers() });
      return response.data.data;
    } catch (error) {
      return projectError(error, "Could not load project overview");
    }
  }),

  runScan: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    scan_type: z.enum(["full", "standard"]).default("full"),
    scanner_categories: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    try {
      const response = await axios.post(`${scansApi()}`, input, { headers: await headers() });
      return response.data;
    } catch (error) {
      return projectError(error, "Could not start the audit");
    }
  }),

  runSqlInjection: baseProcedure.input(z.object({ project_id: z.string().uuid(), authorized: z.literal(true), include_post_requests: z.boolean(), include_time_based: z.boolean(), max_pages: z.number().int().min(1).max(50) })).mutation(async ({ input }) => {
    try { const { project_id, ...payload } = input; const response = await axios.post(`${securityScansApi()}/projects/${project_id}/security-scans/sql-injection`, payload, { headers: await headers() }); return response.data; }
    catch (error) { return projectError(error, "Could not start SQL injection scan"); }
  }),

  runXss: baseProcedure.input(z.object({ project_id: z.string().uuid(), authorized: z.literal(true), include_post_requests: z.boolean(), max_pages: z.number().int().min(1).max(100) })).mutation(async ({ input }) => {
    try { const { project_id, ...payload } = input; const response = await axios.post(`${securityScansApi()}/projects/${project_id}/security-scans/xss`, payload, { headers: await headers() }); return response.data; }
    catch (error) { return projectError(error, "Could not start active XSS scan"); }
  }),

  runAuthenticationScan: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    authorized: z.literal(true),
    production_confirmed: z.boolean(),
    webhook_url: z.string().url(),
    webhook_secret: z.string().min(32),
    test_account: z.object({ email: z.string().optional(), phone: z.string().optional(), username: z.string().optional(), identifier: z.string().optional(), password: z.string().optional() }),
    flow: z.object({ type: z.enum(["login", "login_with_otp", "passwordless", "password_reset", "signup"]), steps: z.array(z.object({ action: z.enum(["open_url", "fill", "click", "wait_for_otp", "fill_otp", "wait_for_selector", "assert_url_contains", "assert_text"]), url: z.string().optional(), selector: z.string().optional(), value: z.string().optional(), value_from: z.string().optional(), prompt: z.string().optional(), text: z.string().optional() })).min(1).max(40) }),
    rate_limit_probe: z.object({ enabled: z.boolean(), start_url: z.string(), identifier_selector: z.string().optional(), identifier_from: z.enum(["test_account.email", "test_account.phone", "test_account.username", "test_account.identifier"]), password_selector: z.string().optional(), submit_selector: z.string().optional(), wrong_password: z.string().optional(), attempts: z.number().int().min(3).max(8), delay_ms: z.number().int().min(250).max(2000), endpoint_path: z.string().optional() }),
    include_password_reset: z.boolean(),
  })).mutation(async ({ input }) => {
    try { const { project_id, ...payload } = input; const response = await axios.post(`${securityScansApi()}/projects/${project_id}/security-scans/authentication`, payload, { headers: await headers() }); return response.data; }
    catch (error) { return projectError(error, "Could not start authentication flow scan"); }
  }),

  runExtendedScan: baseProcedure.input(z.object({ scan_type: z.enum(["github_sast", "dependencies", "firebase", "tenant_isolation", "audit_logging", "ddos_resilience", "mobile_api", "hosting_security"]), project_id: z.string().uuid().optional(), url: z.string().url(), authorized: z.literal(true), repository_url: z.string().url().optional(), github_token: z.string().optional(), firebase_project_url: z.string().url().optional(), firebase_access_token: z.string().optional(), firebase_api_key: z.string().optional(), vercel_project_id: z.string().optional(), vercel_token: z.string().optional(), netlify_site_id: z.string().optional(), netlify_token: z.string().optional(), cloudflare_zone_id: z.string().optional(), cloudflare_api_token: z.string().optional(), tenant_test_mode: z.boolean().optional(), tenant: z.object({ login_url: z.string(), identifier_selector: z.string(), password_selector: z.string(), submit_selector: z.string(), actor_a: z.object({ identifier: z.string().min(1), password: z.string().min(12) }), actor_b: z.object({ identifier: z.string().min(1), password: z.string().min(12) }), resource_paths: z.array(z.string().startsWith("/")).min(1).max(20) }).optional() })).mutation(async ({ input }) => {
    try { const { scan_type, ...payload } = input; const response = await axios.post(`${securityScansApi()}/scans/security/${scan_type}`, payload, { headers: await headers() }); return response.data; }
    catch (error) { return projectError(error, "Could not start integration scan"); }
  }),

  runRobotsCrawl: baseProcedure.input(z.object({ url: z.string().url() })).mutation(async ({ input }) => {
    try { const response = await axios.post(`${securityScansApi()}/scans/robots-crawl`, input, { headers: await headers() }); return response.data; }
    catch (error) { return projectError(error, "Could not start robots crawl"); }
  }),

  benchmarks: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<CompetitorBenchmark[]> => {
    try {
      const response = await axios.get<{ data: CompetitorBenchmark[] }>(`${projectsApi()}/${input.project_id}/benchmarks`, { headers: await headers() });
      return response.data.data || [];
    } catch (error) {
      return projectError(error, "Could not load competitor benchmarks");
    }
  }),

  saveBenchmarks: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    competitors: z.array(z.object({ label: z.string().trim().min(1).max(120), url: z.string().url() })).min(1).max(3),
  })).mutation(async ({ input }): Promise<CompetitorBenchmark[]> => {
    try {
      const response = await axios.put<{ data: CompetitorBenchmark[] }>(`${projectsApi()}/${input.project_id}/benchmarks`, { competitors: input.competitors }, { headers: await headers() });
      return response.data.data || [];
    } catch (error) {
      return projectError(error, "Could not save competitor benchmarks");
    }
  }),

  roi: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<RoiProfile> => {
    try {
      const response = await axios.get<{ data: RoiProfile }>(`${projectsApi()}/${input.project_id}/roi`, { headers: await headers() });
      return response.data.data;
    } catch (error) {
      return projectError(error, "Could not load ROI insights");
    }
  }),

  updateRoi: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    monthly_sessions: z.number().int().min(1).max(100_000_000),
    average_order_value: z.number().min(0.01).max(10_000_000),
    conversion_rate: z.number().min(0.01).max(100),
    currency: z.string().trim().min(3).max(3).default("USD"),
    lcp_delay_seconds: z.number().min(0).max(30).default(1.2),
  })).mutation(async ({ input }): Promise<RoiProfile> => {
    try {
      const { project_id, ...payload } = input;
      const response = await axios.put<{ data: RoiProfile }>(`${projectsApi()}/${project_id}/roi`, payload, { headers: await headers() });
      return response.data.data;
    } catch (error) {
      return projectError(error, "Could not update ROI settings");
    }
  }),

  scanHistory: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ScanHistoryItem[]> => {
    try {
      const response = await axios.get<ScanHistoryItem[]>(`${scansApi()}/projects/${input.project_id}/scan-history?limit=100`, { headers: await headers() });
      return response.data || [];
    } catch (error) {
      return projectError(error, "Could not load scan history");
    }
  }),

  scanDetail: baseProcedure.input(z.object({ scan_id: z.string().uuid() })).query(async ({ input }): Promise<ScanDetail> => {
    try {
      const response = await axios.get<ScanDetail>(`${scansApi()}/${input.scan_id}`, { headers: await headers() });
      return response.data;
    } catch (error) {
      return projectError(error, "Could not load scan details");
    }
  }),

  latestScan: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ScanDetail> => {
    try {
      const response = await axios.get<ScanDetail>(`${projectsApi()}/${input.project_id}/scans/latest`, { headers: await headers() });
      return response.data;
    } catch (error) { return projectError(error, "Could not load the latest scan"); }
  }),

  scanDiff: baseProcedure.input(z.object({ scan_id: z.string().uuid() })).query(async ({ input }): Promise<ScanDiff> => {
    try {
      const response = await axios.get<ScanDiff>(`${scansApi()}/${input.scan_id}/diff`, { headers: await headers() });
      return response.data;
    } catch (error) {
      return projectError(error, "Could not compare scans");
    }
  }),

  schedule: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ProjectSchedule> => {
    try {
      const response = await axios.get<{ data: ProjectSchedule }>(`${projectsApi()}/${input.project_id}/schedule`, { headers: await headers() });
      return response.data.data;
    } catch (error) { return projectError(error, "Could not load scan schedule"); }
  }),

  updateSchedule: baseProcedure.input(z.object({ project_id: z.string().uuid(), enabled: z.boolean().optional(), interval_minutes: z.number().int().min(60).max(43200).optional() })).mutation(async ({ input }): Promise<ProjectSchedule> => {
    try {
      const { project_id, ...payload } = input;
      const response = await axios.patch<{ data: ProjectSchedule }>(`${projectsApi()}/${project_id}/schedule`, payload, { headers: await headers() });
      return response.data.data;
    } catch (error) { return projectError(error, "Could not update scan schedule"); }
  }),

  webhooks: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ProjectWebhook[]> => {
    try {
      const response = await axios.get<{ data: ProjectWebhook[] }>(`${projectsApi()}/${input.project_id}/webhooks`, { headers: await headers() });
      return response.data.data || [];
    } catch (error) { return projectError(error, "Could not load project webhooks"); }
  }),

  createWebhook: baseProcedure.input(z.object({ project_id: z.string().uuid(), url: z.string().url(), secret: z.string().min(32), events: z.array(z.enum(["scan.completed", "scan.failed", "scan.regression", "uptime.down", "uptime.recovered"])).min(1) })).mutation(async ({ input }): Promise<ProjectWebhook> => {
    try {
      const { project_id, ...payload } = input;
      const response = await axios.post<{ data: ProjectWebhook }>(`${projectsApi()}/${project_id}/webhooks`, payload, { headers: await headers() });
      return response.data.data;
    } catch (error) { return projectError(error, "Could not create project webhook"); }
  }),

  deleteWebhook: baseProcedure.input(z.object({ project_id: z.string().uuid(), webhook_id: z.string().uuid() })).mutation(async ({ input }) => {
    try {
      await axios.delete(`${projectsApi()}/${input.project_id}/webhooks/${input.webhook_id}`, { headers: await headers() });
      return { success: true };
    } catch (error) { return projectError(error, "Could not delete project webhook"); }
  }),

  providerConnection: baseProcedure.input(z.object({ project_id: z.string().uuid(), provider: z.string().min(1) })).query(async ({ input }): Promise<ProviderConnection> => {
    try {
      const response = await axios.get<{ data: ProviderConnection }>(`${projectsApi()}/${input.project_id}/connections/${input.provider}`, { headers: await headers() });
      return response.data.data;
    } catch (error) { return projectError(error, "Could not load provider connection"); }
  }),

  providerConnections: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ProviderConnection[]> => {
    try {
      const response = await axios.get<{ data: ProviderConnection[] }>(`${projectsApi()}/${input.project_id}/connections`, { headers: await headers() });
      return response.data.data || [];
    } catch (error) { return projectError(error, "Could not load provider connections"); }
  }),

  saveProviderConnection: baseProcedure.input(z.object({ project_id: z.string().uuid(), provider: z.enum(["github", "firebase", "vercel", "netlify", "cloudflare"]), configuration: z.record(z.string(), z.string().min(1)).refine((value) => Object.keys(value).length > 0) })).mutation(async ({ input }): Promise<ProviderConnection> => {
    try {
      const { project_id, provider, configuration } = input;
      const response = await axios.post<{ data: ProviderConnection }>(`${projectsApi()}/${project_id}/connections/${provider}`, { configuration }, { headers: await headers() });
      return response.data.data;
    } catch (error) { return projectError(error, "Could not save provider connection"); }
  }),

  deleteProviderConnection: baseProcedure.input(z.object({ project_id: z.string().uuid(), provider: z.string().min(1) })).mutation(async ({ input }) => {
    try {
      await axios.delete(`${projectsApi()}/${input.project_id}/connections/${input.provider}`, { headers: await headers() });
      return { success: true };
    } catch (error) { return projectError(error, "Could not remove provider connection"); }
  }),

  activity: baseProcedure.input(z.object({ project_id: z.string().uuid() })).query(async ({ input }): Promise<ProjectActivity[]> => {
    try {
      const response = await axios.get<{ data: ProjectActivity[] }>(`${projectsApi()}/${input.project_id}/activity`, { headers: await headers() });
      return response.data.data || [];
    } catch (error) { return projectError(error, "Could not load project activity"); }
  }),

  reportShares: baseProcedure.input(z.object({ scan_id: z.string().uuid() })).query(async ({ input }): Promise<ReportShare[]> => {
    try {
      const response = await axios.get<ReportShare[]>(`${scansApi()}/${input.scan_id}/share`, { headers: await headers() });
      return response.data || [];
    } catch (error) { return projectError(error, "Could not load report share links"); }
  }),

  createReportShare: baseProcedure.input(z.object({ scan_id: z.string().uuid(), expires_in_hours: z.number().int().min(1).max(8760).nullable() })).mutation(async ({ input }): Promise<{ url: string; expires_at: string | null }> => {
    try {
      const response = await axios.post<{ url: string; expires_at: string | null }>(`${scansApi()}/${input.scan_id}/share`, { expires_in_hours: input.expires_in_hours }, { headers: await headers() });
      return response.data;
    } catch (error) { return projectError(error, "Could not create report share link"); }
  }),

  revokeReportShare: baseProcedure.input(z.object({ scan_id: z.string().uuid(), link_id: z.string().uuid() })).mutation(async ({ input }) => {
    try {
      await axios.delete(`${scansApi()}/${input.scan_id}/share/${input.link_id}`, { headers: await headers() });
      return { success: true };
    } catch (error) { return projectError(error, "Could not revoke report share link"); }
  }),

  billingAccount: baseProcedure.query(async (): Promise<BillingAccount> => {
    try {
      const response = await axios.get<BillingAccount>(`${billingApi()}/account`, { headers: await headers() });
      return response.data;
    } catch (error) { return projectError(error, "Could not load billing account"); }
  }),

  billingPlans: baseProcedure.query(async (): Promise<BillingPlan[]> => {
    try {
      const response = await axios.get<BillingPlan[]>(`${billingApi()}/plans`, { headers: await headers() });
      return response.data || [];
    } catch (error) { return projectError(error, "Could not load billing plans"); }
  }),

  createCheckout: baseProcedure.input(z.object({ plan: z.enum(["starter", "pro", "max"]), interval: z.enum(["monthly", "quarterly", "annual"]).default("monthly") })).mutation(async ({ input }): Promise<{ checkout_url: string }> => {
    try {
      const response = await axios.post<{ checkout_url: string }>(`${billingApi()}/checkout`, input, { headers: await headers() });
      return response.data;
    } catch (error) { return projectError(error, "Could not create checkout session"); }
  }),

  createBillingPortal: baseProcedure.mutation(async (): Promise<{ portal_url: string }> => {
    try {
      const response = await axios.post<{ portal_url: string }>(`${billingApi()}/portal`, {}, { headers: await headers() });
      return response.data;
    } catch (error) { return projectError(error, "Could not open billing portal"); }
  }),

  updateFindingTriage: baseProcedure.input(z.object({
    scan_id: z.string().uuid(),
    finding_id: z.number().int(),
    triage_status: z.enum(["open", "in_progress", "accepted_risk", "false_positive", "resolved"]),
    triage_note: z.string().max(1000).optional(),
  })).mutation(async ({ input }): Promise<FindingItem> => {
    try {
      const { scan_id, finding_id, ...payload } = input;
      const response = await axios.patch<FindingItem>(
        `${scansApi()}/${scan_id}/findings/${finding_id}/triage`,
        payload,
        { headers: await headers() }
      );
      return response.data;
    } catch (error) { return projectError(error, "Could not update finding status"); }
  }),

  retestFinding: baseProcedure.input(z.object({
    scan_id: z.string().uuid(),
    finding_id: z.number().int(),
  })).mutation(async ({ input }): Promise<FindingRetestResponse> => {
    try {
      const response = await axios.post<FindingRetestResponse>(
        `${scansApi()}/${input.scan_id}/findings/${input.finding_id}/retest`,
        {},
        { headers: await headers() }
      );
      return response.data;
    } catch (error) { return projectError(error, "Could not re-test finding"); }
  }),

  findingRetests: baseProcedure.input(z.object({
    scan_id: z.string().uuid(),
    finding_id: z.number().int(),
  })).query(async ({ input }): Promise<FindingRetest[]> => {
    try {
      const response = await axios.get<FindingRetest[]>(
        `${scansApi()}/${input.scan_id}/findings/${input.finding_id}/retests`,
        { headers: await headers() }
      );
      return response.data || [];
    } catch (error) { return projectError(error, "Could not load retest history"); }
  }),

  seoPreview: baseProcedure.input(z.object({
    project_id: z.string().uuid(),
    url: z.string().optional(),
  })).query(async ({ input }): Promise<SeoPreviewData> => {
    let targetUrl = input.url;
    if (!targetUrl) {
      try {
        const projRes = await axios.get<{ data: Project }>(
          `${projectsApi()}/${input.project_id}`,
          { headers: await headers() }
        );
        targetUrl = projRes.data?.data?.website_url || (projRes.data as any)?.website_url;
      } catch {}
    }

    if (!targetUrl) {
      return {
        url: "",
        title: null,
        description: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        canonical: null,
        favicon: null,
        fetchedAt: new Date().toISOString(),
      };
    }

    const normalized = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

    try {
      const res = await axios.get(normalized, {
        timeout: 8000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        maxRedirects: 5,
        responseType: "text",
      });

      const html = typeof res.data === "string" ? res.data : "";
      return parseHtmlSeoMetadata(html, normalized);
    } catch {
      return {
        url: normalized,
        title: null,
        description: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        canonical: null,
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalized)}&sz=64`,
        fetchedAt: new Date().toISOString(),
      };
    }
  }),
});

