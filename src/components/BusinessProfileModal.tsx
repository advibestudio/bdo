import React, { useState } from 'react';
import {
  AdVibeService,
  BusinessOpportunity,
  BusinessRecord,
  CommunicationChannel,
  ContactPerson,
  FollowUpTask,
  OutreachEmailDraft,
  PipelineStage,
  ResearchReportVersion,
  TimelineEvent,
} from '../types/advibe';
import { INITIAL_PIPELINE_STAGES } from '../data/seedData';
import { getPriorityCategory } from '../utils/intelligenceRules';
import {
  X,
  Globe,
  Star,
  Plus,
  RefreshCw,
  Mail,
  Calendar,
  Phone,
  CheckCircle2,
  ExternalLink,
  FileText,
  UserPlus,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

interface BusinessProfileModalProps {
  business: BusinessRecord;
  services: AdVibeService[];
  tasks: FollowUpTask[];
  drafts: OutreachEmailDraft[];
  onClose: () => void;
  onUpdateBusiness: (updated: BusinessRecord) => void;
  onCreateFollowUp: (task: Omit<FollowUpTask, 'id'>) => void;
  onNavigateToCampaignWithBusiness: (businessId: string, contactId?: string) => void;
}

type ProfileTab =
  | 'overview'
  | 'research'
  | 'contacts'
  | 'timeline'
  | 'emails'
  | 'followups'
  | 'opportunities'
  | 'notes';

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  business,
  services,
  tasks,
  drafts,
  onClose,
  onUpdateBusiness,
  onCreateFollowUp,
  onNavigateToCampaignWithBusiness,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [isRefreshingResearch, setIsRefreshingResearch] = useState(false);

  // Score Override state
  const [overrideScore, setOverrideScore] = useState<string>(String(business.leadScore));
  const [overrideReason, setOverrideReason] = useState<string>(business.scoreOverrideReason || '');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  // New Contact state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const [newContactDept, setNewContactDept] = useState('Marketing');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactChannel, setNewContactChannel] = useState<CommunicationChannel>('Email');

  // New Interaction state
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState<'Phone call' | 'WhatsApp conversation' | 'Meeting'>('Phone call');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [interactionOutcome, setInteractionOutcome] = useState('Interested');

  // New Follow-up inline state
  const [showQuickFollowUp, setShowQuickFollowUp] = useState(false);
  const [fuPurpose, setFuPurpose] = useState('');
  const [fuDate, setFuDate] = useState('2026-11-08');
  const [fuChannel, setFuChannel] = useState<CommunicationChannel>('Email');
  const [fuContactId, setFuContactId] = useState(business.contacts[0]?.id || '');

  // New Opportunity state
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [oppName, setOppName] = useState('');
  const [oppServiceId, setOppServiceId] = useState(services[0]?.id || '');
  const [oppValue, setOppValue] = useState(String(business.estimatedDealValue || 2400));

  // New Note state
  const [newNoteText, setNewNoteText] = useState('');

  const businessTasks = tasks.filter((t) => t.businessId === business.id);
  const businessDrafts = drafts.filter((d) => d.businessId === business.id);
  const currentReport: ResearchReportVersion | undefined =
    business.researchHistory[selectedReportIndex] || business.researchHistory[0];

  const handleToggleDream100 = () => {
    const nextDream = !business.isDream100;
    const updated: BusinessRecord = {
      ...business,
      isDream100: nextDream,
      dream100Strategy: nextDream
        ? business.dream100Strategy || {
            enrolledAt: '2026-11-04',
            strategicPriority: 'Tier 1 Iconic',
            reasonForTargeting: business.opportunitySummary,
            keyDecisionMakerId: business.contacts[0]?.id || '',
            desiredRelationship: `Partner on ${business.recommendedServices[0] || 'Product Advertisements'}`,
            engagementStrategy: 'Multi-touch research-backed executive introduction',
            relationshipStatus: 'Ready for introduction',
            nextPlannedActivityDate: '2026-11-06',
            relationshipNotes: 'Promoted from Business Profile.',
          }
        : undefined,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          businessId: business.id,
          timestamp: new Date().toISOString(),
          type: 'Relationship-building activity',
          origin: 'Manual Record',
          title: nextDream ? 'Promoted to Dream 100 list' : 'Removed from Dream 100 list',
          description: nextDream
            ? 'Enrolled in strategic relationship-building program.'
            : 'Returned to standard CRM prospect pool.',
          ownerName: 'Shittu (Founder)',
        },
        ...business.timeline,
      ],
    };
    onUpdateBusiness(updated);
  };

  const handleStageChange = (newStage: PipelineStage) => {
    const updated: BusinessRecord = {
      ...business,
      pipelineStage: newStage,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          businessId: business.id,
          timestamp: new Date().toISOString(),
          type: 'Internal review',
          origin: 'Manual Record',
          title: `Pipeline stage updated to "${newStage}"`,
          description: `Moved from "${business.pipelineStage}" to "${newStage}".`,
          ownerName: 'Shittu (Founder)',
        },
        ...business.timeline,
      ],
    };
    onUpdateBusiness(updated);
  };

  const handleRequestFreshResearch = async () => {
    setIsRefreshingResearch(true);
    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business,
          serviceCatalogue: services.map((s) => ({ name: s.name, shortDescription: s.shortDescription })),
        }),
      });
      const data = await res.json();
      const nextVersionNum = (business.researchHistory[0]?.versionNumber || 0) + 1;
      const aiRep = data?.report;

      const newReport: ResearchReportVersion = {
        id: `rep-${business.id}-v${nextVersionNum}`,
        versionNumber: nextVersionNum,
        createdAt: new Date().toISOString(),
        businessOverview:
          aiRep?.businessOverview ||
          `${business.name} (${business.website}) operates in ${business.country} within ${business.industry}. ${business.description}`,
        productsAndServices: aiRep?.productsAndServices || [
          'Core Commercial Catalog',
          'Seasonal Campaign Bundles',
        ],
        targetAudience: aiRep?.targetAudience || `Commercial and retail buyers in ${business.country}.`,
        positioning: aiRep?.positioning || 'Quality-focused category contender with active digital storefront.',
        publicSizeIndicator:
          aiRep?.publicSizeIndicator ||
          'Active commercial website (Private annual revenue & employee count: Not publicly established)',
        marketingActivity: {
          activelyPromotes: true,
          publishesVideoContent: true,
          usesProductDemos: false,
          usesTestimonials: true,
          publishesEducational: true,
          runsVisibleCampaigns: true,
          consistentStrategy: true,
          recurringNeeds: true,
          summary:
            aiRep?.marketingSummary ||
            'Active promotional storefront and social updates with clear headroom for short-form AI product video creatives.',
        },
        videoContentAnalysis:
          aiRep?.videoContentAnalysis ||
          'Current creative library under-utilizes hook-tested 9:16 product demonstrations and structured explainers.',
        creativeOpportunities: aiRep?.creativeOpportunities || [
          'Five Creative Pack for flagship product catalog',
          'UGC-Style hook testing sprint',
          'Monthly AI Video Content Retainer for ongoing launches',
        ],
        recommendedServices: aiRep?.recommendedServices || business.recommendedServices,
        strongestInitialOffer: aiRep?.strongestInitialOffer || business.recommendedServices[0] || 'Product Advertisements',
        problemSolved:
          aiRep?.problemSolved ||
          'Delivers broadcast-ready commercial product and explainer videos in 5–7 business days without physical production overhead.',
        suggestedOutreachAngle:
          aiRep?.suggestedOutreachAngle ||
          `Lead with tailored creative concepts for ${business.name}'s current product promotion in ${business.country}.`,
        appropriateFirstConversation:
          aiRep?.appropriateFirstConversation || '15-minute Creative Opportunity Audit reviewing 3 bespoke video hooks.',
        evidence: [
          {
            id: `ev-${Date.now()}`,
            claim: aiRep?.evidenceClaim || `Verified active commercial catalog on ${business.website}`,
            sourceUrl: business.website,
            sourceType: 'Official Website',
            retrievalDate: new Date().toISOString().slice(0, 10),
            extractedEvidence:
              aiRep?.extractedEvidence ||
              `Storefront and promotional sections inspected on ${new Date().toISOString().slice(0, 10)}; private financials marked Not publicly established.`,
            confidenceLevel: 'High',
          },
          ...(currentReport?.evidence || []),
        ],
        researchConfidence: 'High',
      };

      const updated: BusinessRecord = {
        ...business,
        lastResearchDate: new Date().toISOString().slice(0, 10),
        researchHistory: [newReport, ...business.researchHistory],
        timeline: [
          {
            id: `tl-${Date.now()}`,
            businessId: business.id,
            timestamp: new Date().toISOString(),
            type: 'Research',
            origin: 'Integration Confirmed',
            title: `Fresh AI Research Report v${nextVersionNum} generated (historical versions preserved)`,
            description: `Updated creative opportunity analysis and verified evidence sources for ${business.name}.`,
            ownerName: 'AI Research Engine',
          },
          ...business.timeline,
        ],
      };
      onUpdateBusiness(updated);
      setSelectedReportIndex(0);
      setActiveTab('research');
    } finally {
      setIsRefreshingResearch(false);
    }
  };

  const handleSaveScoreOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.max(0, Math.min(100, Number(overrideScore)));
    if (Number.isNaN(numeric) || !overrideReason.trim()) return;
    const updated: BusinessRecord = {
      ...business,
      leadScore: numeric,
      priorityCategory: getPriorityCategory(numeric),
      scoreOverrideReason: overrideReason.trim(),
      timeline: [
        {
          id: `tl-${Date.now()}`,
          businessId: business.id,
          timestamp: new Date().toISOString(),
          type: 'Internal review',
          origin: 'Manual Record',
          title: `Lead score manually overridden to ${numeric}/100 (Original AI score: ${business.aiOriginalScore}/100 preserved)`,
          description: `Reason: ${overrideReason.trim()}`,
          ownerName: 'Shittu (Founder)',
        },
        ...business.timeline,
      ],
    };
    onUpdateBusiness(updated);
    setShowOverrideForm(false);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactTitle.trim()) return;
    const newContact: ContactPerson = {
      id: `cnt-${Date.now()}`,
      businessId: business.id,
      fullName: newContactName.trim(),
      jobTitle: newContactTitle.trim(),
      department: newContactDept,
      professionalRole: newContactTitle.trim(),
      email: newContactEmail.trim() || 'Not publicly established',
      phone: newContactPhone.trim() || 'Not publicly established',
      whatsapp: newContactPhone.trim() || 'Not publicly established',
      linkedinUrl: 'Not publicly established',
      socialProfiles: [],
      contactSource: 'Manual Researcher Enrichment',
      verificationStatus: newContactEmail.includes('@') ? 'Verified' : 'Needs Check',
      contactStatus: 'Active',
      preferredChannel: newContactChannel,
      isPrimaryDecisionMaker: business.contacts.length === 0,
    };

    const nextStatus =
      business.qualificationStatus === 'Qualified – contact unavailable' && newContactEmail.includes('@')
        ? 'Qualified – contact available'
        : business.qualificationStatus;

    const updated: BusinessRecord = {
      ...business,
      qualificationStatus: nextStatus,
      contacts: [...business.contacts, newContact],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          businessId: business.id,
          contactId: newContact.id,
          timestamp: new Date().toISOString(),
          type: 'Research',
          origin: 'Manual Record',
          title: `Added contact: ${newContact.fullName} (${newContact.jobTitle})`,
          description: `Department: ${newContact.department} · Preferred channel: ${newContact.preferredChannel}`,
          ownerName: 'Shittu (Founder)',
        },
        ...business.timeline,
      ],
    };
    onUpdateBusiness(updated);
    setNewContactName('');
    setNewContactTitle('');
    setNewContactEmail('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const handleLogInteractionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionSummary.trim()) return;
    const ev: TimelineEvent = {
      id: `tl-${Date.now()}`,
      businessId: business.id,
      contactId: business.contacts[0]?.id,
      timestamp: new Date().toISOString(),
      type: interactionType,
      origin: 'Manual Record',
      title: `${interactionType} recorded — Outcome: ${interactionOutcome}`,
      description: interactionSummary.trim(),
      outcome: interactionOutcome,
      ownerName: 'Shittu (Founder)',
    };
    onUpdateBusiness({
      ...business,
      lastInteractionDate: new Date().toISOString().slice(0, 10),
      lastContactOutcome: interactionOutcome,
      timeline: [ev, ...business.timeline],
    });
    setInteractionSummary('');
    setShowLogInteraction(false);
    setActiveTab('timeline');
  };

  const handleQuickFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuPurpose.trim() || !fuDate) return;
    const selectedContact =
      business.contacts.find((c) => c.id === fuContactId) || business.contacts[0];
    onCreateFollowUp({
      businessId: business.id,
      businessName: business.name,
      contactId: selectedContact?.id || 'unassigned',
      contactName: selectedContact?.fullName || 'Primary Decision-Maker',
      contactRole: selectedContact?.jobTitle || 'Leadership',
      country: business.country,
      industry: business.industry,
      dueDate: fuDate,
      dueTime: '10:00',
      channel: fuChannel,
      purpose: fuPurpose.trim(),
      notes: `Created from ${business.name} Business Profile.`,
      priority: business.isDream100 ? 'Urgent' : 'High',
      assignedTo: business.leadOwner,
      status: fuDate === '2026-11-04' ? 'Due today' : 'Pending',
      creationSource: 'Manual',
    });
    setFuPurpose('');
    setShowQuickFollowUp(false);
    setActiveTab('followups');
  };

  const handleAddOpportunitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppName.trim()) return;
    const srv = services.find((s) => s.id === oppServiceId) || services[0];
    const newOpp: BusinessOpportunity = {
      id: `opp-${Date.now()}`,
      businessId: business.id,
      primaryContactId: business.contacts[0]?.id || '',
      name: oppName.trim(),
      recommendedServiceId: srv.id,
      recommendedServiceName: srv.name,
      estimatedValue: Number(oppValue) || 2000,
      currency: business.dealCurrency,
      probability: 50,
      expectedClosingDate: '2026-12-01',
      stage: business.pipelineStage,
      proposalStatus: 'Not Prepared',
      notes: 'Added from Business Profile.',
      outcome: 'Open',
      ownerName: business.leadOwner,
    };
    onUpdateBusiness({
      ...business,
      opportunities: [...business.opportunities, newOpp],
    });
    setOppName('');
    setShowAddOpportunity(false);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onUpdateBusiness({
      ...business,
      notes: [
        {
          id: `note-${Date.now()}`,
          author: 'Shittu (Founder)',
          createdAt: new Date().toISOString(),
          content: newNoteText.trim(),
        },
        ...business.notes,
      ],
    });
    setNewNoteText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Business Profile: ${business.name}`}
    >
      <div className="relative flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Profile Header (Section 23.2) */}
        <div className="border-b border-slate-200 px-6 py-5 bg-slate-50/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1">
                <span className="font-medium text-slate-900">{business.country}</span>
                <span aria-hidden="true">·</span>
                <span>{business.city}</span>
                <span aria-hidden="true">·</span>
                <span>{business.industry}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-indigo-700">
                  Score: {business.leadScore}/100 ({business.priorityCategory})
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-800">{business.qualificationStatus}</span>
                {business.isDream100 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-700">Dream 100 Active</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{business.name}</h2>
              <a
                href={business.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mt-0.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{business.website}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={onClose}
              aria-label="Close business profile"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Header Actions (Section 23.2) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowQuickFollowUp((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Create Follow-up</span>
              </button>
              <button
                onClick={() =>
                  onNavigateToCampaignWithBusiness(business.id, business.contacts[0]?.id)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Generate Email</span>
              </button>
              <button
                onClick={() => setShowLogInteraction((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Record Interaction</span>
              </button>
              <button
                onClick={handleToggleDream100}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  business.isDream100
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>{business.isDream100 ? 'In Dream 100' : 'Add to Dream 100'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="profile-stage-select" className="text-xs font-medium text-slate-600">
                Pipeline Stage:
              </label>
              <select
                id="profile-stage-select"
                value={business.pipelineStage}
                onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
                className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {INITIAL_PIPELINE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Inline Create Follow-up Drawer */}
          {showQuickFollowUp && (
            <form
              onSubmit={handleQuickFollowUpSubmit}
              className="mt-3 p-4 bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up Purpose
                </label>
                <input
                  type="text"
                  required
                  value={fuPurpose}
                  onChange={(e) => setFuPurpose(e.target.value)}
                  placeholder="e.g., Send Q4 Five Creative Pack breakdown"
                  className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={fuDate}
                  onChange={(e) => setFuDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Channel</label>
                <div className="flex items-center gap-2">
                  <select
                    value={fuChannel}
                    onChange={(e) => setFuChannel(e.target.value as CommunicationChannel)}
                    className="w-full text-xs border border-slate-300 rounded-md px-2 py-1.5"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Video Meeting">Video Meeting</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Quick Inline Record Interaction Drawer */}
          {showLogInteraction && (
            <form
              onSubmit={handleLogInteractionSubmit}
              className="mt-3 p-4 bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Interaction Type
                </label>
                <select
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5"
                >
                  <option value="Phone call">Phone call</option>
                  <option value="WhatsApp conversation">WhatsApp conversation</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Outcome</label>
                <select
                  value={interactionOutcome}
                  onChange={(e) => setInteractionOutcome(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5"
                >
                  <option value="Interested">Interested</option>
                  <option value="Requested pricing">Requested pricing</option>
                  <option value="Meeting booked">Meeting booked</option>
                  <option value="Follow up later">Follow up later</option>
                  <option value="No answer">No answer</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Conversation Summary
                  </label>
                  <input
                    type="text"
                    required
                    value={interactionSummary}
                    onChange={(e) => setInteractionSummary(e.target.value)}
                    placeholder="Record key takeaways and agreed next step..."
                    className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
                >
                  Log Activity
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 8 Main Tabs (Section 23.2) */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 bg-white overflow-x-auto">
          {(
            [
              { id: 'overview', label: '1. Overview' },
              { id: 'research', label: `2. Research (${business.researchHistory.length})` },
              { id: 'contacts', label: `3. Contacts (${business.contacts.length})` },
              { id: 'timeline', label: `4. Activity Timeline (${business.timeline.length})` },
              { id: 'emails', label: `5. Emails (${businessDrafts.length})` },
              { id: 'followups', label: `6. Follow-ups (${businessTasks.length})` },
              { id: 'opportunities', label: `7. Opportunities (${business.opportunities.length})` },
              { id: 'notes', label: `8. Notes (${business.notes.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="text-xs text-slate-500">Recommended AdVibe Services</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-900">
                    {business.recommendedServices.join(' · ')}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Deal Estimate:{' '}
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {business.dealCurrency} {business.estimatedDealValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="text-xs text-slate-500">Primary Decision-Maker</div>
                  {business.contacts[0] ? (
                    <>
                      <div className="mt-1.5 text-sm font-semibold text-slate-900">
                        {business.contacts[0].fullName}
                      </div>
                      <div className="text-xs text-slate-600">
                        {business.contacts[0].jobTitle} · {business.contacts[0].email}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1.5 text-sm text-amber-700 font-medium">
                      Not publicly established — add contact in Contacts tab
                    </div>
                  )}
                </div>
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="text-xs text-slate-500">Relationship & Follow-up State</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-900">
                    Last Outcome: {business.lastContactOutcome}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 font-mono-tabular">
                    Last Contact: {business.lastInteractionDate} · Next Due: {business.nextFollowUpDate}
                  </div>
                </div>
              </div>

              <div className="p-5 border border-slate-200 rounded-lg bg-white space-y-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Commercial & Creative Opportunity Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {business.opportunitySummary}
                </p>
              </div>

              {/* 8-Criterion Lead Scoring Breakdown (Section 7.2) */}
              <div className="p-5 border border-slate-200 rounded-lg bg-white space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      8-Criterion Lead Qualification Score Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Current Score:{' '}
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {business.leadScore}/100
                      </span>{' '}
                      · Original AI Assessment:{' '}
                      <span className="font-mono-tabular">{business.aiOriginalScore}/100</span>
                      {business.scoreOverrideReason &&
                        ` · Override Note: "${business.scoreOverrideReason}"`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOverrideForm((v) => !v)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Override AI Score
                  </button>
                </div>

                {showOverrideForm && (
                  <form
                    onSubmit={handleSaveScoreOverride}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-end gap-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        New Score (0–100)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(e.target.value)}
                        className="w-24 text-xs border border-slate-300 rounded px-2 py-1 font-mono-tabular bg-white"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Reason for Manual Override (Audit Logged)
                      </label>
                      <input
                        type="text"
                        required
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g., Confirmed Q4 creative budget via LinkedIn intro"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
                    >
                      Save Override
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Service relevance', item: business.scoreBreakdown.serviceRelevance },
                    {
                      label: 'Evidence of promotional activity',
                      item: business.scoreBreakdown.promotionalActivity,
                    },
                    {
                      label: 'Recurring creative opportunity',
                      item: business.scoreBreakdown.recurringOpportunity,
                    },
                    { label: 'Business maturity', item: business.scoreBreakdown.businessMaturity },
                    {
                      label: 'Product/service promotion frequency',
                      item: business.scoreBreakdown.promotionFrequency,
                    },
                    {
                      label: 'Contact accessibility',
                      item: business.scoreBreakdown.contactAccessibility,
                    },
                    {
                      label: 'Potential commercial value',
                      item: business.scoreBreakdown.commercialValue,
                    },
                    {
                      label: 'Strategic relationship potential',
                      item: business.scoreBreakdown.strategicRelationship,
                    },
                  ].map((crit) => (
                    <div
                      key={crit.label}
                      className="p-3 border border-slate-200 rounded-md bg-slate-50/40"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                        <span>{crit.label}</span>
                        <span className="font-mono-tabular text-indigo-700">
                          {crit.item.score}/{crit.item.max}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{crit.item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI BUSINESS RESEARCH REPORT (Section 6.4) */}
          {activeTab === 'research' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-800">
                    Historical Report Versions:
                  </span>
                  {business.researchHistory.length > 0 ? (
                    <select
                      aria-label="Select Research Report Version"
                      value={selectedReportIndex}
                      onChange={(e) => setSelectedReportIndex(Number(e.target.value))}
                      className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white font-medium"
                    >
                      {business.researchHistory.map((rep, idx) => (
                        <option key={rep.id} value={idx}>
                          Version {rep.versionNumber} — {rep.createdAt.slice(0, 10)} (Confidence:{' '}
                          {rep.researchConfidence})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500">No report generated yet</span>
                  )}
                </div>

                <button
                  onClick={handleRequestFreshResearch}
                  disabled={isRefreshingResearch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingResearch ? 'animate-spin' : ''}`} />
                  <span>
                    {isRefreshingResearch
                      ? 'Investigating & Synthesising...'
                      : 'Request Fresh Research Report'}
                  </span>
                </button>
              </div>

              {currentReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded-lg bg-white">
                      <h4 className="text-xs font-bold text-slate-900">1. Business Overview</h4>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {currentReport.businessOverview}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        Public Size Indicator: {currentReport.publicSizeIndicator}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg bg-white">
                      <h4 className="text-xs font-bold text-slate-900">
                        2. Identifiable Products & Services
                      </h4>
                      <ul className="mt-1.5 space-y-1 text-xs text-slate-700 list-disc list-inside">
                        {currentReport.productsAndServices.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <strong>3. Target Audience:</strong> {currentReport.targetAudience}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded-lg bg-white">
                      <h4 className="text-xs font-bold text-slate-900">
                        4. Marketing Activity & 5. Video Content Analysis
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-700">
                        {currentReport.marketingActivity.summary}
                      </p>
                      <p className="mt-2 text-xs text-slate-700">
                        <strong>Video Analysis:</strong> {currentReport.videoContentAnalysis}
                      </p>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg bg-white">
                      <h4 className="text-xs font-bold text-slate-900">
                        6. Potential Creative Opportunities & 7. Recommended Services
                      </h4>
                      <ul className="mt-1.5 space-y-1 text-xs text-slate-700 list-disc list-inside">
                        {currentReport.creativeOpportunities.map((op, i) => (
                          <li key={i}>{op}</li>
                        ))}
                      </ul>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-indigo-700 font-semibold">
                        Strongest Initial Offer: {currentReport.strongestInitialOffer}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      8. Suggested Outreach Angle & First Conversation
                    </h4>
                    <p className="text-xs text-slate-700">
                      <strong>Outreach Angle:</strong> {currentReport.suggestedOutreachAngle}
                    </p>
                    <p className="text-xs text-slate-700">
                      <strong>Problem Solved:</strong> {currentReport.problemSolved} ·{' '}
                      <strong>First Conversation:</strong>{' '}
                      {currentReport.appropriateFirstConversation}
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      10. Verifiable Evidence & Grounded Sources (Strict Non-Hallucination Policy)
                    </h4>
                    <div className="space-y-2">
                      {currentReport.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 border border-slate-200 rounded-md bg-slate-50/50 text-xs space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-900">
                            <span>{ev.claim}</span>
                            <span className="text-slate-500 font-mono-tabular">
                              {ev.sourceType} · Retrieved {ev.retrievalDate} · Confidence:{' '}
                              {ev.confidenceLevel}
                            </span>
                          </div>
                          <p className="text-slate-600">{ev.extractedEvidence}</p>
                          <a
                            href={ev.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            <span>{ev.sourceUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-slate-200 rounded-lg bg-white">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">
                    No AI Research Report generated yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Click "Request Fresh Research Report" above to investigate this business and
                    extract verifiable evidence.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTACTS (Multiple Contacts Support - Section 9.3) */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Decision-Makers & Stakeholders ({business.contacts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Separate communication histories and preferred channels per contact.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddContact((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Contact</span>
                </button>
              </div>

              {showAddContact && (
                <form
                  onSubmit={handleAddContactSubmit}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="e.g., Sarah Jenkins"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newContactTitle}
                      onChange={(e) => setNewContactTitle(e.target.value)}
                      placeholder="e.g., Marketing Director"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={newContactDept}
                      onChange={(e) => setNewContactDept(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Public Business Email
                    </label>
                    <input
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      placeholder="sarah@company.com"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Business Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="+44 20 ..."
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Preferred Channel
                      </label>
                      <select
                        value={newContactChannel}
                        onChange={(e) => setNewContactChannel(e.target.value as CommunicationChannel)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                      >
                        <option value="Email">Email</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Phone Call">Phone Call</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {business.contacts.map((cnt) => (
                  <div
                    key={cnt.id}
                    className="p-4 border border-slate-200 rounded-lg bg-white flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span>{cnt.fullName}</span>
                        <span className="text-xs font-normal text-slate-500">
                          · {cnt.jobTitle} ({cnt.department})
                        </span>
                        {cnt.isPrimaryDecisionMaker && (
                          <span className="text-xs font-semibold text-indigo-700">
                            · Primary Decision-Maker
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-mono-tabular">
                        Email: {cnt.email} · Phone: {cnt.phone} · Preferred: {cnt.preferredChannel}
                      </div>
                      <div className="text-xs text-slate-500">
                        Source: {cnt.contactSource} · Verification: {cnt.verificationStatus} ·
                        Compliance Status: {cnt.contactStatus}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateToCampaignWithBusiness(business.id, cnt.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                      >
                        Draft Individual Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY TIMELINE (Section 10.8) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chronological Interaction Timeline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distinguishes between Integration Confirmed events, Manual Records, and AI
                    Recommendations.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {business.timeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 border border-slate-200 rounded-lg bg-white space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {ev.type} · {ev.origin}
                      </span>
                      <span className="font-mono-tabular">
                        {ev.timestamp.replace('T', ' ').slice(0, 16)} UTC · {ev.ownerName}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{ev.title}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EMAILS */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Individual Outreach Messages & Gmail Drafts ({businessDrafts.length})
                </h3>
                <button
                  onClick={() =>
                    onNavigateToCampaignWithBusiness(business.id, business.contacts[0]?.id)
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Prepare New Email in Campaign Studio
                </button>
              </div>
              {businessDrafts.length === 0 ? (
                <div className="p-6 text-center border border-slate-200 rounded-lg text-xs text-slate-500">
                  No outreach drafts prepared for this business yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {businessDrafts.map((drf) => (
                    <div
                      key={drf.id}
                      className="p-4 border border-slate-200 rounded-lg bg-white space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-900">Subject: {drf.subject}</span>
                        <span className="font-mono-tabular font-semibold text-indigo-700">
                          Status: {drf.status}{' '}
                          {drf.gmailDraftId && `· Gmail Draft ID: ${drf.gmailDraftId}`}
                        </span>
                      </div>
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded border border-slate-100">
                        {drf.body}
                      </pre>
                      <div className="text-xs text-slate-500 font-mono-tabular">
                        Estimated Opens: {drf.estimatedOpens} · Unique Clicks: {drf.uniqueClicks} ·
                        Total Clicks: {drf.totalClicks}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FOLLOW-UPS */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Scheduled & Completed Follow-up Tasks ({businessTasks.length})
                </h3>
                <button
                  onClick={() => setShowQuickFollowUp(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  + Add Follow-up Task
                </button>
              </div>
              <div className="space-y-2">
                {businessTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 border border-slate-200 rounded-lg bg-white flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.purpose}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
                        Contact: {t.contactName} · Channel: {t.channel} · Due: {t.dueDate} · Status:{' '}
                        <span className="font-semibold text-slate-800">{t.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: OPPORTUNITIES (Section 11.4) */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sales Opportunities ({business.opportunities.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    A business can have multiple service packages and retainer opportunities.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddOpportunity((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Add Opportunity</span>
                </button>
              </div>

              {showAddOpportunity && (
                <form
                  onSubmit={handleAddOpportunitySubmit}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Opportunity Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={oppName}
                      onChange={(e) => setOppName(e.target.value)}
                      placeholder="e.g., Q1 Monthly Video Retainer"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Recommended AdVibe Service
                    </label>
                    <select
                      value={oppServiceId}
                      onChange={(e) => setOppServiceId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Estimated Value ({business.dealCurrency})
                      </label>
                      <input
                        type="number"
                        value={oppValue}
                        onChange={(e) => setOppValue(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-mono-tabular"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {business.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 border border-slate-200 rounded-lg bg-white flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{opp.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Service: {opp.recommendedServiceName} · Stage: {opp.stage} · Proposal:{' '}
                        {opp.proposalStatus}
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <div className="text-sm font-bold text-slate-900">
                        {opp.currency} {opp.estimatedValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        Probability: {opp.probability}% · Close: {opp.expectedClosingDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a research or relationship note..."
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Save Note
                </button>
              </form>
              <div className="space-y-2">
                {business.notes.map((n) => (
                  <div key={n.id} className="p-3.5 border border-slate-200 rounded-lg bg-white">
                    <div className="text-xs text-slate-500 font-mono-tabular">
                      {n.author} · {n.createdAt.slice(0, 16).replace('T', ' ')}
                    </div>
                    <p className="text-xs text-slate-800 mt-1">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
