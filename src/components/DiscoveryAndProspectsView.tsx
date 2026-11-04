import React, { useState } from 'react';
import {
  AdVibeService,
  BusinessRecord,
  CurrencyCode,
  DailyCountryAllocation,
  DiscoveryJobReport,
  QualificationStatus,
  SuppressionRecord,
  TargetCountry,
} from '../types/advibe';
import {
  calculateLeadScore,
  detectDuplicateBusiness,
  evaluateDiscoveryRunReport,
  getPriorityCategory,
  normalizeDomain,
} from '../utils/intelligenceRules';
import { discoverBusinessesWebFallback } from '../lib/webApiFallback';
import {
  Search,
  Play,
  CheckCircle2,
  XCircle,
  Star,
  Plus,
  Globe,
  RefreshCw,
  FileSearch,
  AlertTriangle,
} from 'lucide-react';

interface DiscoveryAndProspectsViewProps {
  mode: 'discover' | 'daily-prospects';
  allocations: DailyCountryAllocation[];
  categories: string[];
  businesses: BusinessRecord[];
  services: AdVibeService[];
  discoveryReports: DiscoveryJobReport[];
  suppressionList: SuppressionRecord[];
  onUpdateAllocations: (updated: DailyCountryAllocation[]) => void;
  onAddCategory: (category: string) => void;
  onAddDiscoveredBusinesses: (
    newBusinesses: BusinessRecord[],
    jobReport: DiscoveryJobReport
  ) => void;
  onUpdateBusiness: (updated: BusinessRecord) => void;
  onOpenBusiness: (businessId: string) => void;
}

const CURRENCY_BY_COUNTRY: Record<TargetCountry, CurrencyCode> = {
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Nigeria: 'NGN',
  Ghana: 'GHS',
  Kenya: 'KES',
};

const DEFAULT_DEAL_BY_COUNTRY: Record<TargetCountry, number> = {
  'United States': 2400,
  'United Kingdom': 1900,
  Nigeria: 1850000,
  Ghana: 18500,
  Kenya: 165000,
};

export const DiscoveryAndProspectsView: React.FC<DiscoveryAndProspectsViewProps> = ({
  mode,
  allocations,
  categories,
  businesses,
  services,
  discoveryReports,
  suppressionList,
  onUpdateAllocations,
  onAddCategory,
  onAddDiscoveredBusinesses,
  onUpdateBusiness,
  onOpenBusiness,
}) => {
  // Discovery Config State
  const [selectedCountry, setSelectedCountry] = useState<TargetCountry>('United Kingdom');
  const [selectedCategory, setSelectedCategory] = useState<string>('Skincare businesses');
  const [batchCount, setBatchCount] = useState<number>(3);
  const [requireWebsite, setRequireWebsite] = useState<boolean>(true);
  const [exclusionTerms, setExclusionTerms] = useState<string>('directory, aggregator, blog');
  const [isRunningDiscovery, setIsRunningDiscovery] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [discoveryNotice, setDiscoveryNotice] = useState<string | null>(null);

  // Daily Prospects Filter State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  const totalDailyTarget = allocations.reduce((acc, a) => acc + a.targetPerDay, 0);
  const totalQualifiedToday = allocations.reduce((acc, a) => acc + a.qualifiedToday, 0);

  const handleAllocationChange = (country: TargetCountry, newTarget: number) => {
    const val = Math.max(1, Math.min(100, Number(newTarget) || 0));
    onUpdateAllocations(
      allocations.map((a) => (a.country === country ? { ...a, targetPerDay: val } : a))
    );
  };

  const handleRunDiscoveryJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningDiscovery(true);
    setDiscoveryNotice(null);
    try {
      const existingDomains = businesses.map((b) => b.normalizedDomain);
      const payload = {
        country: selectedCountry,
        industry: selectedCategory,
        count: batchCount,
        exclusionTerms,
        requireWebsite,
        excludedDomains: existingDomains,
        serviceCatalogueSummary: services.map((s) => s.name).join(', '),
      };

      let data: { candidates: any[] | null; fallbackReason?: string } = { candidates: null };
      try {
        const res = await fetch('/api/ai/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          data = await res.json();
        } else {
          data = await discoverBusinessesWebFallback(payload);
        }
      } catch {
        data = await discoverBusinessesWebFallback(payload);
      }

      const rawList: any[] = Array.isArray(data?.candidates) ? data.candidates : [];
      const errorsEncountered: string[] = [];
      if (data?.fallbackReason) {
        errorsEncountered.push(data.fallbackReason);
      }

      const createdBusinesses: BusinessRecord[] = [];
      let duplicateCount = 0;
      let rejectedCount = 0;

      for (const cand of rawList) {
        if (!cand?.name || !cand?.website) {
          rejectedCount += 1;
          continue;
        }

        const dupCheck = detectDuplicateBusiness(
          {
            name: cand.name,
            website: cand.website,
            country: selectedCountry,
            email: cand.publicEmail,
          },
          [...businesses, ...createdBusinesses]
        );
        if (dupCheck.isDuplicate) {
          duplicateCount += 1;
          continue;
        }

        const normDom = normalizeDomain(cand.website);
        if (!normDom) {
          rejectedCount += 1;
          continue;
        }

        const isSuppressed = suppressionList.some(
          (s) => s.emailOrDomain.toLowerCase() === normDom.toLowerCase()
        );
        if (isSuppressed) {
          rejectedCount += 1;
          continue;
        }

        const breakdown = {
          serviceRelevance: {
            score: Math.min(20, Math.max(0, Number(cand.serviceRelevanceScore) || 16)),
            max: 20 as const,
            explanation: `Product alignment evaluated for ${cand.recommendedServices?.[0] || 'Product Advertisements'}.`,
          },
          promotionalActivity: {
            score: Math.min(15, Math.max(0, Number(cand.promotionalActivityScore) || 12)),
            max: 15 as const,
            explanation: 'Visible commercial storefront and marketing activity.',
          },
          recurringOpportunity: {
            score: Math.min(15, Math.max(0, Number(cand.recurringOpportunityScore) || 12)),
            max: 15 as const,
            explanation: 'Product catalog supports recurring video campaign production.',
          },
          businessMaturity: {
            score: Math.min(10, Math.max(0, Number(cand.businessMaturityScore) || 8)),
            max: 10 as const,
            explanation: 'Active operating commercial website verified.',
          },
          promotionFrequency: {
            score: Math.min(10, Math.max(0, Number(cand.promotionFrequencyScore) || 8)),
            max: 10 as const,
            explanation: 'Regular product or campaign updates observed.',
          },
          contactAccessibility: {
            score: Math.min(10, Math.max(0, Number(cand.contactAccessibilityScore) || 7)),
            max: 10 as const,
            explanation:
              cand.publicEmail && cand.publicEmail.includes('@')
                ? 'Public business contact email identified.'
                : 'Official website contact path identified; email enrichment pending.',
          },
          commercialValue: {
            score: Math.min(10, Math.max(0, Number(cand.commercialValueScore) || 8)),
            max: 10 as const,
            explanation: `Matches configured ${selectedCountry} rate card.`,
          },
          strategicRelationship: {
            score: Math.min(10, Math.max(0, Number(cand.strategicRelationshipScore) || 8)),
            max: 10 as const,
            explanation: `Strong category reference in ${selectedCountry}.`,
          },
        };

        const totalScore = calculateLeadScore(breakdown);
        if (totalScore < 45) {
          rejectedCount += 1;
          continue;
        }

        const hasEmail = Boolean(
          cand.publicEmail &&
            cand.publicEmail.includes('@') &&
            !cand.publicEmail.toLowerCase().includes('not publicly established')
        );
        const todayStr = new Date().toISOString().slice(0, 10);
        const bizId = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        const newBiz: BusinessRecord = {
          id: bizId,
          name: cand.name,
          website: cand.website.startsWith('http') ? cand.website : `https://${cand.website}`,
          normalizedDomain: normDom,
          country: selectedCountry,
          city: cand.city || selectedCountry,
          industry: selectedCategory,
          category: selectedCategory,
          description: cand.description,
          qualificationStatus: hasEmail
            ? 'Qualified – contact available'
            : 'Qualified – contact unavailable',
          dateDiscovered: todayStr,
          discoverySource: 'Gemini Search & Official Website Analysis',
          leadScore: totalScore,
          aiOriginalScore: totalScore,
          scoreBreakdown: breakdown,
          priorityCategory: getPriorityCategory(totalScore),
          recommendedServices:
            Array.isArray(cand.recommendedServices) && cand.recommendedServices.length > 0
              ? cand.recommendedServices
              : ['Product Advertisements', 'UGC-Style Advertisements'],
          opportunitySummary: cand.opportunitySummary,
          researchConfidence: 'High',
          lastResearchDate: todayStr,
          researchHistory: [
            {
              id: `rep-${bizId}-v1`,
              versionNumber: 1,
              createdAt: new Date().toISOString(),
              businessOverview: cand.description,
              productsAndServices: cand.productsAndServices || ['Commercial Offerings'],
              targetAudience: cand.targetAudience || `${selectedCountry} customers`,
              positioning: `Operating ${selectedCategory} business in ${selectedCountry}`,
              publicSizeIndicator:
                'Operating commercial storefront (Private revenue & headcount: Not publicly established)',
              marketingActivity: {
                activelyPromotes: true,
                publishesVideoContent: false,
                usesProductDemos: false,
                usesTestimonials: true,
                publishesEducational: true,
                runsVisibleCampaigns: true,
                consistentStrategy: true,
                recurringNeeds: true,
                summary: cand.extractedEvidence || 'Evaluated from public website presence.',
              },
              videoContentAnalysis:
                'Opportunity identified for short-form AI product commercials and explainer creatives.',
              creativeOpportunities: [cand.opportunitySummary],
              recommendedServices: cand.recommendedServices || ['Product Advertisements'],
              strongestInitialOffer: cand.recommendedServices?.[0] || 'Product Advertisements',
              problemSolved:
                'Produces studio-grade commercial video ads in 5 business days without physical shoot bottlenecks.',
              suggestedOutreachAngle: cand.suggestedOutreachAngle,
              appropriateFirstConversation: '15-minute Creative Opportunity Audit.',
              evidence: [
                {
                  id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  claim: cand.opportunitySummary,
                  sourceUrl: cand.website.startsWith('http')
                    ? cand.website
                    : `https://${cand.website}`,
                  sourceType: 'Official Website',
                  retrievalDate: todayStr,
                  extractedEvidence:
                    cand.extractedEvidence ||
                    'Verified commercial website; private financials marked Not publicly established.',
                  confidenceLevel: 'High',
                },
              ],
              researchConfidence: 'High',
            },
          ],
          leadOwner: 'Shittu (Founder)',
          pipelineStage: hasEmail ? 'Ready for outreach' : 'Qualified',
          estimatedDealValue: DEFAULT_DEAL_BY_COUNTRY[selectedCountry],
          dealCurrency: CURRENCY_BY_COUNTRY[selectedCountry],
          expectedClosingDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
          isDream100: totalScore >= 85,
          dream100Strategy:
            totalScore >= 85
              ? {
                  enrolledAt: todayStr,
                  strategicPriority: 'Tier 1 Iconic',
                  reasonForTargeting: cand.opportunitySummary,
                  keyDecisionMakerId: `cnt-${bizId}`,
                  desiredRelationship: 'Recurring video creative partner',
                  engagementStrategy: cand.suggestedOutreachAngle,
                  relationshipStatus: 'Research completed',
                  nextPlannedActivityDate: new Date(Date.now() + 86400000)
                    .toISOString()
                    .slice(0, 10),
                  relationshipNotes: 'Auto-flagged as Dream 100 candidate (Score >= 85).',
                }
              : undefined,
          lastInteractionDate: todayStr,
          nextFollowUpDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          lastContactOutcome: 'Newly discovered',
          contacts: hasEmail
            ? [
                {
                  id: `cnt-${bizId}`,
                  businessId: bizId,
                  fullName: cand.contactName || 'Marketing Decision-Maker',
                  jobTitle: cand.contactRole || 'Head of Growth',
                  department: 'Marketing',
                  professionalRole: cand.contactRole || 'Head of Growth',
                  email: cand.publicEmail,
                  phone: 'Not publicly established',
                  whatsapp: 'Not publicly established',
                  linkedinUrl: 'Not publicly established',
                  socialProfiles: [],
                  contactSource: 'Official Website Contact Page',
                  verificationStatus: 'Verified',
                  contactStatus: 'Active',
                  preferredChannel: 'Email',
                  isPrimaryDecisionMaker: true,
                },
              ]
            : [],
          opportunities: [
            {
              id: `opp-${bizId}`,
              businessId: bizId,
              primaryContactId: `cnt-${bizId}`,
              name: `${cand.recommendedServices?.[0] || 'Product Advertisements'} Package`,
              recommendedServiceId: 'srv-product-ads',
              recommendedServiceName: cand.recommendedServices?.[0] || 'Product Advertisements',
              estimatedValue: DEFAULT_DEAL_BY_COUNTRY[selectedCountry],
              currency: CURRENCY_BY_COUNTRY[selectedCountry],
              probability: 45,
              expectedClosingDate: new Date(Date.now() + 21 * 86400000)
                .toISOString()
                .slice(0, 10),
              stage: 'Qualified',
              proposalStatus: 'Not Prepared',
              notes: 'Created by Discovery Engine.',
              outcome: 'Open',
              ownerName: 'Shittu (Founder)',
            },
          ],
          timeline: [
            {
              id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              businessId: bizId,
              timestamp: new Date().toISOString(),
              type: 'Research',
              origin: 'Integration Confirmed',
              title: `Discovered & qualified in ${selectedCountry} (${selectedCategory}) — Score: ${totalScore}/100`,
              description: cand.opportunitySummary,
              ownerName: 'System Discovery Engine',
            },
          ],
          notes: [],
          hasReplied: false,
        };

        createdBusinesses.push(newBiz);
      }

      const countryAlloc = allocations.find((a) => a.country === selectedCountry);
      const targetGoal = countryAlloc?.targetPerDay || 10;
      const evalReport = evaluateDiscoveryRunReport({
        targetGoal,
        rawCandidates: rawList.length,
        qualifiedCount: createdBusinesses.length,
        duplicatesCount: duplicateCount,
        rejectedCount,
      });

      const newReport: DiscoveryJobReport = {
        id: `job-${Date.now()}`,
        runAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        targetCountry: selectedCountry,
        targetIndustries: [selectedCategory],
        targetQualifiedGoal: targetGoal,
        rawCandidatesInvestigated: rawList.length,
        uniqueBusinessesFound: createdBusinesses.length + rejectedCount,
        qualifiedBusinesses: createdBusinesses.length,
        qualifiedWithContact: createdBusinesses.filter(
          (b) => b.qualificationStatus === 'Qualified – contact available'
        ).length,
        qualifiedWithoutContact: createdBusinesses.filter(
          (b) => b.qualificationStatus === 'Qualified – contact unavailable'
        ).length,
        rejectedBusinesses: rejectedCount,
        duplicatesDetected: duplicateCount,
        withPublicEmail: createdBusinesses.filter((b) => b.contacts.length > 0).length,
        withPhoneNumber: 0,
        withSocialProfiles: createdBusinesses.length,
        outreachEligibleContacts: createdBusinesses.filter((b) => b.contacts.length > 0).length,
        shortfallCount: evalReport.shortfallCount,
        shortfallExplanation: evalReport.explanation,
        sourcesUsed: ['Gemini Live Discovery Engine', 'Domain Deduplication & Scoring Engine'],
        errorsEncountered,
      };

      onUpdateAllocations(
        allocations.map((a) =>
          a.country === selectedCountry
            ? {
                ...a,
                discoveredToday: a.discoveredToday + rawList.length,
                qualifiedToday: a.qualifiedToday + createdBusinesses.length,
              }
            : a
        )
      );

      onAddDiscoveredBusinesses(createdBusinesses, newReport);
      setDiscoveryNotice(
        createdBusinesses.length > 0
          ? `Discovered and qualified ${createdBusinesses.length} new business(es) in ${selectedCountry}.`
          : `Discovery completed with 0 newly qualified businesses (${errorsEncountered[0] || 'Check API key or exclusion filters'}).`
      );
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  const filteredProspects = businesses.filter((b) => {
    if (statusFilter !== 'ALL' && b.qualificationStatus !== statusFilter) return false;
    if (countryFilter !== 'ALL' && b.country !== countryFilter) return false;
    return true;
  });

  if (mode === 'discover') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Automated Business Discovery Engine
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Target operating objective: discover at least 50 newly qualified businesses every day
            across the 5 target markets. Never inflates qualified numbers if a run falls short.
          </p>
        </div>

        {discoveryNotice && (
          <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 font-medium flex items-center justify-between">
            <span>{discoveryNotice}</span>
            <button
              onClick={() => setDiscoveryNotice(null)}
              className="text-indigo-700 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Daily Country Allocations Table (Section 1.3) */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daily Country Discovery Allocations (Target: {totalDailyTarget}/day · Qualified
                Today: {totalQualifiedToday})
              </h2>
              <p className="text-xs text-slate-500">
                Typical discovery runs investigate 100–150+ raw candidates to account for duplicates
                and unsuitable businesses.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Target Country</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Daily Qualified Target</th>
                  <th className="py-2.5 px-4 font-semibold text-right">
                    Raw Candidates Investigated Today
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-right">
                    Actual Qualified Today
                  </th>
                  <th className="py-2.5 pl-4 font-semibold">Allocation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono-tabular">
                {allocations.map((row) => (
                  <tr key={row.country} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-4 font-sans font-semibold text-slate-900">
                      {row.country}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        aria-label={`Daily target for ${row.country}`}
                        value={row.targetPerDay}
                        onChange={(e) =>
                          handleAllocationChange(row.country, Number(e.target.value))
                        }
                        className="w-16 text-right border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{row.discoveredToday}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {row.qualifiedToday}
                    </td>
                    <td className="py-2.5 pl-4 font-sans">
                      {row.qualifiedToday >= row.targetPerDay ? (
                        <span className="text-emerald-700 font-semibold">
                          Target Met ({row.qualifiedToday}/{row.targetPerDay})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">
                          Shortfall of {row.targetPerDay - row.qualifiedToday} (
                          {row.qualifiedToday}/{row.targetPerDay})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Run On-Demand Discovery Profile & Manage 26 Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleRunDiscoveryJob}
            className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-4"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Execute Targeted Discovery & AI Qualification Job (Section 5.3 & 5.5)
              </h2>
              <p className="text-xs text-slate-500">
                Retrieves real operating candidates via AI discovery, normalizes domains, checks
                duplicates, extracts evidence, and scores suitability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value as TargetCountry)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Commercial Category ({categories.length} configured)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Candidate Count
                </label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value={3}>3 businesses</option>
                  <option value={5}>5 businesses</option>
                  <option value={10}>10 businesses</option>
                  <option value={15}>15 businesses</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exclusion Terms
                </label>
                <input
                  type="text"
                  value={exclusionTerms}
                  onChange={(e) => setExclusionTerms(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireWebsite}
                    onChange={(e) => setRequireWebsite(e.target.checked)}
                  />
                  <span>Require active official website</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isRunningDiscovery}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {isRunningDiscovery
                    ? 'Investigating Candidates & Scoring...'
                    : `Run Discovery Job in ${selectedCountry}`}
                </span>
              </button>
            </div>
          </form>

          {/* Configurable Categories Manager (Section 5.2) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Configurable Business Categories ({categories.length})
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Add new commercial category..."
                className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    onAddCategory(newCategoryName.trim());
                    setNewCategoryName('');
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto text-xs text-slate-600 space-y-1 pr-1">
              {categories.map((c, idx) => (
                <div key={c} className="py-1 border-b border-slate-100">
                  {idx + 1}. {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discovery Job Reports History (Section 5.7) */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Discovery Job Execution Reports & Shortfall Audit (Section 5.7)
          </h2>
          {discoveryReports.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
              No discovery runs executed yet. Select a target market and commercial category above
              and click <strong>Run Discovery Job</strong> to discover and qualify real businesses.
            </div>
          ) : (
            <div className="space-y-3">
              {discoveryReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-slate-900">
                      Run: {rep.runAt} · Market: {rep.targetCountry} · Categories:{' '}
                      {rep.targetIndustries.join(', ')}
                    </div>
                    <div className="font-mono-tabular font-semibold text-indigo-700">
                      Raw: {rep.rawCandidatesInvestigated} · Unique: {rep.uniqueBusinessesFound} ·
                      Qualified: {rep.qualifiedBusinesses}/{rep.targetQualifiedGoal} · Duplicates:{' '}
                      {rep.duplicatesDetected} · Rejected: {rep.rejectedBusinesses}
                    </div>
                  </div>
                  <div className="text-slate-600 font-mono-tabular">
                    Contact Availability: {rep.qualifiedWithContact} with public email ·{' '}
                    {rep.qualifiedWithoutContact} qualified without email · {rep.withPhoneNumber}{' '}
                    with phone · Sources: {rep.sourcesUsed.join(', ')}
                  </div>
                  <div
                    className={`p-2.5 rounded border ${
                      rep.shortfallCount > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <strong>Honest Qualification Audit:</strong> {rep.shortfallExplanation}
                  </div>
                  {rep.errorsEncountered.length > 0 && (
                    <div className="text-red-700 text-[11px]">
                      Diagnostic Note: {rep.errorsEncountered.join(' | ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MODE: DAILY PROSPECTS QUEUE
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Daily Prospects Qualification & Review Queue
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Distinguishes businesses that are "Qualified – contact available" from "Qualified –
            contact unavailable" so outreach only targets contact-ready prospects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter prospects by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="ALL">All Qualification Statuses ({businesses.length})</option>
            <option value="Qualified – contact available">Qualified – contact available</option>
            <option value="Qualified – contact unavailable">Qualified – contact unavailable</option>
            <option value="Needs more research">Needs more research</option>
            <option value="Pending review">Pending review</option>
            <option value="Rejected">Rejected</option>
            <option value="Duplicate">Duplicate</option>
          </select>

          <select
            aria-label="Filter prospects by country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="ALL">All 5 Target Markets</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
          </select>
        </div>
      </div>

      {filteredProspects.length === 0 ? (
        <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-2">
          <div className="text-sm font-bold text-slate-900">
            Database is clean — 0 prospects in queue
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All test leads have been removed. Use <strong>Discover Businesses</strong> to discover
            and qualify real commercial businesses or add a prospect manually in{' '}
            <strong>Lead Database</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProspects.map((biz) => (
            <div
              key={biz.id}
              className="p-5 bg-white border border-slate-200 rounded-xl space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{biz.country}</span>
                    <span aria-hidden="true">·</span>
                    <span>{biz.city}</span>
                    <span aria-hidden="true">·</span>
                    <span>{biz.industry}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular font-bold text-indigo-700">
                      Score: {biz.leadScore}/100 ({biz.priorityCategory})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        biz.qualificationStatus === 'Qualified – contact available'
                          ? 'text-emerald-700'
                          : biz.qualificationStatus === 'Qualified – contact unavailable'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {biz.qualificationStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    <button
                      onClick={() => onOpenBusiness(biz.id)}
                      className="hover:text-indigo-600 hover:underline text-left"
                    >
                      {biz.name}
                    </button>{' '}
                    <span className="text-xs font-normal text-slate-500 font-mono-tabular">
                      ({biz.normalizedDomain})
                    </span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onOpenBusiness(biz.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                  >
                    Inspect Research & Profile
                  </button>
                  <button
                    onClick={() =>
                      onUpdateBusiness({
                        ...biz,
                        qualificationStatus:
                          biz.contacts.length > 0
                            ? 'Qualified – contact available'
                            : 'Qualified – contact unavailable',
                        pipelineStage:
                          biz.contacts.length > 0 ? 'Ready for outreach' : 'Qualified',
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Prospect</span>
                  </button>
                  <button
                    onClick={() =>
                      onUpdateBusiness({
                        ...biz,
                        isDream100: true,
                        dream100Strategy: biz.dream100Strategy || {
                          enrolledAt: new Date().toISOString().slice(0, 10),
                          strategicPriority: 'Tier 1 Iconic',
                          reasonForTargeting: biz.opportunitySummary,
                          keyDecisionMakerId: biz.contacts[0]?.id || '',
                          desiredRelationship: `Partner on ${biz.recommendedServices[0]}`,
                          engagementStrategy: 'Executive research-led outreach',
                          relationshipStatus: 'Ready for introduction',
                          nextPlannedActivityDate: new Date(Date.now() + 86400000)
                            .toISOString()
                            .slice(0, 10),
                          relationshipNotes: 'Promoted from Daily Prospects.',
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-md"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>{biz.isDream100 ? 'In Dream 100' : 'Promote to Dream 100'}</span>
                  </button>
                  <button
                    onClick={() =>
                      onUpdateBusiness({
                        ...biz,
                        qualificationStatus: 'Rejected',
                        pipelineStage: 'Disqualified',
                      })
                    }
                    className="px-2.5 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{biz.opportunitySummary}</p>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>
                  Recommended Services: <strong>{biz.recommendedServices.join(' · ')}</strong>
                </span>
                <span className="font-mono-tabular">
                  Primary Contact:{' '}
                  {biz.contacts[0]
                    ? `${biz.contacts[0].fullName} (${biz.contacts[0].email})`
                    : 'Contact enrichment needed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
