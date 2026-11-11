// Motore di calcolo del Portafoglio (port dell'app Android, stesse regole e stesso formato dati).
// Lo stato è un oggetto JSON identico al file di backup (versione 5), così il backup è
// compatibile con l'app Android in entrambe le direzioni.

export const VERSIONE_DATI = 5;

// ---------- Mesi ----------

export const chiave = (y, m) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
export const parseChiave = (k) => {
  const [y, m] = k.split('-').map(Number);
  return { y, m };
};
export const indice = (ym) => ym.y * 12 + (ym.m - 1);
export const daIndice = (i) => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });
export const succ = (ym) => daIndice(indice(ym) + 1);
export const stessoMese = (a, b) => a.y === b.y && a.m === b.m;
export const oggiYM = (d = new Date()) => ({ y: d.getFullYear(), m: d.getMonth() + 1 });

const clona = (o) => JSON.parse(JSON.stringify(o));

// ---------- Frasi predefinite ----------

export const FRASI_PREDEFINITE = [
  { soglia: -1000, testo: 'Attenzione: sei parecchio sotto il target. Rimanda le spese non necessarie.' },
  { soglia: -200, testo: "Sei un po' sotto il target: con qualche piccola rinuncia lo recuperi." },
  { soglia: 0, testo: 'Sei in linea con il target. Continua così!' },
  { soglia: 500, testo: 'Ottimo lavoro: sei sopra il target. Puoi mettere qualcosa nei salvadanai.' },
];

export const FRASI_SALVADANAIO_PREDEFINITE = [
  { soglia: 0, testo: 'Ogni obiettivo parte da un primo passo: inizia a mettere da parte qualcosa.' },
  { soglia: 25, testo: 'Buon inizio! Un quarto della strada è già fatto.' },
  { soglia: 50, testo: 'Sei a metà strada: continua così.' },
  { soglia: 75, testo: 'Ci sei quasi, manca poco!' },
  { soglia: 100, testo: 'Obiettivo raggiunto! Complimenti.' },
];

// ---------- Stati iniziali ----------

export function vuoto(oggi) {
  return {
    versione: VERSIONE_DATI,
    impostazioni: {
      inizioAnno: oggi.y, inizioMese: oggi.m, fineAnno: oggi.y + 3,
      saldoIniziale: 0, residuoIniziale: 0, plafondCarte: 1600, frasi: clona(FRASI_PREDEFINITE),
    },
    saldoCorrente: { saldo: 0, nonAddebitato: 0, nonAccreditato: 0, buoniResidui: 0, welfare: 0, residuoCarte: 0 },
    voci: [],
    salvadanai: [],
    mesi: {},
    ultimoMeseAperto: chiave(oggi.y, oggi.m),
  };
}

/**
 * Dati generici di esempio: anno indicato e i tre seguenti.
 * Se si passa [oggi], il saldo corrente viene calibrato perché la Disponibilità del mese sia +150 €.
 */
export function esempio(anno, oggi = null) {
  const s = esempioBase(anno);
  if (oggi) {
    const d = riepilogo(s, oggi).disponibilita;
    if (d != null) s.saldoCorrente.saldo = Math.round(s.saldoCorrente.saldo - d + 150);
  }
  return s;
}

function esempioBase(anno) {
  const anni = [anno, anno + 1, anno + 2, anno + 3];
  const ogniAnno = (...m) => anni.flatMap((a) => m.map((x) => chiave(a, x)));
  let n = 0;
  const p = (nome, importo, mesi) => ({ id: `p${n++}`, nome, importo, tipo: 'PERIODICO', mesi: mesi.sort() });
  const e = (nome, importo, a, ...m) => ({
    id: `e${n++}`, nome, importo, tipo: 'EXTRA', mesi: m.map((x) => chiave(a, x)), anno: a,
  });
  return {
    versione: VERSIONE_DATI,
    impostazioni: {
      inizioAnno: anno, inizioMese: 1, fineAnno: anno + 3,
      saldoIniziale: 5000, residuoIniziale: 12000, plafondCarte: 1500, frasi: clona(FRASI_PREDEFINITE),
    },
    saldoCorrente: { saldo: 6000, nonAddebitato: 300, nonAccreditato: 0, buoniResidui: 10, welfare: 0, residuoCarte: 1200 },
    voci: [
      p('Bollo auto', -200, ogniAnno(2)),
      p('Assicurazione auto', -450, ogniAnno(3)),
      p('TARI', -250, ogniAnno(5)),
      p('Quattordicesima', 1500, ogniAnno(7)),
      p('Vacanza estiva', -1500, ogniAnno(8)),
      p('Abbonamento palestra', -300, ogniAnno(9)),
      p('Manutenzione caldaia', -100, ogniAnno(10)),
      p('Tredicesima', 2000, ogniAnno(12)),
      p('Regali di Natale', -400, ogniAnno(12)),
      e('Nuovo computer', -1200, anno, 4),
      e('Rimborso 730', 600, anno + 1, 7),
      e('Acconto cambio auto', -3000, anno + 2),
    ],
    salvadanai: [
      { id: 'vacanze', nome: 'Vacanze', obiettivo: 1500, scadenza: chiave(anno + 1, 6), frasi: clona(FRASI_SALVADANAIO_PREDEFINITE) },
      { id: 'emergenze', nome: 'Emergenze', obiettivo: 3000, scadenza: chiave(anno + 1, 12), frasi: clona(FRASI_SALVADANAIO_PREDEFINITE) },
    ],
    mesi: {
      [chiave(anno, 1)]: { extra: 0, entrate: 2400, spese: 1600, valoreBuono: 8, rata: 250, salvadanai: { vacanze: 0, emergenze: 1000 } },
      [chiave(anno, 6)]: { extra: 0, salvadanai: { vacanze: 500 } },
      [chiave(anno + 1, 1)]: { extra: 0, entrate: 2500, salvadanai: { vacanze: 0 } },
    },
  };
}

// ---------- Mesi inseriti a mano ----------

const CAMPI_TRASCINATI = ['entrate', 'spese', 'valoreBuono', 'rata'];

export function meseVuoto(m) {
  if (!m) return true;
  return CAMPI_TRASCINATI.every((c) => m[c] == null) && !(m.extra) &&
    (!m.salvadanai || Object.keys(m.salvadanai).length === 0);
}

function conMese(s, k, m) {
  if (meseVuoto(m)) delete s.mesi[k];
  else s.mesi[k] = m;
}

// ---------- Proiezione ----------

/**
 * Calcola mese per mese. Regole:
 *  Utile = Entrate nette − Spese fisse
 *  Saldo contabile = precedente + Utile + Extra (manuale + voci straordinarie) + Periodico
 *  Residuo finanziamenti = precedente − Rata (mai sotto zero)
 *  Saldo netto totale = Saldo contabile − salvadanai − residuo finanziamenti
 */
export function proiezione(s) {
  const imp = s.impostazioni;
  const inizio = { y: imp.inizioAnno, m: imp.inizioMese };
  const fine = { y: imp.fineAnno, m: 12 };
  const idSalv = s.salvadanai.map((x) => x.id);
  const v = { entrate: 0, spese: 0, valoreBuono: 0, rata: 0 };
  const salv = {};
  const applica = (m) => {
    for (const c of CAMPI_TRASCINATI) if (m[c] != null) v[c] = m[c];
    if (m.salvadanai) for (const [id, x] of Object.entries(m.salvadanai)) salv[id] = x;
  };
  // valori "a trascinamento" impostati prima dell'inizio
  Object.keys(s.mesi).filter((k) => indice(parseChiave(k)) < indice(inizio)).sort()
    .forEach((k) => applica(s.mesi[k]));

  const righe = [];
  let saldo = imp.saldoIniziale;
  let residuo = imp.residuoIniziale;
  for (let i = indice(inizio); i <= indice(fine); i++) {
    const ym = daIndice(i);
    const k = chiave(ym.y, ym.m);
    const m = s.mesi[k] || {};
    applica(m);
    let periodico = 0;
    let extraVoci = 0;
    for (const voce of s.voci) {
      if (!voce.mesi.includes(k)) continue;
      if (voce.tipo === 'PERIODICO') periodico += voce.importo;
      else if (voce.anno == null || voce.anno === ym.y) extraVoci += voce.importo;
    }
    const extraManuale = m.extra || 0;
    const utile = v.entrate - v.spese;
    saldo += utile + extraManuale + extraVoci + periodico;
    residuo = Math.max(0, residuo - v.rata);
    const salvadanai = {};
    const nettiSalv = {};
    let progressivo = saldo;
    let totSalv = 0;
    for (const id of idSalv) {
      const x = salv[id] ?? 0;
      salvadanai[id] = x;
      totSalv += x;
      progressivo -= x;
      nettiSalv[id] = progressivo;
    }
    righe.push({
      ym, chiave: k,
      entrate: v.entrate, spese: v.spese, utile, valoreBuono: v.valoreBuono,
      extraManuale, extraVoci, extra: extraManuale + extraVoci, periodico,
      saldoContabile: saldo,
      rata: v.rata, residuoFinanziamenti: residuo,
      saldoNettoFinanziamenti: saldo - residuo,
      salvadanai, saldoNettoSalvadanai: nettiSalv, totaleSalvadanai: totSalv,
      saldoAlNettoSalvadanai: saldo - totSalv,
      saldoNettoTotale: saldo - residuo - totSalv,
    });
  }
  return righe;
}

// ---------- Home ----------

export function riepilogo(s, mese, righe = proiezione(s)) {
  const c = s.saldoCorrente;
  const riga = righe.find((r) => stessoMese(r.ym, mese));
  const valoreBuono = riga?.valoreBuono ??
    [...righe].reverse().find((r) => indice(r.ym) <= indice(mese))?.valoreBuono ??
    righe[0]?.valoreBuono ?? 0;
  const saldoBuoni = c.buoniResidui * valoreBuono;
  const saldoNetto = c.saldo - c.nonAddebitato + c.nonAccreditato + saldoBuoni + c.welfare;
  const speseCarte = s.impostazioni.plafondCarte - c.residuoCarte;
  const target = riga ? riga.saldoContabile : null;
  const saldoDisponibile = saldoNetto - speseCarte;
  return {
    mese, valoreBuono, saldoBuoni, saldoNetto, speseCarte, target, saldoDisponibile,
    disponibilita: target == null ? null : saldoDisponibile - target,
  };
}

/** Riporta la Disponibilità del mese sull'Extra del mese. */
export function chiudiMese(s, mese) {
  const d = riepilogo(s, mese).disponibilita;
  if (d == null) return s;
  const n = clona(s);
  const k = chiave(mese.y, mese.m);
  const m = n.mesi[k] || { extra: 0 };
  m.extra = (m.extra || 0) + d;
  conMese(n, k, m);
  return n;
}

/**
 * All'apertura dell'app: se il mese è cambiato dall'ultima apertura, chiude l'ultimo mese aperto.
 * Restituisce { stato, chiusura } dove chiusura = { mese, importo } oppure null.
 */
export function aperturaApp(s, oggi) {
  const k = chiave(oggi.y, oggi.m);
  let ultimo = null;
  if (s.ultimoMeseAperto && /^\d{4}-\d{2}$/.test(s.ultimoMeseAperto)) ultimo = parseChiave(s.ultimoMeseAperto);
  if (!ultimo || indice(ultimo) >= indice(oggi)) {
    if (ultimo && stessoMese(ultimo, oggi)) return { stato: s, chiusura: null };
    return { stato: { ...s, ultimoMeseAperto: k }, chiusura: null };
  }
  const d = riepilogo(s, ultimo).disponibilita;
  const chiuso = { ...chiudiMese(s, ultimo), ultimoMeseAperto: k };
  return { stato: chiuso, chiusura: d == null ? null : { mese: ultimo, importo: d } };
}

/** La frase con la soglia più alta non superiore al valore; sotto tutte, quella più bassa. */
export function frasePer(valore, frasi) {
  if (valore == null) return null;
  const ord = (frasi || []).filter((f) => f.testo && f.testo.trim()).sort((a, b) => a.soglia - b.soglia);
  if (!ord.length) return null;
  let scelta = ord[0];
  for (const f of ord) if (valore >= f.soglia) scelta = f;
  return scelta.testo;
}

/** Avanzamento di un salvadanaio verso l'obiettivo; null se non ha obiettivo. */
export function avanzamento(s, righe, id, oggi) {
  const sv = s.salvadanai.find((x) => x.id === id);
  if (!sv || !(sv.obiettivo > 0)) return null;
  const riga = righe.find((r) => stessoMese(r.ym, oggi)) ??
    [...righe].reverse().find((r) => indice(r.ym) <= indice(oggi)) ?? righe[0];
  const saldo = riga?.salvadanai[id] ?? 0;
  const percentuale = (saldo / sv.obiettivo) * 100;
  const mancante = Math.max(0, sv.obiettivo - saldo);
  let mesi = null;
  if (sv.scadenza && /^\d{4}-\d{2}$/.test(sv.scadenza)) {
    mesi = Math.max(0, indice(parseChiave(sv.scadenza)) - indice(oggi));
  }
  let quota = null;
  if (mancante === 0) quota = 0;
  else if (mesi) quota = mancante / mesi;
  return {
    saldo, obiettivo: sv.obiettivo, percentuale, mancante, mesiRimanenti: mesi, quotaMensile: quota,
    frase: frasePer(percentuale, sv.frasi),
  };
}

// ---------- Modifiche ----------

/**
 * Imposta entrate / spese / valoreBuono di un mese.
 * applica: 'SOLO_MESE' | 'FINO_PROSSIMA' | 'TUTTI'
 */
export function impostaCampi(s, ym, valori, applica) {
  const prima = proiezione(s);
  const successivo = prima.find((r) => stessoMese(r.ym, succ(ym)));
  const n = clona(s);
  const k = chiave(ym.y, ym.m);
  for (const [campo, valore] of Object.entries(valori)) {
    if (applica === 'SOLO_MESE' && successivo) {
      const ks = successivo.chiave;
      const ms = n.mesi[ks] || { extra: 0 };
      if (ms[campo] == null) {
        ms[campo] = successivo[campo];
        conMese(n, ks, ms);
      }
    } else if (applica === 'TUTTI') {
      for (const kk of Object.keys(n.mesi)) {
        if (indice(parseChiave(kk)) > indice(ym)) {
          const mm = n.mesi[kk];
          delete mm[campo];
          conMese(n, kk, mm);
        }
      }
    }
    const m = n.mesi[k] || { extra: 0 };
    m[campo] = valore;
    conMese(n, k, m);
  }
  return n;
}

/** Salva extra e rata del mese (la rata solo se diversa da quella ereditata) e poi i campi cambiati. */
export function salvaMese(s, ym, extra, rata, cambi, applica) {
  const righe = proiezione(s);
  const i = righe.findIndex((r) => stessoMese(r.ym, ym));
  const rataEreditata = i > 0 ? righe[i - 1].rata : null;
  const n = clona(s);
  const k = chiave(ym.y, ym.m);
  const m = n.mesi[k] || { extra: 0 };
  m.extra = extra;
  if (rataEreditata == null || rata !== rataEreditata) m.rata = rata;
  else delete m.rata;
  conMese(n, k, m);
  return Object.keys(cambi).length ? impostaCampi(n, ym, cambi, applica) : n;
}

export function toggle(voce, ym, on) {
  if (voce.tipo === 'EXTRA' && voce.anno != null && voce.anno !== ym.y) return voce;
  const k = chiave(ym.y, ym.m);
  const set = new Set(voce.mesi);
  if (on) set.add(k); else set.delete(k);
  return { ...voce, mesi: [...set].sort() };
}

const prefisso = (a) => `${String(a).padStart(4, '0')}-`;

export function copiaAnnoPrecedente(voce, anno) {
  if (voce.tipo !== 'PERIODICO') return voce;
  const resto = voce.mesi.filter((k) => !k.startsWith(prefisso(anno)));
  const copiati = voce.mesi.filter((k) => k.startsWith(prefisso(anno - 1))).map((k) => prefisso(anno) + k.slice(5));
  return { ...voce, mesi: [...new Set([...resto, ...copiati])].sort() };
}

export function cambiaTipo(voce, nuovo, anno) {
  if (voce.tipo === nuovo) return voce;
  if (nuovo === 'EXTRA') {
    return { ...voce, tipo: 'EXTRA', anno, mesi: voce.mesi.filter((k) => k.startsWith(prefisso(anno))) };
  }
  const { anno: _scarta, ...resto } = voce;
  return { ...resto, tipo: 'PERIODICO' };
}

export function cambiaAnno(voce, nuovoAnno) {
  if (voce.tipo !== 'EXTRA') return voce;
  return { ...voce, anno: nuovoAnno, mesi: [...new Set(voce.mesi.map((k) => prefisso(nuovoAnno) + k.slice(5)))].sort() };
}

export function salvaVoce(s, voce) {
  const n = clona(s);
  const i = n.voci.findIndex((v) => v.id === voce.id);
  if (i >= 0) n.voci[i] = voce; else n.voci.push(voce);
  return n;
}

export function eliminaVoce(s, id) {
  return { ...s, voci: s.voci.filter((v) => v.id !== id) };
}

export function salvaSalvadanaio(s, sv) {
  const n = clona(s);
  const i = n.salvadanai.findIndex((x) => x.id === sv.id);
  if (i >= 0) n.salvadanai[i] = sv; else n.salvadanai.push(sv);
  return n;
}

export function impostaSalvadanaio(s, id, ym, valore) {
  const righe = proiezione(s);
  const i = righe.findIndex((r) => stessoMese(r.ym, ym));
  const ereditato = i > 0 ? righe[i - 1].salvadanai[id] : null;
  const n = clona(s);
  const k = chiave(ym.y, ym.m);
  const m = n.mesi[k] || { extra: 0 };
  m.salvadanai = m.salvadanai || {};
  if (ereditato != null && ereditato === valore) delete m.salvadanai[id];
  else m.salvadanai[id] = valore;
  if (!Object.keys(m.salvadanai).length) delete m.salvadanai;
  conMese(n, k, m);
  return n;
}

export function eliminaSalvadanaio(s, id) {
  const n = clona(s);
  n.salvadanai = n.salvadanai.filter((x) => x.id !== id);
  for (const k of Object.keys(n.mesi)) {
    const m = n.mesi[k];
    if (m.salvadanai) {
      delete m.salvadanai[id];
      if (!Object.keys(m.salvadanai).length) delete m.salvadanai;
    }
    conMese(n, k, m);
  }
  return n;
}

// ---------- Lettura di un backup (anche delle versioni precedenti dell'app Android) ----------

const num = (x, d = 0) => (typeof x === 'number' && isFinite(x) ? x : d);

export function normalizza(o) {
  if (!o || typeof o !== 'object' || !o.impostazioni || !o.saldoCorrente || !Array.isArray(o.voci) || !o.mesi) {
    throw new Error('File non valido');
  }
  const versione = num(o.versione, 1);
  const i = o.impostazioni;
  const inizioAnno = num(i.inizioAnno);
  const inizioMese = num(i.inizioMese, 1);
  const voci = o.voci.map((v) => {
    const tipo = v.tipo === 'EXTRA' ? 'EXTRA' : 'PERIODICO';
    let mesi = (v.mesi || []).map(String);
    let anno = v.anno != null ? num(v.anno) : null;
    // versione 1: le straordinarie non avevano un anno
    if (anno == null && tipo === 'EXTRA') anno = mesi.length ? Number([...mesi].sort()[0].slice(0, 4)) : inizioAnno;
    if (anno != null) mesi = mesi.filter((k) => k.startsWith(prefisso(anno)));
    const voce = { id: String(v.id), nome: String(v.nome), importo: num(v.importo), tipo, mesi: mesi.sort() };
    if (tipo === 'EXTRA') voce.anno = anno;
    return voce;
  });
  const salvadanai = Array.isArray(o.salvadanai)
    ? o.salvadanai.map((x) => {
      const sv = { id: String(x.id), nome: String(x.nome), frasi: Array.isArray(x.frasi) ? x.frasi : clona(FRASI_SALVADANAIO_PREDEFINITE) };
      if (x.obiettivo != null) sv.obiettivo = num(x.obiettivo);
      if (x.scadenza) sv.scadenza = String(x.scadenza);
      return sv;
    })
    : [{ id: 'papa', nome: 'Papà', frasi: clona(FRASI_SALVADANAIO_PREDEFINITE) },
      { id: 'diana', nome: 'Diana', frasi: clona(FRASI_SALVADANAIO_PREDEFINITE) }];
  const mesi = {};
  for (const [k, m] of Object.entries(o.mesi)) {
    const salv = { ...(m.salvadanai || {}) };
    if (versione < 2) {
      if (m.salvPapa != null) salv.papa = m.salvPapa;
      if (m.salvDiana != null) salv.diana = m.salvDiana;
    }
    const utileVecchio = versione < 3 ? m.utile : undefined;
    const nm = { extra: num(m.extra) };
    if (m.entrate != null) nm.entrate = m.entrate; else if (utileVecchio != null) nm.entrate = utileVecchio;
    if (m.spese != null) nm.spese = m.spese; else if (utileVecchio != null) nm.spese = 0;
    if (m.valoreBuono != null) nm.valoreBuono = m.valoreBuono;
    if (m.rata != null) nm.rata = m.rata;
    if (Object.keys(salv).length) nm.salvadanai = salv;
    mesi[k] = nm;
  }
  if (versione < 3 && i.valoreBuono != null) {
    const k = chiave(inizioAnno, inizioMese);
    mesi[k] = mesi[k] || { extra: 0 };
    if (mesi[k].valoreBuono == null) mesi[k].valoreBuono = i.valoreBuono;
  }
  const c = o.saldoCorrente;
  const s = {
    versione: VERSIONE_DATI,
    impostazioni: {
      inizioAnno, inizioMese, fineAnno: num(i.fineAnno, inizioAnno),
      saldoIniziale: num(i.saldoIniziale), residuoIniziale: num(i.residuoIniziale),
      plafondCarte: num(i.plafondCarte), frasi: Array.isArray(i.frasi) ? i.frasi : clona(FRASI_PREDEFINITE),
    },
    saldoCorrente: {
      saldo: num(c.saldo), nonAddebitato: num(c.nonAddebitato), nonAccreditato: num(c.nonAccreditato),
      buoniResidui: num(c.buoniResidui), welfare: num(c.welfare), residuoCarte: num(c.residuoCarte),
    },
    voci, salvadanai, mesi,
  };
  if (o.ultimoMeseAperto) s.ultimoMeseAperto = String(o.ultimoMeseAperto);
  return s;
}
