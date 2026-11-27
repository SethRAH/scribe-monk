/** The plait grid form: DOM wiring only; geometry and output live in core/ and render/. */
import { plaitFilename } from '../core/decorations.ts';
import { maxCord } from '../core/plait.ts';
import { validateSettings, type Settings } from '../core/settings.ts';
import { fmt, fmtU, fromUnit, toUnit } from '../core/units.ts';
import { plaitLayout, plaitPdf, plaitSvg } from '../render/plait-output.ts';
import { downloadFile } from './download.ts';
import { loadSettings, saveSettings } from './storage.ts';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

export function startPlaitApp(): void {
  const S: Settings = loadSettings();
  const u = (mm: number) => fmt(mm, S.unit);
  const uU = (mm: number) => fmtU(mm, S.unit);

  const syncRange = () => {
    const rg = $('cordRange');
    rg.max = toUnit(maxCord(S.tw, S.th) * 0.98, S.unit).toFixed(3);
    rg.step = S.unit === 'in' ? '0.01' : '0.1';
    rg.value = String(toUnit(S.cord, S.unit));
  };

  const syncInputs = () => {
    $('tw').value = u(S.tw);
    $('th').value = u(S.th);
    $('cols').value = String(S.cols);
    $('rows').value = String(S.rows);
    $('cord').value = u(S.cord);
    $('tw').step = $('th').step = $('cord').step = S.unit === 'in' ? '0.0625' : '0.5';
    $<HTMLSelectElement>('shade').value = S.shade;
    $('outline').checked = S.outline;
    $('tiles').checked = S.tiles;
    $<HTMLSelectElement>('paper').value = S.paper;
    $<HTMLSelectElement>('orient').value = S.orient;
    $('fit').checked = S.fit;
    document
      .querySelectorAll<HTMLButtonElement>('#units button')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.u === S.unit)));
    syncRange();
  };

  const render = () => {
    const errs = validateSettings(S);
    const err = $('err');
    err.textContent = errs.join(' ');
    err.classList.toggle('show', errs.length > 0);
    $<HTMLButtonElement>('dlPdf').disabled = $<HTMLButtonElement>('dlSvg').disabled = errs.length > 0;
    if (errs.length) {
      $('stats').innerHTML = '';
      $('warn').classList.remove('show');
      return;
    }
    const L = plaitLayout(S);
    const mx = maxCord(S.tw, S.th);
    $('stats').innerHTML =
      `Grid <b>${uU(L.gw)} × ${uU(L.gh)}</b> · page ${L.orient}<br>` +
      `Cord is ${Math.round((S.cord / mx) * 100)}% of the maximum (${uU(mx)})`;
    const w = $('warn');
    if (L.tooBig) {
      w.textContent = S.fit
        ? `Too big for one page — the PDF is scaled to ${(L.scale * 100).toFixed(1)}%. The check bar stays true size so you can tell.`
        : `The grid is larger than the printable area (${uU(L.availW)} × ${uU(L.availH)}). Reduce tiles, pick bigger paper, or tick “Scale down to fit”.`;
      w.classList.add('show');
    } else w.classList.remove('show');

    // preview at page proportions
    $('paperBox').style.aspectRatio = `${L.pw} / ${L.ph}`;
    const pv = $('preview');
    const scaleShown = Math.min(1, L.availW / L.gw, L.availH / L.gh);
    pv.style.width = ((L.gw * scaleShown) / L.pw) * 100 + '%';
    pv.style.aspectRatio = `${L.gw} / ${L.gh}`;
    pv.innerHTML = plaitSvg(S, 'fluid');
    saveSettings(S);
  };

  (['tw', 'th', 'cols', 'rows', 'cord'] as const).forEach((id) =>
    $(id).addEventListener('input', () => {
      const v = parseFloat($(id).value);
      if (id === 'cols' || id === 'rows') S[id] = Math.round(v);
      else S[id] = fromUnit(v, S.unit);
      if (id !== 'cord') syncRange();
      else $('cordRange').value = String(toUnit(S.cord, S.unit));
      render();
    }),
  );
  $('cordRange').addEventListener('input', () => {
    S.cord = fromUnit(parseFloat($('cordRange').value), S.unit);
    $('cord').value = u(S.cord);
    render();
  });
  const onSelect = <K extends 'shade' | 'paper' | 'orient'>(id: K) =>
    $<HTMLSelectElement>(id).addEventListener('change', () => {
      S[id] = $<HTMLSelectElement>(id).value as Settings[K];
      render();
    });
  onSelect('shade');
  onSelect('paper');
  onSelect('orient');
  (['outline', 'tiles', 'fit'] as const).forEach((id) =>
    $(id).addEventListener('change', () => {
      S[id] = $(id).checked;
      render();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('#units button').forEach((b) =>
    b.addEventListener('click', () => {
      S.unit = b.dataset.u === 'in' ? 'in' : 'mm';
      syncInputs();
      render();
    }),
  );

  // ---------- downloads ----------
  const status = (t: string) => {
    $('status').textContent = t;
  };
  const fname = (ext: string) => plaitFilename(S, S.unit, ext);

  $('dlPdf').addEventListener('click', async () => {
    const name = fname('pdf');
    let JsPDF: typeof import('jspdf').jsPDF;
    try {
      ({ jsPDF: JsPDF } = await import('jspdf'));
    } catch {
      status('The PDF library didn’t load. Try the SVG instead.');
      return;
    }
    try {
      const doc = plaitPdf(S, (opts) => new JsPDF(opts));
      downloadFile(name, doc.output('blob'));
      status('Saved ' + name);
    } catch {
      status('Couldn’t save the file here.');
    }
  });
  $('dlSvg').addEventListener('click', () => {
    const name = fname('svg');
    downloadFile(name, plaitSvg(S, 'file'), 'image/svg+xml');
    status('Saved ' + name);
  });

  syncInputs();
  render();
}
