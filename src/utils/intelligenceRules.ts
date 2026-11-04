import {
  BusinessRecord,
  ContactPerson,
  FollowUpOutcome,
  FollowUpTask,
  OutreachEmailDraft,
  PriorityCategory,
  ScoreCriterionBreakdown,
  SuppressionRecord,
} from '../types/advibe';

/**
 * Normalizes a website URL or domain string for primary deduplication.
 */
export function normalizeDomain(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.replace(/^www\./, '');
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  return cleaned.trim();
}

/**
 * Calculates total lead score (0-100) from the 8 criteria in Section 7.2 of the PRD.
 */
export function calculateLeadScore(breakdown: ScoreCriterionBreakdown): number {
  const clamp = (val: number, max: number) => Math.max(0, Math.min(max, Math.round(val)));
  const total =
    clamp(breakdown.serviceRelevance.score, 20) +
    clamp(breakdown.promotionalActivity.score, 15) +
    clamp(breakdown.recurringOpportunity.score, 15) +
    clamp(breakdown.businessMaturity.score, 10) +
    clamp(breakdown.promotionFrequency.score, 10) +
    clamp(breakdown.contactAccessibility.score, 10) +
    clamp(breakdown.commercialValue.score, 10) +
    clamp(breakdown.strategicRelationship.score, 10);

  return Math.max(0, Math.min(100, total));
}

/**
 * Classifies a 0-100 lead score into the exact Priority Category defined in Section 7.3:
 * - 85-100: Dream 100 candidate
 * - 70-84: High-potential prospect
 * - 50-69: Emerging prospect
 * - Below 50: Low priority or further research
 */
export function getPriorityCategory(score: number): PriorityCategory {
  if (score >= 85) return 'Dream 100 candidate';
  if (score >= 70) return 'High-potential prospect';
  if (score >= 50) return 'Emerging prospect';
  return 'Low priority or further research';
}

/**
 * Honest discovery shortfall calculation (Section 1.3 & 5.7).
 * Never falsely reports 50 qualified prospects if fewer met the criteria.
 */
export function evaluateDiscoveryRunReport(params: {
  targetGoal: number;
  rawCandidates: number;
  qualifiedCount: number;
  duplicatesCount: number;
  rejectedCount: number;
}): {
  targetMet: boolean;
  shortfallCount: number;
  actualQualifiedReported: number;
  explanation: string;
} {
  const actualQualifiedReported = Math.max(0, params.qualifiedCount);
  const shortfallCount = Math.max(0, params.targetGoal - actualQualifiedReported);
  const targetMet = shortfallCount === 0;

  let explanation = 'Daily qualified target achieved with verified commercial and creative-need evidence.';
  if (!targetMet) {
    explanation = `Shortfall of ${shortfallCount} qualified businesses (${actualQualifiedReported}/${params.targetGoal} qualified from ${params.rawCandidates} raw candidates; ${params.duplicatesCount} duplicates filtered and ${params.rejectedCount} candidates rejected due to insufficient evidence of commercial video need).`;
  }

  return {
    targetMet,
    shortfallCount,
    actualQualifiedReported,
    explanation,
  };
}

/**
 * Detects whether a candidate business is a duplicate of an existing CRM record.
 * Uses normalized website domain as the primary signal, and never merges solely on similar names
 * in different countries with different domains (Section 9.4).
 */
export function detectDuplicateBusiness(
  candidate: { name: string; website: string; country: string; email?: string },
  existingBusinesses: Pick<BusinessRecord, 'id' | 'name' | 'normalizedDomain' | 'country' | 'contacts'>[]
): { isDuplicate: boolean; matchedBusinessId?: string; reason?: string } {
  const candidateDomain = normalizeDomain(candidate.website);

  for (const existing of existingBusinesses) {
    const existingDomain = normalizeDomain(existing.normalizedDomain);
    if (candidateDomain && existingDomain && candidateDomain === existingDomain) {
      return {
        isDuplicate: true,
        matchedBusinessId: existing.id,
        reason: `Exact normalized domain match (${candidateDomain})`,
      };
    }

    if (candidate.email) {
      const normalizedEmail = candidate.email.trim().toLowerCase();
      const emailMatch = existing.contacts.some(
        (c) => c.email && c.email.trim().toLowerCase() === normalizedEmail
      );
      if (emailMatch) {
        return {
          isDuplicate: true,
          matchedBusinessId: existing.id,
          reason: `Shared public contact email (${normalizedEmail})`,
        };
      }
    }

    // Exact name AND same country AND missing domain on one side
    if (
      !candidateDomain &&
      existing.name.trim().toLowerCase() === candidate.name.trim().toLowerCase() &&
      existing.country === candidate.country
    ) {
      return {
        isDuplicate: true,
        matchedBusinessId: existing.id,
        reason: `Identical business name in ${candidate.country}`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Follow-up Protection Rules (Section 10.10 & 20.3):
 * Prevents duplicate follow-ups, sending after a reply (unless manual override),
 * or contacting suppressed/unsubscribed/do-not-contact recipients.
 */
export function checkFollowUpEligibility(params: {
  business: Pick<BusinessRecord, 'id' | 'normalizedDomain' | 'hasReplied'>;
  contact: Pick<ContactPerson, 'id' | 'email' | 'contactStatus'>;
  existingTasks: Pick<FollowUpTask, 'businessId' | 'contactId' | 'purpose' | 'status'>[];
  suppressionList: Pick<SuppressionRecord, 'emailOrDomain'>[];
  intendedPurpose: string;
  isAutomatedSequence: boolean;
}): { allowed: boolean; blockReason?: string } {
  if (params.contact.contactStatus !== 'Active') {
    return {
      allowed: false,
      blockReason: `Contact status is '${params.contact.contactStatus}' — outreach prohibited by compliance governance.`,
    };
  }

  const emailLower = (params.contact.email || '').trim().toLowerCase();
  const domainLower = normalizeDomain(params.business.normalizedDomain);
  const isSuppressed = params.suppressionList.some((s) => {
    const target = s.emailOrDomain.trim().toLowerCase();
    return target === emailLower || (domainLower && target === domainLower);
  });

  if (isSuppressed) {
    return {
      allowed: false,
      blockReason: 'Recipient or domain is on the active Suppression List.',
    };
  }

  if (params.isAutomatedSequence && params.business.hasReplied) {
    return {
      allowed: false,
      blockReason: 'Prospect has replied — automated follow-up sequence is paused pending human review.',
    };
  }

  const hasDuplicateActiveTask = params.existingTasks.some(
    (t) =>
      t.businessId === params.business.id &&
      t.contactId === params.contact.id &&
      t.purpose.trim().toLowerCase() === params.intendedPurpose.trim().toLowerCase() &&
      (t.status === 'Pending' || t.status === 'Due today' || t.status === 'Overdue' || t.status === 'Draft prepared')
  );

  if (hasDuplicateActiveTask) {
    return {
      allowed: false,
      blockReason: 'An active follow-up task for this exact action already exists.',
    };
  }

  return { allowed: true };
}

/**
 * Recommends next sales action andpipeline stage when a follow-up task is completed (Section 10.6).
 */
export function getNextActionRecommendationForOutcome(outcome: FollowUpOutcome): {
  recommendedTaskTitle: string | null;
  suggestedDaysOffset: number | null;
  suggestedStage?: string;
  compliancePrompt?: string;
} {
  switch (outcome) {
    case 'Interested':
      return {
        recommendedTaskTitle: 'Schedule discovery & creative strategy call',
        suggestedDaysOffset: 1,
        suggestedStage: 'Interested',
      };
    case 'Requested pricing':
      return {
        recommendedTaskTitle: 'Send country-specific AdVibe package pricing & deliverables',
        suggestedDaysOffset: 1,
        suggestedStage: 'Proposal requested',
      };
    case 'Requested more information':
      return {
        recommendedTaskTitle: 'Share relevant AdVibe video case study & production workflow',
        suggestedDaysOffset: 1,
        suggestedStage: 'Conversation started',
      };
    case 'Meeting booked':
      return {
        recommendedTaskTitle: 'Prepare meeting agenda & brand video audit deck',
        suggestedDaysOffset: 1,
        suggestedStage: 'Meeting scheduled',
      };
    case 'Proposal requested':
      return {
        recommendedTaskTitle: 'Prepare tailored AdVibe production proposal',
        suggestedDaysOffset: 2,
        suggestedStage: 'Proposal requested',
      };
    case 'Proposal sent':
      return {
        recommendedTaskTitle: 'Follow up on submitted proposal & deliverables review',
        suggestedDaysOffset: 4,
        suggestedStage: 'Proposal sent',
      };
    case 'Follow up later':
      return {
        recommendedTaskTitle: 'Scheduled check-in on upcoming campaign window',
        suggestedDaysOffset: 14,
        suggestedStage: 'Nurture',
      };
    case 'No answer':
    case 'No response yet':
      return {
        recommendedTaskTitle: 'Contextual follow-up with product video angle',
        suggestedDaysOffset: 4,
      };
    case 'Not interested':
      return {
        recommendedTaskTitle: null,
        suggestedDaysOffset: null,
        suggestedStage: 'Lost',
        compliancePrompt:
          'Would you like to close this record, move to long-term permitted nurture, or add to the suppression list?',
      };
    case 'Converted to customer':
      return {
        recommendedTaskTitle: 'Kick off AdVibe creative onboarding & brief',
        suggestedDaysOffset: 1,
        suggestedStage: 'Won',
      };
    default:
      return {
        recommendedTaskTitle: 'Review account status and determine next touchpoint',
        suggestedDaysOffset: 5,
      };
  }
}

/**
 * Calculates accurate Email & Campaign Metrics (Section 4.2, 13.5, 15.2, 15.6).
 * Strictly distinguishes Gmail Drafts Created from Confirmed Sent messages.
 * Creating a Gmail draft is NEVER counted as sending an email.
 */
export function calculateEmailPerformanceMetrics(drafts: OutreachEmailDraft[]) {
  const preparedCount = drafts.filter((d) => d.status !== 'Rejected').length;
  const gmailDraftsCreatedCount = drafts.filter(
    (d) => d.status === 'Gmail Draft Created' || Boolean(d.gmailDraftId)
  ).length;
  const sentMessages = drafts.filter((d) => d.status === 'Confirmed Sent' || d.status === 'Replied');
  const confirmedSentCount = sentMessages.length;

  const estimatedOpenedMessages = sentMessages.filter((d) => d.estimatedOpens > 0).length;
  const uniqueClickedMessages = sentMessages.filter((d) => d.uniqueClicks > 0).length;
  const totalClicksCount = sentMessages.reduce((acc, d) => acc + d.totalClicks, 0);
  const repliesReceivedCount = sentMessages.filter((d) => d.status === 'Replied').length;
  const positiveRepliesCount = sentMessages.filter(
    (d) =>
      d.status === 'Replied' &&
      (d.replyClassification === 'Positive' ||
        d.replyClassification === 'Interested' ||
        d.replyClassification === 'Pricing request' ||
        d.replyClassification === 'Meeting request')
  ).length;

  const denom = confirmedSentCount > 0 ? confirmedSentCount : 1;

  return {
    preparedCount,
    gmailDraftsCreatedCount,
    confirmedSentCount,
    estimatedOpenedMessages,
    uniqueClickedMessages,
    totalClicksCount,
    repliesReceivedCount,
    positiveRepliesCount,
    estimatedOpenRate: confirmedSentCount > 0 ? Number(((estimatedOpenedMessages / denom) * 100).toFixed(1)) : 0,
    uniqueCtr: confirmedSentCount > 0 ? Number(((uniqueClickedMessages / denom) * 100).toFixed(1)) : 0,
    replyRate: confirmedSentCount > 0 ? Number(((repliesReceivedCount / denom) * 100).toFixed(1)) : 0,
    positiveReplyRate: confirmedSentCount > 0 ? Number(((positiveRepliesCount / denom) * 100).toFixed(1)) : 0,
  };
}
