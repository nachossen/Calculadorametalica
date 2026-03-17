import { C } from './theme.js';

/** Badge de color — Bg */
export function Badge({ children, color = C.ac }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold"
      style={{ background: `${color}20`, color }}>
      {children}
    </span>
  );
}
