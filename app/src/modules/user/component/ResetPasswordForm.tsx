"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/client";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const trpc = useTRPCClient();
  const [password, setPassword] = useState("");
  const reset = useMutation({
    mutationFn: (input: { token: string; password: string }) => trpc.user.resetPassword.mutate(input),
    onSuccess: () => { toast.success("Password updated"); router.replace("/login"); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); reset.mutate({ token, password }); }} className="w-full max-w-sm space-y-4">
      <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">New password</label>
      <Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
      <Button type="submit" disabled={reset.isPending || !token} className="w-full rounded-md bg-slate-950 hover:bg-slate-800">{reset.isPending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
