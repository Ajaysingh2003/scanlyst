"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PricingTable from "@/modules/billing/component/PricingTable";
import CompareTable from "@/modules/pricing/component/CompareTable";
import PricingFaq from "@/modules/pricing/component/PricingFaq";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TRUST_POINTS = ["No credit card to start", "No overage charges", "Cancel anytime"];

const BILLING_STEPS = [
  {
    n: "01",
    title: "Start with a free scan",
    body: "Drop in a URL and get a full report — headers, TLS, DNS, exposed files, performance. No account needed to look.",
  },
  
  {
    n: "02",
    title: "Upgrade from the dashboard",
    body: "Pick monthly, quarterly, or annual. Quarterly saves 10%, annual saves 20%, and mid-cycle upgrades are prorated.",
  },

  {
    n: "03",
    title: "Scale or stop whenever",
    body: "Add domains as you grow. Downgrade or cancel in two clicks — monitoring stops at period end, reports stay readable.",
  },
];

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="pp-eyebrow inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-slate-700 uppercase shadow-xs">
      <span className="font-bold text-rose-500">{index}</span>
      <span className="h-3 w-px bg-slate-200" />
      {label}
    </div>
  );
}

function Estimator() {
  const [domains, setDomains] = useState(3);
  const [audits, setAudits] = useState(60);
  const cardRef = useRef<HTMLDivElement>(null);

  const recommendation = useMemo(() => {
    if (domains <= 1 && audits <= 5)
      return {
        name: "Free",
        price: "$0",
        why: "Your volume fits the free tier — 1 domain and 5 audits a month, no card required.",
      };
    if (domains <= 2 && audits <= 50)
      return {
        name: "Starter",
        price: "from $19/mo",
        why: `${domains} domain${domains > 1 ? "s" : ""} and ~${audits} audits fit Starter's 2 domains and 50 monthly audits.`,
      };
    if (domains <= 5 && audits <= 250)
      return {
        name: "Pro",
        price: "from $39/mo",
        why: `You need room for ${domains} domains and ~${audits} audits — Pro covers 5 domains, 250 audits, and daily monitoring.`,
      };
    return {
      name: "Business",
      price: "from $79/mo",
      why: `${domains} domains${audits > 250 ? ` and ~${audits} audits` : ""} exceed Pro's ceiling — Business gives you 25 domains and unlimited scans.`,
    };
  }, [domains, audits]);

  useGSAP(
    () => {
      if (!cardRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        cardRef.current,
        { scale: 0.985, opacity: 0.6 },
        { scale: 1, opacity: 1, duration: 0.35, ease: "power2.out" },
      );
    },
    { dependencies: [recommendation.name] },
  );

  const sliderClass =
    "w-full accent-rose-600 cursor-pointer" as const;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
      <div  className="space-y-7 lg:col-span-7">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label
              htmlFor="pp-domains"
              className="text-sm font-semibold text-slate-800"
            >
              Domains to watch
            </label>
            <span className="rounded-md bg-slate-950 px-2 py-0.5 font-mono text-xs font-bold text-white tabular-nums">
              {domains}
            </span>
          </div>
          <input
            id="pp-domains"
            type="range"
            min={1}
            max={25}
            value={domains}
            onChange={(e) => setDomains(Number(e.target.value))}
            className={sliderClass}
          />
          <div className="mt-1 flex justify-between font-mono text-[10.5px] text-stone-400">
            <span>1</span>
            <span>25</span>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label
              htmlFor="pp-audits"
              className="text-sm font-semibold text-slate-800"
            >
              Full audits per month
            </label>
            <span className="rounded-md bg-slate-950 px-2 py-0.5 font-mono text-xs font-bold text-white tabular-nums">
              {audits}
            </span>
          </div>
          <input
            id="pp-audits"
            type="range"
            min={5}
            max={1000}
            step={5}
            value={audits}
            onChange={(e) => setAudits(Number(e.target.value))}
            className={sliderClass}
          />
          <div className="mt-1 flex justify-between font-mono text-[10.5px] text-stone-400">
            <span>5</span>
            <span>1000+</span>
          </div>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-stone-400">
          A rule of thumb: count each site you ship to, plus staging if it is
          public. Most two-site teams land on Starter; anyone with a status
          page lands on Pro.
        </p>
      </div>
      <div className="lg:col-span-5">
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-white sm:p-7"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-rose-400/25 blur-3xl"
          />
          <p className="font-mono text-[10.5px] tracking-widest text-white/50 uppercase">
            Your fit
          </p>
          <p  className="font-heading mt-2 !text-white/50 text-3xl font-bold tracking-tight">
            {recommendation.name}{" "}
            <span className="font-serif text-lg font-medium text-white/60 italic">
              {recommendation.price}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {recommendation.why}
          </p>
          <Link
            href="/register"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-950 transition-colors hover:bg-rose-50"
          >
            Start with {recommendation.name}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PricingPageView() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        gsap.set(".pp-mask-child", { yPercent: 0 });
        return;
      }

      gsap.set(".pp-mask-child", { yPercent: 110 });
      gsap.set("[data-reveal]", { opacity: 0, y: 22 });
      gsap.set(".pp-eyebrow-hero", { opacity: 0, y: 10 });
      gsap.set(".pp-sub, .pp-trust", { opacity: 0, y: 14 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(".pp-eyebrow-hero", { opacity: 1, y: 0, duration: 0.45 }, 0.05)
        .to(".pp-mask-child", { yPercent: 0, duration: 0.7, stagger: 0.09 }, 0.1)
        .to(".pp-sub", { opacity: 1, y: 0, duration: 0.5 }, 0.45)
        .to(".pp-trust", { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, 0.55);

      ScrollTrigger.batch("[data-reveal]", {
        start: "top 86%",
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power3.out",
            stagger: 0.08,
          }),
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="bg-[#fafaf9]">
      <div className="mx-auto max-w-6xl px-4 pt-32 sm:px-6 md:pt-40 lg:px-8">
        {/* ================= HERO ================= */}
        <div style={{ backgroundImage: "radial-gradient(#D2D2D2 1px, transparent 1px)", backgroundSize: "20px 20px" }} className="mx-auto max-w-2xl text-center">
          <div className="pp-eyebrow-hero inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-slate-700 uppercase shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Pricing
          </div>
          <h1 className="font-heading mt-5 overflow-hidden text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            <span className="pp-mask-child block">Scan for free.</span>
            {/* <span className="pp-mask-child block font-serif font-medium text-slate-600 italic">
            </span> */}
            <span className="tc-mask-child block italic font-medium font-serif bg-gradient-to-r from-rose-400 to-white/70 bg-clip-text text-transparent">
            Pay when it needs watching.
                    {/* — not interfere with it. */}
                  </span>
          </h1>
          <p className="pp-sub font-content mt-4 text-base leading-relaxed text-slate-600">
            One free audit shows you exactly what is exposed. Paid plans add
            continuous monitoring, proof-backed findings, and reports your
            clients can read.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="pp-trust flex items-center gap-1.5 text-[13px] font-medium text-slate-600"
              >
                <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* ================= 02 FIND YOUR FIT ================= */}
        <div className="mt-20 md:mt-28" data-reveal>
          <div className="mb-3 flex justify-center">
            <Eyebrow index="02" label="Find your fit" />
          </div>
          <h2 className="font-heading mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How much watching{" "}
            <span className="font-serif font-medium text-slate-600 italic">
              do you actually need?
            </span>
          </h2>
          <p className="font-content mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-slate-600">
            Drag the sliders. We will point at the cheapest plan that covers
            you — no sales call attached.
          </p>
          <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
            <Estimator />
          </div>
        </div>

        {/* ================= 03 COMPARE ================= */}
        <div className="mt-20 md:mt-28" data-reveal>
          <div className="mb-3 flex justify-center">
            <Eyebrow index="03" label="Compare everything" />
          </div>
          <h2 className="font-heading mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            The full matrix,{" "}
            <span className="font-serif font-medium text-slate-600 italic">
              no asterisks.
            </span>
          </h2>
          <p className="font-content mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-slate-600">
            Every capability, every tier, one table. If a cell says it is
            included, it is included — not gated behind an add-on.
          </p>
          <div className="mt-10">
            <CompareTable />
          </div>
        </div>

        {/* ================= 04 HOW BILLING WORKS ================= */}
        <div className="mt-20 md:mt-28" data-reveal>
          <div className="mb-3 flex justify-center">
            <Eyebrow index="04" label="How billing works" />
          </div>
          <h2 className="font-heading mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Boring billing,{" "}
            <span className="font-serif font-medium text-slate-600 italic">
              on purpose.
            </span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {BILLING_STEPS.map((step) => (
              <div
                key={step.n}
                className="group rounded-2xl border border-stone-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
              >
                <p className="font-mono text-xs font-bold text-rose-500">
                  {step.n}
                </p>
                <h3 className="font-heading mt-2 text-[17px] font-bold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="font-content mt-2 text-sm leading-relaxed text-slate-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          {/* Guarantee band */}
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-rose-500/20 blur-3xl"
            />
            <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="font-mono text-[10.5px] tracking-widest text-white/50 uppercase">
                  The Scanlyst guarantee
                </p>
                <h3 className="font-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  No overages. No surprise renewals.{" "}
                  <span className="font-serif font-medium text-white/60 italic">
                    Ever.
                  </span>
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                  Hitting a limit pauses scans instead of charging you. Annual
                  plans remind you 14 days before renewal. Invoices live in
                  your dashboard from day one.
                </p>
              </div>
              <ul className="space-y-3.5 lg:col-span-5">
                {[
                  { icon: ShieldCheck, text: "Limits pause scans — never auto-bill" },
                  { icon: RefreshCw, text: "Prorated upgrades, mid-cycle" },
                  { icon: CreditCard, text: "Cancel in two clicks, keep your reports" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <item.icon className="size-4 text-rose-300" />
                    </span>
                    <span className="text-sm font-medium text-white/85">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ================= 05 PRICING FAQ ================= */}
        <div className="mt-20 md:mt-28" data-reveal>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-28">
              <Eyebrow index="05" label="Pricing FAQ" />
              <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Asked at checkout,{" "}
                <span className="font-serif font-medium text-slate-600 italic">
                  answered here.
                </span>
              </h2>
              <p className="font-content text-[15px] leading-relaxed text-slate-600">
                Card requirements, audit counting, prorating, cancellations —
                the unglamorous questions finance teams actually ask.
              </p>
              <a
                href="mailto:support@scanlyst.dev"
                className="group inline-flex items-center gap-2 pt-2 text-[13px] font-semibold text-slate-800 transition-colors hover:text-rose-600"
              >
                Still stuck? Talk to support
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
            <div className="lg:col-span-7">
              <PricingFaq />
              <p className="flex items-center justify-between pt-4 font-mono text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  6 billing questions answered
                </span>
                <span>Updated Aug 2025</span>
              </p>
            </div>
          </div>
        </div>

        {/* ================= FINAL CTA ================= */}
        <div className="mt-20 md:mt-28" data-reveal>
          <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white px-6 py-14 text-center sm:px-12 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-rose-100/60 blur-3xl"
            />
            <p className="relative font-mono text-[11px] font-semibold tracking-widest text-stone-500 uppercase">
              Free audit · ~60 seconds · No signup
            </p>
            <h2 className="font-heading relative mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.15]">
              See what is exposed{" "}
              <span className="font-serif font-medium text-slate-600 italic">
                before you pay a cent.
              </span>
            </h2>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(
                  "bg-background-btn inline-flex items-center gap-2 rounded-lg px-6 py-3",
                  "text-sm font-semibold text-white transition-transform hover:-translate-y-0.5",
                )}
              >
                Run my free scan
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="mailto:support@scanlyst.dev?subject=Business%20plan%20question"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                Ask about Business
              </a>
            </div>
            <p className="relative mt-5 font-mono text-[11px] text-stone-400">
              1 domain · 5 audits/month · yours to keep
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1340px] md:mt-24">
      </div>
    </div>
  );
}
