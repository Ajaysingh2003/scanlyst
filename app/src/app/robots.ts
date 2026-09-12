import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

const protectedPaths = ["/dashboard/", "/api/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/verify-otp"];

// export default function robots(): MetadataRoute.Robots {
//   return {
//     rules: [
//       { userAgent: "*", allow: "/", disallow: protectedPaths },
//       { userAgent: ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"], allow: "/", disallow: protectedPaths },
//     ],
//     sitemap: absoluteUrl("/sitemap.xml"),
//     host: absoluteUrl("/"),
//   };
// }




export default function robots(): MetadataRoute.Robots {
  const domainHost = new URL(absoluteUrl("/")).host;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: protectedPaths,
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: "/",
        disallow: protectedPaths,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: domainHost,
  };
}