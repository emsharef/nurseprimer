// Draws a probability-bar list: one button per candidate next word (tap to pick it), then a non-interactive
// row for everything else. Bars are drawn to one honest scale: a full bar is 100%.
export interface BarRow {
  label: string;
  p: number;
  /** Shown under the percentage, e.g. "23 times". */
  sub?: string;
  /** Accessible name for the word (e.g. "space has" for " has"). */
  aria?: string;
}

export const pct = (p: number) => (p >= 0.1 ? `${Math.round(p * 100)}%` : p >= 0.001 ? `${(p * 100).toFixed(1)}%` : p > 0 ? '<0.1%' : '0%');

/** Shows a leading space as a visible dot, so word pieces like " has" can be read. */
export function showSpaces(piece: string): DocumentFragment {
  const f = document.createDocumentFragment();
  const m = piece.match(/^( *)(.*?)( *)$/s)!;
  const dot = (n: number) => { if (!n) return; const s = document.createElement('span'); s.className = 'nw-sp'; s.textContent = '·'.repeat(n); f.append(s); };
  dot(m[1].length);
  f.append(m[2].replace(/\n/g, '⏎'));
  dot(m[3].length);
  return f;
}

export function renderBars(
  list: HTMLElement,
  rows: BarRow[],
  rest: { p: number; label: string } | null,
  onPick: ((i: number) => void) | null,
  opts: { chosen?: number; spaces?: boolean } = {},
) {
  const max = 1;
  const items = rows.map((r, i) => {
    const li = document.createElement('li');
    const b = document.createElement(onPick ? 'button' : 'div');
    if (b instanceof HTMLButtonElement) {
      b.type = 'button';
      b.addEventListener('click', () => onPick!(i));
      b.setAttribute('aria-label', `${r.aria ?? r.label}: ${pct(r.p)}${r.sub ? `, ${r.sub}` : ''}. Pick this.`);
    }
    b.className = `nw-bar${opts.chosen === i ? ' chosen' : ''}`;
    const w = document.createElement('span');
    w.className = 'w';
    if (opts.spaces) w.append(showSpaces(r.label));
    else w.textContent = r.label;
    const track = document.createElement('span');
    track.className = 'track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'fill';
    fill.style.width = `${(r.p / max) * 100}%`;
    track.append(fill);
    const v = document.createElement('span');
    v.className = 'pct';
    v.textContent = pct(r.p);
    if (r.sub) { const s = document.createElement('small'); s.textContent = r.sub; v.append(s); }
    b.append(w, track, v);
    li.append(b);
    return li;
  });
  if (rest) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="nw-bar rest"><span class="w"></span><span class="track" aria-hidden="true"><span class="fill"></span></span><span class="pct"></span></div>`;
    li.querySelector('.w')!.textContent = rest.label;
    li.querySelector<HTMLElement>(".fill")!.style.width = `${rest.p * 100}%`;
    li.querySelector('.pct')!.textContent = pct(rest.p);
    items.push(li);
  }
  list.replaceChildren(...items);
}
