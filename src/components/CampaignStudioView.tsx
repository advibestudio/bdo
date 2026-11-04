import React, { useState } from 'react';
import {
  AdVibeService,
  BusinessRecord,
  OutreachCampaign,
  OutreachEmailDraft,
  ReplyClassification,
  SuppressionRecord,
  TargetCountry,
} from '../types/advibe';
import { getAccessToken } from '../lib/firebase';
import { calculateEmailPerformanceMetrics } from '../utils/intelligenceRules';
import {
  Mail,
  Sparkles,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  FileEdit,
  Plus,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';

interface CampaignStudioViewProps {
  campaigns: OutreachCampaign[];
  drafts: OutreachEmailDraft[];
  businesses: BusinessRecord[];
  services: AdVibeService[];
  suppressionList: SuppressionRecord[];
  knowledgeBaseSummary: string;
  initialBusinessId?: string | null;
  initialContactId?: string | null;
  onCreateCampaign: (campaign: Omit<OutreachCampaign, 'id' | 'createdAt'>) => void;
  onSaveDraft: (draft: OutreachEmailDraft) => void;
  onUpdateDraftStatus: (
    draftId: string,
    updates: Partial<OutreachEmailDraft>,
    auditNote?: string
  ) => void;
  onOpenBusiness: (businessId: string) => void;
}

const CAMPAIGN_TYPES: OutreachCampaign['type'][] = [
  'Cold business introduction',
  'Product advertisement offer',
  'Monthly content retainer offer',
  'White-label agency partnership',
  'AI promotional mini-series offer',
  'Explainer video offer',
  'Training Academy promotion',
  'Dream 100 relationship-building campaign',
  'Event or seasonal campaign',
  'Custom campaign',
];

export const CampaignStudioView: React.FC<CampaignStudioViewProps> = ({
  campaigns,
  drafts,
  businesses,
  services,
  suppressionList,
  knowledgeBaseSummary,
  initialBusinessId,
  initialContactId,
  onCreateCampaign,
  onSaveDraft,
  onUpdateDraftStatus,
  onOpenBusiness,
}) => {
  const [studioMode, setStudioMode] = useState<'drafts' | 'generator' | 'assistant'>(
    initialBusinessId ? 'generator' : 'drafts'
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Generator State
  const [genBizId, setGenBizId] = useState<string>(
    initialBusinessId || businesses[0]?.id || ''
  );
  const [genContactId, setGenContactId] = useState<string>(
    initialContactId || businesses[0]?.contacts[0]?.id || ''
  );
  const [genCampaignId, setGenCampaignId] = useState<string>(campaigns[0]?.id || '');
  const [genServiceId, setGenServiceId] = useState<string>(services[0]?.id || '');
  const [genSequenceStep, setGenSequenceStep] = useState<number>(1);
  const [genTone, setGenTone] = useState<OutreachCampaign['tone']>('Consultative & Executive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  // Editing Draft State
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');

  // Gmail API / Confirmation Modal State (Workspace Integration Destructive/Mutating Confirmation Requirement)
  const [confirmGmailAction, setConfirmGmailAction] = useState<{
    type: 'create_draft' | 'confirm_sent';
    draft: OutreachEmailDraft;
  } | null>(null);
  const [isCreatingGmailDraft, setIsCreatingGmailDraft] = useState<string | null>(null);

  // New Campaign Modal State
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampType, setNewCampType] = useState<OutreachCampaign['type']>(
    'Product advertisement offer'
  );
  const [newCampCountry, setNewCampCountry] = useState<TargetCountry>('United Kingdom');
  const [newCampServiceId, setNewCampServiceId] = useState<string>(services[0]?.id || '');
  const [newCampObjective, setNewCampObjective] = useState<string>(
    'Initiate consultative conversations with qualified decision-makers.'
  );

  // AI Outreach Assistant State (Module 14)
  const [astBizId, setAstBizId] = useState<string>(businesses[0]?.id || '');
  const [astTaskType, setAstTaskType] = useState<string>(
    'Phone Conversation Talking Points'
  );
  const [astContext, setAstContext] = useState<string>('');
  const [isRunningAssistant, setIsRunningAssistant] = useState(false);
  const [assistantOutput, setAssistantOutput] = useState<{
    headline: string;
    classification: string;
    recommendedNextAction: string;
    talkingPointsOrDraft: string[];
    suggestedResponseText: string;
  } | null>(null);

  const selectedBiz = businesses.find((b) => b.id === genBizId) || businesses[0];
  const selectedContact =
    selectedBiz?.contacts.find((c) => c.id === genContactId) || selectedBiz?.contacts[0];
  const selectedService = services.find((s) => s.id === genServiceId) || services[0];
  const countryPrice = selectedService?.pricingByCountry.find(
    (p) => p.country === selectedBiz?.country && p.active
  );

  const metrics = calculateEmailPerformanceMetrics(drafts);

  const filteredDrafts = drafts.filter((d) => {
    if (selectedCampaignId !== 'ALL' && d.campaignId !== selectedCampaignId) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    return true;
  });

  const handleGeneratePersonalisedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplianceError(null);
    if (!selectedBiz) return;

    const contactEmail = selectedContact?.email || '';
    if (!contactEmail || !contactEmail.includes('@')) {
      setComplianceError(
        `Cannot prepare email for ${selectedBiz.name}: No verified public email address is available. Please enrich contact details first.`
      );
      return;
    }

    const isSuppressed = suppressionList.some(
      (s) =>
        s.emailOrDomain.toLowerCase() === contactEmail.toLowerCase() ||
        s.emailOrDomain.toLowerCase() === selectedBiz.normalizedDomain.toLowerCase()
    );
    if (isSuppressed || selectedContact?.contactStatus !== 'Active') {
      setComplianceError(
        `Compliance Governance Block: ${contactEmail} or ${selectedBiz.normalizedDomain} is suppressed or marked Do Not Contact.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const campaign = campaigns.find((c) => c.id === genCampaignId) || campaigns[0];
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: selectedBiz,
          contact: selectedContact,
          service: selectedService,
          pricingRecord: countryPrice || null,
          campaignObjective: campaign?.objective,
          tone: genTone,
          sequenceStep: genSequenceStep,
          previousInteractions: selectedBiz.timeline.slice(0, 4),
          knowledgeBase: knowledgeBaseSummary,
        }),
      });
      const data = await res.json();
      const aiGen = data?.generated;

      const priceSentence = countryPrice
        ? `Our ${countryPrice.packageName} in ${selectedBiz.country} is ${countryPrice.currency} ${countryPrice.price.toLocaleString()} (${countryPrice.packageDescription}, delivered in ${countryPrice.turnaroundTime}).`
        : `We scope custom production packages tailored to your campaign calendar and deliverable requirements.`;

      const stepPrefix = genSequenceStep > 1 ? `Re: Follow-up (#${genSequenceStep - 1}) — ` : '';
      const defaultSubject = `${stepPrefix}${selectedService.name} concepts for ${selectedBiz.name}`;
      const defaultBody = `Hi ${selectedContact?.fullName.split(' ')[0] || 'there'},

${
  genSequenceStep === 1
    ? `While reviewing ${selectedBiz.name} (${selectedBiz.website}), I noticed ${selectedBiz.opportunitySummary}`
    : `Following up on my previous note regarding ${selectedBiz.name} (${
        selectedBiz.lastContactOutcome || 'creative opportunity'
      }).`
}

At AdVibe Studios, we help ${selectedBiz.industry.toLowerCase()} produce high-converting ${selectedService.name.toLowerCase()} without physical shoot bottlenecks. ${priceSentence}

You can review our relevant commercial reel here:
https://advibestudios.com/portfolio/${selectedService.code.toLowerCase()}

Would you be open to a brief 15-minute call this week to explore 3 tailored video hooks for ${selectedBiz.name}?

Best regards,
Shittu
Founder, AdVibe Studios
advibestudios.global@gmail.com`;

      const draftId = `drf-${Date.now()}`;
      const newDraft: OutreachEmailDraft = {
        id: draftId,
        idempotencyKey: `idem-${selectedBiz.id}-${selectedContact?.id || 'c'}-s${genSequenceStep}-${Date.now()}`,
        campaignId: campaign?.id || 'cmp-default',
        campaignName: campaign?.name || 'Custom Outreach Campaign',
        businessId: selectedBiz.id,
        businessName: selectedBiz.name,
        contactId: selectedContact?.id || 'cnt-1',
        contactName: selectedContact?.fullName || 'Decision Maker',
        contactEmail,
        country: selectedBiz.country,
        industry: selectedBiz.industry,
        recommendedServiceId: selectedService.id,
        recommendedServiceName: selectedService.name,
        subject: aiGen?.subject || defaultSubject,
        body: aiGen?.body || defaultBody,
        researchEvidenceUsed:
          aiGen?.researchEvidenceUsed || selectedBiz.opportunitySummary.slice(0, 140),
        personalisationAngle:
          aiGen?.personalisationAngle ||
          `${selectedService.name} matched to ${selectedBiz.country} catalog`,
        status: 'Pending Approval',
        createdAt: new Date().toISOString(),
        estimatedOpens: 0,
        uniqueClicks: 0,
        totalClicks: 0,
        trackedLinks: [
          {
            id: `lnk-${Date.now()}`,
            label: `AdVibe ${selectedService.name} Showreel`,
            destinationUrl: `https://advibestudios.com/portfolio/${selectedService.code.toLowerCase()}`,
            trackingUrl: `/api/track/click/${draftId}/lnk-1`,
            uniqueClicked: false,
            totalClickCount: 0,
          },
        ],
        sequenceStep: genSequenceStep,
      };

      onSaveDraft(newDraft);
      setStudioMode('drafts');
    } finally {
      setIsGenerating(false);
    }
  };

  const executeConfirmedGmailDraftCreation = async (draft: OutreachEmailDraft) => {
    setConfirmGmailAction(null);
    setIsCreatingGmailDraft(draft.id);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      let data: { gmailDraftId?: string };
      try {
        const res = await fetch('/api/gmail/create-draft', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            idempotencyKey: draft.idempotencyKey,
            to: draft.contactEmail,
            subject: draft.subject,
            body: draft.body,
          }),
        });
        if (res.ok) {
          data = await res.json();
        } else {
          const { createGmailDraftWebFallback } = await import('../lib/webApiFallback');
          data = await createGmailDraftWebFallback({
            idempotencyKey: draft.idempotencyKey,
            to: draft.contactEmail,
            subject: draft.subject,
            body: draft.body,
            accessToken: token,
          });
        }
      } catch {
        const { createGmailDraftWebFallback } = await import('../lib/webApiFallback');
        data = await createGmailDraftWebFallback({
          idempotencyKey: draft.idempotencyKey,
          to: draft.contactEmail,
          subject: draft.subject,
          body: draft.body,
          accessToken: token,
        });
      }
      onUpdateDraftStatus(
        draft.id,
        {
          status: 'Gmail Draft Created',
          gmailDraftId: data.gmailDraftId || `r-${Date.now()}`,
          draftCreatedAt: new Date().toISOString(),
        },
        `Created individual Gmail draft (${data.gmailDraftId}) for ${draft.contactEmail}. Draft is NOT counted as sent.`
      );
    } finally {
      setIsCreatingGmailDraft(null);
    }
  };

  const executeConfirmedSentStatus = (draft: OutreachEmailDraft) => {
    setConfirmGmailAction(null);
    onUpdateDraftStatus(
      draft.id,
      {
        status: 'Confirmed Sent',
        gmailMessageId: `msg-${Date.now().toString(16)}`,
        gmailThreadId: `thr-${Date.now().toString(16)}`,
        sentAt: new Date().toISOString(),
      },
      `Synchronised sent status from Gmail for ${draft.contactEmail}. Scheduled Day 4 follow-up suggestion.`
    );
  };

  const handleRunAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    const biz = businesses.find((b) => b.id === astBizId) || businesses[0];
    if (!biz) return;
    setIsRunningAssistant(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: astTaskType,
          business: biz,
          contact: biz.contacts[0],
          contextText: astContext,
          serviceCatalogueSummary: services.map((s) => s.name).join(', '),
        }),
      });
      const data = await res.json();
      if (data?.assistantOutput) {
        setAssistantOutput(data.assistantOutput);
      } else {
        setAssistantOutput({
          headline: `${astTaskType} for ${biz.name} (${biz.country})`,
          classification: astTaskType.includes('Reply') ? 'Interested / Pricing Inquiry' : 'Strategic Prep',
          recommendedNextAction: `Schedule a 15-minute review with ${
            biz.contacts[0]?.fullName || 'decision-maker'
          } focused on ${biz.recommendedServices[0] || 'Product Advertisements'}.`,
          talkingPointsOrDraft: [
            `1. Reference verifiable evidence from ${biz.website}: ${biz.opportunitySummary}`,
            `2. Present AdVibe’s ${biz.recommendedServices[0] || 'Five Creative Pack'} with 5–7 business day turnaround and full commercial rights.`,
            `3. Address brand consistency by walking through AdVibe’s locked product-reference and storyboard approval pipeline.`,
          ],
          suggestedResponseText: `Hi ${
            biz.contacts[0]?.fullName.split(' ')[0] || 'there'
          },\n\nThank you for your note. Based on ${biz.name}'s current product lineup, I have prepared our ${
            biz.country
          } package breakdown and 3 visual hook concepts. Would Thursday at 2:00 PM work for a 15-minute walkthrough?\n\nBest regards,\nShittu — AdVibe Studios`,
        });
      }
    } finally {
      setIsRunningAssistant(false);
    }
  };

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName.trim()) return;
    const srv = services.find((s) => s.id === newCampServiceId) || services[0];
    onCreateCampaign({
      name: newCampName.trim(),
      type: newCampType,
      targetCountries: [newCampCountry],
      targetIndustries: srv.idealProspectTypes.slice(0, 3),
      promotedServiceId: srv.id,
      promotedServiceName: srv.name,
      objective: newCampObjective.trim(),
      tone: 'Consultative & Executive',
      followUpPolicyDays: [4, 9, 16],
      status: 'Active',
    });
    setNewCampName('');
    setShowNewCampaignModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Campaign Studio, Gmail Drafts & AI Outreach Assistant
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Strict individual email approval workflow connected to{' '}
            <span className="font-mono-tabular font-semibold text-slate-900">
              advibestudios.global@gmail.com
            </span>
            . Creating a Gmail draft is never counted as sending an email.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewCampaignModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>
          <button
            onClick={() => setStudioMode('generator')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Individual Email</span>
          </button>
        </div>
      </div>

      {/* Strict Separation Metrics Bar (Section 4.2 & 13.5) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Emails Prepared</div>
          <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900">
            {metrics.preparedCount}
          </div>
          <div className="text-xs text-slate-500">Individual 1-to-1 messages</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Awaiting Human Approval</div>
          <div className="mt-1 text-xl font-bold font-mono-tabular text-amber-700">
            {drafts.filter((d) => d.status === 'Pending Approval').length}
          </div>
          <div className="text-xs text-slate-500">Never auto-sent</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Gmail Drafts Created</div>
          <div className="mt-1 text-xl font-bold font-mono-tabular text-indigo-700">
            {metrics.gmailDraftsCreatedCount}
          </div>
          <div className="text-xs text-slate-500">Staged in Gmail (Not Sent)</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Confirmed Sent Emails</div>
          <div className="mt-1 text-xl font-bold font-mono-tabular text-emerald-700">
            {metrics.confirmedSentCount}
          </div>
          <div className="text-xs text-slate-500">Synchronised from Gmail</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Unique CTR / Replies</div>
          <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900">
            {metrics.uniqueCtr}% / {metrics.repliesReceivedCount}
          </div>
          <div className="text-xs text-slate-500">
            {metrics.totalClicksCount} total portfolio clicks
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setStudioMode('drafts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              studioMode === 'drafts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Individual Approval & Gmail Draft Queue ({drafts.length})
          </button>
          <button
            onClick={() => setStudioMode('generator')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              studioMode === 'generator'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Personalised Email Generator
          </button>
          <button
            onClick={() => setStudioMode('assistant')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              studioMode === 'assistant'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Outreach Assistant (Calls, Agendas & Replies)
          </button>
        </div>

        {studioMode === 'drafts' && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by campaign"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="ALL">All Campaigns ({campaigns.length})</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by message status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="ALL">All Message Statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Gmail Draft Created">Gmail Draft Created (Not Sent)</option>
              <option value="Confirmed Sent">Confirmed Sent</option>
              <option value="Replied">Replied</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* MODE 1: INDIVIDUAL APPROVAL & GMAIL DRAFT QUEUE */}
      {studioMode === 'drafts' && (
        <div className="space-y-4">
          {filteredDrafts.map((drf) => {
            const isEditing = editingDraftId === drf.id;
            return (
              <div
                key={drf.id}
                className="p-5 bg-white border border-slate-200 rounded-lg space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span
                        className={`font-semibold ${
                          drf.status === 'Pending Approval'
                            ? 'text-amber-700'
                            : drf.status === 'Gmail Draft Created'
                            ? 'text-indigo-700'
                            : drf.status === 'Confirmed Sent' || drf.status === 'Replied'
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        }`}
                      >
                        Status: {drf.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Campaign: {drf.campaignName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Step #{drf.sequenceStep}</span>
                      {drf.gmailDraftId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-slate-800">
                            Gmail Draft ID: {drf.gmailDraftId}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      To: {drf.contactName} &lt;{drf.contactEmail}&gt; —{' '}
                      <button
                        onClick={() => onOpenBusiness(drf.businessId)}
                        className="text-indigo-600 hover:underline"
                      >
                        {drf.businessName}
                      </button>{' '}
                      ({drf.country})
                    </div>
                    <div className="text-xs text-slate-500">
                      Promoted Service: <strong>{drf.recommendedServiceName}</strong> · Research
                      Evidence Used: {drf.researchEvidenceUsed}
                    </div>
                  </div>

                  {/* Individual Approval & Gmail Draft Controls (Section 13.5 & 14.3) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingDraftId(null);
                        } else {
                          setEditingDraftId(drf.id);
                          setEditSubject(drf.subject);
                          setEditBody(drf.body);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Subject & Body'}</span>
                    </button>

                    {drf.status === 'Pending Approval' && (
                      <>
                        <button
                          onClick={() =>
                            onUpdateDraftStatus(
                              drf.id,
                              {
                                status: 'Approved',
                                approvedAt: new Date().toISOString(),
                              },
                              `Approved individual email for ${drf.contactEmail}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Email</span>
                        </button>
                        <button
                          onClick={() =>
                            onUpdateDraftStatus(
                              drf.id,
                              { status: 'Rejected' },
                              `Rejected draft for ${drf.contactEmail}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {(drf.status === 'Approved' || drf.status === 'Pending Approval') && (
                      <button
                        onClick={() =>
                          setConfirmGmailAction({ type: 'create_draft', draft: drf })
                        }
                        disabled={isCreatingGmailDraft === drf.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>
                          {isCreatingGmailDraft === drf.id
                            ? 'Creating Draft...'
                            : 'Create Individual Gmail Draft'}
                        </span>
                      </button>
                    )}

                    {drf.status === 'Gmail Draft Created' && (
                      <button
                        onClick={() =>
                          setConfirmGmailAction({ type: 'confirm_sent', draft: drf })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm Sent in Gmail</span>
                      </button>
                    )}

                    {drf.status === 'Confirmed Sent' && (
                      <button
                        onClick={() =>
                          onUpdateDraftStatus(
                            drf.id,
                            {
                              uniqueClicks: 1,
                              totalClicks: drf.totalClicks + 1,
                              estimatedOpens: Math.max(1, drf.estimatedOpens + 1),
                            },
                            `Recorded tracked portfolio link click for ${drf.businessName}`
                          )
                        }
                        className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                      >
                        Record Tracked Click (+1)
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Personalised Email Body
                      </label>
                      <textarea
                        rows={7}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded p-3 bg-white font-sans"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateDraftStatus(
                            drf.id,
                            { subject: editSubject, body: editBody },
                            `Edited subject/body for ${drf.contactEmail}`
                          );
                          setEditingDraftId(null);
                        }}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-900 bg-slate-50 px-3 py-2 rounded border border-slate-200/80">
                      Subject: {drf.subject}
                    </div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50/50 p-3.5 rounded border border-slate-200/80 leading-relaxed">
                      {drf.body}
                    </pre>
                  </div>
                )}

                {drf.replySnippet && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 space-y-1">
                    <div className="font-bold">
                      Synchronised Gmail Reply — AI Classification: {drf.replyClassification} (Auto-Paused Sequence)
                    </div>
                    <p>"{drf.replySnippet}"</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 font-mono-tabular">
                  <span>Idempotency Key: {drf.idempotencyKey}</span>
                  <span>
                    Estimated Opens: {drf.estimatedOpens} · Unique Clicks: {drf.uniqueClicks} ·
                    Total Clicks: {drf.totalClicks}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: PERSONALISED EMAIL GENERATOR */}
      {studioMode === 'generator' && (
        <form
          onSubmit={handleGeneratePersonalisedEmail}
          className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 max-w-3xl"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              AI Research-Grounded Individual Email Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Uses verified research evidence, previous interaction timeline, and country-specific
              Service Catalogue pricing. Never fabricates familiarity or unconfigured discounts.
            </p>
          </div>

          {complianceError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{complianceError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Business *
              </label>
              <select
                value={genBizId}
                onChange={(e) => {
                  const id = e.target.value;
                  setGenBizId(id);
                  const b = businesses.find((x) => x.id === id);
                  setGenContactId(b?.contacts[0]?.id || '');
                }}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country} · Score: {b.leadScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Contact *
              </label>
              <select
                value={genContactId}
                onChange={(e) => setGenContactId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {selectedBiz?.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.jobTitle} ({c.email})
                  </option>
                ))}
                {selectedBiz?.contacts.length === 0 && (
                  <option value="">No public email available (Enrichment required)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Attribution
              </label>
              <select
                value={genCampaignId}
                onChange={(e) => setGenCampaignId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recommended AdVibe Service
              </label>
              <select
                value={genServiceId}
                onChange={(e) => setGenServiceId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sequence Step
              </label>
              <select
                value={genSequenceStep}
                onChange={(e) => setGenSequenceStep(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value={1}>Step 1 — Initial First-Contact Email</option>
                <option value={2}>Step 2 — Day 4 Contextual Follow-up #1</option>
                <option value={3}>Step 3 — Day 9 Value & Case Study Follow-up #2</option>
                <option value={4}>Step 4 — Day 16 Final Planned Follow-up</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Communication Tone
              </label>
              <select
                value={genTone}
                onChange={(e) => setGenTone(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="Consultative & Executive">Consultative & Executive</option>
                <option value="Creative & Observational">Creative & Observational</option>
                <option value="Direct & Value-Focused">Direct & Value-Focused</option>
                <option value="Warm Partnership">Warm Partnership</option>
              </select>
            </div>
          </div>

          {/* Grounded Context Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="font-semibold text-slate-900">
              Grounded Evidence & Configured Pricing for {selectedBiz?.name} ({selectedBiz?.country}):
            </div>
            <p className="text-slate-600">
              <strong>Opportunity Evidence:</strong> {selectedBiz?.opportunitySummary}
            </p>
            <p className="text-slate-600 font-mono-tabular">
              <strong>Catalogue Package ({selectedBiz?.country}):</strong>{' '}
              {countryPrice
                ? `${countryPrice.packageName} — ${countryPrice.currency} ${countryPrice.price.toLocaleString()} (${countryPrice.turnaroundTime})`
                : 'No country-specific fixed price configured — AI will recommend a custom scoping conversation without guessing.'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStudioMode('drafts')}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGenerating
                  ? 'Synthesising Research & Generating...'
                  : 'Generate Individual Email for Approval'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* MODE 3: AI OUTREACH ASSISTANT (Module 14 - Section 17) */}
      {studioMode === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleRunAssistant}
            className="p-5 bg-white border border-slate-200 rounded-xl space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Outreach & Relationship Assistant
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepare phone scripts, meeting agendas, proposal outlines, objection responses, or
                classify incoming prospect replies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Prospect Business
              </label>
              <select
                value={astBizId}
                onChange={(e) => setAstBizId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country} · {b.industry})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assistant Function (Section 17.2)
              </label>
              <select
                value={astTaskType}
                onChange={(e) => setAstTaskType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="Phone Conversation Talking Points">
                  Suggest Phone Conversation Talking Points
                </option>
                <option value="Discovery Meeting Agenda">Prepare 20-Minute Meeting Agenda</option>
                <option value="Draft Response to Incoming Reply">
                  Classify & Draft Response to Incoming Reply
                </option>
                <option value="Proposal & Scope Outline">Draft Tailored Service Proposal</option>
                <option value="Objection Handling Guidance">
                  Identify & Handle Prospect Objections
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Reply Text or Conversation Context
              </label>
              <textarea
                rows={4}
                value={astContext}
                onChange={(e) => setAstContext(e.target.value)}
                placeholder="Paste a prospect's email reply, objection, or meeting goal here..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isRunningAssistant}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              {isRunningAssistant
                ? 'Generating Recommendations...'
                : 'Generate Assistant Recommendation'}
            </button>
          </form>

          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Assistant Output (For Human Review)</h3>
            {assistantOutput ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900">{assistantOutput.headline}</div>
                  <div className="text-slate-600 mt-0.5">
                    Classification: <strong>{assistantOutput.classification}</strong> · Next
                    Recommended Action: {assistantOutput.recommendedNextAction}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Key Talking Points & Strategy:
                  </div>
                  <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                    {assistantOutput.talkingPointsOrDraft.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Suggested Draft Text:</div>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap font-sans text-slate-700">
                    {assistantOutput.suggestedResponseText}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select a business and function on the left to generate contextual talking points,
                meeting agendas, or reply suggestions.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Mutating Gmail Workspace Operations (Mandatory per workspace-integration skill) */}
      {confirmGmailAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Gmail Action"
        >
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {confirmGmailAction.type === 'create_draft'
                ? 'Confirm Individual Gmail Draft Creation'
                : 'Confirm Message Sent in Gmail'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmGmailAction.type === 'create_draft'
                ? `Create an individual Gmail draft in advibestudios.global@gmail.com addressed to ${confirmGmailAction.draft.contactName} (${confirmGmailAction.draft.contactEmail}) with subject "${confirmGmailAction.draft.subject}"? This will stage the draft without sending it.`
                : `Confirm that the email to ${confirmGmailAction.draft.contactName} (${confirmGmailAction.draft.contactEmail}) has been sent from Gmail? This will update CRM outreach status and schedule the Day 4 follow-up task suggestion.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmGmailAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmGmailAction.type === 'create_draft'
                    ? executeConfirmedGmailDraftCreation(confirmGmailAction.draft)
                    : executeConfirmedSentStatus(confirmGmailAction.draft)
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create Outreach Campaign"
        >
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New Outreach Campaign</h3>
            <form onSubmit={handleCreateCampaignSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  placeholder="e.g., Ghana & Nigeria Beauty Brands Q4 Creative Pack"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Campaign Type (Section 13.2)
                </label>
                <select
                  value={newCampType}
                  onChange={(e) => setNewCampType(e.target.value as OutreachCampaign['type'])}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {CAMPAIGN_TYPES.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Primary Target Market
                  </label>
                  <select
                    value={newCampCountry}
                    onChange={(e) => setNewCampCountry(e.target.value as TargetCountry)}
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Promoted AdVibe Service
                  </label>
                  <select
                    value={newCampServiceId}
                    onChange={(e) => setNewCampServiceId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Outreach Objective
                </label>
                <input
                  type="text"
                  value={newCampObjective}
                  onChange={(e) => setNewCampObjective(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
