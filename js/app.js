// Portafoglio – web app. Stesse funzioni dell'app Android 1.5.1, più backup all'avvio ed export Excel.
import * as M from './model.js';
import { esportaXlsx } from './esporta.js';
import { INFO, RISCHI_BACKUP } from './info.js';
import { COLORI, graficoBarre, graficoLinee } from './grafici.js';
import {
  ICONE, NOMI_MESI, NOMI_MESI_LUNGHI, apriInfo, apriModale, avviso, campo, campoTesto, classeImporto,
  collegaEditorFrasi, conferma, editorFrasi, esc, euro, numero, parseNumero, riga, rigaValore, salvaFile,
  sezione, testoHtml,
} from './ui.js';

export const VERSIONE_APP = '1.0.1';
const CHIAVE_STATO = 'portafoglio.stato';
const CHIAVE_BACKUP = 'portafoglio.ultimoBackup';

// ---------- Stato ----------

const oggi = () => M.oggiYM();
const meseTxt = (ym) => `${NOMI_MESI_LUNGHI[ym.m - 1]} ${ym.y}`;

function carica() {
  let testo = null;
  try {
    testo = localStorage.getItem(CHIAVE_STATO);
    if (testo) return M.normalizza(JSON.parse(testo));
  } catch (e) {
    // dati illeggibili: li conservo a parte invece di perderli
    try { if (testo) localStorage.setItem(`${CHIAVE_STATO}.illeggibile.${Date.now()}`, testo); } catch (_) { /* spazio esaurito */ }
  }
  const o = oggi();
  return { ...M.esempio(o.y, o), ultimoMeseAperto: M.chiave(o.y, o.m) };
}

let stato = carica();
let righe = M.proiezione(stato);
const ui = {
  pagina: 'home',
  anno: { proiezione: null, voci: null, salvadanai: null },
  tipoVoci: 'PERIODICO',
  chiusura: null,
};

function salva() {
  try {
    localStorage.setItem(CHIAVE_STATO, JSON.stringify(stato));
  } catch (e) {
    avviso('Impossibile salvare: memoria del browser piena. Esporta un backup.');
  }
}

function aggiorna(nuovo, ridisegna = true) {
  stato = nuovo;
  righe = M.proiezione(stato);
  salva();
  if (ridisegna) render();
}

function controllaCambioMese() {
  const { stato: nuovo, chiusura } = M.aperturaApp(stato, oggi());
  if (nuovo !== stato) aggiorna(nuovo, false);
  if (chiusura) ui.chiusura = chiusura;
}

const anniProiezione = () => {
  const a = [];
  for (let y = stato.impostazioni.inizioAnno; y <= stato.impostazioni.fineAnno; y++) a.push(y);
  return a;
};

// ---------- Struttura ----------

const PAGINE = {
  home: { titolo: 'Portafoglio', nav: 'Home', icona: ICONE.home, info: 'home', disegna: paginaHome },
  proiezione: { titolo: 'Proiezione', nav: 'Proiezione', icona: ICONE.calendario, info: 'proiezione', disegna: paginaProiezione },
  voci: { titolo: 'Voci', nav: 'Voci', icona: ICONE.lista, info: 'voci', disegna: paginaVoci },
  salvadanai: { titolo: 'Salvadanai', nav: 'Salvadanai', icona: ICONE.salvadanaio, info: 'salvadanai', disegna: paginaSalvadanai },
  opzioni: { titolo: 'Opzioni', nav: 'Opzioni', icona: ICONE.opzioni, info: 'opzioni', disegna: paginaOpzioni },
};

const vista = document.getElementById('vista');

function render() {
  // conserva lo scorrimento della pagina e dell'anno visualizzato
  const scorrimenti = {};
  vista.querySelectorAll('.pagina-anno').forEach((p) => { scorrimenti[p.dataset.anno] = p.scrollTop; });
  const scrollVista = vista.scrollTop;

  const p = PAGINE[ui.pagina];
  document.getElementById('titolo').textContent = p.titolo;
  document.getElementById('info-pagina').dataset.info = p.info;
  document.querySelectorAll('.navbar button').forEach((b) => b.classList.toggle('attiva', b.dataset.pagina === ui.pagina));
  vista.className = '';
  vista.innerHTML = p.disegna();
  dopoRender[ui.pagina]?.();

  vista.querySelectorAll('.pagina-anno').forEach((pa) => {
    if (scorrimenti[pa.dataset.anno] != null) pa.scrollTop = scorrimenti[pa.dataset.anno];
  });
  vista.scrollTop = scrollVista;
}

function vaiA(pagina) {
  if (ui.pagina === pagina) return;
  ui.pagina = pagina;
  vista.scrollTop = 0;
  vista.innerHTML = '';
  render();
}

// ---------- Pager degli anni (swipe orizzontale) ----------

function pagerAnni(id, contenuto, sopra = '') {
  const anni = anniProiezione();
  if (!anni.length) return '<p class="vuoto">Nessun anno nella proiezione: controlla le Opzioni.</p>';
  if (!anni.includes(ui.anno[id])) ui.anno[id] = anni.includes(oggi().y) ? oggi().y : anni[0];
  vista.classList.add('con-pager');
  return `${sopra}<div class="schede-anni" role="tablist">${anni.map((a) =>
    `<button type="button" role="tab" data-vai-anno="${a}" class="${a === ui.anno[id] ? 'attiva' : ''}">${a}</button>`).join('')}</div>
    <div class="pager" data-pager="${id}">${anni.map((a) => `<div class="pagina-anno" data-anno="${a}">${contenuto(a)}</div>`).join('')}</div>`;
}

function collegaPager(id) {
  const pager = vista.querySelector(`[data-pager="${id}"]`);
  if (!pager) return;
  const anni = anniProiezione();
  const tabs = vista.querySelectorAll('[data-vai-anno]');
  const evidenziaTab = (anno) => {
    tabs.forEach((t) => {
      const on = Number(t.dataset.vaiAnno) === anno;
      t.classList.toggle('attiva', on);
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  };
  pager.scrollLeft = anni.indexOf(ui.anno[id]) * pager.clientWidth;
  let timer = null;
  pager.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const i = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
      const anno = anni[Math.max(0, Math.min(anni.length - 1, i))];
      if (anno !== ui.anno[id]) {
        ui.anno[id] = anno;
        evidenziaTab(anno);
      }
    }, 80);
  });
  tabs.forEach((t) => t.addEventListener('click', () => {
    const anno = Number(t.dataset.vaiAnno);
    ui.anno[id] = anno;
    evidenziaTab(anno);
    pager.scrollTo({ left: anni.indexOf(anno) * pager.clientWidth, behavior: 'smooth' });
  }));
  // dopo una rotazione dello schermo resta sull'anno giusto
  new ResizeObserver(() => { pager.scrollLeft = anni.indexOf(ui.anno[id]) * pager.clientWidth; }).observe(pager);
}

// ---------- HOME ----------

function avanzamentoHtml(sv, a, conNome = true) {
  let scad = '';
  if (sv.scadenza) {
    const p = M.parseChiave(sv.scadenza);
    scad = ` · entro ${NOMI_MESI[p.m - 1].toLowerCase()} ${p.y}`;
  }
  const pct = Math.max(0, Math.min(100, a.percentuale));
  let quota = '';
  if (a.mancante > 0 && a.quotaMensile != null) quota = `<p class="calc piccolo">Da mettere da parte: ${euro(a.quotaMensile)} al mese</p>`;
  else if (a.mancante > 0 && a.mesiRimanenti === 0) quota = '<p class="errore piccolo">Scadenza raggiunta: aggiorna l\'obiettivo o la scadenza.</p>';
  return `<div class="avanzamento">
    <div class="riga calcolata"><span>${conNome ? esc(sv.nome) : 'Obiettivo'}</span><span>${euro(a.saldo)} / ${euro(a.obiettivo)}</span></div>
    <div class="progresso" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
    <p class="calc piccolo">${Math.round(a.percentuale)}% raggiunto${a.mancante > 0 ? ` · mancano ${euro(a.mancante)}` : ''}${scad}</p>
    ${quota}${a.frase ? `<p class="frase-piccola">${esc(a.frase)}</p>` : ''}
  </div>`;
}

function homeTarget() {
  const r = M.riepilogo(stato, oggi(), righe);
  const frase = M.frasePer(r.disponibilita, stato.impostazioni.frasi);
  return `${rigaValore('Target saldo', r.target)}${rigaValore('Saldo disponibile', r.saldoDisponibile)}<hr>
    ${rigaValore('Disponibilità', r.disponibilita, { grande: true })}
    ${r.target == null ? '<p class="errore piccolo">Il mese corrente è fuori dal periodo della proiezione: controlla le Opzioni.</p>'
    : frase ? `<p class="frase">${esc(frase)}</p>` : ''}`;
}

function homeCalcoli() {
  const r = M.riepilogo(stato, oggi(), righe);
  const c = stato.saldoCorrente;
  return `${rigaValore(`Saldo buoni (${numero(c.buoniResidui) || 0} × ${euro(r.valoreBuono)})`, r.saldoBuoni)}
    ${rigaValore('Saldo netto', r.saldoNetto, { grande: true })}
    ${riga('Disponibilità carte (plafond)', stato.impostazioni.plafondCarte)}
    ${rigaValore('Spese carte attuali', r.speseCarte)}
    ${rigaValore('Saldo disponibile', r.saldoDisponibile, { grande: true })}
    ${r.target != null ? `<button type="button" class="btn btn-contorno pieno" data-azione="parametri" data-mese="${M.chiave(oggi().y, oggi().m)}">${ICONE.matita}Parametri del mese</button>` : ''}
    <p class="nota">I valori in grassetto sono calcolati automaticamente.</p>`;
}

function paginaHome() {
  const o = oggi();
  const c = stato.saldoCorrente;
  const ch = ui.chiusura;
  const avanz = stato.salvadanai.map((sv) => [sv, M.avanzamento(stato, righe, sv.id, o)]).filter(([, a]) => a);
  return `<div class="contenuto">
    <h2 class="mese-corrente">${meseTxt(o)}</h2>
    ${ch ? `<div class="banner"><strong>${meseTxt(ch.mese)} chiuso</strong>
      <p>La Disponibilità di fine mese (${euro(ch.importo)}) è stata riportata su Extra e la proiezione è stata ricalcolata. Ora aggiorna i dati correnti.</p>
      <div class="destra"><button type="button" class="btn btn-testo" data-azione="nascondi-chiusura">OK</button></div></div>` : ''}
    ${sezione('Target del mese', homeTarget(), { evidenziata: true, info: 'targetMese', id: 'home-target' })}
    ${avanz.length ? sezione('Obiettivi dei salvadanai', avanz.map(([sv, a]) => avanzamentoHtml(sv, a)).join('<hr>'), { info: 'salvadanaiHome' }) : ''}
    ${sezione('Dati correnti (aggiornare manualmente)', `
      ${campo('Saldo corrente', c.saldo, 'data-corrente="saldo"')}
      ${campo('Non addebitato', c.nonAddebitato, 'data-corrente="nonAddebitato"')}
      ${campo('Non accreditato', c.nonAccreditato, 'data-corrente="nonAccreditato"')}
      <div class="due-colonne">${campo('Buoni residui', c.buoniResidui, 'data-corrente="buoniResidui"')}${campo('Welfare', c.welfare, 'data-corrente="welfare"')}</div>
      ${campo('Residuo carte', c.residuoCarte, 'data-corrente="residuoCarte"', `Plafond carte: ${euro(stato.impostazioni.plafondCarte)}`)}`,
    { info: 'datiCorrenti' })}
    ${sezione('Calcoli', homeCalcoli(), { info: 'calcoli', id: 'home-calcoli' })}
    <p class="nota centro">A inizio mese, alla prima apertura dell'app, la Disponibilità del mese appena finito viene riportata automaticamente su Extra.</p>
  </div>`;
}

function collegaHome() {
  vista.querySelectorAll('[data-corrente]').forEach((inp) => inp.addEventListener('input', () => {
    const v = inp.value.trim() === '' ? 0 : parseNumero(inp.value);
    if (v == null) return;
    stato = { ...stato, saldoCorrente: { ...stato.saldoCorrente, [inp.dataset.corrente]: v } };
    salva();
    // aggiorna solo i valori calcolati, senza toccare il campo in cui si sta scrivendo
    vista.querySelector('#home-target .scheda-corpo').innerHTML = homeTarget();
    vista.querySelector('#home-calcoli .scheda-corpo').innerHTML = homeCalcoli();
  }));
}

// ---------- PROIEZIONE ----------

const piccola = (etichetta, v, calcolato = false) => riga(etichetta, v, calcolato);

function cardMese(r) {
  const attuale = M.stessoMese(r.ym, oggi());
  const salv = stato.salvadanai.map((sv) => {
    const v = r.salvadanai[sv.id] ?? 0;
    return v ? piccola(`Salvadanaio ${sv.nome}`, v) : '';
  }).join('');
  return `<section class="scheda mese${attuale ? ' attuale' : ''}">
    <div class="mese-testa"><h3>${meseTxt(r.ym)}${attuale ? ' <small>• corrente</small>' : ''}</h3>
      <strong class="${classeImporto(r.saldoContabile)}">${euro(r.saldoContabile)}</strong></div>
    ${piccola('Entrate nette', r.entrate)}${piccola('Spese fisse', -r.spese)}
    ${piccola('Utile (entrate − spese)', r.utile, true)}
    ${r.extraManuale ? piccola('Extra (manuale)', r.extraManuale) : ''}
    ${r.extraVoci ? piccola('Extra (voci straordinarie)', r.extraVoci, true) : ''}
    ${r.periodico ? piccola('Periodico', r.periodico, true) : ''}
    ${piccola('Valore buono pasto', r.valoreBuono)}<hr>
    ${salv}${stato.salvadanai.length ? piccola('Totale salvadanai', r.totaleSalvadanai, true) : ''}
    ${piccola('Rata finanziamenti', r.rata)}${piccola('Residuo finanziamenti', r.residuoFinanziamenti, true)}<hr>
    ${piccola('Saldo contabile', r.saldoContabile, true)}
    ${piccola('Saldo al netto dei salvadanai', r.saldoAlNettoSalvadanai, true)}
    ${piccola('Saldo al netto dei finanziamenti', r.saldoNettoFinanziamenti, true)}
    ${rigaValore('Saldo netto totale', r.saldoNettoTotale, { grande: true })}
    <button type="button" class="btn btn-contorno pieno" data-azione="parametri" data-mese="${r.chiave}">${ICONE.matita}Parametri del mese</button>
  </section>`;
}

function paginaProiezione() {
  return pagerAnni('proiezione', (anno) => {
    const delAnno = righe.filter((r) => r.ym.y === anno);
    const i0 = righe.findIndex((r) => r.ym.y === anno);
    const i1 = righe.length - 1 - [...righe].reverse().findIndex((r) => r.ym.y === anno);
    const mesi = NOMI_MESI.map((_, i) => delAnno.find((r) => r.ym.m === i + 1));
    const ultimo = delAnno[delAnno.length - 1];
    return `<div class="contenuto">
      ${graficoLinee('Andamento', [
        { nome: 'Saldo contabile', colore: COLORI.contabile, valori: righe.map((r) => r.saldoContabile) },
        { nome: 'Saldo netto totale', colore: COLORI.netto, valori: righe.map((r) => r.saldoNettoTotale) },
      ], [i0, i1], `Tutto il periodo, ${anno} evidenziato`)}
      ${graficoBarre('Extra di fine mese', NOMI_MESI.map((m) => m[0]), [
        { nome: 'Disponibilità riportate / extra manuali', colore: COLORI.delta, valori: mesi.map((r) => r?.extraManuale ?? 0) },
        { nome: 'Voci straordinarie', colore: COLORI.straordinarie, valori: mesi.map((r) => r?.extraVoci ?? 0) },
      ], `Totale anno: ${euro(delAnno.reduce((a, r) => a + r.extra, 0))}`)}
      ${ultimo ? sezione(`Fine ${anno}`, `${rigaValore('Saldo contabile', ultimo.saldoContabile, { grande: true })}
        ${rigaValore('Saldo al netto dei salvadanai', ultimo.saldoAlNettoSalvadanai)}
        ${rigaValore('Saldo al netto dei finanziamenti', ultimo.saldoNettoFinanziamenti)}
        ${rigaValore('Saldo netto totale', ultimo.saldoNettoTotale, { grande: true })}`, { info: 'proiezione' }) : ''}
      ${delAnno.map(cardMese).join('')}
    </div>`;
  });
}

/** Finestra "Parametri del mese". */
function dialogoMese(k) {
  const ym = M.parseChiave(k);
  const r = righe.find((x) => x.chiave === k);
  if (!r) return;
  const input = stato.mesi[k] || {};
  const ultimoMese = righe[righe.length - 1].chiave === k;
  const { el, chiudi } = apriModale({
    titolo: `Parametri del mese – ${meseTxt(ym)}`,
    info: 'proiezione',
    corpo: `<p class="nota">Entrate, Spese, Buono e Rata valgono anche per i mesi seguenti.</p>
      ${campo('Entrate nette', r.entrate, 'data-m="entrate"')}
      ${campo('Spese fisse', r.spese, 'data-m="spese"')}
      <div id="utile-live">${rigaValore('Utile = Entrate nette − Spese fisse', r.utile, { grande: true })}</div>
      ${campo('Valore buono pasto', r.valoreBuono, 'data-m="valoreBuono"')}
      ${campo('Extra (manuale)', input.extra || 0, 'data-m="extra"', r.extraVoci ? `Più ${euro(r.extraVoci)} da voci straordinarie` : 'Solo per questo mese')}
      ${campo('Rata finanziamenti', r.rata, 'data-m="rata"', 'Vale anche per i mesi seguenti')}
      <p class="nota">I salvadanai si modificano nella scheda Salvadanai.</p>`,
    azioni: [
      { testo: 'Annulla' },
      { testo: 'Salva', tipo: 'primario', onClick: () => salvaDialogo() },
    ],
  });
  const leggi = (c) => {
    const t = el.querySelector(`[data-m="${c}"]`).value;
    return t.trim() === '' ? 0 : parseNumero(t);
  };
  el.addEventListener('input', () => {
    const e = leggi('entrate'); const s = leggi('spese');
    if (e != null && s != null) el.querySelector('#utile-live').innerHTML = rigaValore('Utile = Entrate nette − Spese fisse', e - s, { grande: true });
  });
  function salvaDialogo() {
    const v = Object.fromEntries(['entrate', 'spese', 'valoreBuono', 'extra', 'rata'].map((c) => [c, leggi(c)]));
    if (Object.values(v).some((x) => x == null)) { avviso('Controlla i numeri inseriti.'); return; }
    const cambi = {};
    for (const c of ['entrate', 'spese', 'valoreBuono']) if (v[c] !== r[c]) cambi[c] = v[c];
    const applica = (modo) => { aggiorna(M.salvaMese(stato, ym, v.extra, v.rata, cambi, modo)); chiudi(); };
    if (!Object.keys(cambi).length || ultimoMese) { applica('FINO_PROSSIMA'); return; }
    const nomi = { entrate: 'Entrate nette', spese: 'Spese fisse', valoreBuono: 'Valore buono pasto' };
    const scelta = (modo, titolo, testo) => `<button type="button" class="scelta" data-modo="${modo}"><strong>${titolo}</strong><span>${testo}</span></button>`;
    const d = apriModale({
      titolo: 'Applicare ai mesi successivi?',
      info: 'meseApplica',
      corpo: `<p>Hai modificato ${Object.keys(cambi).map((c) => nomi[c]).join(', ')} di ${meseTxt(ym)}.</p>
        ${scelta('SOLO_MESE', 'Solo a questo mese', 'I mesi seguenti mantengono i valori che avevano.')}
        ${scelta('FINO_PROSSIMA', 'Ai mesi successivi, fino alla prossima modifica', 'Si ferma al primo mese in cui il valore era già stato cambiato.')}
        ${scelta('TUTTI', 'A tutti i mesi successivi', 'Sovrascrive anche le modifiche già previste nei mesi futuri.')}`,
      azioni: [{ testo: 'Indietro' }],
    });
    d.el.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { d.chiudi(); applica(b.dataset.modo); }));
  }
}

// ---------- VOCI ----------

function grigliaMesi(voce, anno, attr) {
  return `<div class="griglia-mesi">${NOMI_MESI.map((n, i) => {
    const on = voce.mesi.includes(M.chiave(anno, i + 1));
    return `<button type="button" class="${on ? 'on' : ''}" ${attr}="${i + 1}" aria-pressed="${on}" aria-label="${NOMI_MESI_LUNGHI[i]} ${anno}">${n[0]}</button>`;
  }).join('')}</div>`;
}

const compatto = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(v)));

function paginaVoci() {
  const tipo = ui.tipoVoci;
  const sopra = `<div class="segmenti" role="tablist">
    <button type="button" data-tipo-voci="PERIODICO" class="${tipo === 'PERIODICO' ? 'attiva' : ''}">Periodiche</button>
    <button type="button" data-tipo-voci="EXTRA" class="${tipo === 'EXTRA' ? 'attiva' : ''}">Straordinarie</button></div>`;
  return pagerAnni('voci', (anno) => {
    const voci = stato.voci.filter((v) => v.tipo === tipo && (tipo === 'PERIODICO' || v.anno === anno));
    const totali = NOMI_MESI.map((_, i) => {
      const r = righe.find((x) => x.ym.y === anno && x.ym.m === i + 1);
      return r ? (tipo === 'PERIODICO' ? r.periodico : r.extraVoci) : null;
    });
    return `<div class="contenuto con-fab">
      <section class="scheda"><div class="scheda-titolo"><h3>${tipo === 'PERIODICO' ? 'Totale periodico' : 'Totale straordinarie'} ${anno}</h3></div>
        <div class="totali-mesi">${totali.map((t, i) => `<div><span>${NOMI_MESI[i]}</span><strong class="${t != null ? classeImporto(t) : 'spento'}">${t == null ? '·' : compatto(t)}</strong></div>`).join('')}</div></section>
      <p class="nota">${tipo === 'EXTRA'
        ? `Spese o entrate una tantum del ${anno}: non si ripetono negli altri anni. Tocca un mese per inserirle nella proiezione.`
        : 'Valgono per tutti gli anni; i mesi si attivano anno per anno. Scorri per cambiare anno.'}</p>
      ${voci.length ? '' : '<p class="vuoto">Nessuna voce in questo anno.</p>'}
      ${voci.map((v) => `<section class="scheda voce">
        <button type="button" class="voce-testa" data-modifica-voce="${esc(v.id)}"><span>${esc(v.nome || '(senza nome)')}</span>
          <span class="${classeImporto(v.importo)}">${euro(v.importo)}</span></button>
        <div data-voce="${esc(v.id)}" data-anno-voce="${anno}">${grigliaMesi(v, anno, 'data-toggle')}</div>
      </section>`).join('')}
    </div>`;
  }, sopra) + `<button type="button" class="fab" data-azione="nuova-voce">${ICONE.piu}Nuova voce</button>`;
}

function collegaVoci() {
  collegaPager('voci');
  vista.querySelectorAll('[data-tipo-voci]').forEach((b) => b.addEventListener('click', () => {
    ui.tipoVoci = b.dataset.tipoVoci;
    render();
  }));
}

function dialogoVoce(voce, annoPagina, nuova) {
  const anni = anniProiezione();
  let lavoro = JSON.parse(JSON.stringify(voce));
  let nome = voce.nome;
  let importo = voce.importo;
  const annoVisto = () => (lavoro.tipo === 'EXTRA' ? lavoro.anno ?? annoPagina : annoPagina);
  const { el, chiudi } = apriModale({
    titolo: nuova ? 'Nuova voce' : 'Modifica voce',
    info: 'voci',
    corpo: '<div id="corpo-voce"></div>',
    azioni: [
      { testo: 'Annulla' },
      {
        testo: 'Salva', tipo: 'primario', onClick: () => {
          if (!nome.trim()) { avviso('Inserisci un nome.'); return; }
          aggiorna(M.salvaVoce(stato, { ...lavoro, nome: nome.trim(), importo }));
          chiudi();
        },
      },
    ],
  });
  const disegna = () => {
    const anno = annoVisto();
    el.querySelector('#corpo-voce').innerHTML = `
      ${campoTesto('Nome', nome, 'data-v="nome"')}
      ${campo('Importo', importo, 'data-v="importo"', 'Negativo = uscita, positivo = entrata')}
      <p class="etichetta">Tipo</p>
      <div class="chips"><button type="button" data-tipo="PERIODICO" class="${lavoro.tipo === 'PERIODICO' ? 'on' : ''}">Periodica</button>
        <button type="button" data-tipo="EXTRA" class="${lavoro.tipo === 'EXTRA' ? 'on' : ''}">Straordinaria</button></div>
      ${lavoro.tipo !== voce.tipo && !nuova ? `<p class="avvertenza">${lavoro.tipo === 'EXTRA'
        ? `Diventerà una voce del solo ${anno}: i mesi attivi negli altri anni verranno tolti.`
        : 'Diventerà una voce valida per tutti gli anni.'}</p>` : ''}
      ${lavoro.tipo === 'EXTRA' ? `<div class="selettore-anno"><span class="etichetta">Anno</span>
          <button type="button" class="icona-btn" data-anno-voce-sposta="-1" ${anno <= anni[0] ? 'disabled' : ''} aria-label="Anno precedente">${ICONE.sinistra}</button>
          <strong>${anno}</strong>
          <button type="button" class="icona-btn" data-anno-voce-sposta="1" ${anno >= anni[anni.length - 1] ? 'disabled' : ''} aria-label="Anno successivo">${ICONE.destra}</button></div>`
        : `<p class="etichetta">Mesi ${anno}</p>`}
      ${grigliaMesi(lavoro, anno, 'data-mese-voce')}
      ${lavoro.tipo === 'PERIODICO' ? `<button type="button" class="btn btn-testo" data-copia-anno>Copia mesi dal ${anno - 1}</button>` : ''}
      ${nuova ? '' : '<button type="button" class="btn btn-testo pericolo" data-elimina-voce>Elimina voce</button>'}`;
  };
  disegna();
  el.addEventListener('input', (ev) => {
    if (ev.target.dataset.v === 'nome') nome = ev.target.value;
    if (ev.target.dataset.v === 'importo') {
      const n = ev.target.value.trim() === '' ? 0 : parseNumero(ev.target.value);
      if (n != null) importo = n;
    }
  });
  el.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t || !el.querySelector('#corpo-voce').contains(t)) return;
    const anno = annoVisto();
    if (t.dataset.tipo) lavoro = M.cambiaTipo(lavoro, t.dataset.tipo, anno);
    else if (t.dataset.annoVoceSposta) lavoro = M.cambiaAnno(lavoro, anno + Number(t.dataset.annoVoceSposta));
    else if (t.dataset.meseVoce) lavoro = M.toggle(lavoro, { y: anno, m: Number(t.dataset.meseVoce) }, !t.classList.contains('on'));
    else if (t.hasAttribute('data-copia-anno')) lavoro = M.copiaAnnoPrecedente(lavoro, anno);
    else if (t.hasAttribute('data-elimina-voce')) {
      conferma({
        titolo: `Eliminare "${voce.nome}"?`, testo: 'La voce verrà tolta dalla proiezione.', ok: 'Elimina', pericolo: true,
        onOk: () => { aggiorna(M.eliminaVoce(stato, voce.id)); chiudi(); },
      });
      return;
    } else return;
    disegna();
  });
}

// ---------- SALVADANAI ----------

function paginaSalvadanai() {
  return pagerAnni('salvadanai', (anno) => {
    const delAnno = righe.filter((r) => r.ym.y === anno);
    const i0 = righe.findIndex((r) => r.ym.y === anno);
    const i1 = righe.length - 1 - [...righe].reverse().findIndex((r) => r.ym.y === anno);
    const ultimo = delAnno[delAnno.length - 1];
    if (!stato.salvadanai.length) {
      return `<div class="contenuto con-fab"><p class="vuoto">Nessun salvadanaio. Aggiungine uno (es. Vacanze, Emergenze): il suo saldo viene tolto dal Saldo netto totale.</p></div>`;
    }
    const serie = stato.salvadanai.map((sv, k) => ({ nome: sv.nome, colore: COLORI.palette[k % COLORI.palette.length], valori: righe.map((r) => r.salvadanai[sv.id] ?? 0) }));
    if (stato.salvadanai.length > 1) serie.push({ nome: 'Totale', colore: 'var(--testo)', valori: righe.map((r) => r.totaleSalvadanai) });
    return `<div class="contenuto con-fab">
      ${graficoLinee('Salvadanai', serie, [i0, i1], `Tutto il periodo, ${anno} evidenziato`)}
      ${stato.salvadanai.map((sv, k) => {
        const a = M.avanzamento(stato, righe, sv.id, oggi());
        const impostati = new Set(Object.entries(stato.mesi).filter(([, m]) => m.salvadanai && sv.id in m.salvadanai).map(([kk]) => kk));
        return `<section class="scheda salvadanaio">
          <div class="mese-testa"><h3><i class="pallino" style="background:${COLORI.palette[k % COLORI.palette.length]}"></i>${esc(sv.nome)}</h3>
            <strong>${ultimo ? euro(ultimo.salvadanai[sv.id] ?? 0) : ''}</strong>
            <button type="button" class="icona-btn" data-modifica-salv="${esc(sv.id)}" aria-label="Modifica nome, obiettivo e frasi">${ICONE.matita}</button></div>
          ${ultimo ? `<p class="calc piccolo">Saldo netto salvadanaio ${esc(sv.nome)} a fine ${anno}: ${euro(ultimo.saldoNettoSalvadanai[sv.id] ?? 0)}</p>` : ''}
          ${a ? avanzamentoHtml(sv, a, false) : '<p class="nota">Nessun obiettivo: tocca la matita per impostarne uno.</p>'}
          <div class="celle-mesi">${NOMI_MESI.map((n, i) => {
            const r = delAnno.find((x) => x.ym.m === i + 1);
            const kk = M.chiave(anno, i + 1);
            return `<button type="button" class="${impostati.has(kk) ? 'impostato' : ''}" ${r ? `data-valore-salv="${esc(sv.id)}" data-mese="${kk}"` : 'disabled'}>
              <span>${n}</span><span>${r ? euro(r.salvadanai[sv.id] ?? 0) : '—'}</span></button>`;
          }).join('')}</div>
        </section>`;
      }).join('')}
    </div>`;
  }) + `<button type="button" class="fab" data-azione="nuovo-salvadanaio">${ICONE.piu}Nuovo salvadanaio</button>`;
}

function dialogoSalvadanaio(sv, nuovo) {
  const scad = sv.scadenza ? M.parseChiave(sv.scadenza) : null;
  const dati = {
    nome: sv.nome, obiettivo: sv.obiettivo || 0,
    mese: scad?.m || 0, anno: scad?.y || 0,
    frasi: JSON.parse(JSON.stringify(sv.frasi || M.FRASI_SALVADANAIO_PREDEFINITE)),
  };
  const { el, chiudi } = apriModale({
    titolo: nuovo ? 'Nuovo salvadanaio' : 'Salvadanaio',
    info: 'obiettivoSalvadanaio',
    corpo: `${campoTesto('Nome', dati.nome, 'data-s="nome"')}
      <h4>Obiettivo</h4>
      ${campo('Importo da raggiungere (€)', dati.obiettivo, 'data-s="obiettivo"', '0 = nessun obiettivo')}
      <div class="due-colonne">${campo('Entro il mese (1-12)', dati.mese, 'data-s="mese"')}${campo('Anno', dati.anno, 'data-s="anno"')}</div>
      <p class="avvertenza" id="avviso-scadenza" hidden>Senza una scadenza valida non si può calcolare quanto mettere da parte ogni mese.</p>
      <h4>Frasi motivazionali</h4>
      <p class="nota">La soglia è la percentuale dell'obiettivo raggiunta.</p>
      <div id="frasi-salv">${editorFrasi(dati.frasi, 'Avanzamento da (%)')}</div>
      ${nuovo ? '' : '<button type="button" class="btn btn-testo pericolo" data-elimina-salv>Elimina salvadanaio</button>'}`,
    azioni: [
      { testo: 'Annulla' },
      {
        testo: 'Salva', tipo: 'primario', onClick: () => {
          if (!dati.nome.trim()) { avviso('Inserisci un nome.'); return; }
          const nuovoSv = { id: sv.id, nome: dati.nome.trim(), frasi: dati.frasi };
          if (dati.obiettivo > 0) nuovoSv.obiettivo = dati.obiettivo;
          if (scadenzaValida()) nuovoSv.scadenza = M.chiave(dati.anno, dati.mese);
          aggiorna(M.salvaSalvadanaio(stato, nuovoSv));
          chiudi();
        },
      },
    ],
  });
  const scadenzaValida = () => dati.mese >= 1 && dati.mese <= 12 && Number.isInteger(dati.mese) && dati.anno >= 2000 && dati.anno <= 2100;
  const aggiornaAvviso = () => { el.querySelector('#avviso-scadenza').hidden = !(dati.obiettivo > 0 && !scadenzaValida()); };
  aggiornaAvviso();
  el.addEventListener('input', (ev) => {
    const k = ev.target.dataset.s;
    if (!k) return;
    if (k === 'nome') dati.nome = ev.target.value;
    else {
      const n = ev.target.value.trim() === '' ? 0 : parseNumero(ev.target.value);
      if (n != null) dati[k] = n;
    }
    aggiornaAvviso();
  });
  const box = el.querySelector('#frasi-salv');
  collegaEditorFrasi(box, () => dati.frasi, (nuove, ridisegna) => {
    dati.frasi = nuove;
    if (ridisegna) box.innerHTML = editorFrasi(dati.frasi, 'Avanzamento da (%)');
  }, M.FRASI_SALVADANAIO_PREDEFINITE, 25);
  el.querySelector('[data-elimina-salv]')?.addEventListener('click', () => conferma({
    titolo: `Eliminare "${sv.nome}"?`, testo: 'Verranno cancellati anche tutti i suoi valori mensili.', ok: 'Elimina', pericolo: true,
    onOk: () => { aggiorna(M.eliminaSalvadanaio(stato, sv.id)); chiudi(); },
  }));
}

function dialogoValoreSalvadanaio(id, k) {
  const sv = stato.salvadanai.find((x) => x.id === id);
  const r = righe.find((x) => x.chiave === k);
  if (!sv || !r) return;
  const { el, chiudi } = apriModale({
    titolo: `${sv.nome} – ${meseTxt(r.ym)}`,
    corpo: campo('Saldo del salvadanaio', r.salvadanai[id] ?? 0, 'data-valore', 'Vale da questo mese in poi, finché non lo cambi'),
    azioni: [
      { testo: 'Annulla' },
      {
        testo: 'Salva', tipo: 'primario', onClick: () => {
          const t = el.querySelector('[data-valore]').value;
          const v = t.trim() === '' ? 0 : parseNumero(t);
          if (v == null) { avviso('Controlla il numero inserito.'); return; }
          aggiorna(M.impostaSalvadanaio(stato, id, r.ym, v));
          chiudi();
        },
      },
    ],
  });
  el.querySelector('input').focus();
}

// ---------- OPZIONI ----------

function ultimoBackupTxt() {
  const t = localStorage.getItem(CHIAVE_BACKUP);
  if (!t) return 'Non hai ancora esportato nessun backup da questo dispositivo.';
  const d = new Date(t);
  const giorni = Math.floor((Date.now() - d.getTime()) / 86400000);
  return `Ultimo backup esportato: ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}${giorni > 0 ? ` (${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} fa)` : ' (oggi)'}.`;
}

function paginaOpzioni() {
  const i = stato.impostazioni;
  return `<div class="contenuto">
    ${sezione('Periodo della proiezione', `<div class="due-colonne">${campo('Mese inizio', i.inizioMese, 'data-imp="inizioMese"')}${campo('Anno inizio', i.inizioAnno, 'data-imp="inizioAnno"')}</div>
      ${campo('Ultimo anno', i.fineAnno, 'data-imp="fineAnno"')}`, { info: 'periodo' })}
    ${sezione("Valori di partenza (fine del mese prima dell'inizio)", `${campo('Saldo contabile iniziale', i.saldoIniziale, 'data-imp="saldoIniziale"')}
      ${campo('Residuo finanziamenti iniziale', i.residuoIniziale, 'data-imp="residuoIniziale"')}`, { info: 'valoriPartenza' })}
    ${sezione('Parametri', campo('Disponibilità carte (plafond)', i.plafondCarte, 'data-imp="plafondCarte"'), { info: 'parametri' })}
    ${sezione('Frasi motivazionali della Home', `<p class="nota">Ogni frase compare quando la Disponibilità raggiunge la sua soglia e resta fino alla soglia successiva. Sotto la soglia più bassa non compare nessuna frase.</p>
      <div id="frasi-home">${editorFrasi(i.frasi, 'Disponibilità da (€)')}</div>`, { info: 'frasiHome' })}
    ${sezione('Backup ed esportazione', `<p class="nota">${esc(ultimoBackupTxt())}</p>
      <button type="button" class="btn btn-primario pieno" data-azione="esporta-backup">Esporta backup</button>
      <button type="button" class="btn btn-contorno pieno" data-azione="importa-backup">Importa backup</button>
      <button type="button" class="btn btn-contorno pieno" data-azione="esporta-excel">Esporta in Excel (.xlsx)</button>
      <button type="button" class="btn btn-testo pieno pericolo" data-azione="carica-esempio">Carica i dati di esempio</button>`, { info: 'backup' })}
    ${sezione('Reset', `<p class="nota">Cancella voci, salvadanai, valori mensili e dati correnti. La proiezione ripartirà da zero dal mese corrente.</p>
      <button type="button" class="btn btn-pericolo pieno" data-azione="cancella-tutto">Cancella tutti i dati</button>`, { info: 'reset' })}
    <p class="nota centro">Portafoglio – versione ${VERSIONE_APP} (web)</p>
  </div>`;
}

function collegaOpzioni() {
  vista.querySelectorAll('[data-imp]').forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.imp;
    const v = inp.value.trim() === '' ? 0 : parseNumero(inp.value);
    const i = stato.impostazioni;
    const ok = v != null && (
      (k === 'inizioMese' && Number.isInteger(v) && v >= 1 && v <= 12) ||
      (k === 'inizioAnno' && Number.isInteger(v) && v >= 2000 && v <= 2100 && v <= i.fineAnno) ||
      (k === 'fineAnno' && Number.isInteger(v) && v >= i.inizioAnno && v <= 2100) ||
      ['saldoIniziale', 'residuoIniziale', 'plafondCarte'].includes(k));
    if (!ok) {
      avviso('Valore non valido.');
      inp.value = numero(i[k]);
      return;
    }
    aggiorna({ ...stato, impostazioni: { ...i, [k]: v } });
  }));
  const box = vista.querySelector('#frasi-home');
  collegaEditorFrasi(box, () => stato.impostazioni.frasi, (nuove, ridisegna) => {
    aggiorna({ ...stato, impostazioni: { ...stato.impostazioni, frasi: nuove } }, false);
    if (ridisegna) box.innerHTML = editorFrasi(nuove, 'Disponibilità da (€)');
  }, M.FRASI_PREDEFINITE, 500);
}

const dopoRender = {
  home: collegaHome,
  proiezione: () => collegaPager('proiezione'),
  voci: collegaVoci,
  salvadanai: () => collegaPager('salvadanai'),
  opzioni: collegaOpzioni,
};

// ---------- Backup ed esportazione ----------

const dataFile = () => new Date().toISOString().slice(0, 10);

async function esportaBackup() {
  const ok = await salvaFile(JSON.stringify(stato, null, 2), `portafoglio-${dataFile()}.json`, 'application/json');
  if (ok) {
    localStorage.setItem(CHIAVE_BACKUP, new Date().toISOString());
    avviso('Backup esportato');
    if (ui.pagina === 'opzioni') render();
  }
  return ok;
}

async function esportaExcel() {
  await salvaFile(esportaXlsx(stato, oggi()), `portafoglio-${dataFile()}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function importaBackup() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json,text/plain';
  inp.addEventListener('change', async () => {
    const f = inp.files?.[0];
    if (!f) return;
    let nuovo;
    try {
      nuovo = M.normalizza(JSON.parse(await f.text()));
    } catch (e) {
      avviso('File non valido: scegli un backup del Portafoglio (.json).');
      return;
    }
    conferma({
      titolo: 'Importare il backup?',
      testo: `I dati attuali verranno sostituiti da quelli di "${f.name}".`,
      ok: 'Importa',
      onOk: () => {
        // importare un backup non chiude mesi passati
        aggiorna({ ...nuovo, ultimoMeseAperto: M.chiave(oggi().y, oggi().m) });
        avviso('Backup importato');
      },
    });
  });
  inp.click();
}

function chiediBackupAvvio() {
  const ultimo = localStorage.getItem(CHIAVE_BACKUP);
  apriModale({
    titolo: 'Vuoi fare un backup?',
    info: 'backup',
    classe: 'modale-info',
    corpo: `<div class="testo-info">${testoHtml(RISCHI_BACKUP)}</div><p class="nota"><strong>${esc(ultimoBackupTxt())}</strong></p>`,
    azioni: [
      { testo: 'Non ora' },
      { testo: 'Esporta backup', tipo: 'primario', onClick: async (chiudi) => { chiudi(); await esportaBackup(); } },
    ],
  });
  return ultimo;
}

// ---------- Eventi globali ----------

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  if (t.dataset.info) { apriInfo(t.dataset.info); return; }
  if (t.dataset.pagina) { vaiA(t.dataset.pagina); return; }
  if (!vista.contains(t)) return;
  if (t.dataset.toggle) {
    const box = t.closest('[data-voce]');
    const voce = stato.voci.find((v) => v.id === box.dataset.voce);
    const anno = Number(box.dataset.annoVoce);
    aggiorna(M.salvaVoce(stato, M.toggle(voce, { y: anno, m: Number(t.dataset.toggle) }, !t.classList.contains('on'))));
    return;
  }
  if (t.dataset.modificaVoce) {
    const voce = stato.voci.find((v) => v.id === t.dataset.modificaVoce);
    dialogoVoce(voce, ui.anno.voci, false);
    return;
  }
  if (t.dataset.modificaSalv) { dialogoSalvadanaio(stato.salvadanai.find((x) => x.id === t.dataset.modificaSalv), false); return; }
  if (t.dataset.valoreSalv) { dialogoValoreSalvadanaio(t.dataset.valoreSalv, t.dataset.mese); return; }
  switch (t.dataset.azione) {
    case 'parametri': dialogoMese(t.dataset.mese); break;
    case 'nascondi-chiusura': ui.chiusura = null; render(); break;
    case 'nuova-voce': {
      const id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const nuova = { id, nome: '', importo: 0, tipo: ui.tipoVoci, mesi: [] };
      if (ui.tipoVoci === 'EXTRA') nuova.anno = ui.anno.voci;
      dialogoVoce(nuova, ui.anno.voci, true);
      break;
    }
    case 'nuovo-salvadanaio':
      dialogoSalvadanaio({ id: `s${Date.now().toString(36)}`, nome: '', frasi: M.FRASI_SALVADANAIO_PREDEFINITE }, true);
      break;
    case 'esporta-backup': esportaBackup(); break;
    case 'importa-backup': importaBackup(); break;
    case 'esporta-excel': esportaExcel(); break;
    case 'carica-esempio':
      conferma({
        titolo: 'Caricare i dati di esempio?',
        testo: 'Tutti i dati attuali verranno sostituiti da dati generici di esempio. Se vuoi conservarli, esporta prima un backup.',
        ok: 'Carica', pericolo: true,
        onOk: () => { const o = oggi(); aggiorna({ ...M.esempio(o.y, o), ultimoMeseAperto: M.chiave(o.y, o.m) }); },
      });
      break;
    case 'cancella-tutto':
      conferma({
        titolo: 'Cancellare tutti i dati?',
        testo: "Tutti i dati dell'app verranno eliminati e non potranno essere recuperati. Se vuoi conservarli, esporta prima un backup.",
        ok: 'Cancella tutto', pericolo: true,
        onOk: () => { ui.chiusura = null; aggiorna(M.vuoto(oggi())); },
      });
      break;
    default:
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const prima = ui.chiusura;
  controllaCambioMese();
  if (ui.chiusura !== prima) render();
});

// ---------- Avvio ----------

function costruisciNavbar() {
  document.querySelector('.navbar').innerHTML = Object.entries(PAGINE).map(([k, p]) =>
    `<button type="button" data-pagina="${k}">${p.icona}<span>${p.nav}</span></button>`).join('');
}

costruisciNavbar();
controllaCambioMese();
render();
chiediBackupAvvio();
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const avevaController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  // nuova versione installata: ricarica una volta per usarla
  let ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avevaController || ricaricato) return;
    ricaricato = true;
    location.reload();
  });
}

window.__portafoglio = { get stato() { return stato; }, INFO };
