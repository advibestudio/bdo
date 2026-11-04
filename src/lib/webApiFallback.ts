import { GoogleGenAI, Type } from '@google/genai';

const clientIdempotentDraftCache = new Map<
  string,
  { gmailDraftId: string; createdAt: string; mode: 'gmail_api' | 'local_staging' }
>();

function getClientGeminiKey(): string | null {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey !== 'MISSING_KEY') {
    return String(envKey);
  }
  return null;
}

/**
 * Fallback for static web deployments (e.g. GitHub Pages) when Express /api/ai/discover is not present.
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
  if (!apiKey) {
    return {
      candidates: null,
      fallbackReason:
        'Static web deployment detected without VITE_GEMINI_API_KEY secret configured in GitHub Actions.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are the AdVibe Prospect Intelligence Discovery Engine for AdVibe Studios.
Discover ${Math.min(Math.max(1, Number(params.count) || 3), 15)} real operating commercial businesses in ${params.country} within the category "${params.industry}" that could benefit from AI-powered video advertising, UGC-style product ads, explainer videos, or monthly video content retainers.
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
    return { candidates: Array.isArray(parsed) ? parsed : [] };
  } catch (err: any) {
    return {
      candidates: null,
      fallbackReason: err?.message || 'Client-side AI discovery failed.',
    };
  }
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
