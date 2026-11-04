import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEmailPerformanceMetrics,
  calculateLeadScore,
  checkFollowUpEligibility,
  detectDuplicateBusiness,
  evaluateDiscoveryRunReport,
  getNextActionRecommendationForOutcome,
  getPriorityCategory,
  normalizeDomain,
} from './intelligenceRules';

test('normalizeDomain strips protocol, www, paths, and query params', () => {
  assert.equal(normalizeDomain('https://www.LumiereBotanicals.co.uk/shop?ref=ads#top'), 'lumierebotanicals.co.uk');
  assert.equal(normalizeDomain('http://paystack.com/pricing'), 'paystack.com');
});

test('calculateLeadScore and getPriorityCategory follow PRD Section 7.2 and 7.3', () => {
  const score = calculateLeadScore({
    serviceRelevance: { score: 19, max: 20, explanation: 'High fit' },
    promotionalActivity: { score: 14, max: 15, explanation: 'Active ads' },
    recurringOpportunity: { score: 14, max: 15, explanation: 'Monthly SKUs' },
    businessMaturity: { score: 9, max: 10, explanation: 'Established' },
    promotionFrequency: { score: 9, max: 10, explanation: 'Weekly campaigns' },
    contactAccessibility: { score: 9, max: 10, explanation: 'Direct founder email' },
    commercialValue: { score: 8, max: 10, explanation: 'High LTV' },
    strategicRelationship: { score: 8, max: 10, explanation: 'Flagship brand' },
  });
  assert.equal(score, 90);
  assert.equal(getPriorityCategory(score), 'Dream 100 candidate');
  assert.equal(getPriorityCategory(78), 'High-potential prospect');
  assert.equal(getPriorityCategory(60), 'Emerging prospect');
  assert.equal(getPriorityCategory(42), 'Low priority or further research');
});

test('evaluateDiscoveryRunReport never inflates qualified count when below target', () => {
  const report = evaluateDiscoveryRunReport({
    targetGoal: 50,
    rawCandidates: 118,
    qualifiedCount: 32,
    duplicatesCount: 24,
    rejectedCount: 62,
  });
  assert.equal(report.targetMet, false);
  assert.equal(report.actualQualifiedReported, 32);
  assert.equal(report.shortfallCount, 18);
  assert.ok(report.explanation.includes('Shortfall of 18 qualified businesses'));
});

test('detectDuplicateBusiness matches normalized domain and does not merge distinct domains with similar names', () => {
  const existing = [
    {
      id: 'biz-uk-1',
      name: 'Aura Skincare',
      normalizedDomain: 'auraskincare.co.uk',
      country: 'United Kingdom' as const,
      contacts: [],
    },
  ];
  const dup = detectDuplicateBusiness(
    { name: 'Aura Skincare UK', website: 'https://www.auraskincare.co.uk/products', country: 'United Kingdom' },
    existing
  );
  assert.equal(dup.isDuplicate, true);
  assert.equal(dup.matchedBusinessId, 'biz-uk-1');

  const distinct = detectDuplicateBusiness(
    { name: 'Aura Skincare US', website: 'https://auraskincare.us', country: 'United States' },
    existing
  );
  assert.equal(distinct.isDuplicate, false);
});

test('checkFollowUpEligibility blocks suppressed contacts, replied automated sequences, and duplicates', () => {
  const blockedByReply = checkFollowUpEligibility({
    business: { id: 'b1', normalizedDomain: 'brand.com', hasReplied: true },
    contact: { id: 'c1', email: 'cmo@brand.com', contactStatus: 'Active' },
    existingTasks: [],
    suppressionList: [],
    intendedPurpose: 'Day 4 Follow-up',
    isAutomatedSequence: true,
  });
  assert.equal(blockedByReply.allowed, false);
  assert.ok(blockedByReply.blockReason?.includes('replied'));

  const blockedBySuppression = checkFollowUpEligibility({
    business: { id: 'b1', normalizedDomain: 'brand.com', hasReplied: false },
    contact: { id: 'c1', email: 'optout@brand.com', contactStatus: 'Active' },
    existingTasks: [],
    suppressionList: [{ emailOrDomain: 'optout@brand.com' }],
    intendedPurpose: 'Initial follow-up',
    isAutomatedSequence: false,
  });
  assert.equal(blockedBySuppression.allowed, false);
});

test('calculateEmailPerformanceMetrics never counts Gmail drafts as sent emails', () => {
  const metrics = calculateEmailPerformanceMetrics([
    {
      id: 'd1',
      idempotencyKey: 'k1',
      campaignId: 'c1',
      campaignName: 'Q4 Skincare',
      businessId: 'b1',
      businessName: 'Brand A',
      contactId: 'ct1',
      contactName: 'Ada',
      contactEmail: 'ada@branda.com',
      country: 'Nigeria',
      industry: 'Skincare businesses',
      recommendedServiceId: 'srv-1',
      recommendedServiceName: 'Product Advertisements',
      subject: 'Idea for Brand A',
      body: 'Hello Ada',
      researchEvidenceUsed: 'Website catalog',
      personalisationAngle: 'Product demo',
      status: 'Gmail Draft Created',
      gmailDraftId: 'r-99182',
      createdAt: '2026-11-04',
      estimatedOpens: 0,
      uniqueClicks: 0,
      totalClicks: 0,
      trackedLinks: [],
      sequenceStep: 1,
    },
    {
      id: 'd2',
      idempotencyKey: 'k2',
      campaignId: 'c1',
      campaignName: 'Q4 Skincare',
      businessId: 'b2',
      businessName: 'Brand B',
      contactId: 'ct2',
      contactName: 'Ben',
      contactEmail: 'ben@brandb.com',
      country: 'United Kingdom',
      industry: 'Skincare businesses',
      recommendedServiceId: 'srv-1',
      recommendedServiceName: 'Product Advertisements',
      subject: 'Idea for Brand B',
      body: 'Hello Ben',
      researchEvidenceUsed: 'Website catalog',
      personalisationAngle: 'Product demo',
      status: 'Replied',
      gmailDraftId: 'r-99183',
      gmailMessageId: 'msg-101',
      replyClassification: 'Interested',
      createdAt: '2026-11-04',
      estimatedOpens: 2,
      uniqueClicks: 1,
      totalClicks: 3,
      trackedLinks: [],
      sequenceStep: 1,
    },
  ]);

  assert.equal(metrics.gmailDraftsCreatedCount, 2);
  assert.equal(metrics.confirmedSentCount, 1);
  assert.equal(metrics.estimatedOpenRate, 100);
  assert.equal(metrics.uniqueCtr, 100);
  assert.equal(metrics.totalClicksCount, 3);
  assert.equal(metrics.positiveReplyRate, 100);
});

test('getNextActionRecommendationForOutcome maps outcomes to concrete next steps', () => {
  const pricingOutcome = getNextActionRecommendationForOutcome('Requested pricing');
  assert.equal(pricingOutcome.suggestedStage, 'Proposal requested');
  assert.ok(pricingOutcome.recommendedTaskTitle?.includes('pricing'));
});
