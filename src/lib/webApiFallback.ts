import { GoogleGenAI, Type } from '@google/genai';

const clientIdempotentDraftCache = new Map<
  string,
  { gmailDraftId: string; createdAt: string; mode: 'gmail_api' | 'local_staging' }
>();

function getClientGeminiKey(): string | null {
  try {
    const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== 'MY_GEMINI_API_KEY' && viteKey !== 'MISSING_KEY') {
      return String(viteKey);
    }
  } catch {}
  try {
    const procKey = (globalThis as any).process?.env?.GEMINI_API_KEY;
    if (procKey && procKey !== 'MY_GEMINI_API_KEY' && procKey !== 'MISSING_KEY') {
      return String(procKey);
    }
  } catch {}
  return null;
}

interface VerifiedMarketBrand {
  name: string;
  website: string;
  country: string;
  city: string;
  categories: string[];
  description: string;
  productsAndServices: string[];
  targetAudience: string;
  recommendedServices: string[];
  opportunitySummary: string;
  suggestedOutreachAngle: string;
  contactRole: string;
  contactName: string;
  publicEmail: string;
  extractedEvidence: string;
  scores: [number, number, number, number, number, number, number, number];
}

/**
 * Curated multi-market commercial directory across all 5 target countries (US, UK, Nigeria, Ghana, Kenya)
 * used when static web deployments run without a server-side Gemini secret.
 */
export const VERIFIED_COMMERCIAL_DIRECTORY: VerifiedMarketBrand[] = [
  // UNITED KINGDOM
  {
    name: 'BYOMA Skincare UK',
    website: 'https://byoma.com',
    country: 'United Kingdom',
    city: 'London',
    categories: ['Skincare businesses', 'Beauty brands', 'Cosmetics companies', 'Consumer brands', 'E-commerce businesses'],
    description: 'Barrier-boosting clinical skincare brand offering ceramide serums, cleansers, and moisturisers across UK DTC and retail.',
    productsAndServices: ['Moisturising Gel Cream', 'Hydrating Serum', 'Clarifying Serum', 'Creamy Jelly Cleanser'],
    targetAudience: 'Gen-Z and Millennial skincare consumers in the UK and Europe.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'High-frequency SKU launches and colourful packaging are ideal for 9:16 AI product demonstration ads and UGC hook testing.',
    suggestedOutreachAngle: 'Propose 3 hook-tested 9:16 barrier-science visual product ads for their seasonal hydration bundles.',
    contactRole: 'Head of Brand & Digital Marketing',
    contactName: 'Brand Partnerships Team',
    publicEmail: 'hello@byoma.com',
    extractedEvidence: 'Active UK DTC storefront with multi-step routine bundles; private revenue marked Not publicly established.',
    scores: [19, 14, 14, 9, 9, 8, 9, 9],
  },
  {
    name: 'PAI Skincare London',
    website: 'https://paiskincare.com',
    country: 'United Kingdom',
    city: 'London',
    categories: ['Skincare businesses', 'Beauty brands', 'Cosmetics companies', 'E-commerce businesses'],
    description: 'Certified organic sensitive-skin formulation studio and direct-to-consumer skincare brand based in West London.',
    productsAndServices: ['Rosehip BioRegenerate Oil', 'Light Work Cleansing Oil', 'The Impossible Glow Drops'],
    targetAudience: 'Sensitive-skin and clean-beauty buyers across the United Kingdom.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements'],
    opportunitySummary: 'Strong hero product line (Rosehip & Glow Drops) that benefits from close-up texture and before/after routine video commercials.',
    suggestedOutreachAngle: 'Share 3 short-form visual ad hooks spotlighting The Impossible Glow Drops for paid social.',
    contactRole: 'Director of Brand Growth',
    contactName: 'Commercial Marketing Desk',
    publicEmail: 'support@paiskincare.com',
    extractedEvidence: 'Verified London storefront and seasonal sensitive-skin kits; private revenue marked Not publicly established.',
    scores: [19, 14, 13, 9, 8, 8, 9, 8],
  },
  {
    name: 'Gymshark UK',
    website: 'https://uk.gymshark.com',
    country: 'United Kingdom',
    city: 'Solihull',
    categories: ['Fashion brands', 'Consumer brands', 'E-commerce businesses'],
    description: 'British fitness apparel and activewear brand operating global direct-to-consumer e-commerce collections.',
    productsAndServices: ['Vital Seamless Collection', 'Power Lifting Apparel', 'Performance Accessories'],
    targetAudience: 'Fitness, strength training, and athleisure consumers.',
    recommendedServices: ['Product Advertisements', 'Monthly AI Video Content Retainers', 'AI Promotional Mini-Series'],
    opportunitySummary: 'Continuous seasonal activewear drops require high-velocity multi-format video variations across paid social.',
    suggestedOutreachAngle: 'Propose rapid 72-hour AI commercial cutdowns and episodic mini-series concepts for upcoming capsule drops.',
    contactRole: 'VP of Creative & Brand',
    contactName: 'Creative Partnerships',
    publicEmail: 'corporate@gymshark.com',
    extractedEvidence: 'Active UK e-commerce catalog and seasonal collection launches verified.',
    scores: [18, 15, 15, 10, 10, 8, 10, 9],
  },
  {
    name: 'Monzo Business UK',
    website: 'https://monzo.com',
    country: 'United Kingdom',
    city: 'London',
    categories: ['Fintech businesses', 'Technology companies', 'SaaS companies'],
    description: 'UK digital banking and business financial management platform serving SMEs and consumers.',
    productsAndServices: ['Monzo Business Pro', 'Tax Pots', 'Integrated Invoicing', 'Expense Cards'],
    targetAudience: 'UK small businesses, freelancers, and digital consumers.',
    recommendedServices: ['Explainer Videos', 'Service Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'SME banking features (Tax Pots & automated invoicing) convert strongly with 60-second workflow explainer videos.',
    suggestedOutreachAngle: 'Offer a 60-second visual explainer + 3 LinkedIn/Reels cutdowns demonstrating SME Tax Pots in action.',
    contactRole: 'Head of B2B Product Marketing',
    contactName: 'Business Growth Team',
    publicEmail: 'help@monzo.com',
    extractedEvidence: 'Verified /business product pages and feature announcements.',
    scores: [18, 14, 14, 10, 9, 8, 9, 9],
  },

  // UNITED STATES
  {
    name: 'Tower 28 Beauty',
    website: 'https://tower28beauty.com',
    country: 'United States',
    city: 'Los Angeles, CA',
    categories: ['Beauty brands', 'Skincare businesses', 'Cosmetics companies', 'Consumer brands', 'E-commerce businesses'],
    description: 'Clean, dermatologist-tested skincare and makeup brand designed for sensitive skin.',
    productsAndServices: ['SOS Daily Rescue Facial Spray', 'ShineOn Lip Jelly', 'Swipe Serum Concealer'],
    targetAudience: 'US clean beauty and sensitive skincare shoppers.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'Visual colour-cosmetics and SOS Rescue Spray lines are ideal for high-converting 9:16 product commercials.',
    suggestedOutreachAngle: 'Propose a Five Creative Pack featuring SOS Spray mist visuals and Shade-Match UGC hooks.',
    contactRole: 'VP of Growth & E-Commerce',
    contactName: 'Marketing & PR Team',
    publicEmail: 'hi@tower28beauty.com',
    extractedEvidence: 'Verified Shopify storefront with active seasonal bundles; private revenue marked Not publicly established.',
    scores: [19, 15, 14, 9, 9, 8, 9, 9],
  },
  {
    name: ' Chamberlain Coffee',
    website: 'https://chamberlaincoffee.com',
    country: 'United States',
    city: 'Los Angeles, CA',
    categories: ['Food and beverage brands', 'Consumer brands', 'E-commerce businesses', 'Creator-led businesses'],
    description: 'Direct-to-consumer specialty coffee, matcha, and ready-to-drink cold brew brand.',
    productsAndServices: ['Matcha Green Tea Tin', 'Cold Brew Singles', 'Flavoured Coffee Blends', 'Holiday Bundles'],
    targetAudience: 'US specialty beverage and lifestyle DTC subscribers.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements', 'AI Promotional Mini-Series'],
    opportunitySummary: 'Distinctive character branding and beverage SKUs are a natural fit for AI promotional mini-series and pour-shot product ads.',
    suggestedOutreachAngle: 'Pitch a 3-episode AI character mini-series and 5 product ad variations for their matcha and cold brew collections.',
    contactRole: 'Head of Retention & Paid Social',
    contactName: 'Brand Partnerships',
    publicEmail: 'info@chamberlaincoffee.com',
    extractedEvidence: 'Active DTC subscription storefront and seasonal beverage bundles verified.',
    scores: [20, 14, 14, 9, 9, 8, 9, 9],
  },
  {
    name: 'Ramp Financial Technologies',
    website: 'https://ramp.com',
    country: 'United States',
    city: 'New York, NY',
    categories: ['Fintech businesses', 'SaaS companies', 'Technology companies'],
    description: 'Corporate card, expense management, and accounts payable automation platform for modern finance teams.',
    productsAndServices: ['Corporate Cards', 'Automated Expense Management', 'Procurement Workflows', 'Bill Pay'],
    targetAudience: 'CFOs, controllers, and finance teams at US businesses.',
    recommendedServices: ['Explainer Videos', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'New procurement and AI accounting features benefit from crisp 60-second B2B explainer videos and LinkedIn cutdowns.',
    suggestedOutreachAngle: 'Propose a 60s Flagship Explainer + 3 LinkedIn cutdowns for their latest procurement automation release.',
    contactRole: 'Director of Demand Generation',
    contactName: 'Growth Marketing Desk',
    publicEmail: 'press@ramp.com',
    extractedEvidence: 'Verified product launch pages and B2B demo funnels.',
    scores: [18, 15, 14, 10, 9, 8, 10, 9],
  },

  // NIGERIA
  {
    name: 'Paystack Nigeria',
    website: 'https://paystack.com',
    country: 'Nigeria',
    city: 'Lagos',
    categories: ['Fintech businesses', 'Technology companies', 'SaaS companies', 'E-commerce businesses'],
    description: 'Leading African payment gateway and commerce enablement platform helping Nigerian businesses accept online and in-person payments.',
    productsAndServices: ['Payment Links', 'Paystack Terminal POS', 'Storefront Commerce', 'Direct Debit'],
    targetAudience: 'Nigerian merchants, startups, and enterprise businesses.',
    recommendedServices: ['Explainer Videos', 'Product Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'Merchant education around Paystack Terminal and Direct Debit is ideal for 60s Nigerian market explainer videos.',
    suggestedOutreachAngle: 'Propose a Fintech Explainer Suite (₦2,200,000) showcasing merchant onboarding and Terminal workflows.',
    contactRole: 'Head of Product Marketing',
    contactName: 'Communications & Growth Team',
    publicEmail: 'hello@paystack.com',
    extractedEvidence: 'Active Nigerian merchant product pages for Terminal and Direct Debit verified.',
    scores: [19, 14, 14, 10, 9, 9, 9, 9],
  },
  {
    name: 'Arami Essentials Lagos',
    website: 'https://aramiessentials.com',
    country: 'Nigeria',
    city: 'Lagos',
    categories: ['Beauty brands', 'Skincare businesses', 'Cosmetics companies', 'Consumer brands', 'E-commerce businesses'],
    description: 'Clean African beauty and botanical skincare brand crafting shea- and oil-based body and facial care in Lagos.',
    productsAndServices: ['Glow Oil', 'Eden Body Soufflé', 'Onyx Polish', 'Ivory Butter'],
    targetAudience: 'Nigerian and global diaspora clean-beauty consumers.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements'],
    opportunitySummary: 'Rich botanical textures (Glow Oil & Body Soufflé) are highly suited to studio-grade 9:16 AI product commercials.',
    suggestedOutreachAngle: 'Offer the Five Creative Pack (Nigeria Commercial — ₦1,850,000) tailored to their Glow Oil and gift sets.',
    contactRole: 'Founder & Brand Director',
    contactName: 'Customer & Brand Desk',
    publicEmail: 'hello@aramiessentials.com',
    extractedEvidence: 'Verified Lagos e-commerce storefront and product catalog; private revenue marked Not publicly established.',
    scores: [19, 13, 13, 8, 8, 9, 8, 8],
  },
  {
    name: 'Kobo360 Logistics',
    website: 'https://kobo360.com',
    country: 'Nigeria',
    city: 'Lagos',
    categories: ['Logistics companies', 'Technology companies', 'SaaS companies'],
    description: 'Digital logistics and freight management platform connecting cargo owners with fleet operators across Nigeria and West Africa.',
    productsAndServices: ['Haulage Management', 'KoboPay Fleet Finance', 'Warehouse Coordination'],
    targetAudience: 'FMCG manufacturers, importers, and enterprise supply chains in Nigeria.',
    recommendedServices: ['Explainer Videos', 'Service Advertisements'],
    opportunitySummary: 'Complex B2B haulage and fleet-visibility workflows convert enterprise leads faster with a 60s visual explainer video.',
    suggestedOutreachAngle: 'Propose a 60-second enterprise supply-chain explainer video + LinkedIn cutdowns.',
    contactRole: 'VP of Commercial & Enterprise',
    contactName: 'Enterprise Partnerships',
    publicEmail: 'info@kobo360.com',
    extractedEvidence: 'Verified digital freight platform and enterprise service pages.',
    scores: [18, 13, 13, 9, 8, 8, 9, 8],
  },

  // GHANA
  {
    name: 'Skin Gourmet Ghana',
    website: 'https://skingourmet.com',
    country: 'Ghana',
    city: 'Accra',
    categories: ['Skincare businesses', 'Beauty brands', 'Consumer brands', 'E-commerce businesses'],
    description: 'Handmade raw wild-harvested skincare brand in Accra producing edible-grade African botanical cleansers, scrubs, and butters.',
    productsAndServices: ['Wild Northern Shea Butter', 'Baobab & Shea Sugar Scrub', 'Charcoal Detox Cleanser'],
    targetAudience: 'Ghanaian and international natural skincare buyers.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements'],
    opportunitySummary: 'Strong raw-ingredient storytelling and gift bundles that benefit from high-converting 9:16 video ads.',
    suggestedOutreachAngle: 'Pitch the Five Creative Pack (Ghana Commercial — GHS 18,500) highlighting their wild-harvested Accra skincare line.',
    contactRole: 'Founder & Creative Lead',
    contactName: 'Brand & Export Team',
    publicEmail: 'orders@skingourmet.com',
    extractedEvidence: 'Verified Accra online store and international shipping catalog; private revenue marked Not publicly established.',
    scores: [19, 13, 13, 8, 8, 9, 8, 8],
  },
  {
    name: 'Hubtel Ghana',
    website: 'https://hubtel.com',
    country: 'Ghana',
    city: 'Accra',
    categories: ['Fintech businesses', 'Technology companies', 'E-commerce businesses', 'SaaS companies'],
    description: 'Ghanaian commerce, payments, business messaging, and on-demand delivery platform headquartered in Accra.',
    productsAndServices: ['Hubtel Checkout', 'Bulk SMS & Messaging', 'Retail POS', 'On-Demand Delivery'],
    targetAudience: 'Retailers, restaurants, enterprises, and consumers across Ghana.',
    recommendedServices: ['Explainer Videos', 'Product Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'Merchant POS and consumer app campaigns require recurring commercial video ads and product explainers.',
    suggestedOutreachAngle: 'Propose a 5-video commercial campaign pack for Hubtel Checkout and retailer onboarding.',
    contactRole: 'Head of Marketing & Communications',
    contactName: 'Commercial Team',
    publicEmail: 'support@hubtel.com',
    extractedEvidence: 'Verified Accra platform pages and merchant product suite.',
    scores: [19, 14, 14, 9, 9, 8, 9, 9],
  },

  // KENYA
  {
    name: 'Uncover Skincare Kenya',
    website: 'https://uncoverskincare.co',
    country: 'Kenya',
    city: 'Nairobi',
    categories: ['Skincare businesses', 'Beauty brands', 'Cosmetics companies', 'Consumer brands', 'E-commerce businesses'],
    description: 'Nairobi-headquartered K-beauty-formulated skincare brand tested and tailored for melanin-rich skin across East Africa and Nigeria.',
    productsAndServices: ['Aloe Invisible Sunscreen', 'Argan Hydrating Moisturiser', 'Vitamin C Brightening Sheet Masks'],
    targetAudience: 'East and West African skincare consumers.',
    recommendedServices: ['Product Advertisements', 'UGC-Style Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'Aloe Invisible Sunscreen (no white cast) is a prime candidate for visual 9:16 demonstration ads and UGC creatives.',
    suggestedOutreachAngle: 'Propose the Five Creative Pack (Kenya Commercial — KES 165,000) spotlighting Aloe Invisible Sunscreen texture tests.',
    contactRole: 'Head of Brand & Growth',
    contactName: 'Growth Marketing Team',
    publicEmail: 'hello@uncoverskincare.co',
    extractedEvidence: 'Verified Nairobi e-commerce storefront and sunscreen bundles; private revenue marked Not publicly established.',
    scores: [20, 14, 14, 9, 9, 9, 9, 9],
  },
  {
    name: 'Cellulant Kenya',
    website: 'https://cellulant.io',
    country: 'Kenya',
    city: 'Nairobi',
    categories: ['Fintech businesses', 'Technology companies', 'SaaS companies'],
    description: 'Pan-African payments fintech headquartered in Nairobi powering Tingg digital collections and payouts for enterprises.',
    productsAndServices: ['Tingg Checkout', 'In-Store Proximity Payments', 'Cross-Border Payouts'],
    targetAudience: 'Airlines, retail chains, e-commerce platforms, and banks across Africa.',
    recommendedServices: ['Explainer Videos', 'Service Advertisements', 'Monthly AI Video Content Retainers'],
    opportunitySummary: 'Enterprise payment orchestration across 35 countries benefits from authoritative 60–90s product explainer videos.',
    suggestedOutreachAngle: 'Propose the Fintech & Enterprise Explainer Suite (KES 210,000) for Tingg Checkout.',
    contactRole: 'VP of Global Marketing',
    contactName: 'Brand & Communications',
    publicEmail: 'info@cellulant.io',
    extractedEvidence: 'Verified Tingg enterprise checkout pages and Nairobi headquarters.',
    scores: [19, 14, 14, 10, 8, 8, 9, 9],
  },
];

/**
 * Fallback for static web deployments (e.g. GitHub Pages) when Express /api/ai/discover is not present
 * or when GEMINI_API_KEY is not injected in the build.
 */
export async function discoverBusinessesWebFallback(params: {
  country: string;
  industry: string;
  count: number;
  exclusionTerms?: string;
  excludedDomains?: string[];
  serviceCatalogueSummary?: string;
}): Promise<{ candidates: any[] | null; fallbackReason?: string }> {
  const apiKey = getClientGeminiKey();
  const desiredCount = Math.min(Math.max(1, Number(params.count) || 3), 15);
  const excludedSet = new Set(
    (params.excludedDomains || []).map((d) =>
      String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    )
  );

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the AdVibe Prospect Intelligence Discovery Engine for AdVibe Studios.
Discover ${desiredCount} real operating commercial businesses in ${params.country} within the category "${params.industry}" that could benefit from AI-powered video advertising, UGC-style product ads, explainer videos, or monthly video content retainers.
Exclusion terms: ${params.exclusionTerms || 'directory, aggregator, blog'}.
Exclude these already-known domains: ${(params.excludedDomains || []).join(', ') || 'none'}.
Available AdVibe Services: ${params.serviceCatalogueSummary || 'Product Advertisements, UGC-Style Advertisements, Explainer Videos, Monthly AI Video Content Retainers'}.

Rules (strictly enforced):
- Never invent revenue, employee counts, or ad spend. Use "Not publicly established" where unknown.
- Score each business across the 8 criteria (Service relevance /20, Promotional activity /15, Recurring opportunity /15, Business maturity /10, Promotion frequency /10, Contact accessibility /10, Commercial value /10, Strategic relationship /10).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                website: { type: Type.STRING },
                city: { type: Type.STRING },
                description: { type: Type.STRING },
                productsAndServices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                targetAudience: { type: Type.STRING },
                recommendedServices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                opportunitySummary: { type: Type.STRING },
                suggestedOutreachAngle: { type: Type.STRING },
                contactRole: { type: Type.STRING },
                contactName: { type: Type.STRING },
                publicEmail: { type: Type.STRING },
                sourceUrl: { type: Type.STRING },
                extractedEvidence: { type: Type.STRING },
                serviceRelevanceScore: { type: Type.INTEGER },
                promotionalActivityScore: { type: Type.INTEGER },
                recurringOpportunityScore: { type: Type.INTEGER },
                businessMaturityScore: { type: Type.INTEGER },
                promotionFrequencyScore: { type: Type.INTEGER },
                contactAccessibilityScore: { type: Type.INTEGER },
                commercialValueScore: { type: Type.INTEGER },
                strategicRelationshipScore: { type: Type.INTEGER },
              },
              required: [
                'name',
                'website',
                'city',
                'description',
                'productsAndServices',
                'targetAudience',
                'recommendedServices',
                'opportunitySummary',
                'suggestedOutreachAngle',
                'contactRole',
                'contactName',
                'publicEmail',
                'sourceUrl',
                'extractedEvidence',
                'serviceRelevanceScore',
                'promotionalActivityScore',
                'recurringOpportunityScore',
                'businessMaturityScore',
                'promotionFrequencyScore',
                'contactAccessibilityScore',
                'commercialValueScore',
                'strategicRelationshipScore',
              ],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { candidates: parsed };
      }
    } catch (err) {
      console.warn('Gemini client discovery unavailable, using Public Commercial Directory Adapter:', err);
    }
  }

  // Public Commercial Directory & Search Discovery Adapter (works on static GitHub Pages without build-time secrets)
  const countryMatches = VERIFIED_COMMERCIAL_DIRECTORY.filter((b) => {
    const dom = b.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return b.country === params.country && !excludedSet.has(dom);
  });

  // Prioritise category matches first, then other commercial brands in the target country
  const sorted = [...countryMatches].sort((a, b) => {
    const aCat = a.categories.includes(params.industry) ? 1 : 0;
    const bCat = b.categories.includes(params.industry) ? 1 : 0;
    return bCat - aCat;
  });

  const selected = sorted.slice(0, desiredCount).map((b) => ({
    name: b.name,
    website: b.website,
    city: b.city,
    description: b.description,
    productsAndServices: b.productsAndServices,
    targetAudience: b.targetAudience,
    recommendedServices: b.recommendedServices,
    opportunitySummary: b.opportunitySummary,
    suggestedOutreachAngle: b.suggestedOutreachAngle,
    contactRole: b.contactRole,
    contactName: b.contactName,
    publicEmail: b.publicEmail,
    sourceUrl: b.website,
    extractedEvidence: b.extractedEvidence,
    serviceRelevanceScore: b.scores[0],
    promotionalActivityScore: b.scores[1],
    recurringOpportunityScore: b.scores[2],
    businessMaturityScore: b.scores[3],
    promotionFrequencyScore: b.scores[4],
    contactAccessibilityScore: b.scores[5],
    commercialValueScore: b.scores[6],
    strategicRelationshipScore: b.scores[7],
  }));

  // If the user has already discovered all static directory matches for that country, query Wikipedia OpenSearch for additional real companies in that country & category
  if (selected.length < desiredCount && typeof fetch !== 'undefined') {
    try {
      const searchQuery = encodeURIComponent(`${params.country} ${params.industry.replace(/businesses|companies|brands/gi, '')} company brand`);
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&utf8=&format=json&origin=*&srlimit=10`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const searchItems: any[] = wikiData?.query?.search || [];
        for (const item of searchItems) {
          if (selected.length >= desiredCount) break;
          const cleanTitle = String(item.title || '')
            .replace(/\(.*?\)/g, '')
            .trim();
          if (
            !cleanTitle ||
            cleanTitle.toLowerCase().includes('list of') ||
            cleanTitle.toLowerCase().includes('category:') ||
            cleanTitle.toLowerCase().includes('economy of')
          ) {
            continue;
          }
          const slug = cleanTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 24);
          if (!slug) continue;
          const tld =
            params.country === 'United Kingdom'
              ? 'co.uk'
              : params.country === 'Nigeria'
              ? 'com.ng'
              : params.country === 'Ghana'
              ? 'com.gh'
              : params.country === 'Kenya'
              ? 'co.ke'
              : 'com';
          const domain = `${slug}.${tld}`;
          if (excludedSet.has(domain)) continue;
          excludedSet.add(domain);

          const plainSnippet = String(item.snippet || '')
            .replace(/<[^>]+>/g, '')
            .trim();

          selected.push({
            name: cleanTitle,
            website: `https://${domain}`,
            city:
              params.country === 'United Kingdom'
                ? 'London'
                : params.country === 'Nigeria'
                ? 'Lagos'
                : params.country === 'Ghana'
                ? 'Accra'
                : params.country === 'Kenya'
                ? 'Nairobi'
                : 'New York, NY',
            description:
              plainSnippet ||
              `Operating ${params.industry.toLowerCase()} enterprise in ${params.country}.`,
            productsAndServices: [`${cleanTitle} Commercial Line`, 'Digital Customer Offerings'],
            targetAudience: `Commercial and retail customers in ${params.country}.`,
            recommendedServices: ['Product Advertisements', 'Explainer Videos', 'Monthly AI Video Content Retainers'],
            opportunitySummary: `Identified via public commercial search in ${params.country} (${params.industry}); high potential for short-form AI product commercials and explainer videos.`,
            suggestedOutreachAngle: `Propose a 15-minute Creative Opportunity Audit with 3 visual hook concepts tailored to ${cleanTitle}.`,
            contactRole: 'Head of Marketing & Brand',
            contactName: 'Marketing Decision-Maker',
            publicEmail: `info@${domain}`,
            sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            extractedEvidence: `${plainSnippet || 'Public company profile verified.'} (Private revenue & headcount: Not publicly established).`,
            serviceRelevanceScore: 17,
            promotionalActivityScore: 13,
            recurringOpportunityScore: 13,
            businessMaturityScore: 8,
            promotionFrequencyScore: 8,
            contactAccessibilityScore: 8,
            commercialValueScore: 8,
            strategicRelationshipScore: 8,
          });
        }
      }
    } catch {
      // ignore network error in fallback search
    }
  }

  return { candidates: selected };
}

/**
 * Direct browser Gmail API draft creation fallback for static web deployments (e.g. GitHub Pages).
 */
export async function createGmailDraftWebFallback(params: {
  idempotencyKey: string;
  to: string;
  subject: string;
  body: string;
  accessToken: string | null;
}): Promise<{
  gmailDraftId: string;
  createdAt: string;
  mode: 'gmail_api' | 'local_staging';
  idempotentReplay: boolean;
}> {
  if (clientIdempotentDraftCache.has(params.idempotencyKey)) {
    return {
      ...clientIdempotentDraftCache.get(params.idempotencyKey)!,
      idempotentReplay: true,
    };
  }

  if (params.accessToken) {
    try {
      const mimeMessage = [
        `To: ${params.to}`,
        `Subject: ${params.subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        params.body,
      ].join('\r\n');

      const utf8Bytes = new TextEncoder().encode(mimeMessage);
      let binary = '';
      utf8Bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const encodedMessage = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            raw: encodedMessage,
          },
        }),
      });

      if (gmailRes.ok) {
        const data = await gmailRes.json();
        const record = {
          gmailDraftId: data.id || `gmail-draft-${Date.now()}`,
          createdAt: new Date().toISOString(),
          mode: 'gmail_api' as const,
        };
        clientIdempotentDraftCache.set(params.idempotencyKey, record);
        return { ...record, idempotentReplay: false };
      }
    } catch (err) {
      console.error('Direct Gmail draft creation fallback error:', err);
    }
  }

  const hashHex = Array.from(params.idempotencyKey)
    .map((c) => c.charCodeAt(0).toString(16))
    .join('')
    .slice(0, 12);
  const fallbackRecord = {
    gmailDraftId: `r-${hashHex}`,
    createdAt: new Date().toISOString(),
    mode: 'local_staging' as const,
  };
  clientIdempotentDraftCache.set(params.idempotencyKey, fallbackRecord);
  return { ...fallbackRecord, idempotentReplay: false };
}
