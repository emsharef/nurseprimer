// Wick's face as a tiny inline SVG, used by widgets as their verdict light: phosphor eyes when Wick thinks a
// message can wait, alarm eyes when it thinks it's urgent, dim when it hasn't decided.
export type WickMood = 'idle' | 'urgent' | 'can_wait' | 'thinking';

export function wickFace(mood: WickMood, size = 44): string {
  const eye = mood === 'urgent' ? 'var(--alarm)' : mood === 'can_wait' ? 'var(--phosphor)' : 'var(--rule)';
  const glow = mood === 'idle' ? '' : `filter: drop-shadow(0 0 3px ${eye});`;
  return `<svg class="wick-face ${mood}" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <path d="M10 14 L14 6 L19 12 Q24 10 29 12 L34 6 L38 14 Q42 22 40 32 Q38 42 24 43 Q10 42 8 32 Q6 22 10 14Z" fill="var(--gold)" stroke="var(--ink)" stroke-width="1.6"/>
    <circle cx="17" cy="23" r="7" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/>
    <circle cx="31" cy="23" r="7" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/>
    <circle cx="17" cy="23" r="3.6" fill="${eye}" style="${glow}"/>
    <circle cx="31" cy="23" r="3.6" fill="${eye}" style="${glow}"/>
    <path d="M22 29 L24 33 L26 29Z" fill="var(--ink)"/>
    <rect x="18" y="36" width="12" height="2.4" rx="1" fill="var(--ink)"/>
  </svg>`;
}

export const verdictText = (label: 'urgent' | 'can_wait') => (label === 'urgent' ? 'Urgent' : 'Can wait');
