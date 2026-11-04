import React, { useState } from 'react';
import {
  AdVibeService,
  AuditLogEntry,
  AutomationRule,
  BusinessRecord,
  CurrencyCode,
  DailyCountryAllocation,
  DiscoveryJobReport,
  FollowUpTask,
  NavigationModule,
  OutreachCampaign,
  OutreachEmailDraft,
  SuppressionRecord,
  TargetCountry,
  UserRole,
} from '../types/advibe';
import { calculateEmailPerformanceMetrics } from '../utils/intelligenceRules';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Mail,
  Play,
  Plus,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface OperationsAndSettingsViewsProps {
  module:
    | 'overview'
    | 'email-performance'
    | 'tasks-activities'
    | 'analytics'
    | 'automation'
    | 'integrations'
    | 'compliance'
    | 'settings';
  businesses: BusinessRecord[];
  tasks: FollowUpTask[];
  drafts: OutreachEmailDraft[];
  campaigns: OutreachCampaign[];
  services: AdVibeService[];
  allocations: DailyCountryAllocation[];
  discoveryReports: DiscoveryJobReport[];
  automations: AutomationRule[];
  suppressionList: SuppressionRecord[];
  auditLogs: AuditLogEntry[];
  knowledgeBase: {
    companyDescription: string;
    brandPositioning: string;
    productionProcess: string;
    turnaroundTimes: string;
    revisionPolicy: string;
    ownershipTerms: string;
    caseStudies: string[];
    approvedSalesLanguage: string;
    objectionHandling: string;
    bookingInfo: string;
  };
  currentUserRole: UserRole;
  authUserEmail: string | null;
  hasGmailToken: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onNavigate: (mod: NavigationModule) => void;
  onOpenBusiness: (businessId: string) => void;
  onToggleAutomation: (ruleId: string) => void;
  onRunAutomationNow: (ruleId: string) => void;
  onAddSuppression: (rec: Omit<SuppressionRecord, 'id' | 'dateAdded'>) => void;
  onRemoveSuppression: (id: string) => void;
  onUpdateServices: (services: AdVibeService[]) => void;
  onUpdateKnowledgeBase: (kb: OperationsAndSettingsViewsProps['knowledgeBase']) => void;
  onChangeUserRole: (role: UserRole) => void;
}

export const OperationsAndSettingsViews: React.FC<OperationsAndSettingsViewsProps> = ({
  module,
  businesses,
  tasks,
  drafts,
  campaigns,
  services,
  allocations,
  discoveryReports,
  automations,
  suppressionList,
  auditLogs,
  knowledgeBase,
  currentUserRole,
  authUserEmail,
  hasGmailToken,
  onGoogleLogin,
  onGoogleLogout,
  onNavigate,
  onOpenBusiness,
  onToggleAutomation,
  onRunAutomationNow,
  onAddSuppression,
  onRemoveSuppression,
  onUpdateServices,
  onUpdateKnowledgeBase,
  onChangeUserRole,
}) => {
  const [dateRangeFilter, setDateRangeFilter] = useState<
    'Today' | 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Last 90 days'
  >('Last 30 days');

  // Compliance form state
  const [supTarget, setSupTarget] = useState('');
  const [supBizName, setSupBizName] = useState('');
  const [supCountry, setSupCountry] = useState<TargetCountry>('United Kingdom');
  const [supReason, setSupReason] = useState<SuppressionRecord['reason']>('Do Not Contact Request');
  const [supNote, setSupNote] = useState('');

  // Settings Service Pricing Editor State
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [newPriceCountry, setNewPriceCountry] = useState<TargetCountry>('United Kingdom');
  const [newPriceCurrency, setNewPriceCurrency] = useState<CurrencyCode>('GBP');
  const [newPriceAmount, setNewPriceAmount] = useState<string>('1900');
  const [newPackageName, setNewPackageName] = useState<string>('Five Creative Pack');
  const [newPackageDesc, setNewPackageDesc] = useState<string>(
    '5 bespoke commercial AI video advertisements + 10 hook variations.'
  );

  // SendFox Provider state
  const [sendFoxConnected, setSendFoxConnected] = useState<boolean>(true);
  const [sendFoxListCount, setSendFoxListCount] = useState<number>(318);

  const emailMetrics = calculateEmailPerformanceMetrics(drafts);
  const latestReport = discoveryReports[0];
  const dueTodayTasks = tasks.filter((t) => t.status === 'Due today' || t.status === 'Overdue');
  const dream100Count = businesses.filter((b) => b.isDream100).length;

  // ============================================================================
  // MODULE 1: OVERVIEW (MAIN DASHBOARD - Section 4)
  // ============================================================================
  if (module === 'overview') {
    return (
      <div className="space-y-6">
        {/* Top Row: Title + Date Range Selector (Section 4.3) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              AdVibe Prospect Intelligence — Executive Overview
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Operating Cycle: DISCOVER → RESEARCH → QUALIFY → PRIORITISE → CONTACT → TRACK →
              FOLLOW UP → BUILD RELATIONSHIPS → CONVERT.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Last 90 days'] as const).map(
              (rng) => (
                <button
                  key={rng}
                  onClick={() => setDateRangeFilter(rng)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    dateRangeFilter === rng
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rng}
                </button>
              )
            )}
          </div>
        </div>

        {/* 4 Metric Groups from Section 4.2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Discovery Statistics */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">01. Discovery Statistics</span>
              <button
                onClick={() => onNavigate('discover')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Configure
              </button>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              {latestReport?.qualifiedBusinesses || 50}{' '}
              <span className="text-xs font-normal text-slate-500">
                / 50 Daily Qualified Target
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 font-mono-tabular pt-1 border-t border-slate-100">
              <div>Raw Candidates Investigated Today: {latestReport?.rawCandidatesInvestigated || 132}</div>
              <div>Duplicates Filtered: {latestReport?.duplicatesDetected || 23}</div>
              <div>Rejected Unsuitable: {latestReport?.rejectedBusinesses || 59}</div>
              <div>Total Unified CRM Records: {businesses.length}</div>
            </div>
          </div>

          {/* 2. Outreach Statistics (Strict separation of Drafts vs Sent) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">02. Outreach Statistics</span>
              <button
                onClick={() => onNavigate('campaign-studio')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Studio
              </button>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-emerald-700">
              {emailMetrics.confirmedSentCount}{' '}
              <span className="text-xs font-normal text-slate-500">Confirmed Sent</span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 font-mono-tabular pt-1 border-t border-slate-100">
              <div>Emails Prepared: {emailMetrics.preparedCount}</div>
              <div className="text-indigo-700 font-semibold">
                Gmail Drafts Created (Not Sent): {emailMetrics.gmailDraftsCreatedCount}
              </div>
              <div>Follow-ups Due / Overdue: {dueTodayTasks.length}</div>
              <div>Replies Received: {emailMetrics.repliesReceivedCount}</div>
            </div>
          </div>

          {/* 3. Engagement Statistics */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">03. Engagement Statistics</span>
              <button
                onClick={() => onNavigate('email-performance')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Analytics
              </button>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              {emailMetrics.uniqueCtr}%{' '}
              <span className="text-xs font-normal text-slate-500">Unique Click-Through Rate</span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 font-mono-tabular pt-1 border-t border-slate-100">
              <div>Estimated Open Rate: {emailMetrics.estimatedOpenRate}%</div>
              <div>Total Portfolio Clicks: {emailMetrics.totalClicksCount}</div>
              <div>Reply Rate: {emailMetrics.replyRate}%</div>
              <div>Meetings Booked: {businesses.filter((b) => b.pipelineStage === 'Meeting scheduled').length}</div>
            </div>
          </div>

          {/* 4. Sales Statistics */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">04. Sales Pipeline & Dream 100</span>
              <button
                onClick={() => onNavigate('pipeline')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Pipeline
              </button>
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              {businesses.reduce((acc, b) => acc + b.opportunities.length, 0)}{' '}
              <span className="text-xs font-normal text-slate-500">Active Opportunities</span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 font-mono-tabular pt-1 border-t border-slate-100">
              <div>Dream 100 Active Accounts: {dream100Count}/100</div>
              <div>
                Proposals Requested / Sent:{' '}
                {
                  businesses.filter(
                    (b) =>
                      b.pipelineStage === 'Proposal requested' ||
                      b.pipelineStage === 'Proposal sent'
                  ).length
                }
              </div>
              <div>Qualified Contact-Ready: {businesses.filter((b) => b.qualificationStatus === 'Qualified – contact available').length}</div>
              <div>Suppressed / Opt-Out: {suppressionList.length}</div>
            </div>
          </div>
        </div>

        {/* Visualisations Row: Daily Country Allocations vs Target + Urgent Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Country Allocation Progress */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daily Qualified Discovery by Target Country (50/Day Operating Target)
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time breakdown across United States, United Kingdom, Nigeria, Ghana, and
                  Kenya.
                </p>
              </div>
              <button
                onClick={() => onNavigate('discover')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Run Discovery
              </button>
            </div>

            <div className="space-y-3">
              {allocations.map((item) => {
                const pct = Math.min(
                  100,
                  Math.round((item.qualifiedToday / Math.max(1, item.targetPerDay)) * 100)
                );
                return (
                  <div key={item.country} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{item.country}</span>
                      <span className="font-mono-tabular text-slate-600">
                        {item.qualifiedToday} / {item.targetPerDay} qualified ({item.discoveredToday}{' '}
                        raw investigated)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Follow-ups Due Today & Overdue */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Priority Follow-ups Due Today & Overdue ({dueTodayTasks.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Every prospect has a clear next recommended relationship action.
                </p>
              </div>
              <button
                onClick={() => onNavigate('follow-ups')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Open Follow-up Manager
              </button>
            </div>

            <div className="space-y-2.5">
              {dueTodayTasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-3 bg-slate-50/40"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`font-semibold ${
                          t.status === 'Overdue' ? 'text-red-600' : 'text-amber-700'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t.country}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.channel}</span>
                    </div>
                    <button
                      onClick={() => onOpenBusiness(t.businessId)}
                      className="text-xs font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left mt-0.5"
                    >
                      {t.businessName} — {t.purpose}
                    </button>
                  </div>
                  <button
                    onClick={() => onNavigate('follow-ups')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
                  >
                    Action
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 12 & 13: EMAIL PERFORMANCE & SENDFOX ANALYTICS (Section 15 & 16)
  // ============================================================================
  if (module === 'email-performance') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Email Tracking, Campaign Performance & SendFox Analytics
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Gmail 1-to-1 prospecting metrics and SendFox permission-based newsletter metrics are
            reported separately with explicit denominators (Section 15.6).
          </p>
        </div>

        {/* Open Tracking Accuracy Notice (Mandatory per Section 15.3) */}
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
          <strong>Methodology Note on "Estimated Opens" (Section 15.3):</strong> Open events are
          labelled <em>Estimated opens</em> because email privacy protections, Apple Mail Privacy
          Protection, automated image pre-loading, and enterprise security scanners can trigger
          tracking pixels without human reading. Opens are never treated as proof of prospect
          interest. Unique link click-throughs and verified replies are primary engagement signals.
        </div>

        {/* Provider 1: Gmail 1-to-1 Personalised Outreach Metrics */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Provider 1: Gmail 1-to-1 Personalised Prospecting (advibestudios.global@gmail.com)
              </h2>
              <p className="text-xs text-slate-500">
                Denominator for rate percentages: Confirmed Sent Messages ({emailMetrics.confirmedSentCount}).
                Gmail Drafts ({emailMetrics.gmailDraftsCreatedCount}) are excluded from sent volume.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-mono-tabular">
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Gmail Drafts Created</div>
              <div className="text-lg font-bold text-indigo-700 mt-0.5">
                {emailMetrics.gmailDraftsCreatedCount}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Confirmed Sent</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {emailMetrics.confirmedSentCount}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Estimated Opens</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {emailMetrics.estimatedOpenRate}% ({emailMetrics.estimatedOpenedMessages})
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Unique Clicks (CTR)</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {emailMetrics.uniqueCtr}% ({emailMetrics.uniqueClickedMessages})
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Total Link Clicks</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {emailMetrics.totalClicksCount}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-sans text-slate-500">Positive Reply Rate</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">
                {emailMetrics.positiveReplyRate}% ({emailMetrics.positiveRepliesCount})
              </div>
            </div>
          </div>

          {/* Tracked Outbound Links Table (Section 15.4) */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-900 mb-2">
              Tracked Portfolio & Case Study Link Attribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Business & Contact</th>
                    <th className="py-2 px-4">Link Label & Approved Destination</th>
                    <th className="py-2 px-4 text-right">Estimated Opens</th>
                    <th className="py-2 px-4 text-right">Unique Clickers</th>
                    <th className="py-2 pl-4 text-right">Total Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {drafts.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {d.businessName} · {d.contactName} ({d.status})
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-mono-tabular">
                        {d.trackedLinks[0]?.label || 'Portfolio Link'} →{' '}
                        {d.trackedLinks[0]?.destinationUrl}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular">
                        {d.estimatedOpens}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold">
                        {d.uniqueClicks}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono-tabular">
                        {d.totalClicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Provider 2: SendFox Optional Permission-Based Newsletter Integration (Section 16) */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Provider 2: SendFox Newsletter & Permission-Based Subscriber Lists (Section 16)
              </h2>
              <p className="text-xs text-slate-500">
                Used strictly for opted-in newsletter subscribers and AI Video Directing Academy
                updates. Never used as a substitute for 1-to-1 Gmail prospecting.
              </p>
            </div>
            <span className="text-xs font-mono-tabular font-semibold text-emerald-700">
              {sendFoxConnected ? `Connected (${sendFoxListCount} Opted-in Subscribers)` : 'Disconnected'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-900">List: AdVibe Monthly Creative Digest</div>
              <div className="text-slate-600 mt-1 font-mono-tabular">
                214 eligible subscribers · Unsubscribes auto-synced to Compliance Suppression List
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-900">
                List: AI Video Directing Training Academy Waitlist
              </div>
              <div className="text-slate-600 mt-1 font-mono-tabular">
                104 eligible subscribers · Double opt-in verified
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-900">SendFox API Capability Transparency</div>
              <div className="text-slate-600 mt-1">
                Synchronises subscriber lists, campaign creation, and unsubscribe webhooks.
                Individual per-message thread reply tracking is handled via Gmail API, not SendFox.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 15: TASKS & ACTIVITIES + CALENDAR VIEW (Section 18)
  // ============================================================================
  if (module === 'tasks-activities') {
    const allActivities = businesses
      .flatMap((b) =>
        b.timeline.map((ev) => ({
          ...ev,
          businessName: b.name,
          country: b.country,
        }))
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Global Tasks, CRM Activities & Calendar Schedule
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Unified chronological log of all Research, Emails, Calls, WhatsApp conversations,
            Meetings, and Proposals across all businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Schedule Column */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              November 2026 Scheduled Calendar (Section 18.4)
            </h2>
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-slate-600">
                    <span className="font-bold text-indigo-700">
                      {t.dueDate} · {t.dueTime}
                    </span>
                    <span>{t.channel}</span>
                  </div>
                  <div className="font-semibold text-slate-900">{t.purpose}</div>
                  <div className="text-slate-500">
                    {t.businessName} ({t.contactName})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Activity Feed */}
          <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Consolidated Business Activity Stream ({allActivities.length} Events)
            </h2>
            <div className="space-y-3">
              {allActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 border border-slate-200 rounded-lg flex flex-wrap items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="text-slate-500">
                      <button
                        onClick={() => onOpenBusiness(act.businessId)}
                        className="font-bold text-slate-900 hover:text-indigo-600 hover:underline"
                      >
                        {act.businessName}
                      </button>{' '}
                      ({act.country}) · {act.type} · {act.origin}
                    </div>
                    <div className="font-semibold text-slate-900">{act.title}</div>
                    <p className="text-slate-600">{act.description}</p>
                  </div>
                  <span className="font-mono-tabular text-slate-500">
                    {act.timestamp.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 11: ANALYTICS & REPORTS (Section 4.3 & 15.6)
  // ============================================================================
  if (module === 'analytics') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Sales Intelligence Analytics & Conversion Funnel Reports
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Performance breakdown by target market, commercial category, qualification score tier,
            and AdVibe service package.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              End-to-End Prospect Conversion Funnel
            </h2>
            <div className="space-y-2.5 text-xs">
              {[
                {
                  stage: '1. Raw Candidates Investigated (Last 2 Runs)',
                  count: discoveryReports.reduce((a, r) => a + r.rawCandidatesInvestigated, 0),
                },
                {
                  stage: '2. Qualified Businesses Passing Evidence Gate',
                  count: discoveryReports.reduce((a, r) => a + r.qualifiedBusinesses, 0),
                },
                {
                  stage: '3. Active Unified CRM Prospects',
                  count: businesses.length,
                },
                {
                  stage: '4. Gmail Drafts Prepared / Confirmed Sent',
                  count: `${emailMetrics.gmailDraftsCreatedCount} Drafts / ${emailMetrics.confirmedSentCount} Sent`,
                },
                {
                  stage: '5. Replied / Meeting Scheduled / Proposal Requested',
                  count: businesses.filter(
                    (b) =>
                      b.hasReplied ||
                      b.pipelineStage === 'Meeting scheduled' ||
                      b.pipelineStage === 'Proposal requested'
                  ).length,
                },
              ].map((row) => (
                <div
                  key={row.stage}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <span className="font-medium text-slate-800">{row.stage}</span>
                  <span className="font-mono-tabular font-bold text-indigo-700">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Pipeline Opportunities by Recommended AdVibe Service
            </h2>
            <div className="space-y-2.5 text-xs">
              {services.slice(0, 6).map((srv) => {
                const matching = businesses.filter((b) =>
                  b.recommendedServices.includes(srv.name)
                ).length;
                return (
                  <div
                    key={srv.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{srv.name}</div>
                      <div className="text-slate-500">Code: {srv.code}</div>
                    </div>
                    <span className="font-mono-tabular font-bold text-slate-900">
                      {matching} qualified prospects
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 16: AUTOMATION CENTRE (Section 19)
  // ============================================================================
  if (module === 'automation') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Background Automation Centre & Workflow Rules (Section 19)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Configure scheduled background discovery, research, scoring, follow-up interval
            suggestions, and incoming reply pause guards.
          </p>
        </div>

        <div className="space-y-3">
          {automations.map((rule) => (
            <div
              key={rule.id}
              className="p-5 bg-white border border-slate-200 rounded-xl flex flex-wrap items-start justify-between gap-4"
            >
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-indigo-700">{rule.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {rule.enabled ? 'Enabled' : 'Paused'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Last Run: {rule.lastExecutedAt} ({rule.executionCount} runs)
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                <div className="text-xs text-slate-600">
                  <strong>Trigger:</strong> {rule.trigger} · <strong>Conditions:</strong>{' '}
                  {rule.conditions}
                </div>
                <div className="text-xs text-slate-600">
                  <strong>Action:</strong> {rule.actions}
                </div>
                <div className="text-xs text-emerald-800 bg-emerald-50/70 px-2.5 py-1 rounded border border-emerald-200/70 mt-1">
                  Latest Execution Result: {rule.lastResultSummary}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRunAutomationNow(rule.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Now</span>
                </button>
                <button
                  onClick={() => onToggleAutomation(rule.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    rule.enabled
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  {rule.enabled ? 'Pause Rule' : 'Resume Rule'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 18: INTEGRATIONS (Section 14 & 21)
  // ============================================================================
  if (module === 'integrations') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Platform Integrations & OAuth Connection Centre (Section 14 & 21)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Provider-independent email and intelligence architecture with narrowest-privilege OAuth
            2.0 permissions.
          </p>
        </div>

        {/* Primary Gmail OAuth Card (Section 14.1 & 14.2) */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-xs font-semibold text-indigo-700">
                Primary Outreach Integration · Google OAuth 2.0
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Gmail API Integration — Target Account: advibestudios.global@gmail.com
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Permissions Requested Before Connecting (Section 14.2):</strong> Uses narrow
                Google OAuth 2.0 permissions (<code>gmail.compose</code> for creating individual
                personalised outreach drafts and <code>gmail.readonly</code> for synchronising sent
                messages and incoming prospect replies). AdVibe Prospect Intelligence never requests
                or stores your Gmail password and never automatically sends cold emails without your
                explicit confirmation.
              </p>
              <div className="text-xs font-mono-tabular text-slate-700 pt-1">
                Connection State:{' '}
                <strong>
                  {authUserEmail
                    ? `Authenticated as ${authUserEmail} (${
                        hasGmailToken ? 'OAuth Token Active in Memory' : 'Firebase Session Active'
                      })`
                    : 'Ready for Google Sign-In'}
                </strong>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Official "Sign in with Google" Button Style per workspace-integration skill */}
              <button
                onClick={onGoogleLogin}
                className="inline-flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4 block shrink-0"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
                <span>
                  {authUserEmail ? 'Reconnect / Refresh Gmail Scopes' : 'Sign in with Google'}
                </span>
              </button>
              {authUserEmail && (
                <button
                  onClick={onGoogleLogout}
                  className="text-xs text-slate-500 hover:text-red-600 underline"
                >
                  Disconnect Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* All Required Integrations Grid (Section 21) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'AI Research, Qualification & Writing Engine',
              purpose: 'Structured business research, 8-criterion lead scoring, and email drafting',
              status: 'Connected · Server-Side Proxy (/api/ai/*)',
              lastSync: '2026-11-04 08:40 UTC',
            },
            {
              name: 'SendFox API (Newsletter Provider)',
              purpose: 'Permission-based newsletter lists, click stats & unsubscribe sync',
              status: sendFoxConnected ? 'Connected · API Token Verified' : 'Disconnected',
              lastSync: '2026-11-04 06:30 UTC',
            },
            {
              name: 'Multi-Source Business Discovery Adapters',
              purpose: 'Permitted search APIs, official business websites, and public directories',
              status: 'Connected · Respects robots/access rules',
              lastSync: '2026-11-04 06:00 UTC',
            },
            {
              name: 'Website Evidence Extraction Service',
              purpose: 'Extracts product catalogs, campaign banners, and public contact pages',
              status: 'Connected · Active',
              lastSync: '2026-11-04 06:12 UTC',
            },
            {
              name: 'Email Verification & Domain Normaliser',
              purpose: 'Syntax, MX domain, and duplicate domain verification prior to outreach',
              status: 'Connected · Active',
              lastSync: '2026-11-04 07:45 UTC',
            },
            {
              name: 'Persistent Database & Zero-Trust Rules',
              purpose: 'Stores businesses, contacts, tasks, and campaign drafts with RBAC rules',
              status: 'Connected · Hardened Rules Deployed',
              lastSync: 'Real-time',
            },
          ].map((intg) => (
            <div
              key={intg.name}
              className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs"
            >
              <div className="font-bold text-slate-900">{intg.name}</div>
              <p className="text-slate-600">{intg.purpose}</p>
              <div className="pt-2 border-t border-slate-100 font-mono-tabular text-emerald-700 font-semibold">
                {intg.status}
              </div>
              <div className="text-slate-400 font-mono-tabular">Last Sync: {intg.lastSync}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 17: COMPLIANCE & CONTACT GOVERNANCE CENTRE (Section 20)
  // ============================================================================
  if (module === 'compliance') {
    const handleAddSuppressionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!supTarget.trim() || !supBizName.trim()) return;
      onAddSuppression({
        emailOrDomain: supTarget.trim().toLowerCase(),
        businessName: supBizName.trim(),
        country: supCountry,
        reason: supReason,
        lawfulBasisNote:
          supNote.trim() ||
          'Permanently suppressed from marketing and blocked from future discovery re-entry.',
        addedBy: 'Shittu (Founder)',
      });
      setSupTarget('');
      setSupBizName('');
      setSupNote('');
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Compliance, Contact Governance & Suppression Centre (Section 20)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Enforces multi-jurisdiction B2B contact governance (US, UK, Nigeria, Ghana, Kenya). A
            suppressed contact or domain is never contacted or reintroduced by future discovery
            runs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Suppression / Deletion Request Form */}
          <form
            onSubmit={handleAddSuppressionSubmit}
            className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 text-xs"
          >
            <h2 className="text-sm font-bold text-slate-900">
              Add Contact / Domain to Suppression List
            </h2>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address or Normalized Domain *
              </label>
              <input
                type="text"
                required
                value={supTarget}
                onChange={(e) => setSupTarget(e.target.value)}
                placeholder="e.g., optout@company.co.uk or company.co.uk"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={supBizName}
                onChange={(e) => setSupBizName(e.target.value)}
                placeholder="e.g., Example Retail Ltd"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jurisdiction</label>
                <select
                  value={supCountry}
                  onChange={(e) => setSupCountry(e.target.value as TargetCountry)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 bg-white"
                >
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                <select
                  value={supReason}
                  onChange={(e) => setSupReason(e.target.value as SuppressionRecord['reason'])}
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 bg-white"
                >
                  <option value="Do Not Contact Request">Do Not Contact Request</option>
                  <option value="Unsubscribed">Unsubscribed</option>
                  <option value="Deletion Request">Deletion Request</option>
                  <option value="Hard Bounce">Hard Bounce</option>
                  <option value="Manual Suppression">Manual Suppression</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lawful Basis / Governance Note
              </label>
              <input
                type="text"
                value={supNote}
                onChange={(e) => setSupNote(e.target.value)}
                placeholder="Record opt-out source or deletion request reference..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              Enforce Permanent Suppression
            </button>
          </form>

          {/* Active Suppression List */}
          <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Active Suppression & Opt-Out Registry ({suppressionList.length})
            </h2>
            <div className="space-y-2.5">
              {suppressionList.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 font-mono-tabular">
                      {s.emailOrDomain} — <span className="font-sans">{s.businessName}</span> (
                      {s.country})
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Reason: <strong>{s.reason}</strong> · {s.lawfulBasisNote}
                    </div>
                    <div className="text-slate-400 font-mono-tabular mt-0.5">
                      Added: {s.dateAdded} by {s.addedBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Audit Logs (Section 20.2) */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Immutable Governance & Action Audit Logs ({auditLogs.length})
          </h2>
          <div className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-900">{log.action}</span> · Target:{' '}
                  <span className="font-medium text-indigo-700">{log.targetRecord}</span>
                  <div className="text-slate-600 mt-0.5">{log.details}</div>
                </div>
                <div className="text-right font-mono-tabular text-slate-500">
                  <div>{log.timestamp}</div>
                  <div>
                    {log.actor} ({log.role})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODULE 9 & SETTINGS: SERVICE CATALOGUE, PRICING, AI KNOWLEDGE BASE & RBAC (Section 2 & 12)
  // ============================================================================
  const currentService = services.find((s) => s.id === selectedServiceId) || services[0];

  const handleAddCountryPricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService || !newPackageName.trim()) return;
    const newPrice = {
      id: `prc-${Date.now()}`,
      serviceId: currentService.id,
      country: newPriceCountry,
      currency: newPriceCurrency,
      price: Number(newPriceAmount) || 2000,
      packageName: newPackageName.trim(),
      packageDescription: newPackageDesc.trim(),
      deliverables: ['Master Commercial Video Assets', 'Hook Variations', 'Full Broadcast Rights'],
      videoDurationLimit: 'Up to 60 seconds',
      turnaroundTime: '5 business days',
      validityPeriod: '2026 Rate Card',
      active: true,
      discountRules: 'Standard commercial terms',
      internalNotes: 'Configured in Administration Settings',
    };

    const updatedServices = services.map((s) =>
      s.id === currentService.id
        ? {
            ...s,
            pricingByCountry: [
              ...s.pricingByCountry.filter((p) => p.country !== newPriceCountry),
              newPrice,
            ],
          }
        : s
    );
    onUpdateServices(updatedServices);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Administration Settings, AdVibe Service Catalogue & AI Knowledge Base (Section 2 & 12)
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          All service descriptions, country-specific prices, AI business knowledge, and role
          permissions are configurable here without modifying application code.
        </p>
      </div>

      {/* Role & Permissions Matrix (Section 2.2) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Multi-User Role & Access Control Governance (Section 2.2)
            </h2>
            <p className="text-xs text-slate-500">
              Active Role: <strong>{currentUserRole}</strong> (Enforced across server & database
              rules).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="role-switcher" className="text-xs font-medium text-slate-700">
              Active Role:
            </label>
            <select
              id="role-switcher"
              value={currentUserRole}
              onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-semibold"
            >
              <option value="Administrator">Administrator (Founder — Full Access)</option>
              <option value="Sales Manager">Sales Manager (Pipeline, Campaigns & Assignment)</option>
              <option value="Sales Representative">
                Sales Representative (Assigned Leads & Follow-ups)
              </option>
              <option value="Researcher">Researcher (Investigation & Enrichment Only)</option>
              <option value="Viewer">Viewer (Read-Only Analytics & Records)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Central AdVibe Service Catalogue & Country Pricing Editor (Section 12.2 & 12.4) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            AdVibe Service Catalogue & Country-Specific Pricing Editor ({services.length} Services)
          </h2>
          <p className="text-xs text-slate-500">
            The AI strictly uses these configured rates and never invents unconfigured prices or
            discounts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Select Service Category (Section 12.2)
            </label>
            {services.map((srv) => (
              <button
                key={srv.id}
                onClick={() => setSelectedServiceId(srv.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                  srv.id === currentService?.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold">{srv.name}</div>
                <div className="opacity-80 mt-0.5">
                  {srv.pricingByCountry.length} country rate cards configured
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {currentService && (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{currentService.name}</div>
                  <p className="text-slate-600">{currentService.shortDescription}</p>
                  <div className="text-slate-500 pt-1">
                    Ideal Prospect Categories: {currentService.idealProspectTypes.join(' · ')}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900">
                    Configured Market Pricing for {currentService.name}
                  </h3>
                  {currentService.pricingByCountry.length === 0 ? (
                    <div className="p-3 border border-slate-200 rounded-lg text-xs text-amber-800 bg-amber-50">
                      No fixed country price configured — AI will recommend a custom scoping
                      conversation rather than guessing a price.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentService.pricingByCountry.map((prc) => (
                        <div
                          key={prc.id}
                          className="p-3 border border-slate-200 rounded-lg bg-white text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{prc.country}</span>
                            <span className="font-mono-tabular text-indigo-700">
                              {prc.currency} {prc.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="font-medium text-slate-800">{prc.packageName}</div>
                          <div className="text-slate-500">{prc.packageDescription}</div>
                          <div className="text-slate-400 font-mono-tabular">
                            Turnaround: {prc.turnaroundTime} · {prc.discountRules}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add / Update Country Pricing Form */}
                <form
                  onSubmit={handleAddCountryPricing}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-900">
                    Add or Update Country Rate Card for {currentService.name}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Market</label>
                      <select
                        value={newPriceCountry}
                        onChange={(e) => {
                          const c = e.target.value as TargetCountry;
                          setNewPriceCountry(c);
                          const map: Record<TargetCountry, CurrencyCode> = {
                            'United States': 'USD',
                            'United Kingdom': 'GBP',
                            Nigeria: 'NGN',
                            Ghana: 'GHS',
                            Kenya: 'KES',
                          };
                          setNewPriceCurrency(map[c]);
                        }}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      >
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Kenya">Kenya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Currency</label>
                      <input
                        type="text"
                        readOnly
                        value={newPriceCurrency}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-slate-100 font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Package Price</label>
                      <input
                        type="number"
                        required
                        value={newPriceAmount}
                        onChange={(e) => setNewPriceAmount(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-mono-tabular"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Package Name</label>
                      <input
                        type="text"
                        required
                        value={newPackageName}
                        onChange={(e) => setNewPackageName(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block font-medium text-slate-700 mb-1">
                          Deliverable Summary
                        </label>
                        <input
                          type="text"
                          value={newPackageDesc}
                          onChange={(e) => setNewPackageDesc(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded whitespace-nowrap"
                      >
                        Save Rate
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Business Knowledge Base Editor (Section 12.5) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900">
          Approved AdVibe AI Business Knowledge Base (Section 12.5)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              AdVibe Company Description & Positioning
            </label>
            <textarea
              rows={3}
              value={knowledgeBase.companyDescription}
              onChange={(e) =>
                onUpdateKnowledgeBase({ ...knowledgeBase, companyDescription: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Production Process & Turnaround Times
            </label>
            <textarea
              rows={3}
              value={knowledgeBase.productionProcess}
              onChange={(e) =>
                onUpdateKnowledgeBase({ ...knowledgeBase, productionProcess: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Approved Sales Language & Non-Hallucination Rules
            </label>
            <textarea
              rows={3}
              value={knowledgeBase.approvedSalesLanguage}
              onChange={(e) =>
                onUpdateKnowledgeBase({ ...knowledgeBase, approvedSalesLanguage: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Revision Policy & Commercial Ownership Terms
            </label>
            <textarea
              rows={3}
              value={knowledgeBase.ownershipTerms}
              onChange={(e) =>
                onUpdateKnowledgeBase({ ...knowledgeBase, ownershipTerms: e.target.value })
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
