import axios, { type AxiosError } from "axios";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { baseProcedure, createTRPCRouter, getUserProcedure } from "@/trpc/init";
import type {
  BillingAccount,
  BillingPlan,
  CheckoutResponse,
  PortalResponse,
} from "@/modules/billing/types";

const apiRoot = () => {
  const base = (process.env.BASE_API || "http://localhost:8000/api").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
};

const billingApi = () => `${apiRoot()}/v1/billing`;

type BackendError = {
  detail?: string | Array<{ msg?: string; message?: string }>;
  message?: string;
};

const getBackendMessage = (data: BackendError | undefined, fallback: string) => {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail))
    return data.detail.map((item) => item.msg || item.message).filter(Boolean).join(", ") || fallback;
  return data?.message || fallback;
};

const billingError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendError>;
    if (!axiosError.response) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Billing service is currently unavailable. Ensure the API server is running.",
      });
    }
    const status = axiosError.response?.status;
    const code: TRPCError["code"] =
      status === 401
        ? "UNAUTHORIZED"
        : status === 402
        ? "PAYMENT_REQUIRED"
        : status === 403
        ? "FORBIDDEN"
        : status === 404
        ? "NOT_FOUND"
        : status === 409
        ? "CONFLICT"
        : "BAD_REQUEST";

    throw new TRPCError({
      code,
      message: getBackendMessage(axiosError.response?.data, fallback),
      cause: { status, requestId: axiosError.response?.headers?.["x-request-id"] },
    });
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback });
};

const getAccessToken = async () => (await cookies()).get("access_token")?.value;

const authHeaders = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Please sign in to access billing details.",
    });
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const checkoutProcedure = getUserProcedure
  .input(
    z.object({
      plan: z.enum(["starter", "pro", "max"]).optional(),
      price_id: z.string().optional(),
      interval: z.enum(["monthly", "annual", "quarterly", "annually"]).default("monthly"),
    })
  )
  .mutation(async ({ input }): Promise<CheckoutResponse> => {
    try {
      const headers = await authHeaders();
      // Resolve plan and interval
      let interval: "monthly" | "quarterly" | "annual" =
        input.interval === "annually" ? "annual" : input.interval;
      if (input.price_id) {
        if (input.price_id.includes("quarterly")) {
          interval = "quarterly";
        } else if (input.price_id.includes("annual")) {
          interval = "annual";
        } else if (input.price_id.includes("monthly")) {
          interval = "monthly";
        }
      }
      const plan =
        input.plan ||
        (input.price_id?.includes("pro")
          ? "pro"
          : input.price_id?.includes("max")
          ? "max"
          : "starter");
      const response = await axios.post<{ checkout_url: string }>(
        `${billingApi()}/checkout`,
        { plan, interval },
        { headers }
      );
      const checkout_url = response.data?.checkout_url || "";
      return {
        checkout_url,
        url: checkout_url,
      };
    } catch (error) {
      return billingError(error, "Could not initiate checkout session");
    }
  });

export const billingRouter = createTRPCRouter({
  /**
   * Public procedure to fetch all available plan tiers and features.
   */
  getPlans: baseProcedure.query(async (): Promise<BillingPlan[]> => {
    try {
      const response = await axios.get<BillingPlan[]>(`${billingApi()}/plans`);
      return response.data || [];
    } catch (error) {
      return billingError(error, "Could not load subscription plans");
    }
  }),

  /**
   * Protected procedure to fetch current user's billing account status and scan usage.
   */
  getAccount: getUserProcedure.query(async (): Promise<BillingAccount> => {
    try {
      const headers = await authHeaders();
      const response = await axios.get<BillingAccount>(`${billingApi()}/account`, { headers });
      return response.data;
    } catch (error) {
      return billingError(error, "Could not load billing account");
    }
  }),

  /**
   * Protected mutation to initiate a Dodo Payments checkout session for plan upgrade.
   */
  createCheckout: checkoutProcedure,
  Createcheckout: checkoutProcedure,

  /**
   * Protected mutation to open the Dodo Payments Customer Portal for managing active subscriptions.
   */
  createPortal: getUserProcedure.mutation(async (): Promise<PortalResponse> => {
    try {
      const headers = await authHeaders();
      const response = await axios.post<PortalResponse>(`${billingApi()}/portal`, {}, { headers });
      return response.data;
    } catch (error) {
      return billingError(error, "Could not open Dodo Payments customer portal");
    }
  }),
});
