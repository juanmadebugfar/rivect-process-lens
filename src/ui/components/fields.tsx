import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  unit?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, hint, unit, children, className }: FieldShellProps) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="field-control">
        {children}
        {unit ? <span className="field-unit">{unit}</span> : null}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

const parse = (text: string): number | null => {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const show = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',');

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  hint?: ReactNode;
  className?: string;
  testId?: string;
}

/** Campo numérico que recalcula mientras se escribe y acepta coma decimal. */
export function NumberField({ label, value, onChange, min = 0, max = Infinity, unit, hint, className, testId }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(show(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);

  const parsed = parse(text);
  const outOfRange = parsed !== null && (parsed < min || parsed > max);
  const invalid = text.trim() !== '' && parsed === null;

  return (
    <FieldShell id={id} label={label} unit={unit} className={className} hint={outOfRange ? `Rango permitido: ${min}–${Number.isFinite(max) ? max : '∞'}` : hint}>
      <input
        id={id}
        data-testid={testId}
        className="input num"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || outOfRange}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          setText(e.target.value);
          const n = parse(e.target.value);
          if (n !== null) onChange(Math.min(max, Math.max(min, n)));
        }}
        onBlur={() => {
          focused.current = false;
          setText(show(value));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </FieldShell>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: ReactNode;
  className?: string;
  testId?: string;
}

export function TextField({ label, value, onChange, maxLength, multiline, rows = 3, placeholder, hint, className, testId }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      {multiline ? (
        <textarea id={id} data-testid={testId} className="input" rows={rows} maxLength={maxLength} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} data-testid={testId} className="input" type="text" maxLength={maxLength} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </FieldShell>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  hint?: ReactNode;
  className?: string;
  testId?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, hint, className, testId }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <select id={id} data-testid={testId} className="input select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
  testId?: string;
}

/** Deslizador con valor editable: útil en reunión para probar variables rápido. */
export function RangeField({ label, value, onChange, min = 0, max = 100, step = 1, unit = '%', hint, testId }: RangeFieldProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="field range-field">
      <div className="range-head">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        <span className="range-value num" aria-hidden="true">
          {show(value)}
          {unit}
        </span>
      </div>
      <input
        id={id}
        data-testid={testId}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
        aria-valuetext={`${show(value)}${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  onChange: (v: T) => void;
  hint?: ReactNode;
  name?: string;
  compact?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, hint, compact }: SegmentedProps<T>) {
  const group = useId();
  return (
    <fieldset className={`field segmented-field ${compact ? 'compact' : ''}`}>
      <legend className="field-label">{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <label key={o.value} className={`seg ${value === o.value ? 'on' : ''}`} title={o.title}>
            <input type="radio" name={group} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </fieldset>
  );
}
