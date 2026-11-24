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
      saldoIniziale: 0, plafondCarte: 1600, frasi: clona(FRASI_PREDEFINITE),
    },
    saldoCorrente: { saldo: 0, nonAddebitato: 0, nonAccreditato: 0, buoniResidui: 0, welfare: 0, residuoCarte: 0 },
    voci: [],
    finanziamenti: [],
    salvadanai: [],
    mesi: {},
    ultimoMeseAperto: chiave(oggi.y, oggi.m),
  };
}

/** true se non c'è nessun dato inserito (primo avvio o dopo "Cancella tutti i dati"). */
export function eVuoto(s) {
  if (!s) return true;
  const c = s.saldoCorrente;
  return !s.voci.length && !s.salvadanai.length && !(s.finanziamenti || []).length && !Object.keys(s.mesi).length &&
    !s.impostazioni.saldoIniziale &&
    Object.values(c).every((v) => !v);
}

/**
 * Crea lo stato dalle risposte della compilazione guidata.
 * Gli importi delle voci sono positivi; "entrata" ne decide il segno.
 * Campi facoltativi (presenti quando la compilazione parte da dati esistenti, vedi aCompilazione):
 *  - voci e salvadanai: id (conservato), altriMesi (altri mesi oltre a "mese"), frasi, senzaScadenza;
 *  - finanziamenti: [{ id?, nome, residuo, rata }]; senza elenco valgono residuo e rata (uno solo);
 *  - frasi: frasi della Home;
 *  - mesiPrecedenti: valori inseriti mese per mese, conservati per i mesi successivi all'inizio.
 */
export function daCompilazione(r, oggi) {
  const inizio = r.inizio;
  const fineAnno = inizio.y + Math.max(1, Math.round(r.anni || 3));
  const s = vuoto(oggi);
  s.impostazioni = {
    ...s.impostazioni,
    inizioAnno: inizio.y, inizioMese: inizio.m, fineAnno,
    saldoIniziale: r.saldoIniziale || 0, plafondCarte: r.plafond || 0,
  };
  if (Array.isArray(r.frasi)) s.impostazioni.frasi = clona(r.frasi);
  s.saldoCorrente = {
    saldo: r.corrente?.saldo || 0, nonAddebitato: r.corrente?.nonAddebitato || 0,
    nonAccreditato: r.corrente?.nonAccreditato || 0, buoniResidui: r.corrente?.buoniResidui || 0,
    welfare: r.corrente?.welfare || 0, residuoCarte: r.corrente?.residuoCarte || 0,
  };
  // id: quelli esistenti restano, i nuovi non devono coincidere con nessuno di loro
  const elencoFin = Array.isArray(r.finanziamenti) ? r.finanziamenti
    : (r.residuo || r.rata ? [{ nome: 'Finanziamento', residuo: r.residuo || 0, rata: r.rata || 0 }] : []);
  const usati = new Set([...(r.periodiche || []), ...(r.straordinarie || []), ...(r.salvadanai || []), ...elencoFin]
    .map((x) => x.id).filter(Boolean));
  let n = 0;
  const nuovoId = (p) => {
    let id;
    do id = `${p}${n++}`; while (usati.has(id));
    usati.add(id);
    return id;
  };
  const mesiAnno = (v) => [...new Set([v.mese, ...(v.altriMesi || [])])]
    .filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  const segno = (v) => (v.entrata ? 1 : -1) * Math.abs(v.importo || 0);
  for (const v of r.periodiche || []) {
    if (!v.nome?.trim() || !v.importo) continue;
    const mesi = [];
    for (let y = inizio.y; y <= fineAnno; y++) {
      for (const m of mesiAnno(v)) if (indice({ y, m }) >= indice(inizio)) mesi.push(chiave(y, m));
    }
    s.voci.push({ id: v.id || nuovoId('p'), nome: v.nome.trim(), importo: segno(v), tipo: 'PERIODICO', mesi });
  }
  for (const v of r.straordinarie || []) {
    if (!v.nome?.trim() || !v.importo) continue;
    s.voci.push({
      id: v.id || nuovoId('e'), nome: v.nome.trim(), importo: segno(v), tipo: 'EXTRA',
      mesi: mesiAnno(v).map((m) => chiave(v.anno, m)), anno: v.anno,
    });
  }
  const primo = { extra: 0 };
  if (r.entrate) primo.entrate = r.entrate;
  if (r.spese) primo.spese = r.spese;
  if (r.valoreBuono) primo.valoreBuono = r.valoreBuono;
  for (const f of elencoFin) {
    if (!(f.residuo > 0) && !f.rata && !f.nome?.trim()) continue;
    s.finanziamenti.push({
      id: f.id || nuovoId('f'), nome: f.nome?.trim() || 'Finanziamento',
      residuo: Math.abs(f.residuo || 0), rata: Math.abs(f.rata || 0),
      ...(f.estinzione ? { estinzione: f.estinzione } : {}),
    });
  }
  const salv = {};
  (r.salvadanai || []).filter((x) => x.nome?.trim()).forEach((x) => {
    const id = x.id || nuovoId('s');
    const sv = { id, nome: x.nome.trim(), frasi: clona(Array.isArray(x.frasi) ? x.frasi : FRASI_SALVADANAIO_PREDEFINITE) };
    if (x.obiettivo > 0) sv.obiettivo = x.obiettivo;
    if (!x.senzaScadenza && x.scadenzaMese >= 1 && x.scadenzaMese <= 12 && x.scadenzaAnno >= 2000) {
      sv.scadenza = chiave(x.scadenzaAnno, x.scadenzaMese);
    }
    s.salvadanai.push(sv);
    salv[id] = x.saldo || 0;
  });
  if (Object.keys(salv).length) primo.salvadanai = salv;
  const k = chiave(inizio.y, inizio.m);
  // valori inseriti mese per mese: restano quelli dei mesi dopo l'inizio e l'Extra del primo mese
  if (r.mesiPrecedenti) {
    const ids = new Set(s.salvadanai.map((x) => x.id));
    const idsFin = new Set(s.finanziamenti.map((x) => x.id));
    for (const [km, m] of Object.entries(r.mesiPrecedenti)) {
      if (!/^\d{4}-\d{2}$/.test(km) || km < k) continue;
      if (km === k) {
        primo.extra = m.extra || 0;
        continue;
      }
      const copia = clona(m);
      if (copia.salvadanai) {
        copia.salvadanai = Object.fromEntries(Object.entries(copia.salvadanai).filter(([id]) => ids.has(id)));
        if (!Object.keys(copia.salvadanai).length) delete copia.salvadanai;
      }
      if (copia.rate) {
        copia.rate = Object.fromEntries(Object.entries(copia.rate).filter(([id]) => idsFin.has(id)));
        if (!Object.keys(copia.rate).length) delete copia.rate;
      }
      conMese(s, km, copia);
    }
  }
  conMese(s, k, primo);
  return s;
}

/**
 * Il contrario di daCompilazione: dalle impostazioni e dai dati attuali ricava le risposte
 * della compilazione guidata, per precompilarla. Voci e salvadanai mantengono id e dettagli,
 * così rifare la compilazione senza cambiare nulla restituisce gli stessi calcoli.
 */
export function aCompilazione(s, oggi) {
  const imp = s.impostazioni;
  const inizio = { y: imp.inizioAnno, m: imp.inizioMese };
  const primo = proiezione(s)[0];
  // mesi dell'anno in cui la voce è attiva, dal più frequente
  const mesiDellAnno = (v) => {
    const conta = new Map();
    for (const k of v.mesi) {
      const { m } = parseChiave(k);
      conta.set(m, (conta.get(m) || 0) + 1);
    }
    return [...conta.keys()].sort((a, b) => conta.get(b) - conta.get(a) || a - b);
  };
  const daVoce = (v) => {
    const [mese = inizio.m, ...altri] = mesiDellAnno(v);
    return {
      id: v.id, nome: v.nome, importo: Math.abs(v.importo), entrata: v.importo > 0,
      mese, altriMesi: altri.sort((a, b) => a - b), personale: true, nota: '',
    };
  };
  const periodiche = s.voci.filter((v) => v.tipo === 'PERIODICO')
    .map((v) => ({ ...daVoce(v), scelta: v.mesi.length > 0 && v.importo !== 0 }));
  const straordinarie = s.voci.filter((v) => v.tipo === 'EXTRA' && v.importo !== 0).map((v) => ({
    ...daVoce(v), anno: v.anno ?? (v.mesi[0] ? parseChiave(v.mesi[0]).y : inizio.y),
  }));
  const salvadanai = s.salvadanai.map((sv) => {
    const sc = sv.scadenza && /^\d{4}-\d{2}$/.test(sv.scadenza) ? parseChiave(sv.scadenza) : null;
    return {
      id: sv.id, nome: sv.nome, nota: '', scelta: true, personale: true,
      saldo: primo?.salvadanai[sv.id] ?? 0, obiettivo: sv.obiettivo || 0,
      scadenzaMese: sc?.m ?? 12, scadenzaAnno: sc?.y ?? oggi.y + 1, senzaScadenza: !sc,
      frasi: clona(sv.frasi || FRASI_SALVADANAIO_PREDEFINITE),
    };
  });
  const finanziamenti = (s.finanziamenti || []).map((f) => ({
    id: f.id, nome: f.nome, residuo: f.residuo, rata: primo?.finanziamenti[f.id]?.rataImpostata ?? f.rata,
    ...(f.estinzione ? { estinzione: f.estinzione } : {}),
  }));
  return {
    inizio, anni: Math.max(1, imp.fineAnno - imp.inizioAnno),
    saldoIniziale: imp.saldoIniziale, finanziamenti,
    entrate: primo?.entrate ?? 0, spese: primo?.spese ?? 0, valoreBuono: primo?.valoreBuono ?? 0,
    corrente: { ...s.saldoCorrente }, plafond: imp.plafondCarte,
    periodiche, straordinarie, salvadanai,
    frasi: clona(imp.frasi), mesiPrecedenti: clona(s.mesi),
  };
}

// ---------- Mesi inseriti a mano ----------

const CAMPI_TRASCINATI = ['entrate', 'spese', 'valoreBuono'];

export function meseVuoto(m) {
  if (!m) return true;
  return CAMPI_TRASCINATI.every((c) => m[c] == null) && !(m.extra) &&
    (!m.salvadanai || Object.keys(m.salvadanai).length === 0) &&
    (!m.rate || Object.keys(m.rate).length === 0);
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
 *  Residuo di ogni finanziamento = precedente − sua Rata (mai sotto zero)
 *  Residuo finanziamenti = somma dei residui; Rata finanziamenti = somma delle rate pagate
 *  Saldo netto totale = Saldo contabile − salvadanai − residuo finanziamenti
 * Le rate non toccano il Saldo contabile: sono già comprese nelle Spese fisse.
 * Finanziamento con estinzione ('AAAA-MM'): in quel mese, dopo la rata, si paga tutto il residuo
 * (tolto dal Saldo contabile); nei mesi dopo le rate che si sarebbero pagate restano sul conto
 * (sommate al Saldo contabile come "rate risparmiate").
 */
export function proiezione(s) {
  const imp = s.impostazioni;
  const inizio = { y: imp.inizioAnno, m: imp.inizioMese };
  const fine = { y: imp.fineAnno, m: 12 };
  const idSalv = s.salvadanai.map((x) => x.id);
  const fin = s.finanziamenti || [];
  const v = { entrate: 0, spese: 0, valoreBuono: 0 };
  const salv = {};
  const rate = Object.fromEntries(fin.map((f) => [f.id, f.rata || 0]));
  const residui = Object.fromEntries(fin.map((f) => [f.id, Math.max(0, f.residuo || 0)]));
  // residuo che ci sarebbe senza estinzione: serve a sapere quali rate si risparmiano
  const ombra = { ...residui };
  const estinto = {};
  const applica = (m) => {
    for (const c of CAMPI_TRASCINATI) if (m[c] != null) v[c] = m[c];
    if (m.salvadanai) for (const [id, x] of Object.entries(m.salvadanai)) salv[id] = x;
    if (m.rate) for (const [id, x] of Object.entries(m.rate)) if (id in rate) rate[id] = x;
  };
  // valori "a trascinamento" impostati prima dell'inizio
  Object.keys(s.mesi).filter((k) => indice(parseChiave(k)) < indice(inizio)).sort()
    .forEach((k) => applica(s.mesi[k]));

  const righe = [];
  let saldo = imp.saldoIniziale;
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
    const finanziamenti = {};
    let rata = 0;
    let residuo = 0;
    let estinzione = 0;
    let rateRisparmiate = 0;
    for (const f of fin) {
      const rataOmbra = Math.min(Math.max(0, rate[f.id]), ombra[f.id]);
      ombra[f.id] -= rataOmbra;
      let pagata = 0;
      let saldato = 0;
      if (estinto[f.id]) rateRisparmiate += rataOmbra;
      else {
        pagata = rataOmbra;
        residui[f.id] -= pagata;
        if (f.estinzione === k && residui[f.id] > 0) {
          saldato = residui[f.id];
          residui[f.id] = 0;
          estinzione += saldato;
        }
        if (f.estinzione && f.estinzione <= k) estinto[f.id] = true;
      }
      finanziamenti[f.id] = { rataImpostata: rate[f.id], rata: pagata, residuo: residui[f.id], estinzione: saldato };
      rata += pagata;
      residuo += residui[f.id];
    }
    saldo += utile + extraManuale + extraVoci + periodico - estinzione + rateRisparmiate;
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
      rata, residuoFinanziamenti: residuo, finanziamenti, estinzione, rateRisparmiate,
      saldoNettoFinanziamenti: saldo - residuo,
      salvadanai, saldoNettoSalvadanai: nettiSalv, totaleSalvadanai: totSalv,
      saldoAlNettoSalvadanai: saldo - totSalv,
      saldoNettoTotale: saldo - residuo - totSalv,
    });
  }
  return righe;
}

/**
 * Mesi in cui conviene estinguere i finanziamenti senza mandare in negativo il Saldo contabile.
 * I finanziamenti si estinguono uno alla volta, dal residuo più basso al più alto.
 * Estinguere a fine mese t costa il residuo di quel mese; dal mese dopo la rata non si paga più
 * (è compresa nelle Spese fisse), quindi per ogni mese u ≥ t il saldo diventa
 * Saldo contabile(u) − residuo(u). Si sceglie il primo mese t (dal mese corrente in poi) in cui il
 * saldo, tolti tutti i finanziamenti già estinti, resta ≥ 0 fino alla fine della proiezione.
 * Restituisce [{ id, nome, indice, chiave, ym, importo }] (indice = posizione in righe, null se non
 * si riesce prima della fine naturale o della proiezione; fineNaturale = indice del mese in cui finisce).
 */
export function estinzioni(s, righe, oggi) {
  // i punti si calcolano sempre sulla proiezione senza estinzioni attive
  if ((s.finanziamenti || []).some((f) => f.estinzione)) {
    s = senzaEstinzioni(s);
    righe = proiezione(s);
  }
  const fin = s.finanziamenti || [];
  if (!fin.length || !righe.length) return [];
  let da = righe.findIndex((r) => stessoMese(r.ym, oggi));
  if (da < 0) da = indice(oggi) < indice(righe[0].ym) ? 0 : righe.length;
  if (da >= righe.length) return [];
  const scenario = righe.map((r) => r.saldoContabile);
  const residuoDa = (f) => righe[da].finanziamenti[f.id]?.residuo ?? 0;
  const ordinati = fin.filter((f) => residuoDa(f) > 0).sort((a, b) => residuoDa(a) - residuoDa(b));
  const esito = [];
  for (const f of ordinati) {
    const res = righe.map((r) => r.finanziamenti[f.id]?.residuo ?? 0);
    const fineNaturale = res.findIndex((x, i) => i >= da && x <= 0);
    // minimo da qui alla fine di (scenario − residuo)
    const minSuffisso = new Array(righe.length + 1).fill(Infinity);
    for (let u = righe.length - 1; u >= 0; u--) minSuffisso[u] = Math.min(minSuffisso[u + 1], scenario[u] - res[u]);
    let t = -1;
    for (let i = da; i < righe.length; i++) {
      if (res[i] <= 0) break;
      if (minSuffisso[i] >= 0) { t = i; break; }
    }
    if (t < 0) {
      esito.push({ id: f.id, nome: f.nome, indice: null, fineNaturale: fineNaturale < 0 ? null : fineNaturale });
      continue;
    }
    for (let u = t; u < righe.length; u++) scenario[u] -= res[u];
    esito.push({
      id: f.id, nome: f.nome, indice: t, chiave: righe[t].chiave, ym: righe[t].ym, importo: res[t],
      fineNaturale: fineNaturale < 0 ? null : fineNaturale,
    });
    da = t;
  }
  return esito;
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

/**
 * Una soglia negativa è superata quando il valore è minore della soglia; una soglia positiva (o zero)
 * quando il valore la raggiunge o la supera. Fra le soglie superate vale la più lontana da zero:
 * la più bassa fra le negative, la più alta fra le positive.
 * Se nessuna soglia è superata, o la frase scelta è vuota, non si mostra nessuna frase.
 */
export function frasePer(valore, frasi) {
  if (valore == null || !isFinite(valore)) return null;
  let scelta = null;
  for (const f of frasi || []) {
    if (f.soglia < 0) {
      if (valore < f.soglia && (scelta == null || f.soglia < scelta.soglia)) scelta = f;
    } else if (valore >= f.soglia && (scelta == null || (scelta.soglia >= 0 && f.soglia >= scelta.soglia))) {
      scelta = f;
    }
  }
  const testo = scelta?.testo?.trim();
  return testo ? scelta.testo : null;
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

/**
 * Salva extra e rate del mese e poi i campi cambiati.
 * rate: { idFinanziamento: rata }; una rata si salva nel mese solo se diversa da quella ereditata.
 */
export function salvaMese(s, ym, extra, rate, cambi, applica) {
  const righe = proiezione(s);
  const i = righe.findIndex((r) => stessoMese(r.ym, ym));
  const n = clona(s);
  const k = chiave(ym.y, ym.m);
  const m = n.mesi[k] || { extra: 0 };
  m.extra = extra;
  for (const [id, rata] of Object.entries(rate || {})) {
    const f = (s.finanziamenti || []).find((x) => x.id === id);
    if (!f) continue;
    // rata del mese prima (o quella di base per il primo mese), senza contare la modifica di questo mese
    const ereditata = i > 0 ? righe[i - 1].finanziamenti[id].rataImpostata : f.rata;
    m.rate = m.rate || {};
    if (rata === ereditata) delete m.rate[id];
    else m.rate[id] = rata;
    if (!Object.keys(m.rate).length) delete m.rate;
  }
  conMese(n, k, m);
  return Object.keys(cambi).length ? impostaCampi(n, ym, cambi, applica) : n;
}

/**
 * Attiva o disattiva un mese di una voce.
 * Le voci periodiche si ripetono: se si passa fineAnno, il cambio vale per l'anno ym.y
 * e per tutti gli anni successivi fino a fineAnno (gli anni precedenti restano com'erano).
 */
export function toggle(voce, ym, on, fineAnno) {
  if (voce.tipo === 'EXTRA' && voce.anno != null && voce.anno !== ym.y) return voce;
  const set = new Set(voce.mesi);
  const ultimo = voce.tipo === 'PERIODICO' && fineAnno > ym.y ? fineAnno : ym.y;
  for (let y = ym.y; y <= ultimo; y++) {
    const k = chiave(y, ym.m);
    if (on) set.add(k); else set.delete(k);
  }
  return { ...voce, mesi: [...set].sort() };
}

/** Attiva (o disattiva) tutti i 12 mesi dell'anno; per le periodiche anche negli anni successivi fino a fineAnno. */
export function tuttiIMesi(voce, anno, on, fineAnno) {
  let v = voce;
  for (let m = 1; m <= 12; m++) v = toggle(v, { y: anno, m }, on, fineAnno);
  return v;
}

/**
 * Cambia l'ultimo anno del periodo. Se il periodo si allunga, le voci periodiche
 * ripetono negli anni aggiunti i mesi attivi nel vecchio ultimo anno.
 */
export function cambiaFineAnno(s, nuovoFine) {
  const vecchio = s.impostazioni.fineAnno;
  const n = clona(s);
  n.impostazioni.fineAnno = nuovoFine;
  if (nuovoFine > vecchio) {
    n.voci = n.voci.map((v) => {
      if (v.tipo !== 'PERIODICO') return v;
      const schema = v.mesi.filter((k) => k.startsWith(prefisso(vecchio))).map((k) => k.slice(5));
      const nuovi = [];
      for (let y = vecchio + 1; y <= nuovoFine; y++) schema.forEach((mm) => nuovi.push(prefisso(y) + mm));
      return { ...v, mesi: [...new Set([...v.mesi, ...nuovi])].sort() };
    });
  }
  return n;
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

/**
 * Riordina le voci: ids è il nuovo ordine di un gruppo di voci (quelle visibili in una pagina).
 * Le voci del gruppo occupano gli stessi posti di prima nell'elenco completo, nel nuovo ordine;
 * le altre non si spostano.
 */
export function riordinaVoci(s, ids) {
  const gruppo = new Set(ids);
  const perId = new Map(s.voci.map((v) => [v.id, v]));
  const coda = ids.filter((id) => perId.has(id));
  if (coda.length !== gruppo.size) return s;
  let j = 0;
  return { ...s, voci: s.voci.map((v) => (gruppo.has(v.id) ? perId.get(coda[j++]) : v)) };
}

/** Stato con tutte le estinzioni disattivate. */
export function senzaEstinzioni(s) {
  return { ...s, finanziamenti: (s.finanziamenti || []).map(({ estinzione: _x, ...f }) => f) };
}

/** Attiva (chiave 'AAAA-MM') o disattiva (null) l'estinzione di un finanziamento. */
export function impostaEstinzione(s, id, k) {
  return {
    ...s,
    finanziamenti: (s.finanziamenti || []).map((f) => {
      if (f.id !== id) return f;
      const { estinzione: _x, ...resto } = f;
      return k ? { ...resto, estinzione: k } : resto;
    }),
  };
}

export function salvaFinanziamento(s, f) {
  const n = clona(s);
  n.finanziamenti = n.finanziamenti || [];
  const i = n.finanziamenti.findIndex((x) => x.id === f.id);
  if (i >= 0) n.finanziamenti[i] = f; else n.finanziamenti.push(f);
  return n;
}

export function eliminaFinanziamento(s, id) {
  const n = clona(s);
  n.finanziamenti = (n.finanziamenti || []).filter((x) => x.id !== id);
  for (const k of Object.keys(n.mesi)) {
    const m = n.mesi[k];
    if (m.rate) {
      delete m.rate[id];
      if (!Object.keys(m.rate).length) delete m.rate;
    }
    conMese(n, k, m);
  }
  return n;
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
  // finanziamenti: elenco (web) oppure residuo iniziale + rata mese per mese (app Android / versioni precedenti)
  const conElenco = Array.isArray(o.finanziamenti);
  const finanziamenti = conElenco
    ? o.finanziamenti.map((f) => {
      const x = { id: String(f.id), nome: String(f.nome ?? ''), residuo: num(f.residuo), rata: num(f.rata) };
      if (typeof f.estinzione === 'string' && /^\d{4}-\d{2}$/.test(f.estinzione)) x.estinzione = f.estinzione;
      return x;
    })
    : [];
  const rateVecchie = [];
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
    if (!conElenco && m.rata != null) rateVecchie.push([k, num(m.rata)]);
    if (conElenco && m.rate && typeof m.rate === 'object') {
      const r = Object.fromEntries(Object.entries(m.rate).filter(([, x]) => typeof x === 'number' && isFinite(x)));
      if (Object.keys(r).length) nm.rate = r;
    }
    if (Object.keys(salv).length) nm.salvadanai = salv;
    mesi[k] = nm;
  }
  if (!conElenco && (num(i.residuoIniziale) > 0 || rateVecchie.some(([, x]) => x))) {
    const kInizio = chiave(inizioAnno, inizioMese);
    rateVecchie.sort(([a], [b]) => (a < b ? -1 : 1));
    const f = { id: 'f1', nome: 'Finanziamento', residuo: num(i.residuoIniziale), rata: 0 };
    for (const [k, x] of rateVecchie) {
      if (k <= kInizio) f.rata = x;
      else mesi[k].rate = { f1: x };
    }
    finanziamenti.push(f);
  }
  for (const k of Object.keys(mesi)) if (meseVuoto(mesi[k])) delete mesi[k];
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
      saldoIniziale: num(i.saldoIniziale),
      plafondCarte: num(i.plafondCarte), frasi: Array.isArray(i.frasi) ? i.frasi : clona(FRASI_PREDEFINITE),
    },
    saldoCorrente: {
      saldo: num(c.saldo), nonAddebitato: num(c.nonAddebitato), nonAccreditato: num(c.nonAccreditato),
      buoniResidui: num(c.buoniResidui), welfare: num(c.welfare), residuoCarte: num(c.residuoCarte),
    },
    voci, finanziamenti, salvadanai, mesi,
  };
  if (o.ultimoMeseAperto) s.ultimoMeseAperto = String(o.ultimoMeseAperto);
  return s;
}

/**
 * Stato da scrivere nel file di backup. Oltre all'elenco dei finanziamenti contiene anche i campi
 * dell'app Android (residuo iniziale totale e rata totale mese per mese), così l'app Android calcola
 * lo stesso residuo. Rileggendo il file qui vale l'elenco e quei campi vengono ignorati.
 */
export function perBackup(s) {
  const n = clona(s);
  const righe = proiezione(s);
  n.impostazioni.residuoIniziale = (s.finanziamenti || []).reduce((a, f) => a + Math.max(0, f.residuo || 0), 0);
  let prima = null;
  for (const r of righe) {
    const tot = r.rata + r.estinzione;
    if (tot !== prima) {
      n.mesi[r.chiave] = { extra: 0, ...n.mesi[r.chiave], rata: tot };
      prima = tot;
    }
  }
  return n;
}
