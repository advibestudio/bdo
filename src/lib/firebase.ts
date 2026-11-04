import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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

/**
 * Defensive payload sanitization matching firebase-blueprint.json & firestore.rules constraints.
 */
export async function syncBusinessToFirestore(biz: any): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const cleanId = String(biz.id || 'biz-1')
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 120);
  const path = `businesses/${cleanId}`;

  const payloadStr = JSON.stringify(biz).slice(0, 195000);
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'businesses', cleanId), docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBusinessFromFirestore(businessId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const cleanId = String(businessId)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 120);
  const path = `businesses/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'businesses', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
