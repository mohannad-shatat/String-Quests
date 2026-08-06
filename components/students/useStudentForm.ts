/**
 * Student Manager form state.
 *
 * Errors surface on blur, never on keystroke — typing into an empty required
 * field shouldn't shout at you mid-word. Once a field HAS errored, it
 * re-validates on change so the message clears the moment it's fixed.
 *
 * The typed `setField` generic follows components/schedule/useProfileState.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  emptyStudent,
  isDirty,
  readyForId,
  requiredProgress,
  sectionCompletion,
  validateStudent,
  type StudentErrorKey,
  type StudentErrors,
  type StudentRecord,
} from './studentTypes';
import { findDuplicates, findSiblings, generateFamilyId } from './studentMatching';
import { generatePassword, generateStudentId, saveDraft, clearDraft } from '../../utils/studentStorage';

const DRAFT_DEBOUNCE_MS = 800;

interface UseStudentFormOptions {
  /** Record to edit, or null for a new student. */
  initial: StudentRecord | null;
  isAr: boolean;
  /** All known records, for uniqueness + duplicate checks. */
  existing: StudentRecord[];
  /** Persist a draft while typing. Off for edits of existing records. */
  autosaveDraft?: boolean;
}

export function useStudentForm({ initial, isAr, existing, autosaveDraft }: UseStudentFormOptions) {
  const makeBaseline = useCallback((): StudentRecord => {
    // Seeded demo records carry no password, which would make an otherwise
    // untouched student fail validation the first time staff pressed Save.
    // Mint one up front; baseline and record share it, so this alone doesn't
    // mark the form dirty.
    if (initial) return { ...initial, password: initial.password || generatePassword() };
    // A password is seeded up front (it's regenerable and staff need it to
    // hand over credentials). The academic number is NOT — it's issued only
    // once the record is complete enough to be a real enrolment.
    return { ...emptyStudent(), password: generatePassword() };
  }, [initial]);

  const [baseline, setBaseline] = useState<StudentRecord>(makeBaseline);
  const [record, setRecord] = useState<StudentRecord>(baseline);
  const [errors, setErrors] = useState<StudentErrors>({});
  const [touched, setTouched] = useState<Set<StudentErrorKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  /**
   * Siblings linked in this session but not yet written. A family link is
   * symmetric, so the *other* student needs the same familyId — but writing
   * it on click would persist half a relationship even if the user then
   * discarded the form. Both sides are flushed together on save instead.
   */
  const [pendingLinks, setPendingLinks] = useState<string[]>([]);

  // Reload when the edited record changes identity (row click swaps the panel).
  const initialId = initial?.id ?? '__new__';
  const lastIdRef = useRef(initialId);
  useEffect(() => {
    if (lastIdRef.current === initialId) return;
    lastIdRef.current = initialId;
    const next = makeBaseline();
    setBaseline(next);
    setRecord(next);
    setErrors({});
    setTouched(new Set());
    setSubmitted(false);
  }, [initialId, makeBaseline]);

  const setField = useCallback(
    <K extends keyof StudentRecord>(field: K, value: StudentRecord[K]) => {
      setRecord((prev) => {
        const next = { ...prev, [field]: value };
        // Re-validate only fields the user has already seen an error on.
        setErrors((prevErrors) => {
          if (!(field in prevErrors)) return prevErrors;
          const fresh = validateStudent(next, isAr, { existing, selfId: next.id });
          const key = field as StudentErrorKey;
          if (fresh[key]) return { ...prevErrors, [key]: fresh[key] };
          const { [key]: _removed, ...rest } = prevErrors;
          void _removed;
          return rest;
        });
        return next;
      });
    },
    [isAr, existing],
  );

  const blurField = useCallback(
    (field: StudentErrorKey) => {
      setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
      setErrors((prev) => {
        const fresh = validateStudent(record, isAr, { existing, selfId: record.id });
        if (fresh[field]) return { ...prev, [field]: fresh[field] };
        const { [field]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      });
    },
    [record, isAr, existing],
  );

  /** Validates everything. Returns the errors so callers can act immediately. */
  const validateAll = useCallback((): StudentErrors => {
    const fresh = validateStudent(record, isAr, { existing, selfId: record.id });
    setErrors(fresh);
    setSubmitted(true);
    return fresh;
  }, [record, isAr, existing]);

  // No regenerateId: the String ID is permanent by design. The password is a
  // credential and stays regenerable; the identifier is not.
  const regeneratePassword = useCallback(() => setField('password', generatePassword()), [setField]);

  /** Marks the current values as saved, so the form is no longer dirty. */
  const commit = useCallback((saved: StudentRecord) => {
    setBaseline({ ...saved });
    setRecord({ ...saved });
    setErrors({});
    setTouched(new Set());
    setSubmitted(false);
    setPendingLinks([]);
    clearDraft();
  }, []);

  const dirty = useMemo(() => isDirty(record, baseline), [record, baseline]);

  // Debounced draft autosave, so an accidental close loses nothing.
  useEffect(() => {
    if (!autosaveDraft || !dirty) return;
    const timer = window.setTimeout(() => saveDraft(record), DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [autosaveDraft, dirty, record]);

  const completion = useMemo(() => sectionCompletion(record), [record]);
  const progress = useMemo(() => requiredProgress(record), [record]);

  /* ─── Deferred student-ID issuance ─── */

  const idIssued = !!record.studentId;
  const canIssueId = readyForId(record);

  /**
   * The String ID is issued once, the moment the record first becomes
   * complete, and never changes again — not on edit, not on re-completion.
   * It is deliberately NOT withdrawn when a required field is cleared: doing
   * so would mint a *different* number when the field was refilled, and a
   * permanent identifier that silently changes is worse than none.
   */
  useEffect(() => {
    if (canIssueId && !record.studentId) {
      setRecord((prev) => (prev.studentId ? prev : { ...prev, studentId: generateStudentId() }));
    }
  }, [canIssueId, record.studentId]);

  /* ─── Matching ─── */

  const duplicates = useMemo(
    () => findDuplicates(record, existing),
    [record, existing],
  );

  const allSiblings = useMemo(() => findSiblings(record, existing), [record, existing]);

  const confirmedFamily = useMemo(
    () => (record.familyId ? allSiblings.filter((m) => m.student.familyId === record.familyId) : []),
    [allSiblings, record.familyId],
  );

  const siblingSuggestions = useMemo(
    () => allSiblings.filter((m) => !record.familyId || m.student.familyId !== record.familyId),
    [allSiblings, record.familyId],
  );

  /** Adopts the target's family if it has one, otherwise mints a new id. */
  const linkFamily = useCallback(
    (targetId: string): string => {
      const target = existing.find((s) => s.id === targetId);
      const famId = target?.familyId || record.familyId || generateFamilyId();
      setRecord((prev) => ({ ...prev, familyId: famId }));
      setPendingLinks((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
      return famId;
    },
    [existing, record.familyId],
  );

  const unlinkFamily = useCallback(() => {
    setRecord((prev) => ({ ...prev, familyId: '' }));
    setPendingLinks([]);
  }, []);

  /**
   * Soft, non-blocking warnings. Name and national-ID collisions moved to
   * `duplicates`, which renders a richer banner; this is now just the
   * login-email clash. Never prevents a save.
   */
  const warnings = useMemo(() => {
    const out: string[] = [];
    const mail = record.loginEmail.trim().toLowerCase();
    if (mail) {
      const clash = existing.some(
        (o) => o.id !== record.id && o.loginEmail.trim().toLowerCase() === mail,
      );
      if (clash) out.push('msg.dupeEmail');
    }
    return out;
  }, [record, existing]);

  return {
    record,
    setField,
    blurField,
    errors,
    touched,
    submitted,
    validateAll,
    dirty,
    commit,
    regeneratePassword,
    completion,
    progress,
    warnings,
    idIssued,
    pendingLinks,
    duplicates,
    siblingSuggestions,
    confirmedFamily,
    linkFamily,
    unlinkFamily,
  };
}
