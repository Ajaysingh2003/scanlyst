"use client";
import React from "react";
import VerifyOTPForm from "../component/VerifyOTPForm";

function VerifyOTPView({email, token}:{email:string; token?: string}) {
  return (
    <div className="flex items-center flex-col justify-center w-full h-full min-h-screen">
      <div className="max-w-sm flex items-center gap-1 justify-center flex-col">
        <h2 className="text-xl text-black font-heading tracking-wide font-semibold">
          Verify Your Email
        </h2>
        <div className="inline-flex items-center justify-center">
          <p className="text-center text-accent text-sm tracking-wide">
            Enter the 6-digit verification code sent to your email to activate your account.
            {email && <><br/><span className="email font-medium text-slate-900">{email}</span></>}
          </p>
        </div>
        <VerifyOTPForm email={email ?? ""} token={token}/>
      </div>
    </div>
  );
}

export default VerifyOTPView;
