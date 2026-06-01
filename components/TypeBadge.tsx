'use client';
import { ActivationType, TYPE_LABELS, TYPE_COLORS } from '@/lib/types';

export default function TypeBadge({ type }: { type: ActivationType }) {
  const color = TYPE_COLORS[type];
  const label = TYPE_LABELS[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
