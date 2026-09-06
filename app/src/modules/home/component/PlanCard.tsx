"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { ArrowRight, CircleChevronRightIcon } from "lucide-react";
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

function PlanCard({
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
  const [hoverSeeAll, sethoverSeeAll] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm flex flex-col  border-zinc-200 p-1 overflow-hidden",
        popular && "bg-background-card-popular",
      )}
    >
      <PlanCardHeader popular={popular} timeLine={timeLine} plan={plan} />
      <div className="px-5 mt-4 pb-2 flex flex-col flex-1 justify-between">
        <ul className="flex flex-col  gap-3">
          {feature?.map((e, i) => (
            <li key={i} className="flex items-center gap-3 font-medium ">
              <HugeiconsIcon
                icon={e.icon}
                size={14}
                className={cn("text-accent", popular && "text-white/80")}
                strokeWidth={1.5}
              />
              <span
                className={cn(
                  "text-accent text-[13px] tracking-wide",
                  popular && "text-white",
                )}
              >
                {e.label}
              </span>
            </li>
          ))}
        </ul>
        <Button
          onMouseEnter={() => {
            sethoverSeeAll(true);
          }}
          onMouseLeave={() => sethoverSeeAll(false)}
          variant={"outline"}
          className={`rounded-xl text-xs md:text-[13px] capitalizez md:text-md font-semibold  cursor-pointer border px-3 py-1.5  transition-all duration-200 ${
            !popular
              ? "bg-white/90 text-accent shadow-sm  hover:bg-white/60  hover:border-zinc-200 hover:text-accent"
              : "border-zinc-800 hover:bg-transparent bg-transparent  text-stone-300 duration-300 transition-all  hover:text-stone-300   hover:shadow-2xs"
          }
                         relative
                        `}
        >
          Explore all feature{" "}
          <span
            className={cn(
              "bg-gray-300 overflow-hidden rounded-full size-5 text-center flex items-center justify-center ",
              popular && "bg-stone-700",
            )}
          > 
            <div
              className="w-full flex items-start justify-center gap-1"
            >
              <ArrowRight
                className={cn("size-4", popular && "text-stone-300")}
              />
            </div>
          </span>
        </Button>
      </div>
    </div>
  );
}

export default PlanCard;

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
  return (
    <div
      className={cn(
        "w-full px-5 py-6 flex flex-col gap-2 bg-[#fbfbfb] rounded-xl border border-zinc-200 shadow-2xs",
        popular && "bg-transparent border-zinc-800 ",
      )}
    >
      <h3
        className={cn(
          "text-lg md:text-xl text-accent  font-heading font-semibold",
          popular && "text-white",
        )}
      >
        {plan.name}
      </h3>
      <p
        className={cn(
          "text-gray-700 capitalize tracking-wider text-sm font-normal leading-relaxed",
          popular && "text-white/80",
        )}
      >
        {plan.description}
      </p>

      <p className="font-bold space-x-2 items-center md:text-3xl lg:text-4xl text-accent">
        {timeLine != "monthly" &&
          plan?.billing_cycles?.[timeLine]?.amount > 0 && (
            <span
              className={cn(
                "text-2xl text-stone-500 line-through",
                popular && "text-white/80",
              )}
            >
              ${plan?.billing_cycles?.["monthly"]?.amount * (timeLine === "annually" ? 12 : timeLine === "quarterly" ? 6 : 1)}
            </span>
          )}
        <span className={cn(popular && "text-white")}>
          ${plan?.billing_cycles?.[timeLine]?.amount}
        </span>
      </p>

      <div className="">
        <Button
          disabled={mutate.isPending}
          onClick={() => {
            if (plan.billing_cycles[timeLine].amount > 0) {
              mutate.mutateAsync({
                price_id: plan.billing_cycles[timeLine].price_id,
                interval: timeLine,
              });
            }
          }}
          variant={"outline"}
          className={`rounded-md w-full capitalize font-semibold  cursor-pointer border px-3 py-1.5 md:py-2 text-xs md:text-sm transition-all duration-200 ${
            popular
              ? "bg-white/90 text-black  shadow-2xs  hover:bg-white/90  hover:border-zinc-200 hover:text-zinc-800"
              : "bg-white/90z bg-main-btn text-accent  shadow-2xs  hover:bg-white/60  hover:border-zinc-200 hover:text-accent"
          }
             relative
            `}
        >
          {plan.billing_cycles[timeLine].amount > 0
            ? "Upgrade Now"
            : "Current Plan"}
        </Button>
      </div>
    </div>
  );
}
