"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { ArrowRight } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export interface PlanBillingDetails {
  price_id: string;
  amount: number;
}

export type BillingCycleType = "monthly" | "quarterly" | "annually";
export type PlanTierType = "free" | "starter" | "pro" | "business";

export interface PlanConfig {
  name: string;
  description: string;
  billing_cycles: Record<BillingCycleType, PlanBillingDetails>;
}

export interface FeatureItem {
  label: string;
  icon: IconSvgElement;
}

function PlanCardDialog({
  plan,
  timeLine,
  popular = false,
  feature,
}: {
  plan: PlanConfig;
  timeLine: "monthly" | "quarterly" | "annually";
  popular?: boolean;
  feature?: FeatureItem[];
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border shadow-sm flex flex-col border-zinc-200 bg-white p-1.5 overflow-hidden",
        popular && "bg-background-card-popular border-zinc-800",
      )}
    >
      <PlanCardHeader popular={popular} timeLine={timeLine} plan={plan} />

      <div className="flex flex-1 flex-col justify-between gap-3 px-3.5 pb-2 pt-3 sm:px-4">
        <ul className="flex flex-col gap-2">
          {feature?.map((e, i) => (
            <li key={i} className="flex items-start gap-2 font-medium">
              <HugeiconsIcon
                icon={e.icon}
                size={13}
                className={cn("text-accent shrink-0", popular && "text-white/80")}
                strokeWidth={1.5}
              />
              <span
                className={cn(
                  "min-w-0 break-words text-accent text-[12px] leading-4 sm:text-[13px]",
                  popular && "text-white",
                )}
              >
                {e.label}
              </span>
            </li>
          ))}
        </ul>

        <Button
          variant={"outline"}
          className={cn(
            "mt-2 flex w-full items-center justify-between rounded-lg text-xs font-medium cursor-pointer border px-2.5 py-1 h-7.5 transition-all duration-200",
            !popular
              ? "bg-white text-accent shadow-xs hover:bg-zinc-50 hover:border-zinc-300"
              : "border-zinc-800 hover:bg-zinc-900 bg-transparent text-stone-300 hover:text-white",
          )}
        >
          <span>Explore all features</span>
          <span
            className={cn(
              "bg-zinc-200 rounded-full size-4 flex items-center justify-center shrink-0",
              popular && "bg-zinc-800",
            )}
          >
            <ArrowRight
              className={cn("size-2.5 text-zinc-700", popular && "text-stone-300")}
            />
          </span>
        </Button>
      </div>
    </div>
  );
}

export default PlanCardDialog;

function PlanCardHeader({
  plan,
  timeLine,
  popular,
}: {
  plan: PlanConfig;
  timeLine: "monthly" | "quarterly" | "annually";
  popular: boolean;
}) {
  const trpc = useTRPC();
  const mutate = useMutation(
    trpc.billing.Createcheckout.mutationOptions({
      onSuccess(data) {
        if (data?.url) {
          window.location.href = data.url;
        }
      },
      onError(error) {
        toast.error(
          error.message || "Failed to initiate checkout. Please try again.",
        );
      },
    }),
  );

  const timelineCount: Record<BillingCycleType, number> = {
    monthly: 1,
    quarterly: 6,
    annually: 12,
  };

  const currentAmount = plan?.billing_cycles?.[timeLine]?.amount ?? 0;
  const monthlyAmount = plan?.billing_cycles?.["monthly"]?.amount ?? 0;

  return (
    <div
      className={cn(
        "w-full px-3.5 py-3 flex flex-col gap-1.5 bg-[#fbfbfb] rounded-lg border border-zinc-200 shadow-2xs",
        popular && "bg-transparent border-zinc-800",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <h3
          className={cn(
            "text-sm font-semibold text-accent leading-tight",
            popular && "text-white",
          )}
        >
          {plan.name}
        </h3>
      </div>

      <p
        className={cn(
          "text-zinc-600 text-[11px] leading-normal line-clamp-2",
          popular && "text-white/80",
        )}
      >
        {plan.description}
      </p>

      <div className="flex items-baseline gap-1.5 my-0.5">
        {timeLine !== "monthly" && currentAmount > 0 && (
          <span
            className={cn(
              "text-xs text-stone-400 line-through font-medium",
              popular && "text-white/60",
            )}
          >
            ${monthlyAmount * timelineCount[timeLine]}
          </span>
        )}
        <span
          className={cn(
            "text-xl font-bold text-accent tracking-tight",
            popular && "text-white",
          )}
        >
          ${currentAmount}
        </span>
        <span
          className={cn(
            "text-[10px] text-zinc-500 font-normal",
            popular && "text-white/70",
          )}
        >
          /{timeLine === "annually" ? "yr" : timeLine === "quarterly" ? "qtr" : "mo"}
        </span>
      </div>

      <Button
        disabled={mutate.isPending}
        onClick={() => {
          if (currentAmount > 0) {
            mutate.mutateAsync({
              price_id: plan.billing_cycles[timeLine].price_id,
              interval: timeLine,
            });
          }
        }}
        variant={"outline"}
        className={cn(
          "rounded-md w-full font-medium cursor-pointer border px-2.5 h-8 text-xs transition-all duration-200",
          popular
            ? "bg-white text-black shadow-xs hover:bg-zinc-100 hover:text-black border-transparent"
            : "bg-main-btn text-accent shadow-xs hover:bg-zinc-100 border-zinc-200",
        )}
      >
        {currentAmount > 0 ? "Upgrade Now" : "Current Plan"}
      </Button>
    </div>
  );
}
