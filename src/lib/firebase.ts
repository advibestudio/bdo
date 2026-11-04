import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BusinessRecord, FollowUpTask, OutreachEmailDraft } from '../types/advibe';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId ||
    'ai-studio-advibeprospectin-5c87569e-fe81-4954-b3c0-41032a5648e8'
);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string | null;
} | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

function sanitizeDocId(rawId: string, fallbackPrefix = 'rec'): string {
  const cleaned = String(rawId || `${fallbackPrefix}-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

/**
 * Load all persisted BusinessRecord documents owned by the signed-in user from Firestore.
 */
export async function loadBusinessesFromFirestore(): Promise<BusinessRecord[]> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return [];
  const uid = auth.currentUser.uid;
  const path = 'businesses';
  try {
    const q = query(collection(db, 'businesses'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const loaded: BusinessRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.payloadJson) {
        try {
          const parsed = JSON.parse(data.payloadJson) as BusinessRecord;
          if (parsed && parsed.id && parsed.name) {
            loaded.push(parsed);
          }
        } catch {
          // ignore malformed payload
        }
      }
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Defensive payload sanitization matching firebase-blueprint.json & firestore.rules constraints.
 * Preserves createdAt on updates to satisfy immutable field checks in firestore.rules.
 */
export async function syncBusinessToFirestore(biz: BusinessRecord): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const cleanId = sanitizeDocId(biz.id, 'biz');
  const path = `businesses/${cleanId}`;
  const docRef = doc(db, 'businesses', cleanId);

  const payloadStr = JSON.stringify(biz).slice(0, 195000);

  try {
    const existingSnap = await getDoc(docRef);
    const existingCreatedAt = existingSnap.exists() ? existingSnap.data()?.createdAt : null;

    const docData = {
      ownerId: uid,
      name: String(biz.name || 'Unnamed Business').slice(0, 200),
      domain: String(biz.normalizedDomain || 'example.com').slice(0, 200),
      country: ['United States', 'United Kingdom', 'Nigeria', 'Ghana', 'Kenya'].includes(
        biz.country
      )
        ? biz.country
        : 'United Kingdom',
      industry: String(biz.industry || 'E-commerce businesses').slice(0, 120),
      qualificationStatus: [
        'Qualified – contact available',
        'Qualified – contact unavailable',
        'Needs more research',
        'Pending review',
        'Rejected',
        'Duplicate',
        'Excluded',
      ].includes(biz.qualificationStatus)
        ? biz.qualificationStatus
        : 'Pending review',
      pipelineStage: String(biz.pipelineStage || 'Qualified').slice(0, 80),
      leadScore: Math.max(0, Math.min(100, Math.round(Number(biz.leadScore) || 50))),
      isDream100: Boolean(biz.isDream100),
      payloadJson: payloadStr.length >= 2 ? payloadStr : '{}',
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBusinessFromFirestore(businessId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const cleanId = sanitizeDocId(businessId, 'biz');
  const path = `businesses/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'businesses', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncFollowUpTaskToFirestore(task: FollowUpTask): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const cleanId = sanitizeDocId(task.id, 'tsk');
  const cleanBizId = sanitizeDocId(task.businessId, 'biz');
  const path = `followUpTasks/${cleanId}`;
  const docRef = doc(db, 'followUpTasks', cleanId);

  const validStatuses = [
    'Pending',
    'Due today',
    'Overdue',
    'In progress',
    'Awaiting approval',
    'Draft prepared',
    'Completed',
    'Rescheduled',
    'Cancelled',
    'Blocked',
  ];

  try {
    const existingSnap = await getDoc(docRef);
    const existingCreatedAt = existingSnap.exists() ? existingSnap.data()?.createdAt : null;

    const docData = {
      ownerId: uid,
      businessId: cleanBizId,
      title: String(task.purpose || 'Follow-up action').slice(0, 240),
      status: validStatuses.includes(task.status) ? task.status : 'Blocked',
      channel: String(task.channel || 'Email').slice(0, 60),
      dueDate: String(task.dueDate || new Date().toISOString().slice(0, 10)).slice(0, 40),
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCampaignDraftToFirestore(draft: OutreachEmailDraft): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const cleanId = sanitizeDocId(draft.id, 'drf');
  const cleanBizId = sanitizeDocId(draft.businessId, 'biz');
  const path = `campaignDrafts/${cleanId}`;
  const docRef = doc(db, 'campaignDrafts', cleanId);

  const validStatuses = [
    'Pending Approval',
    'Approved',
    'Gmail Draft Created',
    'Confirmed Sent',
    'Replied',
    'Rejected',
  ];

  try {
    const existingSnap = await getDoc(docRef);
    const existingCreatedAt = existingSnap.exists() ? existingSnap.data()?.createdAt : null;

    const docData = {
      ownerId: uid,
      businessId: cleanBizId,
      subject: String(draft.subject || 'Outreach Subject').slice(0, 300),
      body: String(draft.body || 'Outreach Body').slice(0, 20000),
      status: validStatuses.includes(draft.status) ? draft.status : 'Pending Approval',
      gmailDraftId: String(draft.gmailDraftId || '').slice(0, 200),
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Purges all documents owned by the current user across businesses, followUpTasks, and campaignDrafts.
 */
export async function purgeAllUserFirestoreData(): Promise<number> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return 0;
  const uid = auth.currentUser.uid;
  let deletedCount = 0;

  for (const colName of ['followUpTasks', 'campaignDrafts', 'businesses']) {
    try {
      const q = query(collection(db, colName), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
        deletedCount += 1;
      }
    } catch (error) {
      console.error(`Error purging ${colName}:`, error);
    }
  }
  return deletedCount;
}
