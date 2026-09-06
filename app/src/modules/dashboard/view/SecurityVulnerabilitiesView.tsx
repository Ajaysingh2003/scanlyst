"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  Terminal,
  Database,
  FileCode,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SecurityVulnerabilitiesView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Shield}
        title="No Project Selected"
        description="Select or create a project to view application vulnerabilities and risk posture."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  // Filter application vulnerabilities accurately
  const allFindings = latestScan.data?.findings || [];
  const findings = allFindings.filter((f: any) => {
    const cat = (f.category || "").toLowerCase();
    const title = (f.title || "").toLowerCase();
    const scanner = (f.scanner_name || "").toLowerCase();

    if (cat === "vulnerability" || cat === "threat") return true;
    if (cat === "security") return true;

    const keywords = [
      "vulnerab",
      "xss",
      "csrf",
      "sqli",
      "injection",
      "endpoint",
      "debug",
      "sensitive",
      "api key",
      "secret",
      "token",
      "actuator",
      ".env",
      "server-status",
      "idor",
      "traversal",
      "sink",
      "leak",
      "exposure",
      "rce",
    ];
    return keywords.some((kw) => title.includes(kw) || scanner.includes(kw));
  });

  // Diagnostic checks for the summary cards
  const endpointIssue = findings.find((f: any) => {
    const text = `${f.title} ${f.description} ${f.scanner_name}`.toLowerCase();
    return (
      text.includes("endpoint") ||
      text.includes(".env") ||
      text.includes("debug") ||
      text.includes("actuator") ||
      text.includes("server-status")
    );
  });

  const xssIssue = findings.find((f: any) => {
    const text = `${f.title} ${f.description}`.toLowerCase();
    return text.includes("xss") || text.includes("sink") || text.includes("script");
  });

  const injectionIssue = findings.find((f: any) => {
    const text = `${f.title} ${f.description}`.toLowerCase();
    return text.includes("sql") || text.includes("injection") || text.includes("sqli");
  });

  const secretIssue = findings.find((f: any) => {
    const text = `${f.title} ${f.description}`.toLowerCase();
    return (
      text.includes("api key") ||
      text.includes("secret") ||
      text.includes("token") ||
      text.includes("credential")
    );
  });

  const vulnerabilityChecks = [
    {
      name: "Sensitive Endpoints & Files",
      status: !endpointIssue ? "pass" : "fail",
      detail: !endpointIssue
        ? "No accessible debug or env routes detected"
        : endpointIssue.title,
      icon: Terminal,
    },
    {
      name: "Client-Side Sinks & XSS",
      status: !xssIssue ? "pass" : "fail",
      detail: !xssIssue
        ? "No unescaped DOM sinks identified"
        : xssIssue.title,
      icon: FileCode,
    },
    {
      name: "Injection Vectors (SQLi / Command)",
      status: !injectionIssue ? "pass" : "fail",
      detail: !injectionIssue
        ? "Parameter inputs guarded against injection"
        : injectionIssue.title,
      icon: Database,
    },
    {
      name: "API Keys & Secrets Exposure",
      status: !secretIssue ? "pass" : "fail",
      detail: !secretIssue
        ? "No plaintext tokens or credentials exposed"
        : secretIssue.title,
      icon: KeyRound,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header */}
      <PageHeader
        websiteUrl={project.website_url}
        title="Application Risks & Vulnerabilities"
        description="Detailed audit findings for endpoint exposure, sensitive file leaks, injection risks, and client-side sinks."
        score={overview.data?.category_scores?.vulnerability ?? null}
        scoreLabel="Vulnerability Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scans/run">
              <Button
                size="sm"
                className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium hover:opacity-95 cursor-pointer"
              >
                Re-run Vulnerability Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. Core Checks Summary */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Threat Vectors & Surfaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {vulnerabilityChecks.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";

            return (
             <div
  key={item.name}
  className={cn(
    "flex flex-col justify-between rounded-lg border bg-white p-3.5 transition-colors",
    isPass
      ? "border-slate-200 hover:border-slate-300"
      : "border-amber-300/80 bg-amber-50/30"
  )}
>
  <div>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={cn(
            "size-4 shrink-0",
            isPass ? "text-slate-500" : "text-amber-600"
          )}
        />
        <h3 className="truncate font-mono text-xs font-semibold text-slate-800">
          {item.name}
        </h3>
      </div>

      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 font-mono text-[10px]",
          isPass ? "text-emerald-700" : "text-amber-700 font-medium"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            isPass ? "bg-emerald-500" : "bg-amber-500"
          )}
        />
        {isPass ? "Pass" : "Warn"}
      </span>
    </div>

    <p className="mt-2 text-[11.5px] leading-normal text-slate-500 line-clamp-2">
      {item.detail}
    </p>
  </div>
</div>
            );
          })}
        </div>
      </section>

      {/* 3. Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Findings & Diagnostics
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {findings.length} total findings
          </span>
        </div>

        <FindingsTable
          findings={findings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No application risks or vulnerabilities detected in the latest scan."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}
