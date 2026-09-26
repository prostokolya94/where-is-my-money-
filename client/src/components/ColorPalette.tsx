export const PALETTE = [
  '#2f6fed',
  '#0f9d58',
  '#7cb342',
  '#f4b400',
  '#e8710a',
  '#d93025',
  '#e91e8c',
  '#9334e6',
  '#00838f',
  '#5f6368',
];

export const DEFAULT_COLOR = PALETTE[0];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPalette({ value, onChange }: Props) {
  return (
    <div className="palette">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={`palette-swatch${c === value ? ' on' : ''}`}
          style={{ background: c }}
          title={c}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
