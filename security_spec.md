# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate & Global Default Deny**: Every unmatched path under `/databases/{database}/documents` is denied for both reads and writes.
2. **HCDC Domain Enforcement (`@hcdc.edu.ph`)**:
   - Every authenticated operation requires `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.token.email.lower().matches('^[^@]+@hcdc\\.edu\\.ph$')`.
   - Accounts from outside `hcdc.edu.ph` (e.g. `@gmail.com`) are rejected by Firestore rules.
3. **Single Teacher Authority**:
   - Only `edgardo.rojas@hcdc.edu.ph` (with `email_verified == true`) is recognized as the teacher (`isTeacher()`).
   - All other verified `@hcdc.edu.ph` users are strictly students (`isStudent()`): they can read active `lab_activities` and submit `evaluations`, and cannot read/modify/delete anyone else's evaluations or manage lab activities.
4. **Anonymous Profile vs Opt-In Identity Integrity**:
   - When `isAnonymous == true`, `studentName` and `studentEmail` MUST both be empty strings (`""`), guaranteeing no PII is stored.
   - When `isAnonymous == false`, `studentEmail` MUST strictly equal `request.auth.token.email`, preventing identity spoofing.
5. **Path Variable Hardening & Parent Integrity**:
   - Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars).
   - Evaluations must reference an existing `lab_activities/{activityId}` document with `status == 'active'`, use integer ratings `1..5`, cap feedback at `1500` chars, and use `createdAt == request.time`.
