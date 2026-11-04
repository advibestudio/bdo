export type TargetCountry =
  | 'United States'
  | 'United Kingdom'
  | 'Nigeria'
  | 'Ghana'
  | 'Kenya';

export type CurrencyCode = 'USD' | 'GBP' | 'NGN' | 'GHS' | 'KES';

export type UserRole =
  | 'Administrator'
  | 'Sales Manager'
  | 'Sales Representative'
  | 'Researcher'
  | 'Viewer';

export type QualificationStatus =
  | 'Qualified – contact available'
  | 'Qualified – contact unavailable'
  | 'Needs more research'
  | 'Pending review'
  | 'Rejected'
  | 'Duplicate'
  | 'Excluded';

export type PriorityCategory =
  | 'Dream 100 candidate'
  | 'High-potential prospect'
  | 'Emerging prospect'
  | 'Low priority or further research';

export type Dream100Status =
  | 'Not researched'
  | 'Research completed'
  | 'Ready for introduction'
  | 'First contact made'
  | 'Conversation started'
  | 'Relationship developing'
  | 'Meeting scheduled'
  | 'Partnership opportunity'
  | 'Active client'
  | 'Nurture'
  | 'Not interested'
  | 'Closed';

export type PipelineStage =
  | 'Newly discovered'
  | 'Research pending'
  | 'Qualified'
  | 'Ready for outreach'
  | 'Initial contact prepared'
  | 'Initial contact sent'
  | 'Awaiting response'
  | 'Conversation started'
  | 'Interested'
  | 'Meeting scheduled'
  | 'Meeting completed'
  | 'Proposal requested'
  | 'Proposal sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Nurture'
  | 'Disqualified';

export type FollowUpStatus =
  | 'Pending'
  | 'Due today'
  | 'Overdue'
  | 'In progress'
  | 'Awaiting approval'
  | 'Draft prepared'
  | 'Completed'
  | 'Rescheduled'
  | 'Cancelled'
  | 'Blocked';

export type FollowUpOutcome =
  | 'No answer'
  | 'No response yet'
  | 'Interested'
  | 'Requested more information'
  | 'Requested pricing'
  | 'Meeting booked'
  | 'Proposal requested'
  | 'Proposal sent'
  | 'Not interested'
  | 'Wrong contact'
  | 'Unavailable'
  | 'Follow up later'
  | 'Converted to customer'
  | 'Other';

export type CommunicationChannel =
  | 'Email'
  | 'Phone Call'
  | 'WhatsApp'
  | 'LinkedIn'
  | 'Video Meeting';

export type ActivityType =
  | 'Research'
  | 'Initial email'
  | 'Follow-up email'
  | 'Phone call'
  | 'WhatsApp conversation'
  | 'LinkedIn interaction'
  | 'Meeting'
  | 'Proposal'
  | 'Pricing discussion'
  | 'Internal review'
  | 'Relationship-building activity'
  | 'Other';

export type NavigationModule =
  | 'overview'
  | 'discover'
  | 'daily-prospects'
  | 'dream-100'
  | 'lead-database'
  | 'follow-ups'
  | 'pipeline'
  | 'campaign-studio'
  | 'email-performance'
  | 'tasks-activities'
  | 'analytics'
  | 'automation'
  | 'integrations'
  | 'compliance'
  | 'settings';

export interface ScoreCriterionBreakdown {
  serviceRelevance: { score: number; max: 20; explanation: string };
  promotionalActivity: { score: number; max: 15; explanation: string };
  recurringOpportunity: { score: number; max: 15; explanation: string };
  businessMaturity: { score: number; max: 10; explanation: string };
  promotionFrequency: { score: number; max: 10; explanation: string };
  contactAccessibility: { score: number; max: 10; explanation: string };
  commercialValue: { score: number; max: 10; explanation: string };
  strategicRelationship: { score: number; max: 10; explanation: string };
}

export interface ResearchEvidenceItem {
  id: string;
  claim: string;
  sourceUrl: string;
  sourceType: 'Official Website' | 'Social Profile' | 'Ad Library' | 'Directory' | 'Press Release';
  retrievalDate: string;
  extractedEvidence: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

export interface ResearchReportVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  businessOverview: string;
  productsAndServices: string[];
  targetAudience: string;
  positioning: string;
  publicSizeIndicator: string; // e.g., "Multi-SKU DTC store (Revenue not publicly established)"
  marketingActivity: {
    activelyPromotes: boolean;
    publishesVideoContent: boolean;
    usesProductDemos: boolean;
    usesTestimonials: boolean;
    publishesEducational: boolean;
    runsVisibleCampaigns: boolean;
    consistentStrategy: boolean;
    recurringNeeds: boolean;
    summary: string;
  };
  videoContentAnalysis: string;
  creativeOpportunities: string[];
  recommendedServices: string[];
  strongestInitialOffer: string;
  problemSolved: string;
  suggestedOutreachAngle: string;
  appropriateFirstConversation: string;
  evidence: ResearchEvidenceItem[];
  researchConfidence: 'High' | 'Medium' | 'Low';
}

export interface ContactPerson {
  id: string;
  businessId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  professionalRole: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedinUrl: string;
  socialProfiles: string[];
  contactSource: string;
  verificationStatus: 'Verified' | 'Unverified' | 'Needs Check';
  contactStatus: 'Active' | 'Suppressed' | 'Do Not Contact' | 'Unsubscribed';
  preferredChannel: CommunicationChannel;
  isPrimaryDecisionMaker: boolean;
}

export interface BusinessOpportunity {
  id: string;
  businessId: string;
  primaryContactId: string;
  name: string;
  recommendedServiceId: string;
  recommendedServiceName: string;
  estimatedValue: number;
  currency: CurrencyCode;
  probability: number;
  expectedClosingDate: string;
  stage: PipelineStage;
  proposalStatus: 'Not Prepared' | 'Drafted' | 'Sent' | 'Accepted' | 'Declined';
  notes: string;
  outcome: 'Open' | 'Won' | 'Lost';
  ownerName: string;
}

export interface TimelineEvent {
  id: string;
  businessId: string;
  contactId?: string;
  timestamp: string;
  type: ActivityType;
  origin: 'Integration Confirmed' | 'Manual Record' | 'AI Recommendation';
  title: string;
  description: string;
  outcome?: string;
  ownerName: string;
  campaignId?: string;
  opportunityId?: string;
  nextAction?: string;
}

export interface Dream100Strategy {
  enrolledAt: string;
  strategicPriority: 'Tier 1 Iconic' | 'Tier 2 Growth' | 'Tier 3 Partner';
  reasonForTargeting: string;
  keyDecisionMakerId: string;
  desiredRelationship: string;
  engagementStrategy: string;
  relationshipStatus: Dream100Status;
  nextPlannedActivityDate: string;
  relationshipNotes: string;
}

export interface BusinessRecord {
  id: string;
  name: string;
  website: string;
  normalizedDomain: string;
  country: TargetCountry;
  city: string;
  industry: string;
  category: string;
  description: string;
  qualificationStatus: QualificationStatus;
  dateDiscovered: string;
  discoverySource: string;
  leadScore: number;
  aiOriginalScore: number;
  scoreOverrideReason?: string;
  scoreBreakdown: ScoreCriterionBreakdown;
  priorityCategory: PriorityCategory;
  recommendedServices: string[];
  opportunitySummary: string;
  researchConfidence: 'High' | 'Medium' | 'Low';
  lastResearchDate: string;
  researchHistory: ResearchReportVersion[];
  leadOwner: string;
  pipelineStage: PipelineStage;
  estimatedDealValue: number;
  dealCurrency: CurrencyCode;
  expectedClosingDate: string;
  isDream100: boolean;
  dream100Strategy?: Dream100Strategy;
  lastInteractionDate: string;
  nextFollowUpDate: string;
  lastContactOutcome: string;
  contacts: ContactPerson[];
  opportunities: BusinessOpportunity[];
  timeline: TimelineEvent[];
  notes: { id: string; author: string; createdAt: string; content: string }[];
  hasReplied?: boolean;
}

export interface FollowUpTask {
  id: string;
  businessId: string;
  businessName: string;
  contactId: string;
  contactName: string;
  contactRole: string;
  country: TargetCountry;
  industry: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  channel: CommunicationChannel;
  purpose: string;
  notes: string;
  priority: 'Urgent' | 'High' | 'Standard';
  assignedTo: string;
  relatedCampaignId?: string;
  status: FollowUpStatus;
  creationSource: 'Automatic Policy' | 'Manual' | 'AI Recommended';
  aiReasoning?: string;
  completedAt?: string;
  recordedOutcome?: FollowUpOutcome;
  completionNotes?: string;
}

export interface ServicePackagePrice {
  id: string;
  serviceId: string;
  country: TargetCountry;
  currency: CurrencyCode;
  price: number;
  packageName: string;
  packageDescription: string;
  deliverables: string[];
  videoDurationLimit: string;
  turnaroundTime: string;
  validityPeriod: string;
  active: boolean;
  discountRules: string;
  internalNotes: string;
}

export interface AdVibeService {
  id: string;
  code: string;
  name: string;
  shortDescription: string;
  idealProspectTypes: string[];
  keyBenefits: string[];
  active: boolean;
  pricingByCountry: ServicePackagePrice[];
}

export type EmailDraftStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Gmail Draft Created'
  | 'Confirmed Sent'
  | 'Replied'
  | 'Rejected';

export type ReplyClassification =
  | 'Positive'
  | 'Interested'
  | 'Request for information'
  | 'Pricing request'
  | 'Meeting request'
  | 'Not interested'
  | 'Referral'
  | 'Out of office'
  | 'Unclear';

export interface OutreachEmailDraft {
  id: string;
  idempotencyKey: string;
  campaignId: string;
  campaignName: string;
  businessId: string;
  businessName: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  country: TargetCountry;
  industry: string;
  recommendedServiceId: string;
  recommendedServiceName: string;
  subject: string;
  body: string;
  researchEvidenceUsed: string;
  personalisationAngle: string;
  status: EmailDraftStatus;
  gmailDraftId?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  createdAt: string;
  approvedAt?: string;
  draftCreatedAt?: string;
  sentAt?: string;
  repliedAt?: string;
  replySnippet?: string;
  replyClassification?: ReplyClassification;
  estimatedOpens: number;
  firstOpenedAt?: string;
  uniqueClicks: number;
  totalClicks: number;
  trackedLinks: {
    id: string;
    label: string;
    destinationUrl: string;
    trackingUrl: string;
    uniqueClicked: boolean;
    totalClickCount: number;
  }[];
  sequenceStep: number; // 1 = Initial, 2 = Follow-up 1, etc.
}

export interface OutreachCampaign {
  id: string;
  name: string;
  type:
    | 'Cold business introduction'
    | 'Product advertisement offer'
    | 'Monthly content retainer offer'
    | 'White-label agency partnership'
    | 'AI promotional mini-series offer'
    | 'Explainer video offer'
    | 'Training Academy promotion'
    | 'Dream 100 relationship-building campaign'
    | 'Event or seasonal campaign'
    | 'Custom campaign';
  targetCountries: TargetCountry[];
  targetIndustries: string[];
  promotedServiceId: string;
  promotedServiceName: string;
  objective: string;
  tone: 'Consultative & Executive' | 'Creative & Observational' | 'Direct & Value-Focused' | 'Warm Partnership';
  followUpPolicyDays: number[]; // e.g., [4, 9, 16]
  status: 'Draft' | 'Active' | 'Paused' | 'Completed';
  createdAt: string;
}

export interface DiscoveryJobReport {
  id: string;
  runAt: string;
  targetCountry: TargetCountry | 'All 5 Target Markets';
  targetIndustries: string[];
  targetQualifiedGoal: number;
  rawCandidatesInvestigated: number;
  uniqueBusinessesFound: number;
  qualifiedBusinesses: number;
  qualifiedWithContact: number;
  qualifiedWithoutContact: number;
  rejectedBusinesses: number;
  duplicatesDetected: number;
  withPublicEmail: number;
  withPhoneNumber: number;
  withSocialProfiles: number;
  outreachEligibleContacts: number;
  shortfallCount: number;
  shortfallExplanation: string;
  sourcesUsed: string[];
  errorsEncountered: string[];
}

export interface DailyCountryAllocation {
  country: TargetCountry;
  targetPerDay: number;
  discoveredToday: number;
  qualifiedToday: number;
}

export interface SuppressionRecord {
  id: string;
  emailOrDomain: string;
  businessName: string;
  country: TargetCountry;
  reason: 'Unsubscribed' | 'Do Not Contact Request' | 'Hard Bounce' | 'Manual Suppression' | 'Deletion Request';
  lawfulBasisNote: string;
  dateAdded: string;
  addedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  module: string;
  targetRecord: string;
  details: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  category:
    | 'Discovery'
    | 'Research'
    | 'Qualification'
    | 'Follow-up'
    | 'Reply Guard'
    | 'Engagement'
    | 'Dream 100'
    | 'Pipeline'
    | 'Data Hygiene';
  enabled: boolean;
  trigger: string;
  conditions: string;
  actions: string;
  lastExecutedAt: string;
  executionCount: number;
  status: 'Healthy' | 'Paused' | 'Retry Scheduled';
  lastResultSummary: string;
}
