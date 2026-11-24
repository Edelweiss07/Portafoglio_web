// Compilazione guidata: domande passo passo per riempire Home, Voci e Salvadanai,
// con esempi e suggerimenti. Parte quando l'app non contiene dati; se invece ci sono già dati,
// le risposte sono precompilate con quelli (M.aCompilazione).
import * as M from './model.js';
import {
  ICONE, NOMI_MESI_LUNGHI, campo, campoTesto, conferma, esc, euro, parseNumero,
} from './ui.js';

const MODELLI_PERIODICHE = [
  { nome: 'Tredicesima', importo: 2000, mese: 12, entrata: true, nota: 'Di solito circa uno stipendio netto, a dicembre.' },
  { nome: 'Quattordicesima', importo: 1500, mese: 7, entrata: true, nota: 'Solo alcuni contratti, a giugno o luglio.' },
  { nome: 'Rimborso 730 / conguaglio', importo: 300, mese: 7, entrata: true, nota: 'Se negli anni scorsi hai avuto un rimborso in busta paga.' },
  { nome: 'Assicurazione auto (RCA)', importo: 450, mese: 3, entrata: false, nota: 'Guarda la scadenza sulla polizza.' },
  { nome: 'Bollo auto', importo: 200, mese: 2, entrata: false, nota: 'Il mese dipende dalla data di immatricolazione.' },
  { nome: 'Revisione e tagliando auto', importo: 300, mese: 9, entrata: false, nota: '' },
  { nome: 'TARI (rifiuti)', importo: 250, mese: 5, entrata: false, nota: 'Spesso in 2 rate: dopo puoi aggiungere il secondo mese in Impostazioni → Voci.' },
  { nome: 'IMU', importo: 300, mese: 6, entrata: false, nota: 'Di solito solo per seconde case; acconto a giugno, saldo a dicembre.' },
  { nome: 'Manutenzione caldaia', importo: 100, mese: 10, entrata: false, nota: '' },
  { nome: 'Abbonamenti annuali', importo: 300, mese: 9, entrata: false, nota: 'Palestra, streaming, software…' },
  { nome: 'Spese scolastiche', importo: 400, mese: 9, entrata: false, nota: 'Libri, iscrizioni, materiale.' },
  { nome: 'Vacanze estive', importo: 1500, mese: 8, entrata: false, nota: '' },
  { nome: 'Regali di Natale', importo: 400, mese: 12, entrata: false, nota: '' },
];

const MODELLI_SALVADANAI = [
  { nome: 'Fondo emergenze', nota: 'Per imprevisti: guasti, spese mediche, periodi senza entrate.' },
  { nome: 'Vacanze', nota: '' },
  { nome: 'Auto nuova', nota: '' },
  { nome: 'Casa', nota: 'Anticipo, lavori, arredamento.' },
  { nome: 'Figli / studio', nota: '' },
];

const VOCI_SPESA = [
  ['casa', 'Affitto o rata del mutuo'],
  ['bollette', 'Bollette (luce, gas, acqua, internet, telefono)'],
  ['spesa', 'Spesa alimentare e casa'],
  ['trasporti', 'Trasporti (carburante, mezzi pubblici)'],
  ['abbonamenti', 'Abbonamenti mensili (palestra, streaming…)'],
  ['altro', 'Altre spese regolari (figli, animali, svago…)'],
];

const nomeMese = (m) => NOMI_MESI_LUNGHI[m - 1].toLowerCase();
/** Nota per le voci precompilate attive in più mesi dell'anno. */
const notaAltriMesi = (v) => (v.altriMesi?.length
  ? `<p class="nota">Anche a ${v.altriMesi.map(nomeMese).join(', ')}. Questi mesi restano; puoi cambiarli dopo, in Impostazioni → Voci.</p>` : '');
const stessoNome = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const consiglio = (t) => `<div class="consiglio"><strong>Suggerimento</strong><p>${t}</p></div>`;
const esempio = (t) => `<div class="esempio"><strong>Esempio</strong><p>${t}</p></div>`;

function selectMese(attr, valore, etichetta = 'Mese') {
  return `<label class="campo"><span class="campo-etichetta">${etichetta}</span><select ${attr}>${NOMI_MESI_LUNGHI.map((n, i) =>
    `<option value="${i + 1}" ${i + 1 === valore ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
}
function selectAnno(attr, valore, anniProposti, etichetta = 'Anno') {
  const anni = anniProposti.includes(valore) ? anniProposti : [...anniProposti, valore].sort((a, b) => a - b);
  return `<label class="campo"><span class="campo-etichetta">${etichetta}</span><select ${attr}>${anni.map((a) =>
    `<option value="${a}" ${a === valore ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`;
}
const segmento = (attr, entrata) => `<div class="chips piccoli">
  <button type="button" ${attr}="false" class="${entrata ? '' : 'on'}">Uscita</button>
  <button type="button" ${attr}="true" class="${entrata ? 'on' : ''}">Entrata</button></div>`;

function leggiPercorso(o, p) { return p.split('.').reduce((x, k) => x?.[k], o); }
function scriviPercorso(o, p, v) {
  const parti = p.split('.');
  const ultimo = parti.pop();
  parti.reduce((x, k) => x[k], o)[ultimo] = v;
}

/**
 * Apre la compilazione guidata a tutto schermo.
 * opzioni: { oggi, iniziale, onFine(stato), onImporta(), onEsci() }
 * iniziale: risposte già date (da M.aCompilazione) per precompilare i passi; null se l'app è vuota.
 */
export function avviaGuidata({ oggi, iniziale = null, onFine, onImporta, onEsci }) {
  const precompilata = !!iniziale;
  const modelliPeriodiche = MODELLI_PERIODICHE
    .filter((m) => !iniziale?.periodiche.some((v) => stessoNome(v.nome, m.nome)))
    .map((m) => ({ ...m, scelta: false }));
  const modelliSalvadanai = MODELLI_SALVADANAI
    .filter((m) => !iniziale?.salvadanai.some((v) => stessoNome(v.nome, m.nome)))
    .map((m) => ({ ...m, scelta: false, saldo: 0, obiettivo: 0, scadenzaMese: 12, scadenzaAnno: oggi.y + 1 }));
  const w = {
    inizio: { ...oggi }, anni: 3,
    saldoIniziale: 0, finanziamenti: [],
    entrate: 0, spese: 0, valoreBuono: 0,
    corrente: { saldo: 0, nonAddebitato: 0, nonAccreditato: 0, buoniResidui: 0, welfare: 0, residuoCarte: 0 }, plafond: 0,
    straordinarie: [],
    ...iniziale,
    dettaglio: Object.fromEntries(VOCI_SPESA.map(([k]) => [k, 0])), usaDettaglio: false,
    periodiche: [...(iniziale?.periodiche ?? []), ...modelliPeriodiche],
    salvadanai: [...(iniziale?.salvadanai ?? []), ...modelliSalvadanai],
  };
  const anniPeriodo = () => {
    const a = [];
    for (let y = w.inizio.y; y <= w.inizio.y + w.anni; y++) a.push(y);
    return a;
  };
  const risposte = () => ({
    ...w,
    periodiche: w.periodiche.filter((v) => v.scelta),
    salvadanai: w.salvadanai.filter((v) => v.scelta),
  });

  // ---------- Passi ----------

  const passi = [
    {
      titolo: 'Benvenuto',
      html: () => `<p class="grande">Ti faccio qualche domanda per preparare il tuo Portafoglio. Servono circa <strong>5 minuti</strong>.</p>
        <p>Ti chiederò:</p>
        <ul class="elenco"><li>quanto entra e quanto esce ogni mese;</li><li>quanti soldi hai adesso sul conto;</li>
        <li>le spese e le entrate che arrivano una o due volte l'anno (assicurazione, tredicesima…);</li>
        <li>i soldi che vuoi mettere da parte per un obiettivo (salvadanai).</li></ul>
        ${precompilata
    ? consiglio('Ho già inserito come risposte i dati che hai adesso nell\'app: controllali e cambia solo quello che serve. I valori che hai modificato mese per mese nella Proiezione restano. Alla fine i dati attuali vengono sostituiti da quelli confermati qui; se esci prima, non cambia nulla.')
    : consiglio('Tieni a portata di mano l\'app della banca e, se le hai, l\'ultima busta paga e le polizze. Se non sai un valore, metti una stima: potrai correggere tutto in qualsiasi momento.')}
        <div class="scelte-avvio">
          <button type="button" class="btn btn-primario pieno" data-g="avanti">${precompilata ? 'Rivediamo le risposte' : 'Iniziamo'}</button>
          <button type="button" class="btn btn-contorno pieno" data-g="importa">Ho già un backup: importalo</button>
          <button type="button" class="btn btn-testo pieno" data-g="esci">${precompilata ? 'Annulla: lascio i dati come sono' : 'Salta: compilo da solo'}</button>
        </div>`,
      senzaPiede: true,
    },
    {
      titolo: 'Periodo da pianificare',
      html: () => `<p>Da quale mese vuoi far partire la proiezione e per quanti anni?</p>
        <div class="due-colonne">${selectMese('data-ws="inizio.m"', w.inizio.m)}${selectAnno('data-ws="inizio.y"', w.inizio.y, [oggi.y - 1, oggi.y, oggi.y + 1], 'Anno di inizio')}</div>
        <label class="campo"><span class="campo-etichetta">Anni da pianificare dopo il primo</span>
          <select data-ws="anni">${[...new Set([1, 2, 3, 4, 5, w.anni])].sort((a, b) => a - b).map((n) => `<option value="${n}" ${n === w.anni ? 'selected' : ''}>${n} ${n === 1 ? 'anno' : 'anni'} (fino a dicembre ${w.inizio.y + n})</option>`).join('')}</select></label>
        ${consiglio('Parti dal mese corrente: è il modo più semplice. 3 anni bastano per vedere l\'effetto di tredicesime, vacanze e spese grandi; potrai allungare il periodo in Impostazioni.')}`,
    },
    {
      titolo: 'Da dove parti',
      html: () => `<p>Quanti soldi avevi sul conto all'<strong>inizio di ${esc(NOMI_MESI_LUNGHI[w.inizio.m - 1].toLowerCase())} ${w.inizio.y}</strong>?</p>
        ${campo('Saldo del conto a inizio mese (€)', w.saldoIniziale, 'data-w="saldoIniziale"')}
        ${esempio('Se il 1° del mese l\'app della banca segnava 2.850 €, scrivi 2850.')}
        ${consiglio('Se non lo ricordi, usa il saldo di oggi: il primo mese sarà un po\' meno preciso, poi alla chiusura del mese l\'app si riallinea da sola. Se hai più conti, somma quelli che usi per le spese di tutti i giorni.')}
        <h4>Prestiti e finanziamenti</h4>
        <p>Hai prestiti o acquisti a rate? Per ognuno indica quanto ti resta da pagare e la rata mensile. Se non ne hai, vai avanti.</p>
        ${w.finanziamenti.map((f, i) => `<section class="scheda voce-guidata">
          <div class="mese-testa"><h3>Finanziamento ${i + 1}</h3><button type="button" class="icona-btn" data-g-elimina="finanziamenti.${i}" aria-label="Elimina">${ICONE.cestino}</button></div>
          ${campoTesto('Nome', f.nome, `data-wt="finanziamenti.${i}.nome"`)}
          <div class="due-colonne">${campo('Debito residuo (€)', f.residuo, `data-w="finanziamenti.${i}.residuo"`)}${campo('Rata mensile (€)', f.rata, `data-w="finanziamenti.${i}.rata"`)}</div>
        </section>`).join('')}
        <button type="button" class="btn btn-contorno pieno" data-g="nuovo-finanziamento">${ICONE.piu}Aggiungi un finanziamento</button>
        ${esempio('Finanziamento auto: restano 6.400 € da pagare, rata di 220 € al mese.')}
        ${consiglio('Il mutuo della casa di solito si inserisce come spesa fissa mensile (prossimo passo) e non qui: altrimenti il "Saldo netto totale" risulterebbe molto negativo per decenni.')}`,
    },
    {
      titolo: 'Entrate e spese di ogni mese',
      html: () => `<p>Quanto ti entra e quanto spendi in un mese normale?</p>
        ${campo('Entrate nette mensili (€)', w.entrate, 'data-w="entrate"')}
        ${esempio('Stipendio netto 1.900 € + affitto di un box 150 € → scrivi 2050. Non contare tredicesima e quattordicesima: le aggiungiamo più avanti.')}
        ${w.usaDettaglio ? `<div class="dettaglio-spese"><p class="etichetta">Spese fisse, voce per voce</p>
          ${VOCI_SPESA.map(([k, n]) => campo(n, w.dettaglio[k], `data-w="dettaglio.${k}"`)).join('')}
          <button type="button" class="btn btn-testo" data-g="dettaglio">Scrivo solo il totale</button></div>`
        : `${campo('Spese fisse mensili (€)', w.spese, 'data-w="spese" id="g-spese"')}
          <button type="button" class="btn btn-testo" data-g="dettaglio">Non lo so: aiutami a calcolarle</button>`}
        <div id="g-utile"></div>
        ${consiglio('Nelle spese fisse metti tutto quello che esce ogni mese: casa, bollette, spesa, trasporti, abbonamenti. Una stima arrotondata va benissimo: se guardi gli estratti conto degli ultimi 3 mesi e fai la media, sarà ancora più precisa.')}
        <h4>Buoni pasto</h4>
        ${campo('Valore di un buono pasto (€)', w.valoreBuono, 'data-w="valoreBuono"', 'Lascia vuoto se non li ricevi')}
        ${esempio('Buoni da 8 € → scrivi 8.')}`,
      live: () => {
        if (w.usaDettaglio) w.spese = Object.values(w.dettaglio).reduce((a, b) => a + b, 0);
        const u = w.entrate - w.spese;
        let msg = '';
        if (!w.entrate) msg = '';
        else if (u < 0) msg = '<p class="avvertenza">Le spese superano le entrate: il saldo scenderà ogni mese. Controlla i valori o pensa a dove risparmiare.</p>';
        else if (u < w.entrate * 0.1) msg = '<p class="avvertenza">Ti resta meno del 10% delle entrate: le spese di fine anno potrebbero metterti in difficoltà.</p>';
        else msg = `<p class="nota">Ottimo: ogni mese metti da parte circa il ${Math.round((u / w.entrate) * 100)}% delle entrate.</p>`;
        return `<div class="riga calcolata grande"><span>${w.usaDettaglio ? `Spese fisse ${euro(w.spese)} · ` : ''}Utile mensile</span><span class="${u < 0 ? 'neg' : ''}">${euro(u)}</span></div>${msg}`;
      },
      liveId: 'g-utile',
    },
    {
      titolo: 'La situazione di oggi',
      html: () => `<p>Questi valori servono alla Home per dirti se sei in linea con il piano. Andranno aggiornati ogni tanto, idealmente una volta a settimana.</p>
        ${campo('Saldo del conto oggi (€)', w.corrente.saldo, 'data-w="corrente.saldo"')}
        ${campo('Non ancora addebitato (€)', w.corrente.nonAddebitato, 'data-w="corrente.nonAddebitato"', 'Pagamenti già fatti ma non ancora usciti dal conto')}
        ${campo('Non ancora accreditato (€)', w.corrente.nonAccreditato, 'data-w="corrente.nonAccreditato"', 'Soldi certi in arrivo, es. un rimborso')}
        <div class="due-colonne">${campo('Buoni pasto rimasti', w.corrente.buoniResidui, 'data-w="corrente.buoniResidui"')}${campo('Credito welfare (€)', w.corrente.welfare, 'data-w="corrente.welfare"')}</div>
        <h4>Carte di credito</h4>
        <div class="due-colonne">${campo('Plafond mensile (€)', w.plafond, 'data-w="plafond"')}${campo('Ancora spendibile (€)', w.corrente.residuoCarte, 'data-w="corrente.residuoCarte"')}</div>
        ${esempio('Plafond 1.500 €, l\'app della carta dice "disponibile 1.080 €" → hai già speso 420 € che usciranno dal conto il mese prossimo.')}
        ${consiglio('Se non usi carte di credito lascia vuoti i due campi. Le carte di debito e le prepagate non contano: quelle spese escono subito dal conto.')}`,
    },
    {
      titolo: 'Spese ed entrate periodiche',
      html: () => `<p>Quali spese o entrate arrivano <strong>una volta l'anno</strong> (o quasi)? Tocca quelle che ti riguardano e correggi importo e mese.</p>
        <div class="modelli">${w.periodiche.map((v, i) => `<div class="modello${v.scelta ? ' scelto' : ''}">
          <button type="button" class="modello-testa" data-scegli="periodiche.${i}" aria-pressed="${v.scelta}">
            <span class="spunta">${v.scelta ? '✓' : ''}</span><span>${esc(v.nome || 'Nuova voce')}</span>
            <span class="${v.entrata ? '' : 'neg'}">${v.importo ? `${v.entrata ? '+' : '−'} ${euro(v.importo)}` : ''}</span></button>
          ${v.scelta ? `<div class="modello-corpo">
            ${v.personale ? campoTesto('Nome', v.nome, `data-wt="periodiche.${i}.nome"`) : ''}
            ${v.nota ? `<p class="nota">${esc(v.nota)}</p>` : ''}
            ${segmento(`data-entrata="periodiche.${i}"`, v.entrata)}
            <div class="due-colonne">${campo('Importo (€)', v.importo, `data-w="periodiche.${i}.importo"`)}${selectMese(`data-ws="periodiche.${i}.mese"`, v.mese)}</div>
            ${notaAltriMesi(v)}
          </div>` : ''}</div>`).join('')}</div>
        <button type="button" class="btn btn-contorno pieno" data-g="nuova-periodica">${ICONE.piu}Aggiungi un'altra voce</button>
        ${consiglio('Scorri l\'estratto conto degli ultimi 12 mesi e cerca le uscite grandi che non tornano ogni mese. Gli importi suggeriti sono solo indicativi: metti i tuoi. Più mesi per la stessa voce (es. TARI in due rate) si aggiungono dopo, in Impostazioni → Voci.')}`,
    },
    {
      titolo: 'Spese o entrate una tantum',
      html: () => {
        const anni = anniPeriodo();
        return `<p>Prevedi una spesa o un'entrata <strong>che capita una volta sola</strong>? Per esempio un acquisto importante, un matrimonio, un'eredità. Se non ne hai, vai avanti.</p>
        ${w.straordinarie.map((v, i) => `<section class="scheda voce-guidata">
          <div class="mese-testa"><h3>Voce ${i + 1}</h3><button type="button" class="icona-btn" data-g-elimina="straordinarie.${i}" aria-label="Elimina">${ICONE.cestino}</button></div>
          ${campoTesto('Nome', v.nome, `data-wt="straordinarie.${i}.nome"`)}
          ${segmento(`data-entrata="straordinarie.${i}"`, v.entrata)}
          ${campo('Importo (€)', v.importo, `data-w="straordinarie.${i}.importo"`)}
          <div class="due-colonne">${selectMese(`data-ws="straordinarie.${i}.mese"`, v.mese)}${selectAnno(`data-ws="straordinarie.${i}.anno"`, v.anno, anni)}</div>
          ${notaAltriMesi(v)}
        </section>`).join('')}
        <button type="button" class="btn btn-contorno pieno" data-g="nuova-straordinaria">${ICONE.piu}Aggiungi una voce una tantum</button>
        ${esempio('"Lavatrice nuova", uscita di 450 € a marzo; "Anticipo auto", uscita di 3.000 € a settembre del prossimo anno.')}
        ${consiglio('Se una spesa grande è solo un\'idea, inseriscila lo stesso: vedrai subito nella Proiezione se te la puoi permettere e in che mese conviene farla.')}`;
      },
    },
    {
      titolo: 'Salvadanai e obiettivi',
      html: () => {
        const anni = anniPeriodo();
        const fondoConsigliato = w.spese ? w.spese * 3 : 0;
        return `<p>I salvadanai sono soldi che restano sul conto ma hanno già una destinazione. Scegli quelli che vuoi usare e, se vuoi, dai a ciascuno un obiettivo.</p>
        <div class="modelli">${w.salvadanai.map((v, i) => `<div class="modello${v.scelta ? ' scelto' : ''}">
          <button type="button" class="modello-testa" data-scegli="salvadanai.${i}" aria-pressed="${v.scelta}">
            <span class="spunta">${v.scelta ? '✓' : ''}</span><span>${esc(v.nome || 'Nuovo salvadanaio')}</span><span></span></button>
          ${v.scelta ? `<div class="modello-corpo">
            ${v.personale ? campoTesto('Nome', v.nome, `data-wt="salvadanai.${i}.nome"`) : ''}
            ${v.nota ? `<p class="nota">${esc(v.nota)}</p>` : ''}
            ${campo('Quanto c\'è già dentro (€)', v.saldo, `data-w="salvadanai.${i}.saldo"`)}
            ${campo('Obiettivo da raggiungere (€)', v.obiettivo, `data-w="salvadanai.${i}.obiettivo"`,
              v.nome === 'Fondo emergenze' && fondoConsigliato ? `Consigliato: almeno 3 mesi di spese fisse = ${euro(fondoConsigliato)}` : 'Lascia vuoto se non hai un obiettivo')}
            <div class="due-colonne">${selectMese(`data-ws="salvadanai.${i}.scadenzaMese"`, v.scadenzaMese, 'Entro il mese')}${selectAnno(`data-ws="salvadanai.${i}.scadenzaAnno"`, v.scadenzaAnno, anni, 'Entro l\'anno')}</div>
            ${v.senzaScadenza ? '<p class="nota">Ora non ha una scadenza: resta così finché non scegli mese o anno.</p>' : ''}
            <div id="g-quota-${i}"></div>
          </div>` : ''}</div>`).join('')}</div>
        <button type="button" class="btn btn-contorno pieno" data-g="nuovo-salvadanaio">${ICONE.piu}Aggiungi un altro salvadanaio</button>
        ${consiglio(`Dai obiettivi SMART: <strong>S</strong>pecifici ("vacanza in Grecia", non "risparmiare"), <strong>M</strong>isurabili (un importo), r<strong>A</strong>ggiungibili con il tuo utile mensile${w.entrate ? ` (${euro(w.entrate - w.spese)})` : ''}, <strong>R</strong>ilevanti per te e definiti nel <strong>T</strong>empo (una scadenza). L'app ti dirà quanto mettere da parte ogni mese.`)}
        ${esempio('Vacanze: dentro ci sono già 300 €, obiettivo 1.500 € entro giugno del prossimo anno.')}`;
      },
      live: () => {
        w.salvadanai.forEach((v, i) => {
          const el = document.getElementById(`g-quota-${i}`);
          if (!el) return;
          const mancano = Math.max(0, (v.obiettivo || 0) - (v.saldo || 0));
          const mesi = Math.max(0, M.indice({ y: v.scadenzaAnno, m: v.scadenzaMese }) - M.indice(oggi));
          let t = '';
          if (v.senzaScadenza) t = '';
          else if (v.obiettivo > 0 && mancano === 0) t = '<p class="nota">Obiettivo già raggiunto!</p>';
          else if (v.obiettivo > 0 && mesi > 0) {
            const quota = mancano / mesi;
            const utile = w.entrate - w.spese;
            t = `<div class="riga calcolata"><span>Da mettere da parte</span><span>${euro(quota)} al mese</span></div>`;
            if (utile > 0 && quota > utile) t += '<p class="avvertenza">È più del tuo utile mensile: allunga la scadenza o riduci l\'obiettivo.</p>';
          } else if (v.obiettivo > 0) t = '<p class="avvertenza">Scegli una scadenza futura.</p>';
          el.innerHTML = t;
        });
        return null;
      },
    },
    {
      titolo: 'Riepilogo',
      html: () => {
        const s = M.daCompilazione(risposte(), oggi);
        const righe = M.proiezione(s);
        const r = M.riepilogo(s, oggi, righe);
        const fineAnno = [...righe].reverse().find((x) => x.ym.y === w.inizio.y) ?? righe[0];
        const ultimo = righe[righe.length - 1];
        const avvisi = [];
        if (!w.entrate) avvisi.push('Non hai inserito le entrate mensili: la proiezione mostrerà solo le spese.');
        if (w.entrate && w.entrate - w.spese < 0) avvisi.push('Le spese mensili superano le entrate.');
        if (r.disponibilita != null && Math.abs(r.disponibilita) > Math.max(500, w.entrate)) {
          avvisi.push('La Disponibilità di questo mese è molto lontana da zero: controlla che il saldo di inizio mese e il saldo di oggi siano corretti.');
        }
        return `<p>Ecco il tuo Portafoglio. Controlla i numeri: se qualcosa non torna, torna indietro e correggi.</p>
        <section class="scheda">
          <div class="riga calcolata"><span>Utile mensile</span><span class="${w.entrate - w.spese < 0 ? 'neg' : ''}">${euro(w.entrate - w.spese)}</span></div>
          <div class="riga"><span>Voci periodiche</span><span>${s.voci.filter((v) => v.tipo === 'PERIODICO').length}</span></div>
          <div class="riga"><span>Voci una tantum</span><span>${s.voci.filter((v) => v.tipo === 'EXTRA').length}</span></div>
          <div class="riga"><span>Salvadanai</span><span>${s.salvadanai.length}</span></div><hr>
          ${righe.length ? `<div class="riga calcolata"><span>Saldo previsto a fine ${fineAnno.ym.y}</span><span>${euro(fineAnno.saldoContabile)}</span></div>
          <div class="riga calcolata"><span>Saldo previsto a fine ${ultimo.ym.y}</span><span>${euro(ultimo.saldoContabile)}</span></div>
          <div class="riga calcolata"><span>Saldo netto totale a fine ${ultimo.ym.y}</span><span class="${ultimo.saldoNettoTotale < 0 ? 'neg' : ''}">${euro(ultimo.saldoNettoTotale)}</span></div>` : ''}
          ${r.disponibilita != null ? `<hr><div class="riga calcolata grande"><span>Disponibilità di questo mese</span><span class="${r.disponibilita < 0 ? 'neg' : ''}">${euro(r.disponibilita)}</span></div>
            <p class="nota">Confronta i soldi di oggi con quelli previsti per la fine del mese: se lo stipendio o alcune spese devono ancora arrivare, a metà mese può essere negativa senza che ci sia un problema.</p>` : ''}
        </section>
        ${avvisi.map((a) => `<p class="avvertenza">${esc(a)}</p>`).join('')}
        ${consiglio('Dopo la creazione: aggiorna i "Dati correnti" in Home ogni settimana, esporta un backup dalle Impostazioni e usa i pulsanti ⓘ per le spiegazioni di ogni scheda. Le frasi motivazionali sono già pronte e si modificano in Impostazioni.')}`;
      },
      avanti: 'Crea il mio Portafoglio',
    },
  ];

  // ---------- Disegno ----------

  let passo = 0;
  const radice = document.createElement('div');
  radice.className = 'guidata';
  radice.setAttribute('role', 'dialog');
  radice.setAttribute('aria-modal', 'true');
  radice.setAttribute('aria-label', 'Compilazione guidata');
  document.body.appendChild(radice);
  document.body.classList.add('con-modale');

  const chiudi = () => {
    radice.remove();
    if (!document.querySelector('.modale-sfondo')) document.body.classList.remove('con-modale');
  };

  function aggiornaLive() {
    const p = passi[passo];
    if (!p.live) return;
    const html = p.live();
    if (p.liveId && html != null) {
      const el = radice.querySelector(`#${p.liveId}`);
      if (el) el.innerHTML = html;
    }
  }

  function disegna(scrollaInCima = true) {
    const p = passi[passo];
    const totale = passi.length - 1;
    const corpoScroll = radice.querySelector('.guidata-corpo')?.scrollTop ?? 0;
    radice.innerHTML = `<div class="guidata-testa">
        <div class="guidata-riga"><span class="guidata-passo">${passo ? `Passo ${passo} di ${totale}` : 'Compilazione guidata'}</span>
          ${passo ? '<button type="button" class="btn btn-testo" data-g="esci">Esci</button>' : ''}</div>
        <div class="progresso"><div style="width:${(passo / totale) * 100}%"></div></div>
        <h2>${esc(p.titolo)}</h2></div>
      <div class="guidata-corpo">${p.html()}</div>
      ${p.senzaPiede ? '' : `<div class="guidata-piede">
        <button type="button" class="btn btn-testo" data-g="indietro">Indietro</button>
        <button type="button" class="btn btn-primario" data-g="avanti">${esc(p.avanti || 'Avanti')}</button></div>`}`;
    radice.querySelector('.guidata-corpo').scrollTop = scrollaInCima ? 0 : corpoScroll;
    aggiornaLive();
  }

  // ---------- Eventi ----------

  radice.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.w) {
      const v = t.value.trim() === '' ? 0 : parseNumero(t.value);
      if (v == null) return;
      scriviPercorso(w, t.dataset.w, v);
    } else if (t.dataset.wt) {
      scriviPercorso(w, t.dataset.wt, t.value);
      // aggiorna il nome nell'intestazione della voce senza ridisegnare
      const testa = t.closest('.modello')?.querySelector('.modello-testa span:nth-child(2)');
      if (testa) testa.textContent = t.value || 'Nuova voce';
    } else return;
    aggiornaLive();
  });

  radice.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!t.dataset.ws) return;
    scriviPercorso(w, t.dataset.ws, Number(t.value));
    if (/\.scadenza(Mese|Anno)$/.test(t.dataset.ws)) {
      const sv = leggiPercorso(w, t.dataset.ws.replace(/\.scadenza(Mese|Anno)$/, ''));
      if (sv.senzaScadenza) { sv.senzaScadenza = false; disegna(false); return; }
    }
    // il periodo cambia gli anni proposti negli altri passi
    if (t.dataset.ws.startsWith('inizio') || t.dataset.ws === 'anni') disegna(false);
    else aggiornaLive();
  });

  radice.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.scegli) {
      const v = leggiPercorso(w, t.dataset.scegli);
      v.scelta = !v.scelta;
      disegna(false);
      return;
    }
    if (t.dataset.entrata) {
      leggiPercorso(w, t.dataset.entrata).entrata = t.textContent.trim() === 'Entrata';
      disegna(false);
      return;
    }
    if (t.dataset.gElimina) {
      const [lista, i] = t.dataset.gElimina.split('.');
      w[lista].splice(Number(i), 1);
      disegna(false);
      return;
    }
    switch (t.dataset.g) {
      case 'avanti':
        if (passo === passi.length - 1) {
          const stato = M.daCompilazione(risposte(), oggi);
          chiudi();
          onFine(stato);
        } else { passo++; disegna(); }
        break;
      case 'indietro': if (passo > 0) { passo--; disegna(); } break;
      case 'importa': chiudi(); onImporta(); break;
      case 'esci':
        if (passo === 0) { chiudi(); onEsci(); break; }
        conferma({
          titolo: 'Uscire dalla compilazione guidata?',
          testo: precompilata
            ? 'Le modifiche fatte qui non verranno salvate: i tuoi dati restano come sono. Potrai ricominciare dalle Impostazioni.'
            : 'Le risposte date finora non verranno salvate. Potrai ricominciare dalle Impostazioni.',
          ok: 'Esci', pericolo: true,
          onOk: () => { chiudi(); onEsci(); },
        });
        break;
      case 'dettaglio':
        w.usaDettaglio = !w.usaDettaglio;
        if (w.usaDettaglio && !Object.values(w.dettaglio).some(Boolean) && w.spese) w.dettaglio.altro = w.spese;
        disegna(false);
        break;
      case 'nuova-periodica':
        w.periodiche.push({ nome: '', importo: 0, mese: oggi.m, entrata: false, scelta: true, personale: true, nota: '' });
        disegna(false);
        break;
      case 'nuova-straordinaria':
        w.straordinarie.push({ nome: '', importo: 0, entrata: false, mese: oggi.m, anno: w.inizio.y });
        disegna(false);
        break;
      case 'nuovo-finanziamento':
        w.finanziamenti.push({ nome: '', residuo: 0, rata: 0 });
        disegna(false);
        break;
      case 'nuovo-salvadanaio':
        w.salvadanai.push({ nome: '', nota: '', scelta: true, personale: true, saldo: 0, obiettivo: 0, scadenzaMese: 12, scadenzaAnno: oggi.y + 1 });
        disegna(false);
        break;
      default:
    }
  });

  disegna();
  return { chiudi };
}
