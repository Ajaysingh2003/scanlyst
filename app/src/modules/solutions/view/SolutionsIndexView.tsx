"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { SOLUTIONS_DATA } from "../data/solutions";
import SolutionCard from "../component/SolutionCard";
import SolutionCtaSection from "../component/SolutionCtaSection";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin safely
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SolutionsIndexView() {
  const containerRef = useRef<HTMLDivElement>(null);

  /* GSAP scroll-triggered entrance animations */
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion || !containerRef.current) return;

      // Hero reveal
      gsap.fromTo(
        ".solutions-hero-element",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
        }
      );

      // Staggered Solution cards reveal on scroll
      ScrollTrigger.batch(".solution-card", {
        interval: 0.1,
        batchMax: 4,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.1,
              ease: "power2.out",
              overwrite: "auto",
            }
          ),
        once: true,
      });

      // Closing CTA reveal
      ScrollTrigger.create({
        trigger: ".solution-cta-section",
        start: "top 85%",
        onEnter: () => {
          gsap.fromTo(
            ".solution-cta-section",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
          );
        },
        once: true,
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="w-full bg-[#ffffff] text-slate-900 min-h-screen">
      <div className="pt-24 pb-20 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* =========================================================================
            1. BREADCRUMB & METADATA BAR
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-stone-200 bg-white hover:bg-stone-50 hover:text-slate-900 transition-colors shadow-2xs group cursor-pointer"
            >
              <ArrowLeft className="size-3 text-stone-400 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
              <span>Home</span>
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-slate-900 font-semibold">Solutions</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>SUITE: 4 SPECIALIZED PILLARS</span>
            <span className="text-stone-300">•</span>
            <span className="text-slate-600 font-medium">Scanlyst PLATFORM</span>
          </div>
        </div>

        {/* =========================================================================
            2. SOLUTIONS HEADER SECTION
            ========================================================================= */}
        <div className="space-y-4 max-w-3xl">
          <div className="solutions-hero-element inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50/90 border border-rose-200/70 text-rose-700 text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            <span>ENTERPRISE AUDITING SUITES</span>
          </div>

          <h1 className="solutions-hero-element font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 leading-[1.14]">
            Purpose-Built Solutions for Modern Web Engineering
          </h1>

          <p className="solutions-hero-element font-content text-base sm:text-lg text-slate-600 leading-relaxed pt-1">
            Explore dedicated scanning suites engineered for vulnerability defense, next-generation AI answer engine visibility, sub-second conversion velocity, and universal accessibility compliance.
          </p>
        </div>

        {/* =========================================================================
            3. SOLUTIONS 4-PILLAR GRID (Security, SEO & AEO, Performance, Accessibility)
            ========================================================================= */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
            {SOLUTIONS_DATA.map((solution) => (
              <SolutionCard key={solution.id} solution={solution} />
            ))}
          </div>
        </div>

        {/* =========================================================================
            4. PLATFORM AUDIT CAPABILITIES STRIP
            ========================================================================= */}
        <div className="p-8 rounded-2xl bg-[#fafafa] border border-stone-200/90 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-600 uppercase">
              <ShieldCheck className="size-4" />
              <span>Modular Audit Architecture</span>
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-900">
              Need individual scanner specifications?
            </h3>
            <p className="font-content text-xs sm:text-sm text-slate-500">
              Browse all 41 atomic probes, live CLI simulation commands, PoC payloads, and Git patches.
            </p>
          </div>

          <Link
            href="/scans"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs sm:text-sm font-semibold text-slate-800 hover:text-slate-950 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <span>Explore 41 Scanners</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* =========================================================================
            5. CLOSING CONVERSION SECTION
            ========================================================================= */}
        <SolutionCtaSection
          title="Run a Comprehensive Audit Across All Four Pillars"
          description="Test your web perimeter for security flaws, AI search readiness, Core Web Vitals velocity, and WCAG compliance in under 60 seconds."
        />
      </div>

      {/* Global Footer */}
    </div>
  );
}
