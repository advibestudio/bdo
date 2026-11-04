import React, { useState } from 'react';
import {
  BusinessRecord,
  CommunicationChannel,
  FollowUpOutcome,
  FollowUpTask,
  OutreachEmailDraft,
  SuppressionRecord,
  TargetCountry,
} from '../types/advibe';
import {
  checkFollowUpEligibility,
  getNextActionRecommendationForOutcome,
} from '../utils/intelligenceRules';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface FollowUpManagerViewProps {
  tasks: FollowUpTask[];
  businesses: BusinessRecord[];
  drafts: OutreachEmailDraft[];
  suppressionList: SuppressionRecord[];
  onCreateTask: (task: Omit<FollowUpTask, 'id'>) => void;
  onCompleteTask: (
    taskId: string,
    outcome: FollowUpOutcome,
    notes: string,
    createNextRecommendedTask: boolean
  ) => void;
  onRescheduleTask: (taskId: string, newDate: string) => void;
  onOpenBusiness: (businessId: string) => void;
  onPrepareFollowUpEmail: (businessId: string, contactId: string) => void;
}

const FOLLOW_UP_OUTCOMES: FollowUpOutcome[] = [
  'Interested',
  'Requested pricing',
  'Requested more information',
  'Meeting booked',
  'Proposal requested',
  'Proposal sent',
  'Follow up later',
  'No answer',
  'No response yet',
  'Not interested',
  'Wrong contact',
  'Unavailable',
  'Converted to customer',
  'Other',
];

export const FollowUpManagerView: React.FC<FollowUpManagerViewProps> = ({
  tasks,
  businesses,
  drafts,
  suppressionList,
  onCreateTask,
  onCompleteTask,
  onRescheduleTask,
  onOpenBusiness,
  onPrepareFollowUpEmail,
}) => {
  const [activeBucket, setActiveBucket] = useState<
    'today' | 'upcoming' | 'overdue' | 'waiting' | 'completed'
  >('today');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Manual Follow-up Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState<string>(businesses[0]?.id || '');
  const [selectedContactId, setSelectedContactId] = useState<string>(
    businesses[0]?.contacts[0]?.id || ''
  );
  const [newDueDate, setNewDueDate] = useState<string>('2026-11-04');
  const [newDueTime, setNewDueTime] = useState<string>('11:30');
  const [newChannel, setNewChannel] = useState<CommunicationChannel>('Email');
  const [newPurpose, setNewPurpose] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Urgent' | 'High' | 'Standard'>('High');
  const [protectionError, setProtectionError] = useState<string | null>(null);

  // Complete Task Modal State
  const [completingTask, setCompletingTask] = useState<FollowUpTask | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<FollowUpOutcome>('Interested');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [autoScheduleNext, setAutoScheduleNext] = useState<boolean>(true);

  const selectedBizObj = businesses.find((b) => b.id === selectedBizId) || businesses[0];

  const filteredTasks = tasks.filter((t) => {
    if (countryFilter !== 'ALL' && t.country !== countryFilter) return false;
    if (channelFilter !== 'ALL' && t.channel !== channelFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (
      searchQuery.trim() &&
      !`${t.businessName} ${t.contactName} ${t.purpose}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }

    if (activeBucket === 'today') {
      return t.status === 'Due today' || (t.dueDate === '2026-11-04' && t.status !== 'Completed');
    }
    if (activeBucket === 'overdue') {
      return t.status === 'Overdue' || (t.dueDate < '2026-11-04' && t.status !== 'Completed');
    }
    if (activeBucket === 'upcoming') {
      return t.dueDate > '2026-11-04' && t.status !== 'Completed';
    }
    if (activeBucket === 'completed') {
      return t.status === 'Completed';
    }
    return t.status !== 'Completed';
  });

  const waitingBusinesses = businesses.filter(
    (b) =>
      b.pipelineStage === 'Awaiting response' ||
      b.pipelineStage === 'Initial contact sent' ||
      b.pipelineStage === 'Proposal sent'
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProtectionError(null);
    if (!selectedBizObj || !newPurpose.trim()) {
      setProtectionError('Please provide a follow-up purpose.');
      return;
    }

    const contact =
      selectedBizObj.contacts.find((c) => c.id === selectedContactId) ||
      selectedBizObj.contacts[0] || {
        id: 'cnt-default',
        fullName: 'Primary Decision-Maker',
        jobTitle: 'Executive',
        email: '',
        contactStatus: 'Active' as const,
      };

    const eligibility = checkFollowUpEligibility({
      business: selectedBizObj,
      contact,
      existingTasks: tasks,
      suppressionList,
      intendedPurpose: newPurpose.trim(),
      isAutomatedSequence: false,
    });

    if (!eligibility.allowed) {
      setProtectionError(eligibility.blockReason || 'Follow-up blocked by protection rules.');
      return;
    }

    onCreateTask({
      businessId: selectedBizObj.id,
      businessName: selectedBizObj.name,
      contactId: contact.id,
      contactName: contact.fullName,
      contactRole: contact.jobTitle,
      country: selectedBizObj.country,
      industry: selectedBizObj.industry,
      dueDate: newDueDate,
      dueTime: newDueTime,
      channel: newChannel,
      purpose: newPurpose.trim(),
      notes: newNotes.trim(),
      priority: newPriority,
      assignedTo: 'Shittu (Founder)',
      status:
        newDueDate < '2026-11-04'
          ? 'Overdue'
          : newDueDate === '2026-11-04'
          ? 'Due today'
          : 'Pending',
      creationSource: 'Manual',
    });

    setNewPurpose('');
    setNewNotes('');
    setShowCreateModal(false);
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    onCompleteTask(
      completingTask.id,
      selectedOutcome,
      completionNotes.trim() || `Recorded outcome: ${selectedOutcome}`,
      autoScheduleNext
    );
    setCompletingTask(null);
    setCompletionNotes('');
  };

  const nextRec = getNextActionRecommendationForOutcome(selectedOutcome);

  return (
    <div className="space-y-6">
      {/* Header & Top Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Follow-up Manager & Relationship Assistant
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track due and overdue touchpoints, review AI-recommended follow-ups, record outcomes,
            and enforce reply auto-pause protection rules.
          </p>
        </div>

        <button
          onClick={() => {
            setProtectionError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Follow-up Task</span>
        </button>
      </div>

      {/* Follow-up Intelligence & Protection Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Due Today (4 Nov)</div>
          <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900">
            {tasks.filter((t) => t.status === 'Due today').length}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Includes Dream 100 pricing & portfolio click responses
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Overdue Tasks</div>
          <div className="mt-1 text-2xl font-bold font-mono-tabular text-red-600">
            {tasks.filter((t) => t.status === 'Overdue').length}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Immediate outreach or rescheduling required
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Waiting for Prospect Response</div>
          <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900">
            {waitingBusinesses.length}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Active initial outreach or proposal sequences
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs text-slate-500">Reply Auto-Pause Protection</div>
          <div className="mt-1 text-2xl font-bold font-mono-tabular text-emerald-700">
            {businesses.filter((b) => b.hasReplied).length} Active
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Automated sequences paused after incoming reply
          </div>
        </div>
      </div>

      {/* Bucket Selector Tabs (Section 10.3) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              {
                id: 'today',
                label: `Today (${tasks.filter((t) => t.status === 'Due today').length})`,
              },
              {
                id: 'overdue',
                label: `Overdue (${tasks.filter((t) => t.status === 'Overdue').length})`,
              },
              {
                id: 'upcoming',
                label: `Upcoming (${
                  tasks.filter((t) => t.dueDate > '2026-11-04' && t.status !== 'Completed').length
                })`,
              },
              { id: 'waiting', label: `Waiting for Response (${waitingBusinesses.length})` },
              {
                id: 'completed',
                label: `Completed (${tasks.filter((t) => t.status === 'Completed').length})`,
              },
            ] as const
          ).map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBucket(b.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeBucket === b.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by business, contact, purpose..."
            aria-label="Filter follow-up tasks"
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white w-56"
          />
          <select
            aria-label="Filter by country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option value="ALL">All 5 Countries</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
          </select>
          <select
            aria-label="Filter by channel"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option value="ALL">All Channels</option>
            <option value="Email">Email</option>
            <option value="Phone Call">Phone Call</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Video Meeting">Video Meeting</option>
          </select>
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Standard">Standard</option>
          </select>
        </div>
      </div>

      {/* Waiting for Response View vs Task List View */}
      {activeBucket === 'waiting' ? (
        <div className="space-y-3">
          {waitingBusinesses.map((biz) => {
            const bizDrafts = drafts.filter((d) => d.businessId === biz.id);
            const totalClicks = bizDrafts.reduce((acc, d) => acc + d.totalClicks, 0);
            return (
              <div
                key={biz.id}
                className="p-4 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    {biz.country} · {biz.industry} · Stage: {biz.pipelineStage}
                  </div>
                  <div className="text-sm font-bold text-slate-900">{biz.name}</div>
                  <div className="text-xs text-slate-600 font-mono-tabular">
                    Last Contact: {biz.lastInteractionDate} · Next Scheduled Follow-up:{' '}
                    {biz.nextFollowUpDate} · Tracked Portfolio Clicks: {totalClicks}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenBusiness(biz.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Open Business Record
                  </button>
                  <button
                    onClick={() =>
                      onPrepareFollowUpEmail(biz.id, biz.contacts[0]?.id || 'cnt-default')
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Draft Contextual Follow-up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-lg text-center">
              <p className="text-sm font-semibold text-slate-800">
                No follow-up tasks match this view
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Switch tabs or click "Create Follow-up Task" to schedule a new relationship action.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 bg-white border border-slate-200 rounded-lg space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span
                        className={`font-semibold ${
                          task.status === 'Overdue'
                            ? 'text-red-600'
                            : task.status === 'Due today'
                            ? 'text-amber-700'
                            : task.status === 'Completed'
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Due: {task.dueDate} at {task.dueTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Priority: {task.priority}</span>
                      <span aria-hidden="true">·</span>
                      <span>Channel: {task.channel}</span>
                      <span aria-hidden="true">·</span>
                      <span>Source: {task.creationSource}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{task.purpose}</h3>

                    <div className="text-xs text-slate-600">
                      Business:{' '}
                      <button
                        onClick={() => onOpenBusiness(task.businessId)}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {task.businessName}
                      </button>{' '}
                      ({task.country} · {task.industry}) · Contact:{' '}
                      <span className="font-medium text-slate-900">
                        {task.contactName} ({task.contactRole})
                      </span>
                    </div>
                  </div>

                  {/* Direct Task Actions (Section 10.5) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpenBusiness(task.businessId)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                    >
                      Open Business Record
                    </button>
                    {task.status !== 'Completed' && (
                      <>
                        <button
                          onClick={() =>
                            onPrepareFollowUpEmail(task.businessId, task.contactId)
                          }
                          className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md whitespace-nowrap"
                        >
                          Generate Follow-up Email
                        </button>
                        <button
                          onClick={() => onRescheduleTask(task.id, '2026-11-08')}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                        >
                          Reschedule (+4d)
                        </button>
                        <button
                          onClick={() => {
                            setCompletingTask(task);
                            setSelectedOutcome('Interested');
                            setCompletionNotes('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Follow-up</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {task.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
                    <strong>Context Notes:</strong> {task.notes}
                  </p>
                )}

                {task.aiReasoning && (
                  <div className="text-xs text-slate-700 bg-indigo-50/60 p-3 rounded border border-indigo-100">
                    <strong>AI Follow-up Intelligence (Requires Human Approval):</strong>{' '}
                    {task.aiReasoning}
                  </div>
                )}

                {task.status === 'Completed' && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 font-mono-tabular">
                    Completed with Outcome: <strong>{task.recordedOutcome}</strong> · Notes:{' '}
                    {task.completionNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Complete Follow-up & Record Outcome (Section 10.6) */}
      {completingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Complete Follow-up Task"
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Complete Follow-up: {completingTask.businessName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Task: {completingTask.purpose} ({completingTask.contactName})
              </p>
            </div>

            <form onSubmit={handleConfirmComplete} className="space-y-4">
              <div>
                <label
                  htmlFor="followup-outcome-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Recorded Outcome (Section 10.6) *
                </label>
                <select
                  id="followup-outcome-select"
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value as FollowUpOutcome)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                >
                  {FOLLOW_UP_OUTCOMES.map((out) => (
                    <option key={out} value={out}>
                      {out}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conversation & Outcome Notes
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Record key feedback, pricing discussed, or next agreed date..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                />
              </div>

              {/* Next Recommended Action Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="font-semibold text-slate-900">
                  AI Next-Step Recommendation for "{selectedOutcome}":
                </div>
                {nextRec.recommendedTaskTitle ? (
                  <>
                    <p className="text-slate-700">
                      Suggested Task: <strong>{nextRec.recommendedTaskTitle}</strong> (in +
                      {nextRec.suggestedDaysOffset} days)
                      {nextRec.suggestedStage &&
                        ` · Advances pipeline stage to "${nextRec.suggestedStage}"`}
                    </p>
                    <label className="inline-flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoScheduleNext}
                        onChange={(e) => setAutoScheduleNext(e.target.checked)}
                      />
                      <span>Automatically create this next recommended follow-up task</span>
                    </label>
                  </>
                ) : (
                  <p className="text-amber-800">{nextRec.compliancePrompt}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Save Outcome & Complete Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Manual Follow-up Task (Section 10.2.B) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create Manual Follow-up Task"
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Manual Follow-up Task</h3>

            {protectionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {protectionError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Business *</label>
                <select
                  value={selectedBizId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBizId(bId);
                    const b = businesses.find((x) => x.id === bId);
                    setSelectedContactId(b?.contacts[0]?.id || '');
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {selectedBizObj?.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.jobTitle})
                      </option>
                    ))}
                    {selectedBizObj?.contacts.length === 0 && (
                      <option value="">Primary Decision-Maker</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Communication Channel
                  </label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as CommunicationChannel)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Video Meeting">Video Meeting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  placeholder="e.g., Follow up on Five Creative Pack proposal"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up Notes
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Key context or links to reference..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
