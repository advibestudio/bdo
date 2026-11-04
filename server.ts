import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Idempotency cache for Gmail draft creation (prevents duplicate drafts on retries - Section 14.3)
const idempotentDraftRegistry = new Map<
  string,
  { gmailDraftId: string; createdAt: string; mode: 'gmail_api' | 'local_staging' }
>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health & configuration status endpoint
  app.get('/api/status', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      targetGmailAccount: 'advibestudios.global@gmail.com',
    });
  });

  // 1. AI Business Discovery Engine (Section 5)
  app.post('/api/ai/discover', async (req, res) => {
    const {
      country = 'United Kingdom',
      industry = 'Skincare businesses',
      count = 3,
      excludedDomains = [],
      serviceCatalogueSummary = '',
    } = req.body || {};

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the AdVibe Prospect Intelligence Discovery Engine for AdVibe Studios.
Discover ${Math.min(Number(count) || 3, 5)} real operating commercial businesses in ${country} within the category "${industry}" that could benefit from AI-powered video advertising, UGC-style product ads, explainer videos, or monthly video content retainers.
Exclude these already-known domains: ${ (excludedDomains as string[]).join(', ') || 'none' }.
Available AdVibe Services: ${serviceCatalogueSummary || 'Product Advertisements, UGC-Style Advertisements, Explainer Videos, Monthly AI Video Content Retainers, AI Promotional Mini-Series'}.

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
      res.json({ candidates: parsed, source: 'gemini-3.8-flash' });
    } catch (error: any) {
      console.error('AI Discovery fallback triggered:', error?.message);
      res.status(200).json({
        candidates: null,
        fallbackReason:
          error?.message ||
          'Gemini API key not configured or quota reached; using verified market seed adapter.',
      });
    }
  });

  // 2. AI Business Research Engine (Section 6)
  app.post('/api/ai/research', async (req, res) => {
    const { business, serviceCatalogue } = req.body || {};
    if (!business?.name) {
      return res.status(400).json({ error: 'Business details are required for research.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate an evidence-grounded AI Business Research Report for AdVibe Studios on:
Business Name: ${business.name}
Website: ${business.website}
Country: ${business.country}
Industry: ${business.industry}
Current Description: ${business.description}
Available AdVibe Services: ${JSON.stringify(serviceCatalogue || [])}

Strict Evidence Rules (Section 6.3):
- Do NOT invent revenue, employee counts, ad spend, or existing agency relationships.
- Where private financial/headcount metrics are unavailable, explicitly state "Not publicly established".
- Explain why AdVibe should approach this business, which service is the strongest initial offer, and what evidence supports it.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              businessOverview: { type: Type.STRING },
              productsAndServices: { type: Type.ARRAY, items: { type: Type.STRING } },
              targetAudience: { type: Type.STRING },
              positioning: { type: Type.STRING },
              publicSizeIndicator: { type: Type.STRING },
              marketingSummary: { type: Type.STRING },
              videoContentAnalysis: { type: Type.STRING },
              creativeOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedServices: { type: Type.ARRAY, items: { type: Type.STRING } },
              strongestInitialOffer: { type: Type.STRING },
              problemSolved: { type: Type.STRING },
              suggestedOutreachAngle: { type: Type.STRING },
              appropriateFirstConversation: { type: Type.STRING },
              evidenceClaim: { type: Type.STRING },
              extractedEvidence: { type: Type.STRING },
              researchConfidence: { type: Type.STRING },
            },
            required: [
              'businessOverview',
              'productsAndServices',
              'targetAudience',
              'positioning',
              'publicSizeIndicator',
              'marketingSummary',
              'videoContentAnalysis',
              'creativeOpportunities',
              'recommendedServices',
              'strongestInitialOffer',
              'problemSolved',
              'suggestedOutreachAngle',
              'appropriateFirstConversation',
              'evidenceClaim',
              'extractedEvidence',
              'researchConfidence',
            ],
          },
        },
      });

      const report = JSON.parse((response.text ?? '{}').trim());
      res.json({ report });
    } catch (error: any) {
      res.status(200).json({
        report: null,
        fallbackReason: error?.message || 'Using structured evidence synthesis.',
      });
    }
  });

  // 3. AI Personalised Email & Follow-up Generator (Section 13 & 17)
  app.post('/api/ai/generate-email', async (req, res) => {
    const {
      business,
      contact,
      service,
      pricingRecord,
      campaignObjective,
      tone = 'Consultative & Executive',
      sequenceStep = 1,
      previousInteractions = [],
      knowledgeBase = '',
    } = req.body || {};

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate an individual, research-grounded business outreach email from AdVibe Studios (advibestudios.global@gmail.com).
Target Business: ${business?.name} (${business?.website}, ${business?.country}, ${business?.industry})
Recipient Contact: ${contact?.fullName} (${contact?.jobTitle})
Sequence Step: ${sequenceStep === 1 ? 'Initial First-Contact Outreach' : `Follow-up #${sequenceStep - 1}`}
Recommended AdVibe Service: ${service?.name} - ${service?.shortDescription}
Configured Country Pricing (${business?.country}): ${
          pricingRecord
            ? `${pricingRecord.packageName}: ${pricingRecord.currency} ${pricingRecord.price.toLocaleString()} (${pricingRecord.packageDescription})`
            : 'Custom quotation — do not quote a numeric price; recommend a brief scoping conversation.'
        }
Research Evidence: ${business?.opportunitySummary || business?.description}
Previous Interaction History: ${JSON.stringify(previousInteractions)}
Campaign Objective: ${campaignObjective || 'Initiate a consultative conversation around high-converting AI video creatives'}
Desired Tone: ${tone}
AdVibe Knowledge Base Rules: ${knowledgeBase}

Strict Prohibitions (Section 13.4 & 17.4):
- No generic mass email openings ("I hope this email finds you well").
- No fabricated compliments or false claims of familiarity.
- Never quote a price that is not in the Configured Country Pricing above.
- If this is a follow-up, directly reference the previous interaction context without claiming a tracking pixel proves they read or liked the portfolio.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
              researchEvidenceUsed: { type: Type.STRING },
              personalisationAngle: { type: Type.STRING },
            },
            required: ['subject', 'body', 'researchEvidenceUsed', 'personalisationAngle'],
          },
        },
      });

      const generated = JSON.parse((response.text ?? '{}').trim());
      res.json({ generated });
    } catch (error: any) {
      res.status(200).json({
        generated: null,
        fallbackReason: error?.message || 'Using deterministic evidence-grounded template.',
      });
    }
  });

  // 4. AI Outreach Assistant (Phone Script, Meeting Agenda, Objection Handling, Reply Classification - Section 17)
  app.post('/api/ai/assistant', async (req, res) => {
    const { taskType, business, contact, contextText, serviceCatalogueSummary } = req.body || {};
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the AdVibe Studios AI Outreach Assistant.
Task Type: ${taskType}
Business: ${business?.name} (${business?.country} · ${business?.industry})
Contact: ${contact?.fullName || 'Decision Maker'} (${contact?.jobTitle || 'Marketing/Leadership'})
Business Opportunity Summary: ${business?.opportunitySummary}
Additional Context / Incoming Reply: ${contextText || 'None provided'}
AdVibe Services: ${serviceCatalogueSummary}

Provide a concise, actionable output for AdVibe Studios without inventing unconfigured pricing or making contractual commitments.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              classification: { type: Type.STRING },
              recommendedNextAction: { type: Type.STRING },
              talkingPointsOrDraft: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedResponseText: { type: Type.STRING },
            },
            required: [
              'headline',
              'classification',
              'recommendedNextAction',
              'talkingPointsOrDraft',
              'suggestedResponseText',
            ],
          },
        },
      });
      res.json({ assistantOutput: JSON.parse((response.text ?? '{}').trim()) });
    } catch (error: any) {
      res.status(200).json({ assistantOutput: null, fallbackReason: error?.message });
    }
  });

  // 5. Gmail Individual Draft Creation with Idempotency (Section 14.3)
  app.post('/api/gmail/create-draft', async (req, res) => {
    const { idempotencyKey, to, subject, body } = req.body || {};
    if (!idempotencyKey || !to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required draft parameters (idempotencyKey, to, subject, body).' });
    }

    // Idempotency check: prevent duplicate drafts on retries
    if (idempotentDraftRegistry.has(idempotencyKey)) {
      const cached = idempotentDraftRegistry.get(idempotencyKey)!;
      return res.json({
        ...cached,
        idempotentReplay: true,
      });
    }

    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (accessToken) {
      try {
        const mimeMessage = [
          `To: ${to}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          'MIME-Version: 1.0',
          '',
          body,
        ].join('\r\n');

        const encodedMessage = Buffer.from(mimeMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
          idempotentDraftRegistry.set(idempotencyKey, record);
          return res.json({ ...record, idempotentReplay: false });
        }
      } catch (err) {
        console.error('Gmail API draft creation error:', err);
      }
    }

    // Deterministic idempotent draft reference when OAuth popup token is not active in headless preview
    const fallbackRecord = {
      gmailDraftId: `r-${Buffer.from(idempotencyKey).toString('hex').slice(0, 12)}`,
      createdAt: new Date().toISOString(),
      mode: 'local_staging' as const,
    };
    idempotentDraftRegistry.set(idempotencyKey, fallbackRecord);
    return res.json({ ...fallbackRecord, idempotentReplay: false });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AdVibe Prospect Intelligence server running on http://localhost:${PORT}`);
  });
}

startServer();
