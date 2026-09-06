"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Shield, Search, Gauge, Accessibility, Sparkles, Globe, Loader2 } from "lucide-react";
import { SolutionItem } from "../types";
import { useAuthScanAction } from "@/modules/product/hooks/useAuthScanAction";
import toast from "react-hot-toast";

interface SolutionHeroProps {
  solution: SolutionItem;
}

export default function SolutionHero({ solution }: SolutionHeroProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const { handleScanClick, isCreating } = useAuthScanAction();

  const getIcon = () => {
    switch (solution.id) {
      case "security":
        return <Shield className="size-4 text-rose-600" strokeWidth={2} />;
      case "seo-aeo":
        return <Search className="size-4 text-rose-600" strokeWidth={2} />;
      case "performance":
        return <Gauge className="size-4 text-rose-600" strokeWidth={2} />;
      case "accessibility":
        return <Accessibility className="size-4 text-rose-600" strokeWidth={2} />;
      default:
        return <Shield className="size-4 text-rose-600" strokeWidth={2} />;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      toast.error("Please enter a domain to audit.");
      return;
    }
    handleScanClick(targetUrl);
  };

  return (
    <div className="solution-hero space-y-8">
      {/* 1. Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Link
            href="/solutions"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-stone-200 bg-white hover:bg-stone-50 hover:text-slate-900 transition-colors shadow-2xs group cursor-pointer"
          >
            <ArrowLeft className="size-3 text-stone-400 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>Solutions</span>
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-slate-900 font-semibold">{solution.title}</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>CATEGORY: {solution.id.toUpperCase()}</span>
          <span className="text-stone-300">•</span>
          <span className="text-slate-600 font-medium">Scanlyst ENGINE</span>
        </div>
      </div>

      {/* 2. Hero Headline & Scope */}
      <div className="space-y-5 max-w-4xl">
        {/* Solution Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50/90 border border-rose-200/70 text-rose-700 text-xs font-mono font-semibold uppercase tracking-wider">
          {getIcon()}
          <span>{solution.badge}</span>
        </div>

        {/* Main Title & Headline */}
        <div className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 leading-[1.12]">
            {solution.headline}
          </h1>
          <p className="font-content text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl pt-1">
            {solution.longOverview}
          </p>
        </div>

        {/* Interactive Domain Prober Form */}
        <div className="pt-3 max-w-xl">
          <form
            onSubmit={handleFormSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-[#fafafa] border border-stone-200/90 shadow-2xs focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-rose-500/10 transition-all"
          >
            <div className="flex items-center gap-2 px-3 py-2 flex-1">
              <Globe className="size-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Enter domain (e.g. acme-corp.com)"
                className="w-full bg-transparent text-xs sm:text-sm font-content text-slate-900 placeholder:text-stone-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isCreating || !targetUrl.trim()}
                className="bg-background-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm hover:opacity-95 transition-all cursor-pointer w-full sm:w-auto disabled:opacity-60"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <span>Run Free Audit</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 pt-2">
            <span>Instant automated audit</span>
            <Link href="/scans" className="text-slate-600 hover:text-slate-950 font-medium transition-colors">
              Browse 41 individual scanners →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Key Metrics Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        {solution.keyMetrics.map((metric, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-1 hover:border-stone-300 transition-colors"
          >
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              {metric.label}
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900">
              {metric.value}
            </div>
            <p className="font-content text-xs text-slate-500 line-clamp-1">
              {metric.subtext}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
