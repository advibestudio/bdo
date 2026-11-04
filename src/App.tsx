/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AdVibeService,
  AuditLogEntry,
  AutomationRule,
  BusinessRecord,
  DailyCountryAllocation,
  DiscoveryJobReport,
  FollowUpOutcome,
  FollowUpTask,
  NavigationModule,
  OutreachCampaign,
  OutreachEmailDraft,
  SuppressionRecord,
  UserRole,
} from './types/advibe';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_BUSINESSES,
  INITIAL_BUSINESS_CATEGORIES,
  INITIAL_CAMPAIGNS,
  INITIAL_DAILY_ALLOCATIONS,
  INITIAL_DISCOVERY_REPORTS,
  INITIAL_EMAIL_DRAFTS,
  INITIAL_FOLLOW_UP_TASKS,
  INITIAL_KNOWLEDGE_BASE,
  INITIAL_SERVICE_CATALOGUE,
  INITIAL_SUPPRESSION_LIST,
} from './data/seedData';
import {
  deleteBusinessFromFirestore,
  googleSignIn,
  initAuth,
  loadBusinessesFromFirestore,
  logout,
  purgeAllUserFirestoreData,
  syncBusinessToFirestore,
  syncCampaignDraftToFirestore,
  syncFollowUpTaskToFirestore,
  testFirestoreConnection,
} from './lib/firebase';
import { getNextActionRecommendationForOutcome } from './utils/intelligenceRules';
import { BusinessProfileModal } from './components/BusinessProfileModal';
import { FollowUpManagerView } from './components/FollowUpManagerView';
import { CampaignStudioView } from './components/CampaignStudioView';
import { DiscoveryAndProspectsView } from './components/DiscoveryAndProspectsView';
import { CrmAndPipelineViews } from './components/CrmAndPipelineViews';
import { OperationsAndSettingsViews } from './components/OperationsAndSettingsViews';
import {
  LayoutDashboard,
  Compass,
  Users,
  Star,
  Database,
  Clock,
  Kanban,
  Sparkles,
  MailCheck,
  CalendarCheck,
  BarChart3,
  Cpu,
  Plug,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  Plus,
  Play,
  Mail,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  id: NavigationModule;
  label: string;
  group: 'Intelligence & Discovery' | 'CRM & Execution' | 'Analytics & Governance';
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

const LEGACY_TEST_LEAD_IDS = new Set([
  'biz-lumiere-uk',
  'biz-paybridge-ng',
  'biz-sola-us',
  'biz-akosombo-gh',
  'biz-savannah-ke',
  'biz-apexmedia-us',
  'biz-nordic-uk-noemail',
]);

const STORAGE_KEY = 'advibe_clean_production_v2';

export default function App() {
  const [activeModule, setActiveModule] = useState<NavigationModule>('overview');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [campaignTargetBusinessId, setCampaignTargetBusinessId] = useState<string | null>(null);
  const [campaignTargetContactId, setCampaignTargetContactId] = useState<string | null>(null);

  // Core CRM & Platform State (Clean of all test leads)
  const [businesses, setBusinesses] = useState<BusinessRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.businesses)) {
          return parsed.businesses.filter((b: BusinessRecord) => !LEGACY_TEST_LEAD_IDS.has(b.id));
        }
      }
    } catch {}
    return INITIAL_BUSINESSES;
  });
  const [tasks, setTasks] = useState<FollowUpTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.tasks)) {
          return parsed.tasks.filter((t: FollowUpTask) => !LEGACY_TEST_LEAD_IDS.has(t.businessId));
        }
      }
    } catch {}
    return INITIAL_FOLLOW_UP_TASKS;
  });
  const [drafts, setDrafts] = useState<OutreachEmailDraft[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.drafts)) {
          return parsed.drafts.filter(
            (d: OutreachEmailDraft) => !LEGACY_TEST_LEAD_IDS.has(d.businessId)
          );
        }
      }
    } catch {}
    return INITIAL_EMAIL_DRAFTS;
  });
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>(INITIAL_CAMPAIGNS);
  const [services, setServices] = useState<AdVibeService[]>(INITIAL_SERVICE_CATALOGUE);
  const [categories, setCategories] = useState<string[]>(INITIAL_BUSINESS_CATEGORIES);
  const [allocations, setAllocations] = useState<DailyCountryAllocation[]>(INITIAL_DAILY_ALLOCATIONS);
  const [discoveryReports, setDiscoveryReports] = useState<DiscoveryJobReport[]>(
    INITIAL_DISCOVERY_REPORTS
  );
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [suppressionList, setSuppressionList] =
    useState<SuppressionRecord[]>(INITIAL_SUPPRESSION_LIST);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [knowledgeBase, setKnowledgeBase] = useState(INITIAL_KNOWLEDGE_BASE);

  // User Role & Auth State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Administrator');
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [hasGmailToken, setHasGmailToken] = useState<boolean>(false);

  // Persist live CRM state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          businesses,
          tasks,
          drafts,
        })
      );
    } catch {}
  }, [businesses, tasks, drafts]);

  useEffect(() => {
    testFirestoreConnection();
    const unsub = initAuth(
      async (user, token) => {
        setAuthUserEmail(user.email || 'advibestudios.global@gmail.com');
        setHasGmailToken(Boolean(token));
        try {
          const remoteBusinesses = await loadBusinessesFromFirestore();
          // Automatically purge any legacy test leads if present in Firestore
          const cleanRemote: BusinessRecord[] = [];
          for (const b of remoteBusinesses) {
            if (LEGACY_TEST_LEAD_IDS.has(b.id)) {
              await deleteBusinessFromFirestore(b.id).catch(() => {});
            } else {
              cleanRemote.push(b);
            }
          }
          if (cleanRemote.length > 0) {
            setBusinesses((prev) => {
              const map = new Map<string, BusinessRecord>();
              prev.forEach((item) => map.set(item.id, item));
              cleanRemote.forEach((item) => map.set(item.id, item));
              return Array.from(map.values());
            });
          }
        } catch {}
      },
      () => {
        setAuthUserEmail(null);
        setHasGmailToken(false);
      }
    );
    return () => unsub();
  }, []);

  const appendAuditLog = (action: string, module: string, targetRecord: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      actor: authUserEmail || 'Shittu (Founder)',
      role: currentUserRole,
      action,
      module,
      targetRecord,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Auth Handlers
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setAuthUserEmail(res.user.email || 'advibestudios.global@gmail.com');
        setHasGmailToken(Boolean(res.accessToken));
        appendAuditLog(
          'Connected Google OAuth 2.0 (Gmail Compose & Readonly)',
          'Integrations',
          res.user.email || 'advibestudios.global@gmail.com',
          'OAuth scopes granted for idempotent draft creation and reply synchronisation.'
        );
      }
    } catch (err) {
      console.error('Google login cancelled or failed:', err);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setAuthUserEmail(null);
    setHasGmailToken(false);
  };

  // Business Handlers
  const handleUpdateBusiness = (updated: BusinessRecord) => {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    syncBusinessToFirestore(updated).catch(() => {});
  };

  const handlePurgeAllLeads = async () => {
    setBusinesses([]);
    setTasks([]);
    setDrafts([]);
    setCampaigns([]);
    setDiscoveryReports([]);
    setSuppressionList([]);
    setAllocations(INITIAL_DAILY_ALLOCATIONS);
    setSelectedBusinessId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await purgeAllUserFirestoreData().catch(() => {});
    appendAuditLog(
      'Purged all leads, tasks, drafts, and discovery history',
      'Settings',
      'Database Clean Reset',
      'Database cleaned of all leads in local state and Cloud Firestore.'
    );
  };

  const handleAddBusiness = (newBiz: BusinessRecord) => {
    setBusinesses((prev) => [newBiz, ...prev]);
    syncBusinessToFirestore(newBiz).catch(() => {});
    appendAuditLog(
      'Added new business record to CRM',
      'Lead Database',
      newBiz.name,
      `Country: ${newBiz.country} | Score: ${newBiz.leadScore}/100 | Stage: ${newBiz.pipelineStage}`
    );
  };

  const handleMergeDuplicates = (primaryId: string, duplicateId: string) => {
    const primary = businesses.find((b) => b.id === primaryId);
    const duplicate = businesses.find((b) => b.id === duplicateId);
    if (!primary || !duplicate || primaryId === duplicateId) return;

    const mergedContacts = [...primary.contacts];
    duplicate.contacts.forEach((c) => {
      if (
        !mergedContacts.some(
          (mc) => mc.email && c.email && mc.email.toLowerCase() === c.email.toLowerCase()
        )
      ) {
        mergedContacts.push({ ...c, isPrimary: false });
      }
    });

    const merged: BusinessRecord = {
      ...primary,
      contacts: mergedContacts,
      timeline: [
        {
          id: `tl-merge-${Date.now()}`,
          businessId: primary.id,
          timestamp: new Date().toISOString(),
          type: 'Note',
          origin: 'Manually Logged',
          title: `Merged duplicate record (${duplicate.name})`,
          description: `Consolidated contacts, research history, and timeline from ${duplicate.normalizedDomain}.`,
          ownerName: 'Shittu (Founder)',
        },
        ...primary.timeline,
        ...duplicate.timeline,
      ],
      notes: [...primary.notes, ...duplicate.notes],
    };

    setBusinesses((prev) =>
      prev.filter((b) => b.id !== duplicateId).map((b) => (b.id === primaryId ? merged : b))
    );
    syncBusinessToFirestore(merged).catch(() => {});
    deleteBusinessFromFirestore(duplicateId).catch(() => {});
    appendAuditLog(
      `Merged duplicate record ${duplicate.name} into ${primary.name}`,
      'Lead Database',
      primary.name,
      'Preserved primary domain, contacts, and historical timeline.'
    );
  };

  // Discovery Handlers
  const handleAddDiscoveredBusinesses = (
    newBusinesses: BusinessRecord[],
    jobReport: DiscoveryJobReport
  ) => {
    if (newBusinesses.length > 0) {
      setBusinesses((prev) => [...newBusinesses, ...prev]);
      newBusinesses.forEach((b) => syncBusinessToFirestore(b).catch(() => {}));
    }
    setDiscoveryReports((prev) => [jobReport, ...prev]);
    appendAuditLog(
      `Executed Business Discovery Run (${jobReport.targetCountry})`,
      'Discover Businesses',
      `${jobReport.qualifiedBusinesses} Qualified / ${jobReport.rawCandidatesInvestigated} Raw`,
      jobReport.shortfallExplanation
    );
  };

  // Follow-up Task Handlers
  const handleCreateTask = (taskInput: Omit<FollowUpTask, 'id'>) => {
    const newTask: FollowUpTask = {
      ...taskInput,
      id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    syncFollowUpTaskToFirestore(newTask).catch(() => {});

    const targetBiz = businesses.find((b) => b.id === taskInput.businessId);
    if (targetBiz) {
      const updatedBiz: BusinessRecord = {
        ...targetBiz,
        nextFollowUpDate: taskInput.dueDate,
        timeline: [
          {
            id: `tl-fup-${Date.now()}`,
            businessId: targetBiz.id,
            timestamp: new Date().toISOString(),
            type: 'Follow-up',
            origin: 'Manually Logged',
            title: `Scheduled follow-up (${taskInput.channel})`,
            description: `${taskInput.purpose} — Due ${taskInput.dueDate} at ${taskInput.dueTime}`,
            ownerName: taskInput.assignedTo,
          },
          ...targetBiz.timeline,
        ],
      };
      handleUpdateBusiness(updatedBiz);
    }

    appendAuditLog(
      `Scheduled follow-up task (${taskInput.channel})`,
      'Follow-up Manager',
      taskInput.businessName,
      `Due ${taskInput.dueDate}: ${taskInput.purpose}`
    );
  };

  const handleCompleteTask = (
    taskId: string,
    outcome: FollowUpOutcome,
    notes: string,
    createNextRecommendedTask: boolean
  ) => {
    const completedTask = tasks.find((t) => t.id === taskId);
    if (!completedTask) return;

    const recommendation = getNextActionRecommendationForOutcome(outcome);
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Completed',
              outcome,
              completedAt: nowIso,
              notes: notes ? `${t.notes}\nOutcome note: ${notes}` : t.notes,
            }
          : t
      )
    );

    if (
      createNextRecommendedTask &&
      !recommendation.shouldSuppress &&
      recommendation.suggestedDaysOffset !== null
    ) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + recommendation.suggestedDaysOffset);
      const dueDateStr = nextDate.toISOString().slice(0, 10);

      const nextTask: FollowUpTask = {
        id: `tsk-next-${Date.now()}`,
        businessId: completedTask.businessId,
        businessName: completedTask.businessName,
        contactId: completedTask.contactId,
        contactName: completedTask.contactName,
        contactRole: completedTask.contactRole,
        country: completedTask.country,
        industry: completedTask.industry,
        dueDate: dueDateStr,
        dueTime: '10:00',
        channel: completedTask.channel,
        purpose: recommendation.recommendedNextAction,
        notes: `Created automatically following outcome "${outcome}" on ${completedTask.purpose}.`,
        priority: completedTask.priority,
        assignedTo: completedTask.assignedTo,
        status: 'Pending',
        creationSource: 'Automatic Policy',
        aiReasoning: `Outcome "${outcome}" mapped to next action in ${recommendation.suggestedDaysOffset} days.`,
      };
      setTasks((prev) => [nextTask, ...prev]);
    }

    // If outcome requires suppression (Unsubscribed / Do not contact)
    if (recommendation.shouldSuppress) {
      const targetBiz = businesses.find((b) => b.id === completedTask.businessId);
      const primaryContact = targetBiz?.contacts.find((c) => c.id === completedTask.contactId);
      const emailOrDomain =
        primaryContact?.email || targetBiz?.normalizedDomain || completedTask.businessName;
      setSuppressionList((prev) => [
        {
          id: `sup-${Date.now()}`,
          emailOrDomain,
          businessName: completedTask.businessName,
          country: completedTask.country,
          reason: outcome === 'Unsubscribed' ? 'Unsubscribed' : 'Do Not Contact Request',
          lawfulBasisNote: `Automatically added to Suppression List after follow-up outcome: ${outcome}`,
          dateAdded: new Date().toISOString().slice(0, 10),
          addedBy: 'Follow-up Outcome Guard',
        },
        ...prev,
      ]);
    }

    // Update Business Pipeline Stage & Timeline
    const targetBiz = businesses.find((b) => b.id === completedTask.businessId);
    if (targetBiz) {
      const updatedBiz: BusinessRecord = {
        ...targetBiz,
        pipelineStage: recommendation.suggestedStage || targetBiz.pipelineStage,
        lastContactDate: nowIso.slice(0, 10),
        timeline: [
          {
            id: `tl-out-${Date.now()}`,
            businessId: targetBiz.id,
            timestamp: nowIso,
            type: 'Follow-up',
            origin: 'Manually Logged',
            title: `Completed Follow-up: ${outcome}`,
            description: `${completedTask.purpose}. Next step: ${recommendation.recommendedNextAction}`,
            ownerName: completedTask.assignedTo,
          },
          ...targetBiz.timeline,
        ],
      };
      handleUpdateBusiness(updatedBiz);
    }

    appendAuditLog(
      `Completed follow-up task with outcome "${outcome}"`,
      'Follow-up Manager',
      completedTask.businessName,
      recommendation.recommendedNextAction
    );
  };

  const handleRescheduleTask = (taskId: string, newDate: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              dueDate: newDate,
              status: newDate === '2026-11-04' ? 'Due today' : 'Pending',
            }
          : t
      )
    );
  };

  // Campaign & Draft Handlers
  const handleCreateCampaign = (campaignInput: Omit<OutreachCampaign, 'id' | 'createdAt'>) => {
    const newCamp: OutreachCampaign = {
      ...campaignInput,
      id: `cmp-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCampaigns((prev) => [newCamp, ...prev]);
    appendAuditLog(
      `Created outreach campaign "${newCamp.name}"`,
      'Campaign Studio',
      newCamp.name,
      `Promoted Service: ${newCamp.promotedServiceName} | Follow-up intervals: Day ${newCamp.followUpPolicyDays.join(', Day ')}`
    );
  };

  const handleSaveDraft = (draft: OutreachEmailDraft) => {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === draft.id);
      return exists ? prev.map((d) => (d.id === draft.id ? draft : d)) : [draft, ...prev];
    });
    syncCampaignDraftToFirestore(draft).catch(() => {});
    appendAuditLog(
      'Generated personalised outreach email draft',
      'Campaign Studio',
      draft.businessName,
      `Recipient: ${draft.contactName} (${draft.contactEmail}) | Status: ${draft.status}`
    );
  };

  const handleUpdateDraftStatus = (
    draftId: string,
    updates: Partial<OutreachEmailDraft>,
    auditNote?: string
  ) => {
    const targetDraft = drafts.find((d) => d.id === draftId);
    if (!targetDraft) return;

    const updatedDraft: OutreachEmailDraft = { ...targetDraft, ...updates };
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? updatedDraft : d)));
    syncCampaignDraftToFirestore(updatedDraft).catch(() => {});

    const targetBiz = businesses.find((b) => b.id === targetDraft.businessId);
    if (targetBiz) {
      let nextStage = targetBiz.pipelineStage;
      let hasReplied = targetBiz.hasReplied;

      if (updates.status === 'Gmail Draft Created') {
        nextStage = 'Initial contact prepared';
      } else if (updates.status === 'Confirmed Sent') {
        nextStage = 'Initial contact sent';
      } else if (updates.status === 'Replied') {
        nextStage = 'Conversation started';
        hasReplied = true;
        // Pause any pending automated follow-ups for this business
        setTasks((prev) =>
          prev.map((t) =>
            t.businessId === targetBiz.id &&
            (t.status === 'Pending' || t.status === 'Due today' || t.status === 'Overdue')
              ? {
                  ...t,
                  status: 'Paused (Reply Received)',
                  notes: `${t.notes}\n[System Guard]: Automatically paused because ${targetDraft.contactName} replied.`,
                }
              : t
          )
        );
      }

      const updatedBiz: BusinessRecord = {
        ...targetBiz,
        pipelineStage: nextStage,
        hasReplied,
        lastContactDate:
          updates.status === 'Confirmed Sent'
            ? new Date().toISOString().slice(0, 10)
            : targetBiz.lastContactDate,
        timeline: [
          {
            id: `tl-drf-${Date.now()}`,
            businessId: targetBiz.id,
            timestamp: new Date().toISOString(),
            type: updates.status === 'Replied' ? 'Reply Received' : 'Email',
            origin:
              updates.status === 'Gmail Draft Created' || updates.status === 'Replied'
                ? 'Integration Confirmed'
                : 'Manually Logged',
            title: `Outreach Status: ${updates.status || updatedDraft.status}`,
            description:
              auditNote ||
              `Subject: "${updatedDraft.subject}" (${updatedDraft.contactEmail})`,
            ownerName: 'Shittu (Founder)',
          },
          ...targetBiz.timeline,
        ],
      };
      handleUpdateBusiness(updatedBiz);
    }

    if (auditNote) {
      appendAuditLog(
        `Updated email draft status to ${updates.status || updatedDraft.status}`,
        'Campaign Studio',
        targetDraft.businessName,
        auditNote
      );
    }
  };

  //Navigate to Campaign Studio with pre-selected business
  const handleNavigateToCampaignWithBusiness = (businessId: string, contactId?: string) => {
    setCampaignTargetBusinessId(businessId);
    setCampaignTargetContactId(contactId || null);
    setSelectedBusinessId(null);
    setActiveModule('campaign-studio');
  };

  // Computed Badges & Global Search Results
  const dueOrOverdueCount = useMemo(
    () => tasks.filter((t) => t.status === 'Due today' || t.status === 'Overdue').length,
    [tasks]
  );

  const pendingApprovalsCount = useMemo(
    () => drafts.filter((d) => d.status === 'Pending Approval').length,
    [drafts]
  );

  const dream100Count = useMemo(
    () => businesses.filter((b) => b.isDream100).length,
    [businesses]
  );

  const globalSearchMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return businesses
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.normalizedDomain.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q) ||
          b.industry.toLowerCase().includes(q) ||
          b.pipelineStage.toLowerCase().includes(q) ||
          b.contacts.some(
            (c) =>
              c.fullName.toLowerCase().includes(q) ||
              (c.email && c.email.toLowerCase().includes(q)) ||
              (c.phone && c.phone.toLowerCase().includes(q))
          )
      )
      .slice(0, 6);
  }, [businesses, globalSearch]);

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) || null,
    [businesses, selectedBusinessId]
  );

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      group: 'Intelligence & Discovery',
      icon: LayoutDashboard,
    },
    {
      id: 'discover',
      label: 'Discover Businesses',
      group: 'Intelligence & Discovery',
      icon: Compass,
      badge: '50/d',
    },
    {
      id: 'daily-prospects',
      label: 'Daily Prospects',
      group: 'Intelligence & Discovery',
      icon: Users,
      badge: businesses.length,
    },
    {
      id: 'dream-100',
      label: 'Dream 100',
      group: 'Intelligence & Discovery',
      icon: Star,
      badge: dream100Count,
    },
    {
      id: 'lead-database',
      label: 'Lead Database',
      group: 'CRM & Execution',
      icon: Database,
    },
    {
      id: 'follow-ups',
      label: 'Follow-up Manager',
      group: 'CRM & Execution',
      icon: Clock,
      badge: dueOrOverdueCount > 0 ? dueOrOverdueCount : undefined,
    },
    {
      id: 'pipeline',
      label: 'Sales Pipeline',
      group: 'CRM & Execution',
      icon: Kanban,
    },
    {
      id: 'campaign-studio',
      label: 'Campaign Studio',
      group: 'CRM & Execution',
      icon: Sparkles,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'email-performance',
      label: 'Email Performance',
      group: 'CRM & Execution',
      icon: MailCheck,
    },
    {
      id: 'tasks-activities',
      label: 'Tasks & Activities',
      group: 'CRM & Execution',
      icon: CalendarCheck,
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      group: 'Analytics & Governance',
      icon: BarChart3,
    },
    {
      id: 'automation',
      label: 'Automation Centre',
      group: 'Analytics & Governance',
      icon: Cpu,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      group: 'Analytics & Governance',
      icon: Plug,
    },
    {
      id: 'compliance',
      label: 'Compliance Centre',
      group: 'Analytics & Governance',
      icon: ShieldCheck,
    },
    {
      id: 'settings',
      label: 'Settings',
      group: 'Analytics & Governance',
      icon: Settings,
    },
  ];

  const groups: NavItem['group'][] = [
    'Intelligence & Discovery',
    'CRM & Execution',
    'Analytics & Governance',
  ];

  const knowledgeBaseSummary = useMemo(
    () =>
      `${knowledgeBase.companyDescription} Positioning: ${knowledgeBase.brandPositioning} Turnaround: ${knowledgeBase.turnaroundTimes}`,
    [knowledgeBase]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Fixed Left Sidebar (248px) */}
      <aside className="w-[248px] shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Brand Header */}
          <div className="px-4 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
                AV
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#0F172A] leading-none">
                  AdVibe Studios
                </div>
                <div className="text-[11px] font-medium text-[#64748B] mt-1">
                  Prospect Intelligence
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono-tabular font-semibold px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5]">
              v2.4
            </span>
          </div>

          {/* Navigation Groups */}
          <nav className="p-2.5 space-y-5" aria-label="Main Navigation">
            {groups.map((groupName) => (
              <div key={groupName}>
                <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {navItems
                    .filter((item) => item.group === groupName)
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveModule(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#4F46E5]' : 'text-[#64748B]'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded font-semibold ${
                                item.id === 'follow-ups' && Number(item.badge) > 0
                                  ? 'bg-[#FEF3C7] text-[#B45309]'
                                  : isActive
                                  ? 'bg-[#4F46E5] text-white'
                                  : 'bg-[#F1F5F9] text-[#475569]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Outreach Account & Role Footer */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[#64748B]">Outreach Account</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                hasGmailToken
                  ? 'bg-[#ECFDF5] text-[#059669]'
                  : 'bg-[#FEF3C7] text-[#B45309]'
              }`}
            >
              {hasGmailToken ? 'OAuth Active' : 'Draft Ready'}
            </span>
          </div>
          <div className="text-[11px] font-mono-tabular text-[#0F172A] truncate font-medium">
            advibestudios.global@gmail.com
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
            <span>Role: {currentUserRole}</span>
            <button
              onClick={() => setActiveModule('integrations')}
              className="text-[#4F46E5] hover:underline font-medium"
            >
              Configure
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header */}
        <header className="h-14 bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Global CRM Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search business name, domain, contact, email, country, or stage..."
              aria-label="Global CRM Search"
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
            />
            {globalSearch.trim() !== '' && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-30 p-2 space-y-1">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <span>Instant CRM Matches ({globalSearchMatches.length})</span>
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="text-[#4F46E5] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {globalSearchMatches.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-[#64748B]">
                    No matching business, domain, or contact found.
                  </div>
                ) : (
                  globalSearchMatches.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setSelectedBusinessId(biz.id);
                        setGlobalSearch('');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded hover:bg-[#F8FAFC] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                          <span>{biz.name}</span>
                          {biz.isDream100 && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-[#EEF2FF] text-[#4F46E5] rounded">
                              Dream 100
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {biz.normalizedDomain} · {biz.country} · {biz.industry}
                        </div>
                      </div>
                      <span className="text-xs font-mono-tabular font-semibold text-[#4F46E5] shrink-0">
                        {biz.leadScore}/100
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Quick Actions & Status Indicators */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveModule('discover')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Run Discovery</span>
            </button>

            <button
              onClick={() => setActiveModule('campaign-studio')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-colors shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Generate Outreach</span>
            </button>

            <button
              onClick={() => setActiveModule('follow-ups')}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] transition-colors"
              title="Follow-up Tasks Due or Overdue"
            >
              <Bell className="w-3.5 h-3.5 text-[#475569]" />
              <span className="font-mono-tabular font-semibold">{dueOrOverdueCount}</span>
              {dueOrOverdueCount > 0 && (
                <span className="text-[10px] font-medium text-[#B45309]">Due</span>
              )}
            </button>
          </div>
        </header>

        {/* Active Module Workspace */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          {(activeModule === 'discover' || activeModule === 'daily-prospects') && (
            <DiscoveryAndProspectsView
              mode={activeModule}
              allocations={allocations}
              categories={categories}
              businesses={businesses}
              services={services}
              discoveryReports={discoveryReports}
              suppressionList={suppressionList}
              onUpdateAllocations={setAllocations}
              onAddCategory={(cat) => {
                if (!categories.includes(cat)) {
                  setCategories((prev) => [...prev, cat]);
                }
              }}
              onAddDiscoveredBusinesses={handleAddDiscoveredBusinesses}
              onUpdateBusiness={handleUpdateBusiness}
              onOpenBusiness={(id) => setSelectedBusinessId(id)}
            />
          )}

          {(activeModule === 'dream-100' ||
            activeModule === 'lead-database' ||
            activeModule === 'pipeline') && (
            <CrmAndPipelineViews
              mode={activeModule}
              businesses={businesses}
              services={services}
              globalSearch={globalSearch}
              onUpdateBusiness={handleUpdateBusiness}
              onAddBusiness={handleAddBusiness}
              onMergeDuplicates={handleMergeDuplicates}
              onOpenBusiness={(id) => setSelectedBusinessId(id)}
              onNavigateToCampaign={handleNavigateToCampaignWithBusiness}
            />
          )}

          {activeModule === 'follow-ups' && (
            <FollowUpManagerView
              tasks={tasks}
              businesses={businesses}
              drafts={drafts}
              suppressionList={suppressionList}
              onCreateTask={handleCreateTask}
              onCompleteTask={handleCompleteTask}
              onRescheduleTask={handleRescheduleTask}
              onOpenBusiness={(id) => setSelectedBusinessId(id)}
              onPrepareFollowUpEmail={(bizId, contactId) =>
                handleNavigateToCampaignWithBusiness(bizId, contactId)
              }
            />
          )}

          {activeModule === 'campaign-studio' && (
            <CampaignStudioView
              campaigns={campaigns}
              drafts={drafts}
              businesses={businesses}
              services={services}
              suppressionList={suppressionList}
              knowledgeBaseSummary={knowledgeBaseSummary}
              initialBusinessId={campaignTargetBusinessId}
              initialContactId={campaignTargetContactId}
              onCreateCampaign={handleCreateCampaign}
              onSaveDraft={handleSaveDraft}
              onUpdateDraftStatus={handleUpdateDraftStatus}
              onOpenBusiness={(id) => setSelectedBusinessId(id)}
            />
          )}

          {(activeModule === 'overview' ||
            activeModule === 'email-performance' ||
            activeModule === 'tasks-activities' ||
            activeModule === 'analytics' ||
            activeModule === 'automation' ||
            activeModule === 'integrations' ||
            activeModule === 'compliance' ||
            activeModule === 'settings') && (
            <OperationsAndSettingsViews
              module={activeModule}
              businesses={businesses}
              tasks={tasks}
              drafts={drafts}
              campaigns={campaigns}
              services={services}
              allocations={allocations}
              discoveryReports={discoveryReports}
              automations={automations}
              suppressionList={suppressionList}
              auditLogs={auditLogs}
              knowledgeBase={knowledgeBase}
              currentUserRole={currentUserRole}
              authUserEmail={authUserEmail}
              hasGmailToken={hasGmailToken}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onNavigate={(mod) => setActiveModule(mod)}
              onOpenBusiness={(id) => setSelectedBusinessId(id)}
              onToggleAutomation={(ruleId) => {
                setAutomations((prev) =>
                  prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
                );
              }}
              onRunAutomationNow={(ruleId) => {
                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
                setAutomations((prev) =>
                  prev.map((r) =>
                    r.id === ruleId
                      ? {
                          ...r,
                          lastExecutedAt: nowStr,
                          executionCount: r.executionCount + 1,
                        }
                      : r
                  )
                );
                const rule = automations.find((r) => r.id === ruleId);
                if (rule) {
                  appendAuditLog(
                    `Executed automation rule "${rule.name}"`,
                    'Automation Centre',
                    rule.category,
                    rule.lastResultSummary
                  );
                }
              }}
              onAddSuppression={(rec) => {
                const newRec: SuppressionRecord = {
                  ...rec,
                  id: `sup-${Date.now()}`,
                  dateAdded: new Date().toISOString().slice(0, 10),
                };
                setSuppressionList((prev) => [newRec, ...prev]);
                appendAuditLog(
                  `Added ${rec.emailOrDomain} to Suppression List`,
                  'Compliance Centre',
                  rec.businessName,
                  `Reason: ${rec.reason}`
                );
              }}
              onRemoveSuppression={(id) => {
                setSuppressionList((prev) => prev.filter((s) => s.id !== id));
              }}
              onUpdateServices={(updatedServices) => {
                setServices(updatedServices);
                appendAuditLog(
                  'Updated AdVibe Service Catalogue & Country Pricing',
                  'Settings',
                  `${updatedServices.length} Services`,
                  'Synchronised country-specific rate cards for AI outreach generation.'
                );
              }}
              onUpdateKnowledgeBase={(updatedKb) => {
                setKnowledgeBase(updatedKb);
                appendAuditLog(
                  'Updated AI Company Knowledge Base',
                  'Settings',
                  'AdVibe Studios Positioning',
                  'Updated approved sales language and turnaround policies.'
                );
              }}
              onChangeUserRole={(role) => setCurrentUserRole(role)}
              onPurgeAllLeads={handlePurgeAllLeads}
            />
          )}
        </main>
      </div>

      {/* Unified 8-Tab Business Profile Drawer/Modal */}
      {selectedBusiness && (
        <BusinessProfileModal
          business={selectedBusiness}
          services={services}
          tasks={tasks}
          drafts={drafts}
          onClose={() => setSelectedBusinessId(null)}
          onUpdateBusiness={handleUpdateBusiness}
          onCreateFollowUp={handleCreateTask}
          onNavigateToCampaignWithBusiness={handleNavigateToCampaignWithBusiness}
        />
      )}
    </div>
  );
}
