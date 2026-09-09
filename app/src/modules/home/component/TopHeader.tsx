import React from "react";
import { ChartCandlestick } from "lucide-react";
import Image from "next/image";
function TopHeader() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-[90%] md:max-w-3xl cursor-pointer flex flex-col gap-5 items-center justify-center">
        <h1
          style={{ fontWeight: "300" }}
          className="hero-reveal max-w-[min(92vw,738px)] text-balance font-heading text-[clamp(40px,7vw,54px)] font-mediuma leading-[1.15] tracking-[-0.04em] text-ink text-center "
        >
          Security Insights You Can{" "}

          
{/* <span className="tc-mask-child block italic font-medium text-[clamp(36px,7vw,56px)] font-heading bg-gradient-to-r from-rose-400 to-white/70 bg-clip-text !text-transparent [-webkit-background-clip:text]">
  Actually Trust
</span> */}


<span className="italic font-subheading text-[clamp(36px,7vw,56px)] bg-gradient-to-r to-white from-rose-400 via-rose-500 bg-clip-text text-transparent">
  Actually Trust
</span>

        </h1>
        <p className=" text-sm md:text-md text-center tracking-wide font-content md:text-[16px]  max-w-xl ">
          Everything you need to understand your security posture. One scan.
          Prioritized findings. Faster fixes.
        </p>
      </div>
    </div>
  );
}

export default TopHeader;
