import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/personal/", "/api/", "/pay/", "/onboarding"],
    },
    sitemap: "https://rhynode.finance/sitemap.xml",
  };
}
