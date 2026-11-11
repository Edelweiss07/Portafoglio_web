// Costruisce il foglio di calcolo con tutti i dati dell'app.
import * as M from './model.js';
import { creaXlsx } from './xlsx.js';

export const NOMI_MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const h = (v) => ({ v, s: 'h' });
const b = (v) => ({ v, s: 'b' });
const e = (v) => ({ v, s: 'e' });
const eb = (v) => ({ v, s: 'eb' });

export function fogliDati(s, oggi) {
  const righe = M.proiezione(s);
  const r = M.riepilogo(s, oggi, righe);
  const salv = s.salvadanai;

  // 1. Proiezione mese per mese (i valori calcolati sono in grassetto, come nell'app)
  const intest = ['Mese', 'Entrate nette', 'Spese fisse', 'Utile', 'Extra manuale', 'Extra voci straordinarie',
    'Periodico', 'Saldo contabile', 'Valore buono pasto', 'Rata finanziamenti', 'Residuo finanziamenti',
    ...salv.map((x) => `Salvadanaio ${x.nome}`), 'Totale salvadanai',
    'Saldo al netto dei salvadanai', 'Saldo al netto dei finanziamenti', 'Saldo netto totale'];
  const proiezione = [intest.map(h), ...righe.map((x) => [
    `${NOMI_MESI[x.ym.m - 1]} ${x.ym.y}`,
    e(x.entrate), e(x.spese), eb(x.utile), e(x.extraManuale), eb(x.extraVoci), eb(x.periodico),
    eb(x.saldoContabile), e(x.valoreBuono), e(x.rata), eb(x.residuoFinanziamenti),
    ...salv.map((sv) => e(x.salvadanai[sv.id] ?? 0)), eb(x.totaleSalvadanai),
    eb(x.saldoAlNettoSalvadanai), eb(x.saldoNettoFinanziamenti), eb(x.saldoNettoTotale),
  ])];

  // 2. Voci: una riga per voce e per anno, con i flag dei mesi come nel foglio originale
  const anni = [];
  for (let a = s.impostazioni.inizioAnno; a <= s.impostazioni.fineAnno; a++) anni.push(a);
  const voci = [['Voce', 'Tipo', 'Importo', 'Anno', ...NOMI_MESI, 'Totale anno'].map(h)];
  for (const tipo of ['PERIODICO', 'EXTRA']) {
    for (const v of s.voci.filter((x) => x.tipo === tipo)) {
      for (const a of anni) {
        if (tipo === 'EXTRA' && v.anno !== a) continue;
        const flag = NOMI_MESI.map((_, i) => (v.mesi.includes(M.chiave(a, i + 1)) ? 1 : 0));
        const n = flag.reduce((x, y) => x + y, 0);
        voci.push([v.nome, tipo === 'PERIODICO' ? 'Periodica' : 'Straordinaria', e(v.importo), a,
          ...flag.map((f) => (f ? 1 : '')), eb(v.importo * n)]);
      }
    }
  }

  // 3. Salvadanai e obiettivi
  const salvadanai = [['Salvadanaio', 'Saldo attuale', 'Obiettivo', 'Scadenza', 'Avanzamento', 'Mancano', 'Da mettere da parte al mese'].map(h),
    ...salv.map((sv) => {
      const a = M.avanzamento(s, righe, sv.id, oggi);
      const saldo = (righe.find((x) => M.stessoMese(x.ym, oggi)) ?? righe[righe.length - 1])?.salvadanai[sv.id] ?? 0;
      let scad = '';
      if (sv.scadenza) {
        const p = M.parseChiave(sv.scadenza);
        scad = `${NOMI_MESI[p.m - 1]} ${p.y}`;
      }
      return [sv.nome, eb(saldo), sv.obiettivo ? e(sv.obiettivo) : '', scad,
        a ? { v: a.percentuale / 100, s: 'p' } : '', a ? eb(a.mancante) : '', a?.quotaMensile != null ? eb(a.quotaMensile) : ''];
    })];

  // 4. Home: dati correnti e calcoli del mese corrente
  const c = s.saldoCorrente;
  const meseTxt = `${NOMI_MESI[oggi.m - 1]} ${oggi.y}`;
  const home = [
    [h(`Situazione di ${meseTxt}`), h('')],
    [b('Dati correnti (inseriti a mano)'), ''],
    ['Saldo corrente', e(c.saldo)], ['Non addebitato', e(c.nonAddebitato)], ['Non accreditato', e(c.nonAccreditato)],
    ['Buoni residui', c.buoniResidui], ['Welfare', e(c.welfare)], ['Residuo carte', e(c.residuoCarte)],
    ['', ''],
    [b('Calcoli'), ''],
    [b('Valore buono pasto del mese'), eb(r.valoreBuono)], [b('Saldo buoni'), eb(r.saldoBuoni)],
    [b('Saldo netto'), eb(r.saldoNetto)], [b('Disponibilità carte (plafond)'), e(s.impostazioni.plafondCarte)],
    [b('Spese carte attuali'), eb(r.speseCarte)], [b('Saldo disponibile'), eb(r.saldoDisponibile)],
    ['', ''],
    [b('Target del mese'), ''],
    [b('Target saldo'), r.target == null ? 'fuori periodo' : eb(r.target)],
    [b('Disponibilità'), r.disponibilita == null ? '' : eb(r.disponibilita)],
    [b('Frase'), M.frasePer(r.disponibilita, s.impostazioni.frasi) ?? ''],
  ];

  // 5. Impostazioni
  const imp = s.impostazioni;
  const impostazioni = [
    [h('Impostazione'), h('Valore')],
    ['Inizio proiezione', `${NOMI_MESI[imp.inizioMese - 1]} ${imp.inizioAnno}`],
    ['Ultimo anno', imp.fineAnno],
    ['Saldo contabile iniziale', e(imp.saldoIniziale)],
    ['Residuo finanziamenti iniziale', e(imp.residuoIniziale)],
    ['Disponibilità carte (plafond)', e(imp.plafondCarte)],
    ['', ''],
    [h('Frasi della Home: Disponibilità da (€)'), h('Frase')],
    ...[...imp.frasi].sort((x, y) => x.soglia - y.soglia).map((f) => [e(f.soglia), f.testo]),
  ];

  return [
    { nome: 'Home', righe: home, larghezze: [34, 60] },
    { nome: 'Proiezione', righe: proiezione, larghezze: [12, ...intest.slice(1).map(() => 15)], bloccaRighe: 1, bloccaColonne: 1 },
    { nome: 'Voci', righe: voci, larghezze: [26, 14, 12, 7, ...NOMI_MESI.map(() => 5), 13], bloccaRighe: 1, bloccaColonne: 1 },
    { nome: 'Salvadanai', righe: salvadanai, larghezze: [20, 14, 14, 12, 13, 14, 16], bloccaRighe: 1 },
    { nome: 'Impostazioni', righe: impostazioni, larghezze: [36, 80] },
  ];
}

export function esportaXlsx(s, oggi) {
  return creaXlsx(fogliDati(s, oggi));
}
