import { EvaluationRecord, LabActivity } from '../types';

function escapeSqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r?\n/g, '\\n')}'`;
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatIso(date: Date | null): string {
  return date ? date.toISOString() : new Date().toISOString();
}

export function generateSqlExport(
  activities: LabActivity[],
  evaluations: EvaluationRecord[]
): string {
  const lines: string[] = [
    '-- BS Marine Transportation - ICT Laboratory Evaluation Database Export',
    `-- Exported at: ${new Date().toISOString()}`,
    `-- Lab Activities: ${activities.length} | Student Evaluations: ${evaluations.length}`,
    '',
    'CREATE TABLE IF NOT EXISTS lab_activities (',
    '  id VARCHAR(128) PRIMARY KEY,',
    '  code VARCHAR(24) NOT NULL,',
    '  title VARCHAR(120) NOT NULL,',
    '  topic VARCHAR(80) NOT NULL,',
    '  session_date DATE NOT NULL,',
    '  status VARCHAR(16) NOT NULL,',
    '  created_at TIMESTAMP NOT NULL',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS evaluations (',
    '  id VARCHAR(128) PRIMARY KEY,',
    '  activity_id VARCHAR(128) NOT NULL,',
    '  activity_title VARCHAR(120) NOT NULL,',
    '  teaching_rating INT NOT NULL CHECK (teaching_rating BETWEEN 1 AND 5),',
    '  activity_rating INT NOT NULL CHECK (activity_rating BETWEEN 1 AND 5),',
    '  class_rating INT NOT NULL CHECK (class_rating BETWEEN 1 AND 5),',
    '  feedback TEXT NOT NULL,',
    '  section VARCHAR(40) NOT NULL,',
    '  session_date DATE NOT NULL,',
    '  is_anonymous BOOLEAN NOT NULL,',
    '  student_name VARCHAR(120) NOT NULL,',
    '  student_email VARCHAR(120) NOT NULL,',
    '  created_at TIMESTAMP NOT NULL,',
    '  FOREIGN KEY (activity_id) REFERENCES lab_activities(id)',
    ');',
    '',
  ];

  if (activities.length > 0) {
    lines.push('-- Lab Activities');
    for (const act of activities) {
      lines.push(
        `INSERT INTO lab_activities (id, code, title, topic, session_date, status, created_at) VALUES (${escapeSqlString(act.id)}, ${escapeSqlString(act.code)}, ${escapeSqlString(act.title)}, ${escapeSqlString(act.topic)}, ${escapeSqlString(act.sessionDate)}, ${escapeSqlString(act.status)}, ${escapeSqlString(formatIso(act.createdAt))});`
      );
    }
    lines.push('');
  }

  if (evaluations.length > 0) {
    lines.push('-- Student Evaluations');
    for (const ev of evaluations) {
      lines.push(
        `INSERT INTO evaluations (id, activity_id, activity_title, teaching_rating, activity_rating, class_rating, feedback, section, session_date, is_anonymous, student_name, student_email, created_at) VALUES (${escapeSqlString(ev.id)}, ${escapeSqlString(ev.activityId)}, ${escapeSqlString(ev.activityTitle)}, ${ev.teachingRating}, ${ev.activityRating}, ${ev.classRating}, ${escapeSqlString(ev.feedback)}, ${escapeSqlString(ev.section)}, ${escapeSqlString(ev.sessionDate)}, ${ev.isAnonymous ? 'TRUE' : 'FALSE'}, ${escapeSqlString(ev.isAnonymous ? '' : ev.studentName)}, ${escapeSqlString(ev.isAnonymous ? '' : ev.studentEmail)}, ${escapeSqlString(formatIso(ev.createdAt))});`
      );
    }
  }

  return lines.join('\n');
}

export function generateCsvExport(
  activities: LabActivity[],
  evaluations: EvaluationRecord[]
): string {
  const codeById = new Map(activities.map((a) => [a.id, a.code]));
  const headers = [
    'evaluation_id',
    'activity_id',
    'activity_code',
    'activity_title',
    'section',
    'session_date',
    'teaching_rating',
    'activity_rating',
    'class_rating',
    'overall_average',
    'is_anonymous',
    'student_name',
    'student_email',
    'feedback',
    'submitted_at',
  ];

  const rows = evaluations.map((ev) => {
    const overall = ((ev.activityRating + ev.classRating + ev.teachingRating) / 3).toFixed(2);
    return [
      escapeCsvCell(ev.id),
      escapeCsvCell(ev.activityId),
      escapeCsvCell(codeById.get(ev.activityId) ?? ''),
      escapeCsvCell(ev.activityTitle),
      escapeCsvCell(ev.section),
      escapeCsvCell(ev.sessionDate),
      escapeCsvCell(ev.teachingRating),
      escapeCsvCell(ev.activityRating),
      escapeCsvCell(ev.classRating),
      escapeCsvCell(overall),
      escapeCsvCell(ev.isAnonymous),
      escapeCsvCell(ev.isAnonymous ? 'Anonymous' : ev.studentName),
      escapeCsvCell(ev.isAnonymous ? '' : ev.studentEmail),
      escapeCsvCell(ev.feedback),
      escapeCsvCell(formatIso(ev.createdAt)),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateJsonExport(
  activities: LabActivity[],
  evaluations: EvaluationRecord[]
): string {
  const count = evaluations.length;
  const avg = (sum: number) => (count > 0 ? Number((sum / count).toFixed(2)) : 0);

  const payload = {
    exportedAt: new Date().toISOString(),
    program: 'BS Marine Transportation',
    course: 'ICT Laboratory',
    summary: {
      totalEvaluations: count,
      averageTeachingRating: avg(evaluations.reduce((s, e) => s + e.teachingRating, 0)),
      averageActivityRating: avg(evaluations.reduce((s, e) => s + e.activityRating, 0)),
      averageClassRating: avg(evaluations.reduce((s, e) => s + e.classRating, 0)),
    },
    labActivities: activities.map((a) => ({
      ...a,
      createdAt: formatIso(a.createdAt),
    })),
    evaluations: evaluations.map((e) => ({
      ...e,
      studentName: e.isAnonymous ? '' : e.studentName,
      studentEmail: e.isAnonymous ? '' : e.studentEmail,
      createdAt: formatIso(e.createdAt),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
