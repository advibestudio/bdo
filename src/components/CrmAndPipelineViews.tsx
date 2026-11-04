import React, { useState } from 'react';
import {
  AdVibeService,
  BusinessRecord,
  CurrencyCode,
  Dream100Status,
  PipelineStage,
  TargetCountry,
} from '../types/advibe';
import { INITIAL_PIPELINE_STAGES } from '../data/seedData';
import {
  calculateLeadScore,
  getPriorityCategory,
  normalizeDomain,
} from '../utils/intelligenceRules';
import {
  Star,
  Plus,
  Search,
  GitMerge,
  ExternalLink,
  Mail,
  Calendar,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

const DREAM_100_STATUSES: Dream100Status[] = [
  'Not researched',
  'Research completed',
  'Ready for introduction',
  'First contact made',
  'Conversation started',
  'Relationship developing',
  'Meeting scheduled',
  'Partnership opportunity',
  'Active client',
  'Nurture',
  'Not interested',
  'Closed',
];

interface CrmAndPipelineViewsProps {
  mode: 'dream-100' | 'lead-database' | 'pipeline';
  businesses: BusinessRecord[];
  services: AdVibeService[];
  globalSearch: string;
  onUpdateBusiness: (updated: BusinessRecord) => void;
  onAddBusiness: (newBiz: BusinessRecord) => void;
  onMergeDuplicates: (primaryId: string, duplicateId: string) => void;
  onOpenBusiness: (businessId: string) => void;
  onNavigateToCampaign: (businessId: string, contactId?: string) => void;
}

export const CrmAndPipelineViews: React.FC<CrmAndPipelineViewsProps> = ({
  mode,
  businesses,
  services,
  globalSearch,
  onUpdateBusiness,
  onAddBusiness,
  onMergeDuplicates,
  onOpenBusiness,
  onNavigateToCampaign,
}) => {
  // Saved Views State (Section 23.4)
  const [savedView, setSavedView] = useState<
    | 'all'
    | 'nigeria'
    | 'dream100'
    | 'no_email'
    | 'score_80'
    | 'awaiting_replies'
    | 'awaiting_proposals'
  >('all');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  // Add Business Modal State
  const [showAddBizModal, setShowAddBizModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newCountry, setNewCountry] = useState<TargetCountry>('United Kingdom');
  const [newCity, setNewCity] = useState('London');
  const [newIndustry, setNewIndustry] = useState('Skincare businesses');
  const [newDesc, setNewDesc] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Head of Growth');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newIsDream100, setNewIsDream100] = useState(mode === 'dream-100');
  const [newDreamReason, setNewDreamReason] = useState(
    'Flagship category leader with recurring video production demand.'
  );

  // Duplicate Review State (Section 9.4)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState(businesses[0]?.id || '');
  const [mergeSecondaryId, setMergeSecondaryId] = useState(businesses[1]?.id || '');

  // Pipeline View Toggle
  const [pipelineViewMode, setPipelineViewMode] = useState<'kanban' | 'all_stages'>('kanban');

  const handleCreateManualBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWebsite.trim()) return;

    const currencyMap: Record<TargetCountry, CurrencyCode> = {
      'United States': 'USD',
      'United Kingdom': 'GBP',
      Nigeria: 'NGN',
      Ghana: 'GHS',
      Kenya: 'KES',
    };
    const defaultValMap: Record<TargetCountry, number> = {
      'United States': 2400,
      'United Kingdom': 1900,
      Nigeria: 1850000,
      Ghana: 18500,
      Kenya: 165000,
    };

    const breakdown = {
      serviceRelevance: { score: 18, max: 20 as const, explanation: 'Direct creative package fit.' },
      promotionalActivity: { score: 13, max: 15 as const, explanation: 'Active commercial presence.' },
      recurringOpportunity: { score: 13, max: 15 as const, explanation: 'Ongoing campaign needs.' },
      businessMaturity: { score: 8, max: 10 as const, explanation: 'Operating business.' },
      promotionFrequency: { score: 8, max: 10 as const, explanation: 'Regular marketing activity.' },
      contactAccessibility: {
        score: newContactEmail.includes('@') ? 9 : 4,
        max: 10 as const,
        explanation: newContactEmail.includes('@')
          ? 'Verified public business email.'
          : 'Awaiting contact enrichment.',
      },
      commercialValue: { score: 9, max: 10 as const, explanation: 'High package value alignment.' },
      strategicRelationship: {
        score: newIsDream100 ? 9 : 7,
        max: 10 as const,
        explanation: 'Strategic partnership potential.',
      },
    };
    const score = calculateLeadScore(breakdown);
    const bizId = `biz-${Date.now()}`;
    const hasEmail = newContactEmail.includes('@');

    const created: BusinessRecord = {
      id: bizId,
      name: newName.trim(),
      website: newWebsite.startsWith('http') ? newWebsite.trim() : `https://${newWebsite.trim()}`,
      normalizedDomain: normalizeDomain(newWebsite),
      country: newCountry,
      city: newCity.trim() || newCountry,
      industry: newIndustry,
      category: newIndustry,
      description: newDesc.trim() || `${newIndustry} operating in ${newCountry}.`,
      qualificationStatus: hasEmail
        ? 'Qualified – contact available'
        : 'Qualified – contact unavailable',
      dateDiscovered: '2026-11-04',
      discoverySource: 'Manual Executive Entry',
      leadScore: score,
      aiOriginalScore: score,
      scoreBreakdown: breakdown,
      priorityCategory: getPriorityCategory(score),
      recommendedServices: [services[0]?.name || 'Product Advertisements'],
      opportunitySummary:
        newDesc.trim() ||
        `Identified ${newName.trim()} for bespoke AI commercial video production in ${newCountry}.`,
      researchConfidence: 'High',
      lastResearchDate: '2026-11-04',
      researchHistory: [],
      leadOwner: 'Shittu (Founder)',
      pipelineStage: hasEmail ? 'Ready for outreach' : 'Qualified',
      estimatedDealValue: defaultValMap[newCountry],
      dealCurrency: currencyMap[newCountry],
      expectedClosingDate: '2026-12-05',
      isDream100: newIsDream100,
      dream100Strategy: newIsDream100
        ? {
            enrolledAt: '2026-11-04',
            strategicPriority: 'Tier 1 Iconic',
            reasonForTargeting: newDreamReason,
            keyDecisionMakerId: `cnt-${bizId}`,
            desiredRelationship: 'Long-term creative production partner',
            engagementStrategy: 'Research-backed personalised executive outreach',
            relationshipStatus: 'Ready for introduction',
            nextPlannedActivityDate: '2026-11-06',
            relationshipNotes: newDreamReason,
          }
        : undefined,
      lastInteractionDate: '2026-11-04',
      nextFollowUpDate: '2026-11-06',
      lastContactOutcome: 'Newly added',
      contacts: hasEmail
        ? [
            {
              id: `cnt-${bizId}`,
              businessId: bizId,
              fullName: newContactName.trim() || 'Primary Decision-Maker',
              jobTitle: newContactRole.trim() || 'Head of Growth',
              department: 'Marketing',
              professionalRole: newContactRole.trim(),
              email: newContactEmail.trim(),
              phone: 'Not publicly established',
              whatsapp: 'Not publicly established',
              linkedinUrl: 'Not publicly established',
              socialProfiles: [],
              contactSource: 'Manual Executive Entry',
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
          name: `${newName.trim()} Initial Creative Package`,
          recommendedServiceId: services[0]?.id || 'srv-product-ads',
          recommendedServiceName: services[0]?.name || 'Product Advertisements',
          estimatedValue: defaultValMap[newCountry],
          currency: currencyMap[newCountry],
          probability: 50,
          expectedClosingDate: '2026-12-05',
          stage: hasEmail ? 'Ready for outreach' : 'Qualified',
          proposalStatus: 'Not Prepared',
          notes: 'Created on manual prospect entry.',
          outcome: 'Open',
          ownerName: 'Shittu (Founder)',
        },
      ],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          businessId: bizId,
          timestamp: new Date().toISOString(),
          type: 'Research',
          origin: 'Manual Record',
          title: `Business added to CRM${newIsDream100 ? ' & Dream 100' : ''}`,
          description: `Scored ${score}/100 in ${newCountry}.`,
          ownerName: 'Shittu (Founder)',
        },
      ],
      notes: [],
      hasReplied: false,
    };

    onAddBusiness(created);
    setNewName('');
    setNewWebsite('');
    setNewDesc('');
    setNewContactName('');
    setNewContactEmail('');
    setShowAddBizModal(false);
  };

  // Apply Global Search + Saved View Filters
  const searchLower = globalSearch.trim().toLowerCase();
  const matchesGlobalSearch = (b: BusinessRecord) => {
    if (!searchLower) return true;
    const contactBlob = b.contacts.map((c) => `${c.fullName} ${c.email} ${c.phone}`).join(' ');
    return `${b.name} ${b.normalizedDomain} ${b.country} ${b.industry} ${b.pipelineStage} ${contactBlob}`
      .toLowerCase()
      .includes(searchLower);
  };

  // ============================================================================
  // MODE 1: DREAM 100 (Module 5 - Section 8)
  // ============================================================================
  if (mode === 'dream-100') {
    const dreamBusinesses = businesses.filter((b) => b.isDream100 && matchesGlobalSearch(b));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Dream 100 Relationship-Building Platform ({dreamBusinesses.length}/100 Active)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              High-value brands, agencies, and strategic partners. A Dream 100 business never
              disappears simply because it has not replied to an initial email.
            </p>
          </div>

          <button
            onClick={() => {
              setNewIsDream100(true);
              setShowAddBizModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dream 100 Target</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {dreamBusinesses.map((biz) => {
            const strat = biz.dream100Strategy;
            return (
              <div
                key={biz.id}
                className="p-5 bg-white border border-slate-200 rounded-xl space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-amber-800">
                        {strat?.strategicPriority || 'Tier 1 Iconic'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">{biz.country}</span>
                      <span aria-hidden="true">·</span>
                      <span>{biz.industry}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular font-bold text-indigo-700">
                        Score: {biz.leadScore}/100
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Est. Deal: {biz.dealCurrency} {biz.estimatedDealValue.toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      <button
                        onClick={() => onOpenBusiness(biz.id)}
                        className="hover:text-indigo-600 hover:underline text-left"
                      >
                        {biz.name}
                      </button>
                    </h3>

                    <p className="text-xs text-slate-600">
                      <strong>Reason for Targeting:</strong>{' '}
                      {strat?.reasonForTargeting || biz.opportunitySummary}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Desired Relationship:</strong>{' '}
                      {strat?.desiredRelationship || biz.recommendedServices.join(', ')} ·{' '}
                      <strong>Key Decision-Maker:</strong>{' '}
                      {biz.contacts[0]
                        ? `${biz.contacts[0].fullName} (${biz.contacts[0].jobTitle})`
                        : 'Pending identification'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <label
                        htmlFor={`dream-status-${biz.id}`}
                        className="block text-[11px] font-medium text-slate-500 mb-0.5"
                      >
                        Relationship Status (Section 8.3)
                      </label>
                      <select
                        id={`dream-status-${biz.id}`}
                        value={strat?.relationshipStatus || 'Research completed'}
                        onChange={(e) =>
                          onUpdateBusiness({
                            ...biz,
                            dream100Strategy: {
                              ...(strat || {
                                enrolledAt: '2026-11-04',
                                strategicPriority: 'Tier 1 Iconic',
                                reasonForTargeting: biz.opportunitySummary,
                                keyDecisionMakerId: biz.contacts[0]?.id || '',
                                desiredRelationship: 'Strategic Partner',
                                engagementStrategy: 'Multi-touch outreach',
                                nextPlannedActivityDate: '2026-11-06',
                                relationshipNotes: '',
                              }),
                              relationshipStatus: e.target.value as Dream100Status,
                            },
                          })
                        }
                        className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900"
                      >
                        {DREAM_100_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => onOpenBusiness(biz.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 mt-4"
                    >
                      Open Profile
                    </button>
                    <button
                      onClick={() => onNavigateToCampaign(biz.id, biz.contacts[0]?.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg mt-4"
                    >
                      Prepare Outreach
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    <strong>Engagement Strategy:</strong>{' '}
                    {strat?.engagementStrategy || 'Personalised creative audit & follow-up'}
                  </span>
                  <span className="font-mono-tabular">
                    Next Planned Activity: {strat?.nextPlannedActivityDate || biz.nextFollowUpDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {showAddBizModal && renderAddBusinessModal()}
      </div>
    );
  }

  // ============================================================================
  // MODE 2: LEAD DATABASE AND CRM (Module 6 - Section 9 & 23.4)
  // ============================================================================
  if (mode === 'lead-database') {
    const filteredList = businesses.filter((b) => {
      if (!matchesGlobalSearch(b)) return false;
      if (countryFilter !== 'ALL' && b.country !== countryFilter) return false;
      if (savedView === 'nigeria') return b.country === 'Nigeria';
      if (savedView === 'dream100') return b.isDream100;
      if (savedView === 'no_email') return b.contacts.length === 0;
      if (savedView === 'score_80') return b.leadScore >= 80;
      if (savedView === 'awaiting_replies') return b.pipelineStage === 'Awaiting response';
      if (savedView === 'awaiting_proposals') return b.pipelineStage === 'Proposal requested';
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Central Lead Database & Unified CRM ({filteredList.length} Records)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Single source of truth across Discovery, Research, Dream 100, Campaign Studio,
              Follow-ups, and Sales Pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Duplicate Review & Merge</span>
            </button>
            <button
              onClick={() => {
                setNewIsDream100(false);
                setShowAddBizModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Business Record</span>
            </button>
          </div>
        </div>

        {/* Saved Views Bar (Section 23.4) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All CRM Businesses' },
                { id: 'nigeria', label: 'All Nigerian Prospects' },
                { id: 'dream100', label: 'Dream 100 Businesses' },
                { id: 'score_80', label: 'Score Above 80' },
                { id: 'no_email', label: 'Without Email Contacts' },
                { id: 'awaiting_replies', label: 'Awaiting Replies' },
                { id: 'awaiting_proposals', label: 'Opportunities Awaiting Proposals' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => setSavedView(v.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  savedView === v.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter CRM by country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="ALL">All 5 Countries</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
          </select>
        </div>

        {/* High-Density CRM Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Business & Normalised Domain</th>
                  <th className="py-3 px-4 font-semibold">Market & Industry</th>
                  <th className="py-3 px-4 font-semibold text-right">Lead Score</th>
                  <th className="py-3 px-4 font-semibold">Contacts</th>
                  <th className="py-3 px-4 font-semibold">Pipeline Stage</th>
                  <th className="py-3 px-4 font-semibold text-right">Est. Value</th>
                  <th className="py-3 px-4 font-semibold">Next Follow-up</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((biz) => (
                  <tr key={biz.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onOpenBusiness(biz.id)}
                        className="font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left block"
                      >
                        {biz.name}
                      </button>
                      <span className="text-slate-500 font-mono-tabular">
                        {biz.normalizedDomain}
                        {biz.isDream100 ? ' · Dream 100' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium text-slate-900">{biz.country}</div>
                      <div className="text-slate-500">{biz.industry}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular">
                      <span className="font-bold text-indigo-700">{biz.leadScore}/100</span>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {biz.priorityCategory}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {biz.contacts.length > 0 ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {biz.contacts[0].fullName}
                          </div>
                          <div className="text-slate-500 font-mono-tabular">
                            {biz.contacts[0].email}{' '}
                            {biz.contacts.length > 1 && `(+${biz.contacts.length - 1} more)`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium">
                          No email (Enrichment needed)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{biz.pipelineStage}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                      {biz.dealCurrency} {biz.estimatedDealValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600">
                      {biz.nextFollowUpDate}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenBusiness(biz.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded mr-1.5"
                      >
                        Open Record
                      </button>
                      <button
                        onClick={() => onNavigateToCampaign(biz.id, biz.contacts[0]?.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded"
                      >
                        Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Duplicate Review & Merge Modal (Section 9.4) */}
        {showDuplicateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Duplicate Review and Merge"
          >
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Duplicate Business Review & Record Merge (Section 9.4)
              </h3>
              <p className="text-xs text-slate-600">
                Merging preserves all research reports, contacts, campaign history, opportunities,
                and timeline events on the primary business record.
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Record to Retain
                  </label>
                  <select
                    value={mergePrimaryId}
                    onChange={(e) => setMergePrimaryId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.normalizedDomain} · {b.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duplicate Candidate to Merge Into Primary
                  </label>
                  <select
                    value={mergeSecondaryId}
                    onChange={(e) => setMergeSecondaryId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.normalizedDomain} · {b.country})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mergePrimaryId === mergeSecondaryId}
                  onClick={() => {
                    onMergeDuplicates(mergePrimaryId, mergeSecondaryId);
                    setShowDuplicateModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 disabled:opacity-50 rounded-lg"
                >
                  Merge & Preserve History
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddBizModal && renderAddBusinessModal()}
      </div>
    );
  }

  // ============================================================================
  // MODE 3: SALES PIPELINE KANBAN & ALL 18 STAGES (Module 8 - Section 11)
  // ============================================================================
  const activeKanbanStages: PipelineStage[] = [
    'Qualified',
    'Ready for outreach',
    'Initial contact sent',
    'Awaiting response',
    'Interested',
    'Meeting scheduled',
    'Proposal requested',
    'Proposal sent',
    'Negotiation',
    'Won',
  ];

  function renderAddBusinessModal() {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Add Business Record"
      >
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            {newIsDream100 ? 'Add New Dream 100 Business' : 'Add New Business to CRM'}
          </h3>
          <form onSubmit={handleCreateManualBusiness} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Zuri Cosmetics Ltd"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Official Website *</label>
                <input
                  type="text"
                  required
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://zuricosmetics.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Country</label>
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value as TargetCountry)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Public Email</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="name@brand.com"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Commercial Opportunity Summary
              </label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Why would this business benefit from AdVibe Studios?"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
            <label className="inline-flex items-center gap-2 font-medium text-slate-800">
              <input
                type="checkbox"
                checked={newIsDream100}
                onChange={(e) => setNewIsDream100(e.target.checked)}
              />
              <span>Enrol directly in Dream 100 strategic relationship list</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddBizModal(false)}
                className="px-4 py-2 font-medium text-slate-700 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg"
              >
                Save Business Record
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Sales Pipeline & Multi-Currency Opportunity Board
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track prospects across all 18 configurable pipeline stages from Newly Discovered to Won
            client. Moving a card preserves full interaction history.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setPipelineViewMode('kanban')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
              pipelineViewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Kanban Board
          </button>
          <button
            onClick={() => setPipelineViewMode('all_stages')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
              pipelineViewMode === 'all_stages'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All 18 Stages Overview
          </button>
        </div>
      </div>

      {pipelineViewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeKanbanStages.map((stage) => {
            const stageBiz = businesses.filter(
              (b) => b.pipelineStage === stage && matchesGlobalSearch(b)
            );
            return (
              <div
                key={stage}
                className="w-72 shrink-0 bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-900">{stage}</h3>
                  <span className="text-xs font-mono-tabular font-semibold text-slate-600">
                    {stageBiz.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[180px]">
                  {stageBiz.map((biz) => (
                    <div
                      key={biz.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {biz.country} · {biz.industry}
                        </span>
                        <span className="font-mono-tabular font-bold text-indigo-700">
                          {biz.leadScore}/100
                        </span>
                      </div>
                      <button
                        onClick={() => onOpenBusiness(biz.id)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left block"
                      >
                        {biz.name}
                      </button>
                      <div className="text-xs text-slate-600">
                        Contact: {biz.contacts[0]?.fullName || 'Unassigned'}
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        Offer: {biz.recommendedServices[0]}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono-tabular pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-900">
                          {biz.dealCurrency} {biz.estimatedDealValue.toLocaleString()}
                        </span>
                        <span className="text-slate-500">Due: {biz.nextFollowUpDate}</span>
                      </div>
                      <div>
                        <label
                          htmlFor={`stage-move-${biz.id}`}
                          className="sr-only"
                        >
                          Move {biz.name} stage
                        </label>
                        <select
                          id={`stage-move-${biz.id}`}
                          value={biz.pipelineStage}
                          onChange={(e) =>
                            onUpdateBusiness({
                              ...biz,
                              pipelineStage: e.target.value as PipelineStage,
                            })
                          }
                          className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-800"
                        >
                          {INITIAL_PIPELINE_STAGES.map((st) => (
                            <option key={st} value={st}>
                              Move to: {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {INITIAL_PIPELINE_STAGES.map((st, idx) => {
            const count = businesses.filter((b) => b.pipelineStage === st).length;
            return (
              <div
                key={st}
                className="p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-slate-800">
                  {String(idx + 1).padStart(2, '0')}. {st}
                </span>
                <span className="text-sm font-bold font-mono-tabular text-indigo-700">
                  {count} {count === 1 ? 'business' : 'businesses'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
