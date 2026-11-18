export type ActivityStatus = 'active' | 'archived';

export interface LabActivity {
  id: string;
  code: string;
  title: string;
  topic: string;
  sessionDate: string;
  status: ActivityStatus;
  createdAt: Date | null;
}

export interface EvaluationRecord {
  id: string;
  activityId: string;
  activityTitle: string;
  activityRating: number;
  classRating: number;
  teachingRating: number;
  feedback: string;
  section: string;
  sessionDate: string;
  isAnonymous: boolean;
  studentName: string;
  studentEmail: string;
  createdAt: Date | null;
}

export const BLUEPRINT_LIMITS = {
  idMaxLength: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  codeMinLength: 2,
  codeMaxLength: 24,
  titleMinLength: 3,
  titleMaxLength: 120,
  topicMinLength: 2,
  topicMaxLength: 80,
  datePattern: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  feedbackMaxLength: 1500,
  sectionMinLength: 1,
  sectionMaxLength: 40,
  studentNameMaxLength: 120,
  studentEmailMaxLength: 120,
} as const;

export const BSMT_SECTIONS = [
  'BSMT-1A',
  'BSMT-1B',
  'BSMT-2A',
  'BSMT-2B',
  'Unspecified',
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export const TEACHER_EMAIL = 'edgardo.rojas@hcdc.edu.ph';
export const ALLOWED_EMAIL_DOMAIN = '@hcdc.edu.ph';

export function isHcdcEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^@\s]+@hcdc\.edu\.ph$/i.test(email.trim());
}

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === TEACHER_EMAIL;
}

export interface SeedActivityTemplate {
  id: string;
  code: string;
  title: string;
  topic: string;
  sessionDate: string;
  status: ActivityStatus;
}

export const DEFAULT_BSMT_LAB_ACTIVITIES: SeedActivityTemplate[] = [
  {
    id: 'bsmt-lab-01',
    code: 'LAB-01',
    title: 'Web-Based Cargo Stability & Load Calculator Lab',
    topic: 'Web Assessment · Trim, Draft & Stability Tables',
    sessionDate: '2026-11-10',
    status: 'active',
  },
  {
    id: 'bsmt-lab-02',
    code: 'LAB-02',
    title: 'Deployed ECDIS & Digital Charting Web Simulation',
    topic: 'Web Simulation · Electronic Chart Waypoints & Routes',
    sessionDate: '2026-11-12',
    status: 'active',
  },
  {
    id: 'bsmt-lab-03',
    code: 'LAB-03',
    title: 'Shipboard Networking & AIS Web Telemetry Lab',
    topic: 'Web Assessment · IP Addressing & Live Vessel Data',
    sessionDate: '2026-11-14',
    status: 'active',
  },
  {
    id: 'bsmt-lab-04',
    code: 'LAB-04',
    title: 'Online Voyage Plan & Digital Logbook Assessment',
    topic: 'Web Assessment · Structured Passage Documentation',
    sessionDate: '2026-11-16',
    status: 'active',
  },
  {
    id: 'bsmt-lab-05',
    code: 'LAB-05',
    title: 'Marine Engine Monitoring Web Simulation',
    topic: 'Web Simulation · Sensor Logs & Anomaly Diagnostics',
    sessionDate: '2026-11-17',
    status: 'active',
  },
];
