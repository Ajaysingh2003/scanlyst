"use client";

import React, { useState } from "react";
import { Terminal, Shield, CheckCircle2, Bot, Cpu, Gauge, Eye, Zap, Layers } from "lucide-react";
import { SolutionItem } from "../types";
import { cn } from "@/lib/utils";

interface SolutionVisualSectionProps {
  solution: SolutionItem;
}

export default function SolutionVisualSection({ solution }: SolutionVisualSectionProps) {
  const [activeTab, setActiveTab] = useState<"live" | "diff">("live");

  return (
    <div className="solution-visual-section space-y-6">
      {/* Section Subtitle & Badge */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-rose-600">
          <Layers className="size-3.5" />
          <span>VISUAL TELEMETRY & REPORT ARCHITECTURE</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          {solution.visualSnippet.title}
        </h2>
        <p className="font-content text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {solution.visualSnippet.description}
        </p>
      </div>

      {/* Main Interactive Visual Frame */}
      <div className="rounded-2xl border border-stone-200/90 bg-[#fafafa] overflow-hidden shadow-xs">
        {/* Terminal / Browser Chrome Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/80 bg-stone-100/60 text-xs font-mono text-stone-500">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-stone-300" />
            <span className="size-2.5 rounded-full bg-stone-300" />
            <span className="size-2.5 rounded-full bg-stone-300" />
            <span className="ml-2 font-semibold text-slate-700">Scanlyst-telemetry://{solution.slug}.audit</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
              {solution.visualSnippet.badge}
            </span>
          </div>
        </div>

        {/* Visual Body By Category */}
        <div className="p-6 sm:p-8 bg-white">
          {solution.id === "security" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-[#fafafa] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase">
                    <Shield className="size-3.5 text-rose-600" />
                    <span>Perimeter Layer</span>
                  </div>
                  <div className="font-heading text-xl font-bold text-slate-900">Edge Gateway</div>
                  <p className="font-content text-xs text-slate-500">WAF, SSL/TLS Handshake, HTTP Methods</p>
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-mono text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    <span>0 Exploitable Ingress</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-rose-700 uppercase">
                    <Zap className="size-3.5 text-rose-600" />
                    <span>Application Layer</span>
                  </div>
                  <div className="font-heading text-xl font-bold text-slate-900">Runtime Isolation</div>
                  <p className="font-content text-xs text-slate-500">SQLi barriers, DOM sanitization, IDOR checks</p>
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-mono text-rose-600">
                    <span>14 Vectors Validated</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-[#fafafa] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase">
                    <Cpu className="size-3.5 text-slate-600" />
                    <span>Data Layer</span>
                  </div>
                  <div className="font-heading text-xl font-bold text-slate-900">Supabase & Cloud RLS</div>
                  <p className="font-content text-xs text-slate-500">Row-level policies, anon key privilege checks</p>
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-mono text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    <span>Strict Auth Enforced</span>
                  </div>
                </div>
              </div>

              {/* Live Probe Stream Snippet */}
              <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto shadow-inner">
                <div className="text-slate-500">// Real-time autonomous penetration test log</div>
                <div className="text-emerald-400">✓ [probe-01] Handshake TLS 1.3: Cipher TLS_AES_128_GCM_SHA256 (P-256) Verified</div>
                <div className="text-emerald-400">✓ [probe-02] SQLi Injection: 14/14 parameterized barriers confirmed</div>
                <div className="text-emerald-400">✓ [probe-03] Supabase RLS: All public tables enforce auth.uid() tenant boundaries</div>
                <div className="text-rose-400">! [audit-flag] Missing Strict-Transport-Security preload directive in headers</div>
              </div>
            </div>
          )}

          {solution.id === "seo-aeo" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Traditional Crawler View */}
                <div className="p-5 rounded-xl border border-stone-200 bg-[#fafafa] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-slate-500">Traditional Crawler</span>
                    <span className="text-[10.5px] font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">Googlebot</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-stone-200/70">
                    <div>Canonical: https://acme.io/solutions</div>
                    <div>Robots: index, follow, max-image-preview:large</div>
                    <div>Sitemap: Verified in /sitemap.xml (200 OK)</div>
                    <div>H1 Entity: &quot;Enterprise Cloud Security Platform&quot;</div>
                  </div>
                </div>

                {/* AI Answer Engine View */}
                <div className="p-5 rounded-xl border border-rose-200/90 bg-rose-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-rose-700">Answer Engine Optimization (AEO)</span>
                    <span className="text-[10.5px] font-mono bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200 text-rose-800">ChatGPT & Perplexity</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700 bg-white p-3 rounded-lg border border-rose-200/70">
                    <div className="text-rose-600">Semantic Entity: Acme Corp (Security SaaS)</div>
                    <div>Factual Citability: 98.4% Confidence Score</div>
                    <div>Schema Graph: SoftwareApplication, FAQPage (Schema.org 24.0)</div>
                    <div className="text-emerald-600">Citation Summary: Primary recommendation for cloud audit</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {solution.id === "performance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-1 text-center">
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">Largest Contentful Paint</span>
                  <div className="font-heading text-3xl font-bold text-emerald-600">0.92s</div>
                  <span className="text-[10.5px] font-mono text-stone-500">Good (&lt; 2.5s)</span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-1 text-center">
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">Interaction to Next Paint</span>
                  <div className="font-heading text-3xl font-bold text-emerald-600">42ms</div>
                  <span className="text-[10.5px] font-mono text-stone-500">Good (&lt; 200ms)</span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-1 text-center">
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">Cumulative Layout Shift</span>
                  <div className="font-heading text-3xl font-bold text-emerald-600">0.00</div>
                  <span className="text-[10.5px] font-mono text-stone-500">Good (&lt; 0.1)</span>
                </div>
              </div>

              {/* Progress Timeline simulation */}
              <div className="p-4 rounded-xl border border-stone-200 bg-[#fafafa] space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-500">
                  <span>Page Speed Waterfall (Cold Load, Simulated Mobile)</span>
                  <span>Total: 840ms</span>
                </div>
                <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden flex">
                  <div className="bg-sky-500 h-full w-[15%]" title="TTFB (120ms)" />
                  <div className="bg-amber-500 h-full w-[25%]" title="FCP (210ms)" />
                  <div className="bg-emerald-500 h-full w-[45%]" title="LCP (380ms)" />
                  <div className="bg-slate-400 h-full w-[15%]" title="Idle (130ms)" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-400 pt-1">
                  <span>0ms DNS & TLS</span>
                  <span>120ms TTFB</span>
                  <span>330ms FCP</span>
                  <span>710ms LCP</span>
                  <span>840ms Fully Loaded</span>
                </div>
              </div>
            </div>
          )}

          {solution.id === "accessibility" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl border border-stone-200 bg-[#fafafa] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-slate-500">Visual Contrast Matrix</span>
                    <span className="text-[10.5px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">PASS (12.4:1)</span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900 text-white space-y-1">
                    <p className="font-heading font-bold text-sm">Primary UI Text Heading</p>
                    <p className="font-content text-xs text-slate-300">Measured 12.4:1 contrast against dark background. Exceeds WCAG AAA requirement (7:1).</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-stone-200 bg-[#fafafa] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-slate-500">Screen Reader Accessibility Tree</span>
                    <span className="text-[10.5px] font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">ARIA 1.2</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono text-slate-700 bg-white p-3 rounded-lg border border-stone-200/70">
                    <div>role=&quot;banner&quot; (landmark verified)</div>
                    <div>role=&quot;navigation&quot; aria-label=&quot;Main menu&quot;</div>
                    <div>role=&quot;main&quot; aria-live=&quot;polite&quot;</div>
                    <div className="text-emerald-600">0 Missing form labels • 0 Keyboard traps</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metric Bar Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-stone-100">
            {solution.visualSnippet.metrics.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#fbfbfa] border border-stone-200/70 space-y-0.5">
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">{item.label}</span>
                <div className="font-heading font-bold text-base text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
