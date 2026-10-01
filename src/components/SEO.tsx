import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: object | object[];
  breadcrumbs?: { name: string; url: string }[];
  noindex?: boolean;
}

const BASE_URL = "https://duka.twendedigital.tech";

export default function SEO({
  title,
  description = "Twende Duka - The smart point of sale and shop management system for modern businesses.",
  keywords = "duka, twende duka, twendeduka, duka smart, twendedigital, twende digital, POS Tanzania, duka pos system, shop management, mfumo wa duka, biashara, inventory management, mauzo, stoo, point of sale, smart shop management",
  canonical,
  ogImage = `${BASE_URL}/favicon.svg`,
  ogType = "website",
  jsonLd,
  breadcrumbs,
  noindex,
}: SEOProps) {
  const fullTitle = title.length > 55 ? title : `${title} | Twende Duka`;
  const currentLocation = typeof window !== "undefined" ? window.location.pathname : "";
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : `${BASE_URL}${currentLocation}`;

  const allJsonLd: object[] = [];

  // Add provided JSON-LD
  if (jsonLd) {
    if (Array.isArray(jsonLd)) allJsonLd.push(...jsonLd);
    else allJsonLd.push(jsonLd);
  }

  // Auto-generate BreadcrumbList
  if (breadcrumbs && breadcrumbs.length > 0) {
    allJsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((bc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: bc.name,
        item: `${BASE_URL}${bc.url}`,
      })),
    });
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description?.slice(0, 160)} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Twende Digital" />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description?.slice(0, 160)} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Twende Duka" />
      <meta property="og:locale" content="sw_TZ" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description?.slice(0, 160)} />
      <meta name="twitter:image" content={ogImage} />

      {/* Geo targeting */}
      <meta name="geo.region" content="TZ" />
      <meta name="geo.placename" content="Tanzania" />

      {/* JSON-LD */}
      {allJsonLd.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(allJsonLd.length === 1 ? allJsonLd[0] : allJsonLd)}
        </script>
      )}
    </Helmet>
  );
}
