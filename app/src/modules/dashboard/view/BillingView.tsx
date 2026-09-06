"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import { CreditCard, Check, AlertCircle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/modules/dashboard/component/PageHeader";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/modules/billing/types";

export default function BillingView() {
  const { project, isLoading: isProjectLoading } = useActiveProject();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "quarterly" | "annual">("monthly");

  const { data: account, isLoading: isAccountLoading } = useSuspenseQuery(
    trpc.billing.getAccount.queryOptions()
  );

  const { data: plans, isLoading: isPlansLoading } = useSuspenseQuery(
    trpc.billing.getPlans.queryOptions()
  );

  const checkoutMutation = useMutation({
    mutationFn: (variables: { plan: Exclude<PlanTier, "free">; interval: "monthly" | "quarterly" | "annual" }) =>
      client.billing.createCheckout.mutate(variables),
    onSuccess: (data) => {
      if (data.checkout_url) window.location.href = data.checkout_url;
    },
    onError: (error) => toast.error(error.message || "Failed to initiate checkout"),
  });

  const portalMutation = useMutation({
    mutationFn: () => client.billing.createPortal.mutate(),
    onSuccess: (data) => {
      if (data.portal_url) window.location.href = data.portal_url;
    },
    onError: (error) => toast.error(error.message || "Failed to open billing portal"),
  });


  if (isProjectLoading || isAccountLoading || isPlansLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Billing & Plans" description="Manage your subscription and billing details." icon={CreditCard} />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Billing & Plans" description="Manage your subscription and billing details." icon={CreditCard} />
        <EmptyState title="No Project Selected" description="Please select a project to manage billing." />
      </div>
    );
  }

  const handleCheckout = (planId: "starter" | "pro" | "max") => {
    checkoutMutation.mutate({ plan: planId, interval: selectedInterval });
  };

  const currentPlan = account?.plan || "starter";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader title="Billing & Plans" description="Manage your subscription and billing details." icon={CreditCard} />

      {account && (
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-heading text-lg font-semibold mb-1 capitalize">Current Plan: {currentPlan}</h3>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${account.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                {account.status || 'Active'}
              </span>
              {account.cancel_at_period_end && account.current_period_end && (
                <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  <AlertCircle className="w-3 h-3 mr-1" /> Cancels {new Date(account.current_period_end).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="text-sm text-slate-600">
              Scans used: <span className="font-medium">{account.usage_scans}</span> / {account.usage_limit === null ? 'Unlimited' : account.usage_limit}
            </div>
            {account.current_period_end && !account.cancel_at_period_end && (
              <div className="text-xs text-slate-500 mt-2">
                Renews on {new Date(account.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
          <div>
            {account.dodo_customer_configured && (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="whitespace-nowrap"
              >
                {portalMutation.isPending ? "Loading..." : <><ExternalLink className="w-4 h-4 mr-2" /> Manage Billing</>}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex w-full justify-center mb-8">
        <div className="inline-flex shrink-0 items-center rounded-xl border border-stone-200 bg-stone-100/80 p-1 shadow-2xs">
          {(["monthly", "quarterly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setSelectedInterval(cycle)}
              className={`relative shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                selectedInterval === cycle
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {cycle === "annual" ? "Annual (Save 20%)" : cycle === "quarterly" ? "Quarterly (Save 10%)" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isFree = plan.id === "free";

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col ${
                isCurrent
                  ? "border-[#f43f5e] ring-2 ring-rose-500/20 shadow-md bg-white relative"
                  : "border-[#e6e6e6] bg-white shadow-sm"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-1/2">
                  <span className="bg-[#f43f5e] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Current
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-heading text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isFree
                    ? "Basic testing & discovery"
                    : plan.id === "starter"
                    ? "For independent builders (2 projects)"
                    : plan.id === "pro"
                    ? "For growing teams & monitoring"
                    : "For agencies & enterprises"}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-950 font-heading">
                    {isFree
                      ? "$0"
                      : selectedInterval === "quarterly"
                      ? `$${plan.id === "starter" ? 102 : plan.id === "pro" ? 210 : 426}`
                      : selectedInterval === "annual"
                      ? `$${plan.id === "starter" ? 182 : plan.id === "pro" ? 375 : 758}`
                      : `$${plan.id === "starter" ? 19 : plan.id === "pro" ? 39 : 79}`}
                  </span>
                  {!isFree && (
                    <span className="text-xs text-slate-500 font-mono">
                      /{selectedInterval === "annual" ? "yr" : selectedInterval === "quarterly" ? "qtr" : "mo"}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 text-sm flex-grow mt-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-slate-800">
                    {plan.projects === null ? "Unlimited" : plan.projects} {plan.projects === 1 ? "Project" : "Projects"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">
                    {plan.scans_per_month === null ? "Unlimited" : plan.scans_per_month} Scans/month
                  </span>
                </li>
                {plan.api_keys !== undefined && (
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">
                      {plan.api_keys === null ? "Unlimited" : plan.api_keys} API keys
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">
                    {isFree ? "1 Preview finding visible" : "All findings unlocked"}
                  </span>
                </li>
                {plan.features?.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700 capitalize">{feature.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  isCurrent
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : isFree
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-[#f43f5e] hover:bg-[#e11d48] text-white"
                }`}
                disabled={isCurrent || isFree || checkoutMutation.isPending}
                onClick={() => !isFree && handleCheckout(plan.id as "starter" | "pro" | "max")}
              >
                {isCurrent ? "Current Plan" : isFree ? "Free Tier" : `Upgrade to ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
