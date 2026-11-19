// Dove salvare i file esportati (backup .json ed Excel .xlsx).
// La scelta vale per questo dispositivo e non finisce nel backup.
//  - 'download' (predefinita): la cartella Download del dispositivo;
//  - 'cartella': una cartella scelta una volta (solo browser che lo permettono, es. Chrome ed Edge su computer);
//  - 'chiedi': a ogni esportazione si sceglie dove salvare (finestra "Salva con nome" o menu Condividi).

const CHIAVE_MODO = 'portafoglio.destinazione';
const CHIAVE_NOME_CARTELLA = 'portafoglio.destinazione.cartella';
const DB = 'portafoglio';
const STORE = 'file';
const CHIAVE_HANDLE = 'cartellaEsportazione';

const eIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function condivisioneFile() {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'prova.txt', { type: 'text/plain' })] });
  } catch (e) {
    return false;
  }
}

/** Quali modi funzionano in questo browser. */
export const supporto = {
  cartella: typeof window !== 'undefined' && 'showDirectoryPicker' in window && typeof indexedDB !== 'undefined',
  chiedi: typeof window !== 'undefined' && ('showSaveFilePicker' in window || condivisioneFile()),
};

export function modoDestinazione() {
  let m = null;
  try { m = localStorage.getItem(CHIAVE_MODO); } catch (e) { /* storage non disponibile */ }
  if (m === 'cartella' && supporto.cartella) return m;
  if (m === 'chiedi' && supporto.chiedi) return m;
  return 'download';
}

export function nomeCartella() {
  try { return localStorage.getItem(CHIAVE_NOME_CARTELLA) || ''; } catch (e) { return ''; }
}

export function impostaModo(modo) {
  try { localStorage.setItem(CHIAVE_MODO, modo); } catch (e) { /* storage non disponibile */ }
}

/** Testo che spiega il modo scelto, per le Opzioni. */
export function descrizioneModo(modo = modoDestinazione()) {
  if (modo === 'cartella') return `I file vengono salvati nella cartella "${nomeCartella()}".`;
  if (modo === 'chiedi') {
    return 'showSaveFilePicker' in window
      ? 'A ogni esportazione scegli la cartella e il nome del file (si parte da Download).'
      : 'A ogni esportazione si apre il menu Condividi: scegli dove salvare (File, Drive, e-mail…).';
  }
  return eIOS()
    ? 'Si apre il menu Condividi: tocca "Salva su File" e scegli la cartella Download.'
    : 'I file vengono salvati nella cartella Download del dispositivo.';
}

// ---------- Cartella scelta (handle conservato in IndexedDB) ----------

function apriDb() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function operazione(modo, fn) {
  const db = await apriDb();
  try {
    return await new Promise((ok, ko) => {
      const tx = db.transaction(STORE, modo);
      const r = fn(tx.objectStore(STORE));
      tx.oncomplete = () => ok(r?.result);
      tx.onerror = () => ko(tx.error);
    });
  } finally {
    db.close();
  }
}

const leggiCartella = () => operazione('readonly', (st) => st.get(CHIAVE_HANDLE)).catch(() => null);

/**
 * Fa scegliere una cartella e la usa per le prossime esportazioni.
 * Restituisce il nome della cartella, oppure null se l'utente annulla.
 */
export async function scegliCartella() {
  let h;
  try {
    h = await window.showDirectoryPicker({ id: 'portafoglio-esporta', mode: 'readwrite', startIn: 'downloads' });
  } catch (e) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
  await operazione('readwrite', (st) => st.put(h, CHIAVE_HANDLE));
  try { localStorage.setItem(CHIAVE_NOME_CARTELLA, h.name); } catch (e) { /* storage non disponibile */ }
  impostaModo('cartella');
  return h.name;
}

async function permesso(h) {
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission?.(o)) === 'granted') return true;
  return (await h.requestPermission?.(o)) === 'granted';
}

async function scriviHandle(fileHandle, blob) {
  const w = await fileHandle.createWritable();
  await w.write(blob);
  await w.close();
}

// ---------- Salvataggio ----------

function scarica(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function condividi(blob, nome, tipo) {
  const file = new File([blob], nome, { type: tipo });
  if (!navigator.canShare?.({ files: [file] })) return null;
  try {
    await navigator.share({ files: [file], title: nome });
    return 'condiviso';
  } catch (e) {
    return e?.name === 'AbortError' ? false : null;
  }
}

/**
 * Salva un file nella destinazione scelta nelle Opzioni.
 * Restituisce false se l'utente annulla, altrimenti un testo che dice dove è finito il file
 * (es. "in Download"), da usare nel messaggio di conferma.
 */
export async function salvaFile(dati, nome, tipo) {
  const blob = new Blob([dati], { type: tipo });
  const modo = modoDestinazione();

  if (modo === 'cartella') {
    try {
      const h = await leggiCartella();
      if (h && await permesso(h)) {
        await scriviHandle(await h.getFileHandle(nome, { create: true }), blob);
        return `nella cartella "${h.name}"`;
      }
    } catch (e) { /* cartella spostata o eliminata: uso Download */ }
    scarica(blob, nome);
    return `in Download (la cartella "${nomeCartella()}" non è raggiungibile: sceglila di nuovo in Opzioni)`;
  }

  if (modo === 'chiedi') {
    if ('showSaveFilePicker' in window) {
      const est = nome.slice(nome.lastIndexOf('.'));
      try {
        const fh = await window.showSaveFilePicker({
          id: 'portafoglio-esporta', suggestedName: nome, startIn: 'downloads',
          types: [{ description: est === '.json' ? 'Backup del Portafoglio' : 'Foglio Excel', accept: { [tipo]: [est] } }],
        });
        await scriviHandle(fh, blob);
        return `come "${fh.name}"`;
      } catch (e) {
        if (e?.name === 'AbortError') return false;
      }
    } else {
      const r = await condividi(blob, nome, tipo);
      if (r !== null) return r;
    }
  }

  // Download (predefinito). Su iPhone il download diretto non funziona bene dall'icona sulla
  // schermata Home: si usa il menu Condividi, da cui "Salva su File".
  if (eIOS()) {
    const r = await condividi(blob, nome, tipo);
    if (r !== null) return r;
  }
  scarica(blob, nome);
  return 'in Download';
}
