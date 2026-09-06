"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, LoaderCircle, RotateCw, XCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type CheckoutResultProps = {
  outcome: "success" | "cancelled";
};

export default function CheckoutResult({ outcome }: CheckoutResultProps) {
  const trpc = useTRPC();
  const [polling, setPolling] = useState(outcome === "success");
  const billing = useQuery({
    ...trpc.billing.getAccount.queryOptions(),
    enabled: outcome === "success",
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !polling || status === "active" || status === "trialing" ? false : 2500;
    },
    refetchIntervalInBackground: false,
  });

  const active = billing.data?.status === "active" || billing.data?.status === "trialing";
  const success = outcome === "success";

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setPolling(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl items-center px-4 py-32 sm:px-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_24px_80px_-46px_rgba(15,23,42,0.35)] sm:p-10">
        <span
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            success ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
          }`}
        >
          {success ? <CheckCircle2 className="size-7" /> : <XCircle className="size-7" />}
        </span>

        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
          {success ? "Payment received" : "Checkout cancelled"}
        </p>
        <h1 className="font-heading mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {success ? "Your Scanlyst plan is being activated." : "No payment was completed."}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          {success
            ? active
              ? `Your ${billing.data?.plan ?? "paid"} plan is active and its limits are now available in your dashboard.`
              : "We are confirming the subscription with Dodo Payments. This normally completes within a few seconds."
            : "Your existing plan has not changed. You can return to pricing whenever you are ready."}
        </p>

        {success && !active && !billing.isError && (
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            <LoaderCircle className="size-3.5 animate-spin" />
            Waiting for secure payment confirmation
          </div>
        )}

        {success && billing.isError && (
          <div className="mx-auto mt-6 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
            Payment confirmation is still pending or your session has expired. Your payment is not lost; sign in and refresh the status from the dashboard.
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className={cn(buttonVariants(), "bg-rose-500z bg-background-btn text-white hozver:bg-rose-600")}
          >
            Open dashboard <ArrowRight className="size-4" />
          </Link>
          {success ? (
            <Button variant="outline" onClick={() => billing.refetch()} disabled={billing.isFetching}>
              <RotateCw className={`size-4 ${billing.isFetching ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
          ) : (
            <Link  style={{border:"0.1px solid black",boxShadow:"0 2px 4px rgba(0,0,0,0.1)"}}  href="/pricing" className={buttonVariants({ variant: "outline" })}>
              Return to pricing
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
