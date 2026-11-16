// Test del motore: stessi casi di MotoreTest.kt dell'app Android.  Esegui: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';

const vicino = (a, b) => assert.ok(Math.abs(a - b) < 0.001, `atteso ${b}, ottenuto ${a}`);

const stato = () => ({
  versione: 5,
  impostazioni: { inizioAnno: 2026, inizioMese: 1, fineAnno: 2026, saldoIniziale: 1000, residuoIniziale: 1000, plafondCarte: 1000, frasi: M.FRASI_PREDEFINITE },
  saldoCorrente: { saldo: 2000, nonAddebitato: 200, nonAccreditato: 100, buoniResidui: 10, welfare: 50, residuoCarte: 700 },
  voci: [
    { id: 'a', nome: 'Assicurazione', importo: -300, tipo: 'PERIODICO', mesi: ['2026-02'] },
    { id: 'b', nome: 'Computer', importo: -1000, tipo: 'EXTRA', mesi: ['2026-03'], anno: 2026 },
  ],
  salvadanai: [{ id: 'x', nome: 'X', frasi: M.FRASI_SALVADANAIO_PREDEFINITE }, { id: 'y', nome: 'Y', frasi: M.FRASI_SALVADANAIO_PREDEFINITE }],
  mesi: {
    '2026-01': { extra: 0, entrate: 2000, spese: 1500, valoreBuono: 8, rata: 100 },
    '2026-04': { extra: 250, salvadanai: { x: 300, y: 200 } },
    '2026-06': { extra: 0, spese: 1700 },
  },
});
const riga = (s, m) => M.proiezione(s).find((r) => r.ym.m === m);

test('saldo contabile', () => {
  const r = M.proiezione(stato());
  assert.deepEqual(r.slice(0, 6).map((x) => x.saldoContabile), [1500, 1700, 1200, 1950, 2450, 2750]);
  vicino(r[0].utile, 500);
  vicino(r[5].utile, 300);
  vicino(r[2].extraVoci, -1000);
  vicino(r[1].periodico, -300);
});

test('finanziamenti e salvadanai', () => {
  const s = stato();
  vicino(riga(s, 1).residuoFinanziamenti, 900);
  vicino(riga(s, 12).residuoFinanziamenti, 0);
  const r = riga(s, 4);
  vicino(r.saldoNettoFinanziamenti, 1950 - 600);
  vicino(r.saldoNettoSalvadanai.x, 1950 - 300);
  vicino(r.saldoNettoSalvadanai.y, 1950 - 500);
  vicino(r.saldoAlNettoSalvadanai, 1950 - 500);
  vicino(r.saldoNettoTotale, 1950 - 600 - 500);
});

test('riepilogo usa il buono del mese e la chiusura azzera la disponibilità', () => {
  const s = stato();
  const r = M.riepilogo(s, { y: 2026, m: 2 });
  vicino(r.saldoBuoni, 80);
  vicino(r.saldoNetto, 2000 - 200 + 100 + 80 + 50);
  vicino(r.speseCarte, 300);
  vicino(r.target, 1700);
  vicino(r.disponibilita, 2030 - 300 - 1700);
  vicino(M.riepilogo(M.chiudiMese(s, { y: 2026, m: 2 }), { y: 2026, m: 2 }).disponibilita, 0);
});

test('applica solo al mese', () => {
  const s = M.impostaCampi(stato(), { y: 2026, m: 3 }, { entrate: 3000 }, 'SOLO_MESE');
  assert.deepEqual(M.proiezione(s).slice(0, 5).map((r) => r.entrate), [2000, 2000, 3000, 2000, 2000]);
});

test('applica fino alla prossima modifica', () => {
  const s = M.impostaCampi(stato(), { y: 2026, m: 3 }, { spese: 1000 }, 'FINO_PROSSIMA');
  assert.deepEqual(M.proiezione(s).slice(0, 7).map((r) => r.spese), [1500, 1500, 1000, 1000, 1000, 1700, 1700]);
});

test('applica a tutti i successivi', () => {
  const s = M.impostaCampi(stato(), { y: 2026, m: 3 }, { spese: 1000, valoreBuono: 9 }, 'TUTTI');
  const r = M.proiezione(s);
  assert.ok(r.slice(2).every((x) => x.spese === 1000 && x.valoreBuono === 9));
  vicino(r[1].spese, 1500);
  vicino(r[1].valoreBuono, 8);
});

test('voce straordinaria solo nel suo anno', () => {
  const v = stato().voci[0];
  const extra = M.cambiaTipo(v, 'EXTRA', 2026);
  assert.equal(M.toggle(extra, { y: 2027, m: 3 }, true), extra);
  assert.deepEqual(M.cambiaAnno(extra, 2027).mesi, ['2027-02']);
  assert.equal(M.cambiaTipo(extra, 'PERIODICO', 2026).anno, undefined);
});

test('elimina salvadanaio', () => {
  const s = M.eliminaSalvadanaio(stato(), 'x');
  vicino(riga(s, 4).saldoNettoTotale, 1950 - 600 - 200);
});

test('apertura nello stesso mese non chiude', () => {
  const a = M.aperturaApp(stato(), { y: 2026, m: 2 });
  assert.equal(a.chiusura, null);
  assert.equal(a.stato.ultimoMeseAperto, '2026-02');
  assert.equal(M.aperturaApp(a.stato, { y: 2026, m: 2 }).stato, a.stato);
});

test('apertura in un mese nuovo chiude il mese precedente', () => {
  const aperto = { ...stato(), ultimoMeseAperto: '2026-02' };
  const atteso = M.riepilogo(aperto, { y: 2026, m: 2 }).disponibilita;
  const { stato: dopo, chiusura } = M.aperturaApp(aperto, { y: 2026, m: 4 });
  assert.deepEqual(chiusura.mese, { y: 2026, m: 2 });
  vicino(chiusura.importo, atteso);
  vicino(dopo.mesi['2026-02'].extra, atteso);
  assert.equal(dopo.mesi['2026-03'], undefined);
  assert.equal(dopo.ultimoMeseAperto, '2026-04');
  vicino(M.riepilogo(dopo, { y: 2026, m: 2 }).disponibilita, 0);
  assert.equal(M.aperturaApp(dopo, { y: 2026, m: 4 }).chiusura, null);
});

test('frasi motivazionali: dalla soglia fino alla successiva', () => {
  const f = [{ soglia: 0, testo: 'pari' }, { soglia: -500, testo: 'sotto' }, { soglia: 500, testo: 'sopra' }];
  assert.equal(M.frasePer(-2000, f), null); // sotto la soglia più bassa: nessuna frase
  assert.equal(M.frasePer(-500, f), 'sotto');
  assert.equal(M.frasePer(-1, f), 'sotto');
  assert.equal(M.frasePer(0, f), 'pari');
  assert.equal(M.frasePer(499, f), 'pari');
  assert.equal(M.frasePer(500, f), 'sopra');
  assert.equal(M.frasePer(800, f), 'sopra');
  assert.equal(M.frasePer(800, []), null);
  // un intervallo con frase vuota non mostra nulla e non estende la frase precedente
  const g = [{ soglia: 0, testo: 'pari' }, { soglia: 100, testo: '' }, { soglia: 500, testo: 'sopra' }];
  assert.equal(M.frasePer(50, g), 'pari');
  assert.equal(M.frasePer(200, g), null);
  assert.equal(M.frasePer(600, g), 'sopra');
});

test('avanzamento salvadanaio', () => {
  const s = stato();
  s.salvadanai[0].obiettivo = 1200;
  s.salvadanai[0].scadenza = '2026-10';
  const r = M.proiezione(s);
  const a = M.avanzamento(s, r, 'x', { y: 2026, m: 4 });
  vicino(a.saldo, 300);
  vicino(a.percentuale, 25);
  vicino(a.mancante, 900);
  assert.equal(a.mesiRimanenti, 6);
  vicino(a.quotaMensile, 150);
  assert.equal(a.frase, 'Buon inizio! Un quarto della strada è già fatto.');
  const tardi = M.avanzamento(s, r, 'x', { y: 2026, m: 11 });
  assert.equal(tardi.mesiRimanenti, 0);
  assert.equal(tardi.quotaMensile, null);
  assert.equal(M.avanzamento(stato(), r, 'y', { y: 2026, m: 4 }), null);
});

test('compilazione guidata crea lo stato', () => {
  const r = {
    inizio: { y: 2026, m: 11 }, anni: 3,
    saldoIniziale: 3000, residuo: 5000, rata: 200,
    entrate: 2200, spese: 1500, valoreBuono: 8,
    corrente: { saldo: 3100, nonAddebitato: 120, nonAccreditato: 0, buoniResidui: 12, welfare: 0, residuoCarte: 900 }, plafond: 1500,
    periodiche: [{ nome: 'Tredicesima', importo: 2000, entrata: true, mese: 12 }, { nome: 'Bollo auto', importo: 200, entrata: false, mese: 2 }, { nome: '', importo: 50, mese: 1 }],
    straordinarie: [{ nome: 'Lavatrice', importo: 450, entrata: false, mese: 3, anno: 2027 }],
    salvadanai: [{ nome: 'Emergenze', saldo: 1000, obiettivo: 4500, scadenzaMese: 12, scadenzaAnno: 2027 }, { nome: ' ' }],
  };
  const s = M.daCompilazione(r, { y: 2026, m: 11 });
  assert.equal(s.impostazioni.fineAnno, 2029);
  assert.deepEqual(s.voci.map((v) => [v.nome, v.importo, v.tipo]), [['Tredicesima', 2000, 'PERIODICO'], ['Bollo auto', -200, 'PERIODICO'], ['Lavatrice', -450, 'EXTRA']]);
  assert.deepEqual(s.voci[1].mesi, ['2027-02', '2028-02', '2029-02']);
  assert.deepEqual(s.voci[0].mesi, ['2026-12', '2027-12', '2028-12', '2029-12']);
  assert.equal(s.salvadanai.length, 1);
  assert.equal(s.salvadanai[0].scadenza, '2027-12');
  const righe = M.proiezione(s);
  vicino(righe[0].saldoContabile, 3000 + 700);
  vicino(righe[1].saldoContabile, 3700 + 700 + 2000);
  vicino(righe[0].residuoFinanziamenti, 4800);
  vicino(righe[0].saldoNettoTotale, 3700 - 4800 - 1000);
  vicino(M.riepilogo(s, { y: 2026, m: 11 }, righe).saldoBuoni, 96);
  assert.equal(s.ultimoMeseAperto, '2026-11');
  assert.equal(M.eVuoto(s), false);
  assert.equal(M.eVuoto(M.vuoto({ y: 2026, m: 11 })), true);
});

test('backup: andata e ritorno e migrazione dalla versione 1', () => {
  const s = M.daCompilazione({ inizio: { y: 2026, m: 1 }, anni: 2, entrate: 2000, spese: 1000, periodiche: [{ nome: 'A', importo: 5, mese: 3 }], salvadanai: [{ nome: 'B', saldo: 1 }] }, { y: 2026, m: 1 });
  assert.deepEqual(M.normalizza(JSON.parse(JSON.stringify(s))), s);
  const v1 = {
    impostazioni: { inizioAnno: 2026, inizioMese: 10, fineAnno: 2027, saldoIniziale: 100, residuoIniziale: 0, valoreBuono: 7, plafondCarte: 1600 },
    saldoCorrente: { saldo: 1, nonAddebitato: 0, nonAccreditato: 0, buoniResidui: 0, welfare: 0, residuoCarte: 0 },
    voci: [{ id: 'e', nome: 'Casa', importo: -5, tipo: 'EXTRA', mesi: [] }],
    mesi: { '2026-10': { utile: 550, extra: 0, salvPapa: 10 } },
  };
  const n = M.normalizza(v1);
  assert.deepEqual(n.mesi['2026-10'], { extra: 0, entrate: 550, spese: 0, valoreBuono: 7, salvadanai: { papa: 10 } });
  assert.equal(n.voci[0].anno, 2026);
  assert.deepEqual(n.salvadanai.map((x) => x.nome), ['Papà', 'Diana']);
  assert.throws(() => M.normalizza({ a: 1 }));
});
