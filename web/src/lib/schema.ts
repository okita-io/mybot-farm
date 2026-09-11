import { faqs, site } from "@/lib/site";

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.productName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
};

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.productName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
};

export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};
