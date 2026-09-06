"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Shield,
  HelpCircle,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SecurityHeadersView() {
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
        description="Select or create a project to view security headers and TLS status."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  // Filter configuration & header findings
  const allFindings = latestScan.data?.findings || [];
  const findings = allFindings.filter((f: any) => {
    const cat = (f.category || "").toLowerCase();
    const title = (f.title || "").toLowerCase();
    const scanner = (f.scanner_name || "").toLowerCase();

    if (cat === "configuration") return true;
    if (
      scanner.includes("header") ||
      scanner.includes("tls") ||
      scanner.includes("ssl") ||
      scanner.includes("cookie")
    ) {
      return true;
    }

    const keywords = [
      "header",
      "csp",
      "content-security-policy",
      "hsts",
      "strict-transport",
      "tls",
      "ssl",
      "x-frame",
      "x-content-type",
      "referrer-policy",
      "permissions-policy",
      "cross-origin",
      "camera",
      "microphone",
      "geolocation",
      "no-store",
      "cache-control",
      "sri",
    ];
    return keywords.some((kw) => title.includes(kw));
  });

  // Diagnostic checks for the summary cards
  const cspIssue = findings.find(
    (f: any) =>
      f.title?.toLowerCase().includes("content-security-policy") ||
      f.title?.toLowerCase().includes("csp")
  );
  const hstsIssue = findings.find(
    (f: any) =>
      f.title?.toLowerCase().includes("strict-transport-security") ||
      f.title?.toLowerCase().includes("hsts")
  );
  const permIssue = findings.find(
    (f: any) =>
      f.title?.toLowerCase().includes("permissions-policy") ||
      f.title?.toLowerCase().includes("camera") ||
      f.title?.toLowerCase().includes("microphone") ||
      f.title?.toLowerCase().includes("geolocation")
  );
  const frameIssue = findings.find(
    (f: any) =>
      f.title?.toLowerCase().includes("x-frame") ||
      f.title?.toLowerCase().includes("clickjacking")
  );

  const securityChecks = [
    {
      name: "Content Security Policy (CSP)",
      status: !cspIssue ? "pass" : "fail",
      detail: !cspIssue
        ? "Active policy restricting unauthorized scripts"
        : cspIssue.title,
      icon: ShieldCheck,
    },
    {
      name: "Transport Layer Security (HSTS)",
      status: !hstsIssue ? "pass" : "fail",
      detail: !hstsIssue
        ? "Strict HTTPS enforcement active"
        : hstsIssue.title,
      icon: Lock,
    },
    {
      name: "Clickjacking Protection",
      status: !frameIssue ? "pass" : "fail",
      detail: !frameIssue
        ? "Frame restrictions properly configured"
        : frameIssue.title,
      icon: Shield,
    },
    {
      name: "Device & API Permissions",
      status: !permIssue ? "pass" : "fail",
      detail: !permIssue
        ? "Hardware sensors restricted"
        : permIssue.title,
      icon: Sliders,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header */}
      <PageHeader
        websiteUrl={project.website_url}
        title="Security Headers & TLS"
        description="Audit results for HTTP response security headers, transport encryption, and browser protection directives."
        score={overview.data?.category_scores?.configuration ?? null}
        scoreLabel="Configuration Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scans/run">
              <Button
                size="sm"
                className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium hover:opacity-95 cursor-pointer"
              >
                Re-run Headers Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. Core Checks Summary */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Core Protection Signals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {securityChecks.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";

            return (
              <div
                key={item.name}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 bg-white shadow-2xs space-y-2",
                  isPass ? "border-slate-200/90" : "border-amber-200 bg-amber-50/20"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isPass
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        isPass
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
                          : "text-amber-700 bg-amber-50 border-amber-200/60"
                      )}
                    >
                      {isPass ? (
                        <>
                          <CheckCircle2 className="size-2.5" /> Passing
                        </>
                      ) : (
                        <>
                          <AlertCircle className="size-2.5" /> Attention
                        </>
                      )}
                    </span>
                  </div>
                  <h3 className="font-heading text-xs font-bold text-slate-900 line-clamp-1">
                    {item.name}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 font-content leading-relaxed pt-2 border-t border-slate-100 line-clamp-2">
                  {item.detail}
                </p>
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
          emptyMessage="No header or TLS misconfigurations found. All checks passed."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}
