import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithHcdcGoogle,
  signOutAccount,
  toDateValue,
} from './firebase';
import {
  DEFAULT_BSMT_LAB_ACTIVITIES,
  EvaluationRecord,
  isHcdcEmail,
  isTeacherEmail,
  LabActivity,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiquidGlassButton } from './components/LiquidGlassButton';
import { LoginPage } from './components/LoginPage';
import { RateSessionView } from './components/RateSessionView';
import { ResultsExportView } from './components/ResultsExportView';
import { ManageLabsView } from './components/ManageLabsView';

type TabKey = 'rate' | 'results' | 'manage';

interface LocalStudentSession {
  name: string;
  email: string;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('rate');
  const [user, setUser] = useState<User | null>(null);
  const [studentSession, setStudentSession] = useState<LocalStudentSession | null>(
    null
  );
  const [anonymousSession, setAnonymousSession] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activities, setActivities] = useState<LabActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(true);

  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState<boolean>(false);

  const [preselectedLabId] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('lab') || undefined;
  });

  const seededOnceRef = useRef<boolean>(false);

  // Track Firebase Auth state: enforce @hcdc.edu.ph and automatically detect teacher email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setIsTeacher(false);
        setActiveTab('rate');
        setAuthReady(true);
        return;
      }

      if (!nextUser.emailVerified || !isHcdcEmail(nextUser.email)) {
        await signOutAccount();
        setUser(null);
        setIsTeacher(false);
        setActiveTab('rate');
        setAuthError(
          'Only verified @hcdc.edu.ph accounts are allowed. Please sign in with your HCDC Google account.'
        );
        setAuthReady(true);
        return;
      }

      const teacherDetected = isTeacherEmail(nextUser.email);
      setUser(nextUser);
      setStudentSession(null);
      setAnonymousSession(false);
      setIsTeacher(teacherDetected);
      setActiveTab(teacherDetected ? 'results' : 'rate');
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Auto-seed default BSMT web-based ICT lab activities on first teacher login if empty
  useEffect(() => {
    if (!authReady || !isTeacher || seededOnceRef.current) return;
    seededOnceRef.current = true;

    const ensureInitialLabs = async () => {
      try {
        const existing = await getDocs(collection(db, 'lab_activities'));
        if (existing.empty) {
          for (const item of DEFAULT_BSMT_LAB_ACTIVITIES) {
            await setDoc(doc(db, 'lab_activities', item.id), {
              code: item.code,
              title: item.title,
              topic: item.topic,
              sessionDate: item.sessionDate,
              status: item.status,
              createdAt: serverTimestamp(),
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'lab_activities');
      }
    };

    void ensureInitialLabs();
  }, [authReady, isTeacher]);

  const hasEnteredApp = Boolean(user || studentSession || anonymousSession);

  // Subscribe to lab_activities once the user has entered via login page
  useEffect(() => {
    if (!authReady || !hasEnteredApp) {
      setActivities([]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);

    const activitiesQuery = isTeacher
      ? query(collection(db, 'lab_activities'), orderBy('sessionDate', 'desc'))
      : query(
          collection(db, 'lab_activities'),
          where('status', '==', 'active')
        );

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const list: LabActivity[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            code: String(data.code || ''),
            title: String(data.title || ''),
            topic: String(data.topic || ''),
            sessionDate: String(data.sessionDate || ''),
            status: data.status === 'archived' ? 'archived' : 'active',
            createdAt: toDateValue(data.createdAt),
          };
        });
        list.sort((a, b) => a.code.localeCompare(b.code));
        setActivities(list);
        setLoadingActivities(false);
      },
      (error) => {
        setLoadingActivities(false);
        handleFirestoreError(error, OperationType.LIST, 'lab_activities');
      }
    );

    return () => unsubscribe();
  }, [authReady, hasEnteredApp, isTeacher]);

  // Subscribe to evaluations only when edgardo.rojas@hcdc.edu.ph is signed in
  useEffect(() => {
    if (!authReady || !isTeacher) {
      setEvaluations([]);
      setLoadingEvaluations(false);
      return;
    }

    setLoadingEvaluations(true);
    const evalQuery = query(
      collection(db, 'evaluations'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      evalQuery,
      (snapshot) => {
        const list: EvaluationRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            activityId: String(data.activityId || ''),
            activityTitle: String(data.activityTitle || ''),
            activityRating: Number(data.activityRating || 0),
            classRating: Number(data.classRating || 0),
            teachingRating: Number(data.teachingRating || 0),
            feedback: String(data.feedback || ''),
            section: String(data.section || 'Unspecified'),
            sessionDate: String(data.sessionDate || ''),
            isAnonymous: data.isAnonymous !== false,
            studentName: String(data.studentName || ''),
            studentEmail: String(data.studentEmail || ''),
            createdAt: toDateValue(data.createdAt),
          };
        });
        setEvaluations(list);
        setLoadingEvaluations(false);
      },
      (error) => {
        setLoadingEvaluations(false);
        handleFirestoreError(error, OperationType.LIST, 'evaluations');
      }
    );

    return () => unsubscribe();
  }, [authReady, isTeacher]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithHcdcGoogle();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to complete @hcdc.edu.ph sign-in.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleStudentEmailContinue = (name: string, email: string) => {
    setAuthError(null);
    setAnonymousSession(false);
    setStudentSession({ name, email });
    setActiveTab('rate');
  };

  const handleContinueAnonymous = () => {
    setAuthError(null);
    setStudentSession(null);
    setAnonymousSession(true);
    setActiveTab('rate');
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setStudentSession(null);
    setAnonymousSession(false);
    setActiveTab('rate');
    if (user) {
      await signOutAccount();
    }
  };

  const activeEmail = user?.email || studentSession?.email || null;
  const activeName = user?.displayName || studentSession?.name || null;
  const sessionLabel = activeEmail || (anonymousSession ? 'Anonymous Profile' : null);

  return (
    <div className="min-h-screen relative bg-[#08090d] text-slate-100">
      {/* Subtle atmospheric gradient mesh so liquid glass buttons refract naturally */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 w-[620px] h-[420px] rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute top-1/3 right-1/5 w-[520px] h-[380px] rounded-full bg-indigo-600/12 blur-[140px]" />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 sm:gap-8">
          <span className="text-sm sm:text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
            BS Marine Transportation — ICT Laboratory
          </span>

          {hasEnteredApp && isTeacher && (
            <nav
              aria-label="Teacher navigation"
              className="flex items-center gap-5 sm:gap-7 text-sm font-medium"
            >
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  activeTab === 'results'
                    ? 'border-fuchsia-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Results & Export
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  activeTab === 'manage'
                    ? 'border-fuchsia-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Manage Labs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rate')}
                className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  activeTab === 'rate'
                    ? 'border-fuchsia-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Evaluation Form
              </button>
            </nav>
          )}

          {sessionLabel && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline text-xs font-mono-tabular text-slate-400 whitespace-nowrap">
                {sessionLabel}
              </span>
              <LiquidGlassButton
                variant="subtle"
                size="sm"
                onClick={handleSignOut}
              >
                Sign Out
              </LiquidGlassButton>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!authReady ? (
          <div className="max-w-lg mx-auto py-12 space-y-4">
            <div className="h-8 w-56 bg-white/[0.06] rounded-lg animate-pulse" />
            <div className="h-64 w-full bg-white/[0.04] rounded-2xl animate-pulse" />
          </div>
        ) : !hasEnteredApp ? (
          <LoginPage
            signingInWithGoogle={signingIn}
            authError={authError}
            onGoogleSignIn={handleGoogleSignIn}
            onStudentEmailContinue={handleStudentEmailContinue}
            onContinueAnonymous={handleContinueAnonymous}
          />
        ) : (
          <>
            {(!isTeacher || activeTab === 'rate') && (
              <RateSessionView
                activities={activities}
                loadingActivities={loadingActivities}
                preselectedActivityId={preselectedLabId}
                signedInEmail={activeEmail}
                signedInName={activeName}
                isGoogleAuth={Boolean(user)}
              />
            )}

            {isTeacher && activeTab === 'results' && (
              <ResultsExportView
                activities={activities}
                evaluations={evaluations}
                loadingEvaluations={loadingEvaluations}
              />
            )}

            {isTeacher && activeTab === 'manage' && (
              <ManageLabsView activities={activities} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
