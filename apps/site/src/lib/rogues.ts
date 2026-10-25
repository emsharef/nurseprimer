// The Rogues' Gallery: messages the reader wrote that fooled an earlier Wick (kept in the notebook from the
// Third Night's "Break Wick" on). Any later night can re-run them against its own Wick:
//   mountRogues(el, (text) => myWick.predict(text).label, 'Wick with wires (the Fourth Night)')
import { load, CHANGE_EVENT, type Rogue } from '@primer/notebook';

type Label = 'urgent' | 'can_wait';

export function runRogues(predict: (text: string) => Label): { rogue: Rogue; got: Label; ok: boolean }[] {
  return (load().rogues ?? []).map((rogue) => {
    const got = predict(rogue.text);
    return { rogue, got, ok: got === rogue.truth };
  });
}

/** Renders a small report of how this Wick does on the reader's rogues into `el`, and keeps it updated. */
export function mountRogues(el: HTMLElement, predict: (text: string) => Label, machine: string) {
  const render = () => {
    const results = runRogues(predict);
    el.replaceChildren();
    el.classList.add('rogues-report');
    const h = document.createElement('p');
    h.className = 'rogues-title';
    if (!results.length) {
      h.textContent = "Your Rogues' Gallery is empty. Messages that fool Wick in the Third Night's \"Break Wick\" are kept here.";
      el.append(h);
      return;
    }
    const fixed = results.filter((r) => r.ok).length;
    h.textContent = `${machine} on your Rogues' Gallery: ${fixed} of ${results.length} now right.`;
    const ul = document.createElement('ul');
    for (const r of results) {
      const li = document.createElement('li');
      li.className = r.ok ? 'ok' : 'still';
      const q = document.createElement('q');
      q.textContent = r.rogue.text.length > 140 ? r.rogue.text.slice(0, 140) + '…' : r.rogue.text;
      const s = document.createElement('span');
      s.textContent = r.ok ? ' now right' : ` still wrong (says ${r.got === 'urgent' ? 'urgent' : 'can wait'})`;
      li.append(q, s);
      ul.append(li);
    }
    el.append(h, ul);
  };
  render();
  addEventListener(CHANGE_EVENT, render);
}
