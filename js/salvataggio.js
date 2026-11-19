// Salvataggio dei file esportati (backup .json ed Excel .xlsx): a ogni esportazione si sceglie dove salvare.
//  - dove il browser lo permette (Chrome ed Edge su computer) si apre la finestra "Salva con nome",
//    che parte dalla cartella Download;
//  - altrimenti (iPhone, Android) si apre il menu Condividi, da cui si sceglie la destinazione
//    (Salva su File, Drive, e-mail…);
//  - se nessuna delle due è disponibile il file va nella cartella Download.

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
 * Chiede dove salvare il file e lo salva.
 * Restituisce false se l'utente annulla, altrimenti un testo che dice dove è finito il file
 * (es. "in Download"), da usare nel messaggio di conferma; 'condiviso' se è passato dal menu Condividi.
 */
export async function salvaFile(dati, nome, tipo) {
  const blob = new Blob([dati], { type: tipo });

  if ('showSaveFilePicker' in window) {
    const est = nome.slice(nome.lastIndexOf('.'));
    try {
      const fh = await window.showSaveFilePicker({
        id: 'portafoglio-esporta', suggestedName: nome, startIn: 'downloads',
        types: [{ description: est === '.json' ? 'Backup del Portafoglio' : 'Foglio Excel', accept: { [tipo]: [est] } }],
      });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return `come "${fh.name}"`;
    } catch (e) {
      if (e?.name === 'AbortError') return false;
      // finestra non disponibile (es. pagina in un iframe): provo le altre strade
    }
  }

  const r = await condividi(blob, nome, tipo);
  if (r !== null) return r;

  scarica(blob, nome);
  return 'in Download';
}
