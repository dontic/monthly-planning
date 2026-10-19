import { useEffect, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number | undefined;
  /** Called with the parsed number, or 0 when the field is empty. */
  onCommit: (value: number) => void;
};

const parse = (text: string) => {
  const v = parseFloat(text);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * Number field that keeps its own text so in-progress input like "2." or "" isn't
 * overwritten while typing, but still follows outside changes (e.g. quick fill).
 */
export function NumberInput({ value, onCommit, ...rest }: Props) {
  const [text, setText] = useState(value ? String(value) : '');

  useEffect(() => {
    setText((t) => (parse(t) === (value ?? 0) ? t : value ? String(value) : ''));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      {...rest}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onCommit(parse(e.target.value));
      }}
    />
  );
}
