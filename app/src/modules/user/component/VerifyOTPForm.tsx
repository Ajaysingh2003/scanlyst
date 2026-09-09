"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/client";

export default function VerifyOTPForm({
  email: initialEmail = "",
  token = "",
}: {
  email?: string;
  token?: string;
}) {
  const router = useRouter();
  const trpc = useTRPCClient();
  const [email, setEmail] = useState(initialEmail);
  const [verificationToken, setVerificationToken] = useState(token);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setIsEditingEmail(false);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (token) {
      setVerificationToken(token.replace(/\D/g, "").slice(0, 6));
    }
  }, [token]);

  const verify = useMutation({
    mutationFn: (input: { email: string; token: string }) =>
      trpc.user.verifyEmail.mutate(input),
    onSuccess: () => {
      toast.success("Email verified successfully");
      router.replace("/login");
    },
    onError: (error) => toast.error(error.message || "Verification failed"),
  });

  const resend = useMutation({
    mutationFn: (input: { email: string }) =>
      trpc.user.resendVerification.mutate(input),
    onSuccess: () => toast.success("A new verification code has been sent"),
    onError: (error) => toast.error(error.message || "Failed to resend code"),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    const cleanToken = verificationToken.replace(/\D/g, "").trim();

    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    if (!cleanToken) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }
    if (cleanToken.length !== 6) {
      toast.error("Please enter all 6 digits of the verification code");
      return;
    }

    verify.mutate({ email: cleanEmail, token: cleanToken });
  };

  return (
    <div className="w-full max-w-sm lg:max-w-[300px] space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {isEditingEmail ? (
          <div>
            <label
              htmlFor="verification-email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Email address
            </label>
            <Input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
            <span className="truncate">Verifying: <strong className="text-slate-900">{email}</strong></span>
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="text-xs text-blue-600 hover:underline shrink-0 ml-2"
            >
              Change
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor="verification-token"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Verification Code (OTP)
          </label>
          <Input
            id="verification-token"
            value={verificationToken}
            onChange={(event) => {
              const val = event.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationToken(val);
            }}
            placeholder="6-digit code (e.g. 123456)"
            maxLength={6}
            autoComplete="one-time-code"
            inputMode="numeric"
            className="text-center font-mono text-lg tracking-widest"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={verify.isPending || verificationToken.replace(/\D/g, "").length !== 6 || !email.trim()}
          className="w-full rounded-md bg-background-btn"
        >
          {verify.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      {email.trim() && (
        <Button
          type="button"
          variant="outline"
          disabled={resend.isPending}
          onClick={() => resend.mutate({ email: email.trim() })}
          className="w-full"
        >
          {resend.isPending ? "Sending…" : "Resend verification code"}
        </Button>
      )}
    </div>
  );
}
