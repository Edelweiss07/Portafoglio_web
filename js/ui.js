// Componenti di interfaccia: formattazione, finestre modali, schede, campi.
import { INFO } from './info.js';

export const NOMI_MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
export const NOMI_MESI_LUNGHI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export const esc = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** € 1.234 oppure € 1.234,56 (punto delle migliaia anche sotto 10.000, come nell'app Android). */
export function euro(v) {
  if (v == null || !isFinite(v)) return '—';
  const arrot = Math.round(v * 100) / 100;
  const intero = Math.abs(arrot % 1) < 1e-9;
  const [i, d] = Math.abs(arrot).toFixed(intero ? 0 : 2).split('.');
  const migliaia = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€\u00a0${arrot < 0 ? '-' : ''}${migliaia}${d ? `,${d}` : ''}`;
}

export function numero(v) {
  if (v == null || !isFinite(v)) return '';
  return new Intl.NumberFormat('it-IT', { useGrouping: false, maximumFractionDigits: 2 }).format(v);
}

/** Accetta "1234,5", "1.234,5", "1234.5", "-200". Restituisce null se non è un numero. */
export function parseNumero(t) {
  const s = String(t ?? '').trim().replace(/\s/g, '').replace('€', '');
  if (s === '' || s === '-') return null;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(norm);
  return isFinite(n) ? n : null;
}

export const classeImporto = (v) => (v < 0 ? 'neg' : '');

/** Testo con a capo e punti elenco → HTML. */
export function testoHtml(t) {
  return esc(t).split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// ---------- Icone (SVG inline) ----------

const icona = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
export const ICONE = {
  info: icona('M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'),
  matita: icona('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
  piu: icona('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
  cestino: icona('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'),
  sinistra: icona('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z'),
  destra: icona('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
  home: icona('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
  calendario: icona('M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z'),
  lista: icona('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z'),
  salvadanaio: icona('M19.83 7.5 17.56 5.23c.07-.42.18-.81.32-1.15A1.498 1.498 0 0 0 16.5 2c-1.64 0-3.09.79-4 2h-5C4.46 4 2 6.46 2 9.5S4.5 21 4.5 21H10v-2h2v2h5.5l1.68-5.59 2.82-.94V7.5h-2.17zM13 9H8V7h5v2zm3 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z'),
  opzioni: icona('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'),
};

// ---------- Blocchi di contenuto ----------

export const pulsanteInfo = (chiaveInfo) =>
  `<button type="button" class="icona-btn info-btn" data-info="${chiaveInfo}" aria-label="Informazioni: ${esc(INFO[chiaveInfo][0])}">${ICONE.info}</button>`;

/** Scheda con titolo, pulsante ⓘ facoltativo e contenuto. */
export function sezione(titolo, corpo, { evidenziata = false, info = null, id = '' } = {}) {
  return `<section class="scheda${evidenziata ? ' evidenziata' : ''}"${id ? ` id="${id}"` : ''}>
    <div class="scheda-titolo"><h3>${esc(titolo)}</h3>${info ? pulsanteInfo(info) : ''}</div>
    <div class="scheda-corpo">${corpo}</div>
  </section>`;
}

/** Riga di un valore calcolato: etichetta e valore in grassetto. */
export const rigaValore = (etichetta, valore, { grande = false } = {}) =>
  `<div class="riga calcolata${grande ? ' grande' : ''}"><span>${esc(etichetta)}</span><span class="${classeImporto(valore)}">${euro(valore)}</span></div>`;

/** Riga di un valore inserito a mano (testo normale) o calcolato (grassetto). */
export const riga = (etichetta, valore, calcolato = false) =>
  `<div class="riga${calcolato ? ' calcolata' : ''}"><span>${esc(etichetta)}</span><span class="${classeImporto(valore)}">${euro(valore)}</span></div>`;

/** Campo numerico. */
export function campo(etichetta, valore, attributi = '', aiuto = '') {
  const v = valore === 0 || valore == null ? '' : numero(valore);
  return `<label class="campo"><span class="campo-etichetta">${esc(etichetta)}</span>
    <input type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v)}" ${attributi}>
    ${aiuto ? `<span class="campo-aiuto">${esc(aiuto)}</span>` : ''}</label>`;
}

export function campoTesto(etichetta, valore, attributi = '', multilinea = false) {
  return `<label class="campo"><span class="campo-etichetta">${esc(etichetta)}</span>
    ${multilinea ? `<textarea rows="2" ${attributi}>${esc(valore)}</textarea>` : `<input type="text" value="${esc(valore)}" ${attributi}>`}</label>`;
}

// ---------- Finestre modali ----------

let pila = [];

/**
 * Apre una finestra. azioni: [{ testo, tipo: 'primario'|'testo'|'pericolo', onClick(chiudi) }]
 * Restituisce { el, chiudi }.
 */
export function apriModale({ titolo, corpo, azioni = [], info = null, classe = '', onChiudi = null, bloccante = false }) {
  const sfondo = document.createElement('div');
  sfondo.className = 'modale-sfondo';
  sfondo.innerHTML = `<div class="modale ${classe}" role="dialog" aria-modal="true" aria-label="${esc(titolo)}">
    <div class="modale-titolo"><h2>${esc(titolo)}</h2>${info ? pulsanteInfo(info) : ''}</div>
    <div class="modale-corpo">${corpo}</div>
    <div class="modale-azioni"></div>
  </div>`;
  const barra = sfondo.querySelector('.modale-azioni');
  const chiudi = () => {
    if (!sfondo.isConnected) return;
    sfondo.remove();
    pila = pila.filter((x) => x !== sfondo);
    if (!pila.length) document.body.classList.remove('con-modale');
    onChiudi?.();
  };
  for (const a of azioni) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.tipo === 'primario' ? 'btn-primario' : a.tipo === 'pericolo' ? 'btn-pericolo' : 'btn-testo'}`;
    b.textContent = a.testo;
    b.addEventListener('click', () => a.onClick ? a.onClick(chiudi) : chiudi());
    barra.appendChild(b);
  }
  if (!azioni.length) barra.remove();
  if (!bloccante) sfondo.addEventListener('click', (ev) => { if (ev.target === sfondo) chiudi(); });
  document.body.appendChild(sfondo);
  document.body.classList.add('con-modale');
  pila.push(sfondo);
  return { el: sfondo.querySelector('.modale'), chiudi };
}

export function apriInfo(chiaveInfo) {
  const [titolo, testo] = INFO[chiaveInfo];
  apriModale({ titolo, corpo: `<div class="testo-info">${testoHtml(testo)}</div>`, azioni: [{ testo: 'Ho capito', tipo: 'primario' }], classe: 'modale-info' });
}

export function conferma({ titolo, testo, ok = 'OK', pericolo = false, onOk }) {
  apriModale({
    titolo,
    corpo: `<p>${esc(testo)}</p>`,
    azioni: [
      { testo: 'Annulla' },
      { testo: ok, tipo: pericolo ? 'pericolo' : 'primario', onClick: (c) => { c(); onOk(); } },
    ],
  });
}

export function avviso(testo) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = testo;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visibile'));
  setTimeout(() => { t.classList.remove('visibile'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ---------- Editor delle frasi motivazionali ----------

/** HTML dell'editor; gli eventi sono gestiti da collegaEditorFrasi. */
export function editorFrasi(frasi, etichettaSoglia) {
  return `<div class="editor-frasi">${frasi.map((f, i) => `
    <div class="frase" data-indice="${i}">
      <div class="frase-riga">${campo(etichettaSoglia, f.soglia, 'data-frase="soglia"')}
        <button type="button" class="icona-btn" data-frase-elimina="${i}" aria-label="Elimina frase">${ICONE.cestino}</button></div>
      ${campoTesto('Frase', f.testo, 'data-frase="testo"', true)}
    </div>`).join('')}
    <div class="riga-pulsanti"><button type="button" class="btn btn-testo" data-frase-aggiungi>+ Aggiungi frase</button>
    <button type="button" class="btn btn-testo" data-frase-predefinite>Frasi predefinite</button></div>
  </div>`;
}

/**
 * Collega gli eventi dell'editor dentro [radice]. getFrasi() restituisce l'elenco attuale,
 * onChange(nuove, ridisegna) lo salva; ridisegna = true quando cambia il numero di frasi.
 */
export function collegaEditorFrasi(radice, getFrasi, onChange, predefinite, passo) {
  radice.addEventListener('change', (ev) => {
    const box = ev.target.closest('.frase');
    if (!box || !ev.target.dataset.frase) return;
    const i = Number(box.dataset.indice);
    const frasi = getFrasi().map((f) => ({ ...f }));
    if (ev.target.dataset.frase === 'soglia') frasi[i].soglia = parseNumero(ev.target.value) ?? 0;
    else frasi[i].testo = ev.target.value;
    onChange(frasi, false);
  });
  radice.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-frase-elimina],[data-frase-aggiungi],[data-frase-predefinite]');
    if (!el || !radice.contains(el)) return;
    const frasi = getFrasi().map((f) => ({ ...f }));
    if (el.dataset.fraseElimina != null) frasi.splice(Number(el.dataset.fraseElimina), 1);
    else if (el.hasAttribute('data-frase-aggiungi')) {
      const max = frasi.length ? Math.max(...frasi.map((f) => f.soglia)) : -passo;
      frasi.push({ soglia: max + passo, testo: '' });
    } else {
      onChange(predefinite.map((f) => ({ ...f })), true);
      return;
    }
    onChange(frasi, true);
  });
}

// ---------- Scaricare o condividere un file ----------

const eIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Salva un file: su iPhone con il foglio di condivisione (Salva su File), altrove come download. */
export async function salvaFile(dati, nome, tipo) {
  const blob = new Blob([dati], { type: tipo });
  if (eIOS() && navigator.canShare) {
    const file = new File([blob], nome, { type: tipo });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nome });
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
