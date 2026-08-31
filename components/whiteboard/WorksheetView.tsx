import React, { useMemo, useState } from 'react';
import { Check, X, RotateCcw, ClipboardCheck } from 'lucide-react';
import { useBoardCopy, type BoardCopyKey } from './copy';
import type { LessonArtifactData, WorksheetSection } from './content/types';

type Answers = Record<string, string>;

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];

/** Loose comparison for written answers: ignore case, diacritics, and padding. */
const norm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]/gu, '');

const Field: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
}> = ({ value, onChange, disabled, placeholder }) => (
  <input
    type="text"
    value={value}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#091e42] outline-none transition-colors placeholder:font-medium placeholder:text-[#6882a9]/60 focus:border-[#08b8fb] disabled:bg-slate-50"
  />
);

const Picker: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options: { value: string; label: string }[];
  placeholder: string;
}> = ({ value, onChange, disabled, options, placeholder }) => (
  <select
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="rounded-xl border-2 border-slate-200 bg-white px-2.5 py-2 text-sm font-bold text-[#091e42] outline-none transition-colors focus:border-[#08b8fb] disabled:bg-slate-50"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

/** Green / red frame applied only once the sheet has been checked. */
const mark = (checked: boolean, correct: boolean): React.CSSProperties =>
  !checked ? {} : correct
    ? { borderColor: '#10b981', backgroundColor: '#e3f8f0' }
    : { borderColor: '#f43f5e', backgroundColor: '#ffe9ed' };

const Verdict: React.FC<{ correct: boolean; answer?: string }> = ({ correct, answer }) => {
  const { t } = useBoardCopy();
  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold"
      style={{ color: correct ? '#0f766e' : '#be123c' }}
    >
      {correct ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
      {!correct && answer ? `${t('ws.correctAnswer')}: ${answer}` : null}
    </span>
  );
};

/* ------------------------------------------------------------------ grading */

interface Gradeable {
  key: string;
  expected: string;
  /** Written answers compare loosely; everything else is an exact token match. */
  loose?: boolean;
  alternatives?: string[];
}

const isCorrect = (g: Gradeable, answers: Answers): boolean => {
  const given = answers[g.key] ?? '';
  if (!given) return false;
  if (!g.loose) return given === g.expected;
  const candidates = [g.expected, ...(g.alternatives ?? [])].map(norm);
  return candidates.includes(norm(given));
};

const gradeablesFor = (section: WorksheetSection, si: number): Gradeable[] => {
  const out: Gradeable[] = [];
  section.mcq?.forEach((item, i) => out.push({ key: `${si}-mcq-${i}`, expected: String(item.answer) }));
  section.tf?.forEach((item, i) => out.push({ key: `${si}-tf-${i}`, expected: String(item.answer) }));
  section.pairs?.forEach((_, i) => out.push({ key: `${si}-match-${i}`, expected: String(i) }));
  section.blanks?.forEach((b, i) =>
    out.push({
      key: `${si}-blank-${i}`,
      expected: b.answer[0] ?? '',
      alternatives: b.answer.slice(1),
      loose: true,
    }),
  );
  section.groups?.forEach((g, gi) =>
    g.items.forEach((item) => out.push({ key: `${si}-classify-${item}`, expected: String(gi) })),
  );
  section.ordered?.forEach((step, i) => out.push({ key: `${si}-seq-${step}`, expected: String(i) }));
  return out;
};

/* ----------------------------------------------------------------- section */

const SectionView: React.FC<{
  section: WorksheetSection;
  si: number;
  index: number;
  tint: string;
  checked: boolean;
  answers: Answers;
  set: (key: string, value: string) => void;
}> = ({ section, si, index, tint, checked, answers, set }) => {
  const { t } = useBoardCopy();
  const heading = section.title || section.prompt;

  if (section.type === 'instruction' || section.type === 'info_box') {
    return (
      <div
        className="rounded-2xl px-4 py-3.5"
        style={{ backgroundColor: section.type === 'info_box' ? '#fef6e4' : '#f1f5f9' }}
      >
        {heading && <p className="text-sm font-extrabold text-[#091e42]">{heading}</p>}
        {section.text && (
          <p className="mt-1 text-sm leading-relaxed text-[#526b7a]">{section.text}</p>
        )}
      </div>
    );
  }

  // Right column is presented out of order so matching is a real exercise.
  const shuffledPairs = section.pairs
    ? section.pairs.map((p, i) => ({ ...p, i })).sort((a, b) => ((a.right.length * 7) % 11) - ((b.right.length * 7) % 11))
    : [];

  const poolItems = section.groups ? section.groups.flatMap((g) => g.items) : [];
  const shuffledSteps = section.ordered ? [...section.ordered].reverse() : [];

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-extrabold text-[#091e42]">
        {index}. {heading || t(`ws.${section.type}` as BoardCopyKey)}
      </p>

      {/* Multiple choice */}
      {section.mcq?.map((item, i) => {
        const key = `${si}-mcq-${i}`;
        const chosen = answers[key];
        return (
          <div key={key} className="mt-3">
            <p className="text-sm font-bold text-[#091e42]">{item.prompt}</p>
            <div className="mt-2 space-y-1.5">
              {item.options.map((opt, oi) => {
                const selected = chosen === String(oi);
                const isAnswer = oi === item.answer;
                let style: React.CSSProperties = selected
                  ? { borderColor: tint, backgroundColor: `${tint}14` }
                  : {};
                if (checked && isAnswer) style = { borderColor: '#10b981', backgroundColor: '#e3f8f0' };
                else if (checked && selected) style = { borderColor: '#f43f5e', backgroundColor: '#ffe9ed' };
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={checked}
                    style={style}
                    onClick={() => set(key, String(oi))}
                    className="flex w-full items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-right text-sm text-[#091e42] transition-colors enabled:hover:border-slate-300 disabled:cursor-default"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: selected || (checked && isAnswer) ? tint : '#cbd5e1' }}
                    >
                      {(selected || (checked && isAnswer)) && (
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tint }} />
                      )}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* True / false */}
      {section.tf?.map((item, i) => {
        const key = `${si}-tf-${i}`;
        const given = answers[key];
        const correct = given === String(item.answer);
        return (
          <div key={key} className="mt-3 flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-[#091e42]">{item.statement}</p>
            <div className="flex shrink-0 gap-1.5">
              {[true, false].map((value) => {
                const selected = given === String(value);
                let style: React.CSSProperties = selected
                  ? { borderColor: tint, backgroundColor: `${tint}14` }
                  : {};
                if (checked && value === item.answer) style = { borderColor: '#10b981', backgroundColor: '#e3f8f0' };
                else if (checked && selected) style = { borderColor: '#f43f5e', backgroundColor: '#ffe9ed' };
                return (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={checked}
                    style={style}
                    onClick={() => set(key, String(value))}
                    className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-bold text-[#091e42] transition-colors enabled:hover:border-slate-300 disabled:cursor-default"
                  >
                    {value ? t('ws.true') : t('ws.false')}
                  </button>
                );
              })}
            </div>
            {checked && !correct && <Verdict correct={false} answer={item.answer ? t('ws.true') : t('ws.false')} />}
          </div>
        );
      })}

      {/* Matching — pick the letter of the matching definition */}
      {section.pairs && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5 rounded-xl bg-slate-50 p-3">
            {shuffledPairs.map((p, li) => (
              <p key={p.i} className="text-xs leading-relaxed text-[#526b7a]">
                <span className="font-extrabold text-[#091e42]">{LETTERS[li]}. </span>
                {p.right}
              </p>
            ))}
          </div>

          {section.pairs.map((pair, i) => {
            const key = `${si}-match-${i}`;
            const given = answers[key];
            const correctLetter = shuffledPairs.findIndex((p) => p.i === i);
            const correct = given === String(i);
            return (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-bold text-[#091e42]">
                  {i + 1}. {pair.left}
                </span>
                <div style={mark(checked, correct)} className="rounded-xl">
                  <Picker
                    value={given ?? ''}
                    disabled={checked}
                    placeholder={t('ws.choose')}
                    onChange={(v) => set(key, v)}
                    options={shuffledPairs.map((p, li) => ({
                      value: String(p.i),
                      label: LETTERS[li],
                    }))}
                  />
                </div>
                {checked && !correct && <Verdict correct={false} answer={LETTERS[correctLetter]} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Fill in the blank */}
      {section.blanks?.map((b, i) => {
        const key = `${si}-blank-${i}`;
        const correct = isCorrect(
          { key, expected: b.answer[0] ?? '', alternatives: b.answer.slice(1), loose: true },
          answers,
        );
        return (
          <div key={key} className="mt-3">
            <p className="text-sm leading-relaxed text-[#091e42]">{b.text}</p>
            <div className="mt-2 rounded-xl" style={mark(checked, correct)}>
              <Field
                value={answers[key] ?? ''}
                disabled={checked}
                placeholder={t('ws.yourAnswer')}
                onChange={(v) => set(key, v)}
              />
            </div>
            {checked && !correct && <Verdict correct={false} answer={b.answer.join('، ')} />}
          </div>
        );
      })}

      {/* Classify — assign each item to a group */}
      {section.groups && (
        <div className="mt-3 space-y-2">
          {poolItems.map((item) => {
            const key = `${si}-classify-${item}`;
            const groupIndex = section.groups!.findIndex((g) => g.items.includes(item));
            const correct = answers[key] === String(groupIndex);
            return (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm text-[#091e42]">{item}</span>
                <div style={mark(checked, correct)} className="rounded-xl">
                  <Picker
                    value={answers[key] ?? ''}
                    disabled={checked}
                    placeholder={t('ws.choose')}
                    onChange={(v) => set(key, v)}
                    options={section.groups!.map((g, gi) => ({ value: String(gi), label: g.label }))}
                  />
                </div>
                {checked && !correct && (
                  <Verdict correct={false} answer={section.groups![groupIndex].label} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sequence — give each step its position */}
      {section.ordered && (
        <div className="mt-3 space-y-2">
          {shuffledSteps.map((step) => {
            const key = `${si}-seq-${step}`;
            const position = section.ordered!.indexOf(step);
            const correct = answers[key] === String(position);
            return (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm text-[#091e42]">{step}</span>
                <div style={mark(checked, correct)} className="rounded-xl">
                  <Picker
                    value={answers[key] ?? ''}
                    disabled={checked}
                    placeholder={t('ws.position')}
                    onChange={(v) => set(key, v)}
                    options={section.ordered!.map((_, oi) => ({
                      value: String(oi),
                      label: String(oi + 1),
                    }))}
                  />
                </div>
                {checked && !correct && <Verdict correct={false} answer={String(position + 1)} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Compare — filled in together, not auto-marked */}
      {section.compare && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-50 px-3 py-2" />
                {section.compare.items.map((item, i) => (
                  <th
                    key={i}
                    className="border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-extrabold text-[#091e42]"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.compare.dimensions.map((dim, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 px-3 py-2 text-xs font-bold text-[#091e42]">
                    {dim}
                  </td>
                  {section.compare!.items.map((_, j) => (
                    <td key={j} className="border border-slate-200 p-1">
                      <input
                        type="text"
                        disabled={checked}
                        value={answers[`${si}-cmp-${i}-${j}`] ?? ''}
                        onChange={(e) => set(`${si}-cmp-${i}-${j}`, e.target.value)}
                        className="w-full rounded-lg bg-transparent px-2 py-1.5 text-sm text-[#091e42] outline-none focus:bg-slate-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[11px] font-bold text-[#6882a9]">{t('ws.ungraded')}</p>
        </div>
      )}

      {/* Open response — model answer appears with the results */}
      {section.modelAnswer && (
        <>
          <textarea
            rows={3}
            disabled={checked}
            value={answers[`${si}-open`] ?? ''}
            placeholder={t('ws.yourAnswer')}
            onChange={(e) => set(`${si}-open`, e.target.value)}
            className="mt-2 w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-[#091e42] outline-none transition-colors placeholder:text-[#6882a9]/60 focus:border-[#08b8fb] disabled:bg-slate-50"
          />
          {checked ? (
            <div className="mt-2 rounded-xl bg-[#e3f8f0] px-3 py-2.5">
              <p className="text-[11px] font-extrabold text-[#0f766e]">{t('ws.modelAnswer')}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#0f766e]">{section.modelAnswer}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] font-bold text-[#6882a9]">{t('ws.ungraded')}</p>
          )}
        </>
      )}
    </div>
  );
};

/* --------------------------------------------------------------- worksheet */

export const WorksheetView: React.FC<{ data: LessonArtifactData; tint: string }> = ({
  data,
  tint,
}) => {
  const { t } = useBoardCopy();
  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);

  const sections = data.worksheet?.sections ?? [];

  const gradeables = useMemo(
    () => sections.flatMap((section, si) => gradeablesFor(section, si)),
    [sections],
  );

  const score = gradeables.filter((g) => isCorrect(g, answers)).length;

  if (!sections.length) {
    return <p className="text-sm font-medium text-[#6882a9]">{t('art.empty')}</p>;
  }

  let n = 0;
  return (
    <div className="space-y-3">
      {data.worksheet?.title && (
        <h3 className="text-base font-extrabold text-[#091e42]">{data.worksheet.title}</h3>
      )}

      {sections.map((section, si) => {
        const numbered = section.type !== 'instruction' && section.type !== 'info_box';
        if (numbered) n += 1;
        return (
          <SectionView
            key={si}
            section={section}
            si={si}
            index={n}
            tint={tint}
            checked={checked}
            answers={answers}
            set={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
          />
        );
      })}

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        {checked ? (
          <p className="text-sm font-extrabold text-[#091e42]">
            {t('ws.score')}{' '}
            <span style={{ color: score === gradeables.length ? '#10b981' : tint }}>
              {score} / {gradeables.length}
            </span>
          </p>
        ) : (
          <p className="text-xs font-bold text-[#6882a9]">
            {Object.keys(answers).length} / {gradeables.length}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            if (checked) {
              setChecked(false);
              setAnswers({});
            } else {
              setChecked(true);
            }
          }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: checked ? '#091e42' : tint }}
        >
          {checked ? <RotateCcw className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          {checked ? t('ws.reset') : t('ws.check')}
        </button>
      </div>
    </div>
  );
};
