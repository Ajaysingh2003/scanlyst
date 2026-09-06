"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Globe2,
  KeyRound,
  LockKeyhole,
  Play,
  Radar,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  SearchCheck,
  TriangleAlert,
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Button } from "@/components/ui/button";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { downloadReport } from "@/lib/report-export";

const pillars = [
  { key: "security", label: "Security", icon: ShieldCheck, tone: "blue" },
  { key: "seo", label: "SEO", icon: Globe2, tone: "emerald" },
  { key: "aeo", label: "AEO / AI visibility", icon: SearchCheck, tone: "teal" },
  { key: "performance", label: "Performance", icon: Zap, tone: "amber" },
  { key: "domain", label: "Domain", icon: Radar, tone: "violet" },
  { key: "compliance", label: "Compliance", icon: CheckCircle2, tone: "cyan" },
  {
    key: "accessibility",
    label: "Accessibility",
    icon: Sparkles,
    tone: "pink",
  },
];

const pillarTone: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  cyan: "bg-cyan-50 text-cyan-600",
  pink: "bg-pink-50 text-pink-600",
  teal: "bg-teal-50 text-teal-600",
};

const severityOrder = ["critical", "high", "medium", "low", "info"];
const severityLabel: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

const severityColor: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#94a3b8",
};

function getScoreColor(score: number | null) {
  if (score == null) return "#cbd5e1";
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({ score }: { score: number | null }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const color = getScoreColor(score);
  return (
    <div
      className="relative flex size-36 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="flex size-28 flex-col items-center justify-center rounded-full bg-white">
        <span className="text-4xl font-semibold tracking-tight text-slate-950">
          {score == null ? "—" : Math.round(score)}
        </span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
}

function ScoreTrendChart({ scans }: { scans: any[] }) {
  const data = scans
    .filter((scan) => scan.score != null && scan.finished_at)
    .slice()
    .reverse()
    .map((scan) => ({
      date: new Date(scan.finished_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: Math.round(scan.score),
    }))
    .slice(-6); // last 6 scans

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No score history yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            fontSize: "12px",
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: "#2563eb" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SeverityDonutChart({ counts }: { counts: Record<string, number> }) {
  const data = severityOrder
    .map((severity) => ({
      name: severityLabel[severity],
      value: counts[severity] || 0,
      color: severityColor[severity],
    }))
    .filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No findings yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="60%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600">{item.name}</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useActiveProject } from "@/hooks/useActiveProject";
import { EmptyProjectState } from "../component/EmptyProjectState";

function DashboardView() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { project: activeProject, projectId, isLoading } = useActiveProject();

  const overviewQuery = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({
      project_id: projectId,
    }),
    refetchInterval: (query) =>
      query.state.data?.latest_scan?.status === "queued" ||
      query.state.data?.latest_scan?.status === "running"
        ? 3000
        : false,
  });
  const recentScansQuery = useSuspenseQuery({
    ...trpc.project.scanHistory.queryOptions({
      project_id: projectId,
    }),
    refetchInterval: 5000,
  });
  const billingQuery = useSuspenseQuery(
    trpc.project.billingAccount.queryOptions(),
  );
  const runScan = useMutation({
    mutationFn: () =>
      trpcClient.project.runScan.mutate({
        project_id: activeProject!.id,
      }),
    onSuccess: () => {
      toast.success("Full audit queued");
      queryClient.invalidateQueries();
    },
    onError: (error) =>
      toast.error(error.message || "Could not start the audit"),
  });
  const overview = overviewQuery.data;

  if (isLoading)
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  if (!activeProject)
    return (
      <div className="mx-auto h-full w-full flex items-center justify-center max-w-7xl px-6 py-10">
        <EmptyProjectState />
      </div>
    );
  if (overviewQuery.isLoading || !overview)
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );

  const scanRunning =
    overview.latest_scan?.status === "queued" ||
    overview.latest_scan?.status === "running";
  const scansUsed = billingQuery.data?.usage_scans ?? 0;
  const scanLimit = billingQuery.data?.usage_limit ?? null;
  const scansRemaining =
    scanLimit == null ? null : Math.max(0, scanLimit - scansUsed);
  const latestCompletedScanId =
    overview.latest_scan?.status === "completed"
      ? overview.latest_scan.id
      : null;
  const handleExport = async () => {
    if (!latestCompletedScanId) return;
    try {
      await downloadReport(latestCompletedScanId, "pdf");
      toast.success("PDF report downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export this report",
      );
    }
  };
  const pillarScore = (key: string) => {
    if (key === "security") {
      if (overview.category_scores.security != null)
        return overview.category_scores.security;
      const v = overview.category_scores.vulnerability;
      const c = overview.category_scores.configuration;
      if (v != null && c != null) return Math.round((v + c) / 2);
      if (v != null) return v;
      if (c != null) return c;
      return overview.score ?? null;
    }
    return (
      overview.category_scores[key] ??
      (key === "aeo" ? overview.category_scores["seo-aeo"] : undefined) ??
      (key === "domain"
        ? overview.category_scores.infrastructure
        : undefined) ??
      null
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black">
            Project overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {overview.project.name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Globe2 className="size-3.5" />
            {overview.project.website_url}
          </p>
        </div>
        <div className="flex items-center gap-2 p-5 py-3">
          <Button
            className={"md:p-5 p-3"}
            variant="outline"
            size="icon"
            title="Notifications"
          >
            <Bell className="size-4" />
          </Button>
          <Button
            className={"md:p-5 p-3 text-sm md:text-md"}
            variant="outline"
            onClick={() => void handleExport()}
            disabled={!latestCompletedScanId}
            title="Export report"
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button
            className={"p-3 md:p-5 text-sm md:text-md bg-background-btn"}
            onClick={() => runScan.mutate()}
            disabled={
              runScan.isPending || !overview.scan_available || scanRunning
            }
          >
            <Play className="mr-2 size-4" />
            {scanRunning
              ? "Audit running"
              : overview.scan_limit_reached
                ? "Scan limit reached"
                : "Run all audits"}
          </Button>
        </div>
      </div>

      {/* Main hero card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <ScoreRing score={overview.score} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${overview.risk_level === "critical" || overview.risk_level === "high" ? "bg-red-500" : overview.risk_level === "not_scanned" ? "bg-slate-300" : "bg-amber-400"}`}
              />
              <h2 className="text-xl font-semibold text-slate-950">
                {overview.has_scan
                  ? `${overview.total_findings} open findings`
                  : "Ready for your first audit"}
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {scanRunning
                ? "Your audit is running. This overview will update automatically."
                : overview.has_scan
                  ? `Last audit ${overview.latest_scan?.finished_at ? new Date(overview.latest_scan.finished_at).toLocaleString() : "is being prepared"}.`
                  : "Run a full audit to see your security posture across every pillar."}
            </p>
            {overview.plan === "free" && overview.locked_findings > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <LockKeyhole className="size-3.5" />
                {overview.locked_findings} more findings are available with an
                upgrade
              </p>
            )}

            {Boolean(
              overview.failed_scanners && overview.failed_scanners > 0,
            ) && (
              <div className="mt-3.5 rounded-xl border border-amber-200/90 bg-amber-50/60 p-3.5 text-xs">
  <div className="flex items-start gap-2.5">
    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />

    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-amber-950">
          Partial audit coverage
        </p>
        <span className="font-mono text-[10.5px] text-amber-800/80">
          ({overview.failed_scanners} failed)
        </span>
      </div>

      <p className="leading-relaxed text-amber-900/85">
        {overview.global_score != null && (
          <span className="font-medium text-amber-950">
            Findings score: {Math.round(overview.global_score)}/100 · Overall capped at {overview.score}/100.{" "}
          </span>
        )}
        Target host dropped connections, triggered rate limits, or failed DNS lookups during the run.
      </p>
    </div>
  </div>
</div>
            )}
          </div>
          {/* <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs text-slate-500">Plan</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-950">
              {overview.plan}
            </p>
            <Link
              href="/pricing"
              className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:underline"
            >
              Manage plan <ArrowUpRight className="ml-1 size-3" />
            </Link>
          </div> */}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-800">
              Monthly scan usage
            </span>
            <span
              className={
                overview.scan_limit_reached
                  ? "font-semibold text-[#f43f5e]"
                  : "text-slate-500"
              }
            >
              {scanLimit == null
                ? `${scansUsed} scans used · Unlimited plan`
                : `${scansUsed} / ${scanLimit} scans used`}
            </span>
          </div>
          {scanLimit != null && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={
                  overview.scan_limit_reached
                    ? "h-full bg-[#f43f5e]"
                    : "h-full bg-blue-600"
                }
                style={{
                  width: `${Math.min(100, (scansUsed / scanLimit) * 100)}%`,
                }}
              />
            </div>
          )}
          {overview.scan_limit_reached ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2">
              <p className="text-xs font-medium text-rose-700">
                Your monthly scan limit is reached. New scans are blocked until
                the next billing cycle or an upgrade.
              </p>
              <Link
                href="/pricing"
                className="text-xs font-semibold text-[#f43f5e]"
              >
                Upgrade plan
              </Link>
            </div>
          ) : (
            scansRemaining != null && (
              <p className="mt-2 text-xs text-slate-500">
                {scansRemaining} scan{scansRemaining === 1 ? "" : "s"} remaining
                this billing month.
              </p>
            )
          )}
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total findings</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {overview.total_findings}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">High & critical</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {(overview.severity_counts.critical || 0) +
              (overview.severity_counts.high || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Scan status</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            {scanRunning ? (
              <>
                <RefreshCw className="size-4 animate-spin text-blue-600" />
                Scanning now
              </>
            ) : overview.has_scan ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-500" />
                Up to date
              </>
            ) : (
              <>
                <TriangleAlert className="size-4 text-amber-500" />
                Not scanned yet
              </>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Environments configured
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {[overview.setup.website_url_configured].filter(Boolean).length}
            <span className="text-sm font-normal text-slate-400"> /3</span>
          </p>
        </div>
      </div>

      {/* Charts: Score trend & severity donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Score trend</h2>
          <p className="mt-1 text-xs text-slate-500">Last 6 scans</p>
          <div className="mt-4">
            <ScoreTrendChart scans={recentScansQuery.data || []} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Findings by severity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Distribution of open findings
          </p>
          <div className="mt-4">
            <SeverityDonutChart counts={overview.severity_counts} />
          </div>
        </section>
      </div>

      {/* Main content: pillars and findings */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Pillars */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pillars
            </h2>
            <Link
              href="/dashboard/scans"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all scans
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map(({ key, label, icon: Icon, tone }) => {
              const score = pillarScore(key);
              return (
                <Link
                  href={`/dashboard/${key}`}
                  key={key}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${pillarTone[tone]}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-700">
                      {label}
                    </span>
                    <span className="mt-1 block text-xl font-semibold text-slate-950">
                      {score == null ? "—" : Math.round(score)}{" "}
                      <small className="text-xs font-normal text-slate-400">
                        /100
                      </small>
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:text-blue-500" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Needs attention */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Needs attention
            </h2>
            {overview.has_scan && (
              <span className="text-xs text-slate-400">
                {overview.total_findings} total findings
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!overview.has_scan ? (
              <div className="p-8 text-center">
                <CircleHelp className="mx-auto size-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No audit results yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Run all audits to generate your first overview.
                </p>
              </div>
            ) : (
              <>
                {overview.findings.map((finding) => {
                  const catHref =
                    finding.category === "configuration"
                      ? "/dashboard/security/headers"
                      : finding.category === "vulnerability"
                        ? "/dashboard/security/vulnerabilities"
                        : finding.category === "infrastructure"
                          ? "/dashboard/domain"
                          : `/dashboard/${finding.category}`;

                  return (
                    <div
                      key={finding.id}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <span
                        className={`size-2.5 rounded-full ${finding.severity === "critical" || finding.severity === "high" ? "bg-red-500" : finding.severity === "medium" ? "bg-amber-400" : "bg-slate-400"}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        <span className="mr-2 font-semibold uppercase text-[10px] text-slate-400">
                          {severityLabel[finding.severity] || finding.severity}
                        </span>
                        {finding.title}
                      </span>
                      <Link
                        href={catHref}
                        className="hidden items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 sm:inline-flex"
                      >
                        {finding.category} <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  );
                })}
                {overview.locked_findings > 0 && (
                  <Link
                    href="/pricing"
                    className="flex items-center gap-3 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <LockKeyhole className="size-4 text-slate-400" />
                    <span>
                      Unlock {overview.locked_findings} more findings and
                      remediation details
                    </span>
                    <ChevronRight className="ml-auto size-4 text-slate-400" />
                  </Link>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Recent scans */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-rose-500" />
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Telemetry Log
              </span>
            </div>
            <h2 className="mt-0.5 font-heading text-base font-semibold tracking-tight text-slate-900">
              Recent scan activity
            </h2>
          </div>

          <Link
            href="/dashboard/scans/history"
            className="group inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-500 transition-colors hover:text-rose-600"
          >
            <span>View all history</span>
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Grid List */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(recentScansQuery.data || []).slice(0, 3).map((scan) => {
            const score = scan.score != null ? Math.round(scan.score) : null;
            const scoreBadgeClass =
              score == null
                ? "bg-slate-100 text-slate-500 border-slate-200/80"
                : score >= 90
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                  : score >= 70
                    ? "bg-amber-50 text-amber-700 border-amber-200/70"
                    : "bg-rose-50 text-rose-700 border-rose-200/70";

            const statusDotClass =
              scan.status === "queued" || scan.status === "running"
                ? "bg-amber-500 animate-pulse"
                : scan.status === "failed"
                  ? "bg-rose-500"
                  : "bg-emerald-500";

            return (
              <Link
                key={scan.scan_id}
                href={`/dashboard/scans/${scan.scan_id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-rose-500" />
                      <span className="truncate font-heading text-xs font-semibold text-slate-800 group-hover:text-slate-950">
                        {scan.scan_type === "full"
                          ? "Full website audit"
                          : scan.scan_scope
                            ? `Standard · ${scan.scan_scope}`
                            : scan.scan_type}
                      </span>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${scoreBadgeClass}`}
                    >
                      {score ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-150 pt-2.5 font-mono text-[10.5px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${statusDotClass}`}
                    />
                    <span className="capitalize">
                      {scan.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="size-3" />
                    <span>
                      {scan.finished_at
                        ? new Date(scan.finished_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "Scanning…"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {!recentScansQuery.data?.length && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                <Activity className="size-4" />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-700">
                No recent audits found
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Run your first target scan above to populate your activity logs.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom: quick actions and setup */}
      <section className="grid gap-3.5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Health & Next Actions */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                  Recommendations
                </span>
                <h2 className="mt-0.5 font-heading text-sm font-semibold tracking-tight text-slate-900">
                  Keep your project healthy
                </h2>
              </div>
              <span className="flex size-7 items-center justify-center rounded-lg border border-slate-150 bg-slate-50 text-slate-400">
                <Settings2 className="size-3.5" />
              </span>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <Link
                href="/dashboard/monitoring"
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                      <Clock3 className="size-3.5" />
                    </span>
                    <ChevronRight className="size-3.5 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-600" />
                  </div>
                  <p className="mt-2.5 font-heading text-xs font-semibold text-slate-900">
                    Set up monitoring
                  </p>
                  <p className="mt-1 font-content text-[11px] leading-relaxed text-slate-500">
                    Catch score drops and regressions automatically before
                    production.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/api-mcp"
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
                      <KeyRound className="size-3.5" />
                    </span>
                    <ChevronRight className="size-3.5 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-violet-600" />
                  </div>
                  <p className="mt-2.5 font-heading text-xs font-semibold text-slate-900">
                    Connect your workflow
                  </p>
                  <p className="mt-1 font-content text-[11px] leading-relaxed text-slate-500">
                    Trigger automated scan sweeps using project API keys and
                    MCP.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Project Setup Checklist & Progress */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Configuration
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-slate-600">
                {[overview.setup.website_url_configured].filter(Boolean).length}
                /3 Done
              </span>
            </div>

            <h3 className="mt-1 font-heading text-sm font-semibold tracking-tight text-slate-900">
              Project setup
            </h3>

            {/* Progress Bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${([overview.setup.website_url_configured].filter(Boolean).length / 3) * 100}%`,
                }}
              />
            </div>

            {/* Checklist items */}
            <div className="mt-4 space-y-2">
              {[
                [
                  "Website URL",
                  overview.setup.website_url_configured,
                  "Required",
                ],
                ["Webhook Notifications", false, "Optional"],
                ["API Key Generated", false, "Optional"],
              ].map(([label, configured, tag]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-lg border border-slate-150/70 bg-slate-50/40 px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`size-3.5 shrink-0 ${
                        configured ? "text-emerald-500" : "text-slate-300"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        configured ? "text-slate-800" : "text-slate-500"
                      }`}
                    >
                      {String(label)}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-slate-400">
                    {configured ? "Active" : String(tag)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardView;
