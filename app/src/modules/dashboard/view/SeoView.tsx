"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Share2,
  Compass,
  Smartphone,
  Tag,
  ExternalLink,
  Code,
  Bot,
  RefreshCw,
  ImageOff,
  AlertTriangle,
  Link2,
  CircleAlert,
  MoreVertical,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SeoView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();
  const [imgError, setImgError] = useState(false);

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  const seoPreview = useQuery({
    ...trpc.project.seoPreview.queryOptions({
      project_id: projectId,
      url: project?.website_url,
    }),
    enabled: !!project?.website_url,
    staleTime: 1000 * 60 * 5,
  });

  const ogImageUrl = seoPreview.data?.ogImage;

  useEffect(() => {
    setImgError(false);
  }, [ogImageUrl]);

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Search}
        title="No Project Selected"
        description="Select or create a project to view Search Engine Optimization audit results."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const seoFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "seo") || [];

  const titleFinding = seoFindings.find((f) => f.title.toLowerCase().includes("title"));
  const descFinding = seoFindings.find((f) => f.title.toLowerCase().includes("description"));
  const ogFinding = seoFindings.find((f) => f.title.toLowerCase().includes("opengraph") || f.title.toLowerCase().includes("og:"));
  const sitemapFinding = seoFindings.find((f) => f.title.toLowerCase().includes("sitemap"));
  const robotsFinding = seoFindings.find((f) => f.title.toLowerCase().includes("robots"));
  const canonicalFinding = seoFindings.find((f) => f.title.toLowerCase().includes("canonical"));
  const viewportFinding = seoFindings.find((f) => f.title.toLowerCase().includes("viewport"));
  const structuredDataFinding = seoFindings.find((f) => f.title.toLowerCase().includes("schema") || f.title.toLowerCase().includes("json-ld"));

  const siteHostname = project.website_url
    ? (() => {
        try {
          return new URL(
            project.website_url.startsWith("http")
              ? project.website_url
              : `https://${project.website_url}`
          ).hostname;
        } catch {
          return project.website_url;
        }
      })()
    : "example.com";

  // Google SERP live values extracted from target link
  const hasLiveTitle = typeof seoPreview.data?.title === "string" && seoPreview.data.title.trim().length > 0;
  const displayTitle = hasLiveTitle
    ? seoPreview.data!.title!.trim()
    : (project.name ? `${project.name} | Official Website` : `${siteHostname} Home`);

  const hasLiveDesc = typeof seoPreview.data?.description === "string" && seoPreview.data.description.trim().length > 0;
  const displayDesc = hasLiveDesc
    ? seoPreview.data!.description!.trim()
    : (descFinding?.description || "No meta description tag detected on this page. Search engines will generate snippets from visible body content.");

  // OpenGraph live values extracted from target link
  const hasLiveOgTitle = typeof seoPreview.data?.ogTitle === "string" && seoPreview.data.ogTitle.trim().length > 0;
  const displayOgTitle = hasLiveOgTitle
    ? seoPreview.data!.ogTitle!.trim()
    : displayTitle;

  const hasLiveOgDesc = typeof seoPreview.data?.ogDescription === "string" && seoPreview.data.ogDescription.trim().length > 0;
  const displayOgDesc = hasLiveOgDesc
    ? seoPreview.data!.ogDescription!.trim()
    : displayDesc;

  const faviconUrl =
    seoPreview.data?.favicon ||
    (siteHostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(siteHostname)}&sz=64` : null);

  const titleLen = displayTitle.length;
  const titleStatus = !hasLiveTitle
    ? { label: "Fallback", color: "text-amber-700 bg-amber-50 border-amber-200" }
    : titleLen < 30
    ? { label: "Short (<30)", color: "text-amber-700 bg-amber-50 border-amber-200" }
    : titleLen <= 60
    ? { label: "Optimal (30–60)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    : { label: "May Truncate (>60)", color: "text-amber-700 bg-amber-50 border-amber-200" };

  const descLen = displayDesc.length;
  const descStatus = !hasLiveDesc
    ? { label: "Missing Tag", color: "text-rose-700 bg-rose-50 border-rose-200" }
    : descLen < 100
    ? { label: "Short (<100)", color: "text-amber-700 bg-amber-50 border-amber-200" }
    : descLen <= 160
    ? { label: "Optimal (100–160)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    : { label: "May Truncate (>160)", color: "text-amber-700 bg-amber-50 border-amber-200" };

  const technicalChecks = [
    {
      label: "Robots.txt & Indexability",
      status: !robotsFinding ? "pass" : "fail",
      detail: !robotsFinding ? "Robots policy permits search crawlers" : robotsFinding.title,
      icon: Compass,
    },
    {
      label: "XML Sitemap",
      status: !sitemapFinding ? "pass" : "fail",
      detail: !sitemapFinding ? "Valid XML sitemap detected" : sitemapFinding.title,
      icon: FileCode2,
    },
    {
      label: "Canonical URL",
      status: !canonicalFinding ? "pass" : "fail",
      detail: seoPreview.data?.canonical
        ? `Declared canonical: ${seoPreview.data.canonical}`
        : (!canonicalFinding ? "Self-referencing canonical tag is active" : canonicalFinding.title),
      icon: Tag,
    },
    {
      label: "Mobile Viewport",
      status: !viewportFinding ? "pass" : "fail",
      detail: !viewportFinding ? "Configured with width=device-width" : viewportFinding.title,
      icon: Smartphone,
    },
    {
      label: "OpenGraph Metadata",
      status: !ogFinding ? "pass" : "fail",
      detail: ogImageUrl
        ? "Social share tags (og:title, og:image) detected"
        : (!ogFinding ? "Social share tags (og:title, og:image) verified" : ogFinding.title),
      icon: Share2,
    },
    {
      label: "Structured Data (Schema)",
      status: !structuredDataFinding ? "pass" : "fail",
      detail: !structuredDataFinding ? "JSON-LD schema markup detected" : structuredDataFinding.title,
      icon: Code,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Search Engine Optimization"
        description="Verify traditional search crawler indexing, metadata health, canonical structures, OpenGraph social cards, and mobile viewport compliance."
        score={overview.data?.category_scores?.seo ?? null}
        scoreLabel="SEO Score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/aeo">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                <Bot className="size-3.5 text-teal-600" />
                AEO AI Visibility
              </Button>
            </Link>
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn text-white h-9 px-4 text-xs gap-1.5 font-medium">
                Re-run SEO Audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Technical Checks Grid */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Technical SEO Infrastructure Matrix
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {technicalChecks.map((item) => {
            const Icon = item.icon;
            const isPass = item.status === "pass";
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-all bg-white",
                  isPass ? "border-slate-200/90 shadow-2xs" : "border-amber-200 bg-amber-50/30"
                )}
              >
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                  isPass ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-700"
                )}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {item.label}
                    </span>
                    {isPass ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="size-3" /> Pass
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertCircle className="size-3" /> Issue
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Google SERP & OpenGraph Social Previews */}
      <section className="space-y-5">
  {/* Header */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-base font-semibold text-slate-950">
          Search & Social Preview
        </h2>

        {seoPreview.isFetching && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">
            <RefreshCw className="size-3 animate-spin" />
            Updating
          </span>
        )}
      </div>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        See how your website appears when people discover or share it online.
      </p>
    </div>

    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setImgError(false);
        seoPreview.refetch();
      }}
      disabled={seoPreview.isFetching}
      className="h-9 rounded-lg px-3 text-xs font-medium"
    >
      <RefreshCw
        className={cn(
          "mr-1.5 size-3.5",
          seoPreview.isFetching && "animate-spin"
        )}
      />
      Refresh preview
    </Button>
  </div>

  {/* Preview Grid */}
  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    {/* Google Preview */}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50">
            <span className="text-sm font-bold text-blue-600">G</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Google Search
            </h3>
            <p className="text-[11px] text-slate-400">
              How your page may appear in search
            </p>
          </div>
        </div>

        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
          Live preview
        </span>
      </div>

      {/* Google Result */}
      <div className="p-5">
        <div className="rounded-xl bg-slate-50/70 p-5">
          {/* Website identity */}
          <div className="mb-3 flex items-center gap-2.5">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="size-7 rounded-full border border-slate-200 bg-white object-contain p-1"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-500">
                {project.name?.charAt(0) || siteHostname?.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-800">
                {project.name || siteHostname}
              </p>

              <p className="truncate text-[11px] text-slate-500">
                {siteHostname}
              </p>
            </div>

            <MoreVertical className="ml-auto size-4 text-slate-400" />
          </div>

          {/* Search result */}
          <a
            href={
              project.website_url.startsWith("http")
                ? project.website_url
                : `https://${project.website_url}`
            }
            target="_blank"
            rel="noreferrer"
            className="block text-[18px] font-normal leading-snug text-[#1a0dab] hover:underline"
          >
            {displayTitle}
          </a>

          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#4d5156]">
            {displayDesc}
          </p>
        </div>
      </div>

      {/* Friendly health summary */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                Page title
              </span>

              <span
                className={cn(
                  "size-2 rounded-full",
                  titleLen > 0 && titleLen <= 60
                    ? "bg-emerald-500"
                    : "bg-amber-400"
                )}
              />
            </div>

            <div className="mt-1 flex items-end gap-1">
              <span className="text-sm font-semibold text-slate-900">
                {titleLen}
              </span>
              <span className="pb-px text-[10px] text-slate-400">
                / 60 characters
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                Description
              </span>

              <span
                className={cn(
                  "size-2 rounded-full",
                  descLen > 0 && descLen <= 160
                    ? "bg-emerald-500"
                    : "bg-amber-400"
                )}
              />
            </div>

            <div className="mt-1 flex items-end gap-1">
              <span className="text-sm font-semibold text-slate-900">
                {descLen}
              </span>
              <span className="pb-px text-[10px] text-slate-400">
                / 160 characters
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Social Preview */}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Share2 className="size-4" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Social Sharing
            </h3>

            <p className="text-[11px] text-slate-400">
              Preview for LinkedIn, X, Discord and more
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
            ogImageUrl && !imgError
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              ogImageUrl && !imgError
                ? "bg-emerald-500"
                : "bg-amber-400"
            )}
          />
          {ogImageUrl && !imgError ? "Ready to share" : "Needs attention"}
        </div>
      </div>

      {/* Preview */}
      <div className="p-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* OG Image */}
          {ogImageUrl && !imgError ? (
            <div className="relative aspect-[1.91/1] overflow-hidden bg-slate-100">
              <img
                src={ogImageUrl}
                alt={displayOgTitle}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : ogImageUrl && imgError ? (
            <div className="flex aspect-[1.91/1] flex-col items-center justify-center bg-amber-50 px-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                <AlertTriangle className="size-4" />
              </div>

              <p className="text-sm font-semibold text-slate-900">
                We couldn&apos;t load your social image
              </p>

              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
                The image may be protected, unavailable, or blocked from social
                platforms.
              </p>

              <a
                href={ogImageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
              >
                Open image
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <div className="flex aspect-[1.91/1] flex-col items-center justify-center bg-slate-50 px-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                <ImageOff className="size-4" />
              </div>

              <p className="text-sm font-semibold text-slate-900">
                No social image found
              </p>

              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
                Add an Open Graph image to make shared links more visual and
                clickable.
              </p>
            </div>
          )}

          {/* Social Content */}
          <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {siteHostname}
            </p>

            <p className="line-clamp-1 text-sm font-semibold text-slate-900">
              {displayOgTitle}
            </p>

            <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
              {displayOgDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Simple status */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium",
              hasLiveOgTitle
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {hasLiveOgTitle ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <CircleAlert className="size-3" />
            )}

            Social title
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium",
              ogImageUrl && !imgError
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            {ogImageUrl && !imgError ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <CircleAlert className="size-3" />
            )}

            Social image
          </div>

          {seoPreview.data?.canonical && (
            <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
              <Link2   className="size-3 shrink-0" />
              <span className="max-w-[180px] truncate">
                Canonical URL found
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</section>

      {/* SEO Findings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-slate-900 uppercase tracking-wider">
            All Evaluated SEO Rules & Remediations
          </h2>
          <span className="text-xs text-slate-500 font-content">
            {seoFindings.length} issue{seoFindings.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <FindingsTable
          findings={seoFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No SEO issues detected on your website. Canonical tags, robots.txt, sitemaps, and metadata are fully optimized."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}
