import type { Metadata } from "next";
import { Marcellus, DM_Sans } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "react-hot-toast";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { Analytics } from "@vercel/analytics/next"
const fontHeading = Marcellus({
  variable: "--font-heading",
  subsets: ["latin"],
  weight:"400"
});

const fontContent = DM_Sans({
  variable: "--font-content",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | Scanlyst",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "website security scanner",
    "web vulnerability scanner",
    "technical SEO audit",
    "AI search optimization",
    "answer engine optimization",
    "Core Web Vitals audit",
    "website accessibility scanner",
    "attack surface monitoring",
    "vulnerability assessment",
    "automated website audit",
  ],
  authors: [{ name: "Scanlyst Team" }],
  creator: "Scanlyst",
  publisher: "Scanlyst",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: siteConfig.socialImage, width: 1099, height: 630, alt: "Scanlyst website audit platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.twitterImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: siteConfig.logoImage,
    apple: siteConfig.logoImage,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${absoluteUrl("/")}#organization`,
      name: siteConfig.name,
      url: absoluteUrl("/"),
      logo: absoluteUrl(siteConfig.logoImage),
      email: siteConfig.supportEmail,
    },
    {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#website`,
      url: absoluteUrl("/"),
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${absoluteUrl("/")}#software`,
      name: siteConfig.name,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: siteConfig.description,
      featureList: ["Website vulnerability scanning", "Technical SEO and AI-search readiness audits", "Core Web Vitals analysis", "Accessibility and compliance checks", "Scheduled monitoring and exportable reports"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url: absoluteUrl("/pricing") },
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
    },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontHeading.variable} ${fontContent.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        <TRPCReactProvider>
          <Analytics/>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
