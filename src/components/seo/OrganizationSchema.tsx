import { Helmet } from "react-helmet-async";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Twende Digital",
  url: "https://twendedigital.tech",
  logo: "https://duka.twendedigital.tech/icon_duka.png",
  description:
    "Twende Digital ni kampuni ya teknolojia inayotengeneza mifumo ya kisasa ya biashara kwa wafanyabiashara wa Tanzania na Afrika Mashariki.",
  foundingDate: "2024",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+255692671206",
    contactType: "customer service",
    email: "twendegital3@gmail.com",
    availableLanguage: ["sw", "en"],
  },
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Twende Duka",
  alternateName: ["TwendeDuka", "Twende Duka POS"],
  url: "https://duka.twendedigital.tech/",
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Twende Duka",
  alternateName: ["Twende Duka", "Duka POS System", "Duka Smart"],
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Point of Sale",
  operatingSystem: "Web",
  description:
    "Twende Duka ni mfumo bora wa kusimamia duka lako — bidhaa, mauzo, stoo, wasambazaji, matumizi na wafanyakazi. Best POS system for Tanzania dukas.",
  url: "https://duka.twendedigital.tech",
  author: {
    "@type": "Organization",
    name: "Twende Digital",
    url: "https://twendedigital.tech",
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "TZS",
    lowPrice: "9900",
    highPrice: "79900",
    offerCount: "3",
  },
  featureList: [
    "Inventory Management",
    "Sales Tracking",
    "Expense Management",
    "Multi-store Support",
    "Team Management",
    "Mobile Responsive",
    "M-Pesa Integration",
    "Daily Reports",
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Twende Duka POS System",
  description:
    "Professional point of sale and shop management system for Tanzanian businesses. Manage products, sales, expenses, suppliers and staff.",
  brand: { "@type": "Brand", name: "Twende Duka" },
  offers: [
    {
      "@type": "Offer",
      name: "Ndogo Plan",
      price: "9900",
      priceCurrency: "TZS",
      description: "Kwa maduka madogo madogo yanayoanza — duka 1, bidhaa 50",
    },
    {
      "@type": "Offer",
      name: "Biashara Plan",
      price: "29900",
      priceCurrency: "TZS",
      description: "Kwa biashara zinazokua — maduka 5, wafanyakazi 10",
    },
    {
      "@type": "Offer",
      name: "Kampuni Plan",
      price: "79900",
      priceCurrency: "TZS",
      description: "Kwa biashara kubwa — maduka yasiyopungua, API access, 24/7 support",
    },
  ],
};

export default function OrganizationSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>
    </Helmet>
  );
}
