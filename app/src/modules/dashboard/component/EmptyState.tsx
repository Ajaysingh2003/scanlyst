"use client";

import Link from "next/link";
import { type LucideIcon, Inbox, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-screen -mt-20">
      <div className="flex h-full w-full items-center justify-center p-4 sm:p-6">
      <section className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-rose-100/70 bg-gradient-to-b from-white via-rose-50/20 to-white/90 p-8 text-center shadow-xs backdrop-blur-xs sm:p-12">
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-48 rounded-full bg-gradient-to-b from-rose-400/15 via-rose-200/10 to-transparent blur-3xl"
        />

        {/* Floating Rose Icon Badge */}
        <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl border border-rose-200/60 bg-gradient-to-b from-rose-100/80 to-rose-50 text-rose-600 shadow-2xs">
          <Icon className="size-6 stroke-[1.8]" />
        </div>

        {/* Title & Description */}
        <div className="relative mt-5 space-y-2">
          <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            {title}
          </h1>
          <p className="font-content mx-auto max-w-md text-xs leading-relaxed text-zinc-600 sm:text-sm">
            {description}
          </p>
        </div>

        {/* Action Button */}
        {actionLabel && (
          <div className="relative mt-7 flex items-center justify-center">
            {onAction ? (
              <button
                type="button"
                onClick={onAction}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r bg-background-btn px-5 text-xs font-semibold text-white shadow-xs shadow-rose-500/20 transition-all duration-200 hover:opacity-95 hover:shadow-md hover:shadow-rose-500/25 active:scale-[0.98] sm:text-sm cursor-pointer"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            ) : actionHref ? (
              <Link
                href={actionHref}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r bg-background-btn px-5 text-xs font-semibold text-white shadow-xs shadow-rose-500/20 transition-all duration-200 hover:opacity-95 hover:shadow-md hover:shadow-rose-500/25 active:scale-[0.98] sm:text-sm"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}