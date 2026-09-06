"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/client";

export default function VerifyOTPForm({
  email,
  token = "",
}: {
  email: string;
  token?: string;
}) {
  const router = useRouter();
  const trpc = useTRPCClient();
  const [verificationToken, setVerificationToken] = useState(token);
  const verify = useMutation({
    mutationFn: (input: { token: string }) =>
      trpc.user.verifyEmail.mutate(input),
    onSuccess: () => {
      toast.success("Email verified");
      router.replace("/login");
    },
    onError: (error) => toast.error(error.message),
  });
  const resend = useMutation({
    mutationFn: (input: { email: string }) =>
      trpc.user.resendVerification.mutate(input),
    onSuccess: () => toast.success("A new verification email has been sent"),
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="w-full max-w-sm lg:max-w-[300px] space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          verify.mutate({ token: verificationToken });
        }}
        className="space-y-3"
      >
        <label
          htmlFor="verification-token"
          className="block text-sm font-medium text-slate-700"
        >
          Otp
        </label>
        <Input
          id="verification-token"
          value={verificationToken}
          onChange={(event) => setVerificationToken(event.target.value)}
          placeholder="Paste the token from your email"
        />
        <Button
          type="submit"
          disabled={verify.isPending || !verificationToken.trim()}
          className="w-full rounded-md bg-background-btn"
        >
          {verify.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </form>
      {email && (
        <Button
          type="button"
          variant="outline"
          disabled={resend.isPending}
          onClick={() => resend.mutate({ email })}
          className="w-full"
        >
          {resend.isPending ? "Sending…" : "Resend verification email"}
        </Button>
      )}
    </div>
  );
}
