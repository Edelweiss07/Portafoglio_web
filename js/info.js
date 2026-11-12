// Testi dei pulsanti ⓘ: descrizione dei campi, come compilarli e formule.

const GRASSETTO = 'I valori in grassetto sono calcolati dall\'app e non si modificano a mano.';

const SMART = `Consiglio: imposta obiettivi SMART.
• S – Specifico: un obiettivo chiaro ("fondo vacanze", non "risparmiare di più").
• M – Misurabile: un importo preciso in euro, così puoi seguirne l'avanzamento.
• A – Raggiungibile: alla tua portata con le entrate e le spese che hai.
• R – Realistico / Rilevante: importante per te e coerente con le altre priorità.
• T – Definito nel tempo: una scadenza precisa, che trasforma l'obiettivo in una quota mensile.`;

const FRASI_SMART = `Anche le frasi motivazionali funzionano meglio se sono SMART: specifiche (cosa fare), misurabili (con un importo o una percentuale), raggiungibili, rilevanti per te e legate al tempo (questo mese, entro la scadenza).
Esempi:
• "Sotto il target di oltre 200 €: questa settimana niente cene fuori."
• "Sopra il target: sposta 100 € nel salvadanaio Vacanze entro fine mese."`;

export const RISCHI_BACKUP = `I tuoi dati sono salvati solo in questo browser, su questo telefono: non esiste una copia online e nessuno può recuperarli per te.

Senza un backup recente puoi perderli se:
• cancelli la cronologia o i dati dei siti di Safari o Chrome;
• rimuovi l'icona dell'app dalla schermata Home (su iPhone questo cancella anche i dati);
• su iPhone usi l'app da Safari senza averla aggiunta alla schermata Home: Safari può cancellare i dati dei siti non aperti da 7 giorni;
• il telefono ha poco spazio libero e il browser libera memoria;
• il telefono si rompe, viene perso o lo cambi.

Il backup è un file che salvi dove vuoi (File, iCloud Drive, Google Drive, e-mail). Puoi reimportarlo qui o nell'app Android.`;

export const INFO = {
  home: ['Home', `La Home mostra come stai andando nel mese corrente rispetto alla proiezione.

1. Aggiorna i "Dati correnti" guardando conto e carte.
2. Leggi la Disponibilità nella scheda "Target del mese": se è positiva sei avanti rispetto al piano, se è negativa sei indietro.
3. Se hai salvadanai con un obiettivo, ne vedi l'avanzamento.

A inizio mese, alla prima apertura dell'app, la Disponibilità del mese appena finito viene riportata automaticamente su Extra.

${GRASSETTO}`],

  targetMese: ['Target del mese', `• Target saldo: il Saldo contabile previsto dalla proiezione per il mese corrente.
• Saldo disponibile = Saldo netto − Spese carte attuali.
• Disponibilità = Saldo disponibile − Target saldo.

Disponibilità positiva: hai più soldi di quanto previsto. Negativa: sei sotto il piano.
La frase sotto cambia in base alla Disponibilità; le frasi e le soglie si impostano in Opzioni.

A inizio mese la Disponibilità del mese finito viene sommata all'Extra di quel mese: così la proiezione riparte dai soldi che hai davvero.

${GRASSETTO}`],

  datiCorrenti: ['Dati correnti', `Da aggiornare a mano, idealmente una volta a settimana e sempre a fine mese.
• Saldo corrente: il saldo del conto oggi.
• Non addebitato: spese già fatte ma non ancora uscite dal conto (es. addebiti in arrivo).
• Non accreditato: entrate già certe ma non ancora arrivate sul conto (es. rimborsi).
• Buoni residui: numero di buoni pasto che hai ancora.
• Welfare: credito welfare aziendale ancora disponibile.
• Residuo carte: quanto puoi ancora spendere sulle carte di credito questo mese.

Il plafond delle carte si imposta in Opzioni; il valore del buono pasto con il pulsante "Parametri del mese".`],

  calcoli: ['Calcoli', `• Saldo buoni = Buoni residui × Valore buono pasto del mese (modificabile con "Parametri del mese").
• Saldo netto = Saldo corrente − Non addebitato + Non accreditato + Saldo buoni + Welfare.
• Spese carte attuali = Disponibilità carte (plafond) − Residuo carte.
• Saldo disponibile = Saldo netto − Spese carte attuali.

${GRASSETTO}`],

  salvadanaiHome: ['Obiettivi dei salvadanai', `Per ogni salvadanaio con un obiettivo vedi:
• Avanzamento = Saldo del salvadanaio ÷ Obiettivo × 100.
• Mancano = Obiettivo − Saldo.
• Da mettere da parte ogni mese = Mancano ÷ mesi rimasti fino alla scadenza.

Obiettivo, scadenza e frasi si impostano nella scheda Salvadanai, toccando la matita.

${SMART}`],

  proiezione: ['Proiezione', `Mostra mese per mese come evolve il tuo saldo. Scorri a destra o a sinistra per cambiare anno.

In ogni mese il pulsante "Parametri del mese" apre i campi da compilare:
• Entrate nette e Spese fisse: valgono anche per i mesi seguenti; l'app ti chiede fin dove applicare la modifica.
• Valore buono pasto: come sopra.
• Extra (manuale): entrate o uscite una tantum solo di quel mese. Qui finisce anche la Disponibilità riportata a fine mese.
• Rata finanziamenti: vale anche per i mesi seguenti.

Formule:
• Utile = Entrate nette − Spese fisse.
• Periodico = somma delle voci periodiche attive nel mese.
• Saldo contabile = Saldo contabile del mese prima + Utile + Extra + Periodico.
• Residuo finanziamenti = Residuo del mese prima − Rata.
• Totale salvadanai = somma dei saldi dei salvadanai.
• Saldo al netto dei salvadanai = Saldo contabile − Totale salvadanai.
• Saldo al netto dei finanziamenti = Saldo contabile − Residuo finanziamenti.
• Saldo netto totale = Saldo contabile − Totale salvadanai − Residuo finanziamenti.

Grafici: "Andamento" confronta Saldo contabile e Saldo netto totale su tutto il periodo; "Extra di fine mese" mostra mese per mese le Disponibilità riportate e le voci straordinarie.

${GRASSETTO}`],

  meseApplica: ['Applicare ai mesi successivi', `• Solo a questo mese: il mese dopo torna al valore che aveva prima.
• Fino alla prossima modifica: il nuovo valore vale anche per i mesi seguenti, finché non trova un mese in cui avevi già previsto un cambio.
• A tutti i mesi successivi: il nuovo valore vale fino alla fine della proiezione e cancella i cambi già previsti.`],

  voci: ['Voci', `Le spese ed entrate che non arrivano ogni mese.

• Periodiche: si ripetono negli anni (assicurazione, bollo, tredicesima). Valgono per tutti gli anni; i mesi si attivano anno per anno toccando i quadratini. "Copia mesi dall'anno precedente" ripete lo schema dell'anno prima.
• Straordinarie: una tantum (un acquisto, un rimborso). Appartengono a un solo anno e non si ripetono.

Importo negativo = uscita, positivo = entrata.
Tocca il nome di una voce per modificarla, cambiarne il tipo (periodica / straordinaria), spostare una straordinaria in un altro anno o eliminarla.

Formule:
• Totale periodico del mese = somma degli importi delle voci periodiche attive in quel mese.
• Totale straordinarie del mese = somma degli importi delle voci straordinarie attive in quel mese.
Entrambi entrano nel Saldo contabile.

${GRASSETTO}`],

  salvadanai: ['Salvadanai', `Soldi che tieni sul conto ma che sono già destinati a qualcosa (vacanze, emergenze, figli).

• Tocca un mese per inserire il saldo del salvadanaio: vale anche per i mesi seguenti finché non lo cambi. I mesi con il bordo colorato sono quelli in cui hai inserito un valore.
• Tocca la matita per rinominare, eliminare o impostare obiettivo, scadenza e frasi motivazionali.

Formule:
• Saldo netto salvadanaio = Saldo contabile − salvadanai precedenti nell'elenco − questo salvadanaio.
• Saldo al netto dei salvadanai = Saldo contabile − somma dei salvadanai.
• Saldo netto totale = Saldo contabile − somma dei salvadanai − Residuo finanziamenti.
• Avanzamento = Saldo ÷ Obiettivo × 100; Quota mensile = (Obiettivo − Saldo) ÷ mesi alla scadenza.

${SMART}

${GRASSETTO}`],

  obiettivoSalvadanaio: ['Obiettivo e frasi del salvadanaio', `• Obiettivo: l'importo da raggiungere (0 = nessun obiettivo).
• Scadenza: mese e anno entro cui raggiungerlo. Serve a calcolare quanto mettere da parte ogni mese.
• Frasi: la soglia è la percentuale dell'obiettivo raggiunta. Ogni frase compare quando l'avanzamento raggiunge la sua soglia e resta fino alla soglia successiva; sotto la soglia più bassa non compare nessuna frase.

${SMART}

${FRASI_SMART}`],

  opzioni: ['Opzioni', `Impostazioni generali dell'app: periodo della proiezione, valori di partenza, plafond delle carte, frasi motivazionali della Home, backup, esportazione in Excel e reset.
In fondo trovi il numero di versione.`],

  periodo: ['Periodo della proiezione', `• Mese e anno di inizio: il primo mese calcolato.
• Ultimo anno: la proiezione arriva a dicembre di quell'anno.
Allungare il periodo non cancella nulla; accorciarlo nasconde i mesi esclusi senza cancellarne i dati.`],

  valoriPartenza: ['Valori di partenza', `Valori alla fine del mese prima dell'inizio della proiezione.
• Saldo contabile iniziale: il saldo da cui parte il calcolo.
• Residuo finanziamenti iniziale: il debito residuo di prestiti e finanziamenti.
Esempio: se la proiezione inizia a gennaio, inserisci i valori al 31 dicembre.`],

  parametri: ['Parametri', `• Disponibilità carte (plafond): il limite mensile delle carte di credito. Serve a calcolare le Spese carte attuali = Plafond − Residuo carte.
Il valore del buono pasto si imposta mese per mese con il pulsante "Parametri del mese".`],

  frasiHome: ['Frasi motivazionali della Home', `Ogni frase ha una soglia in euro: compare quando la Disponibilità raggiunge quella soglia e resta visibile fino a quando non si raggiunge la soglia successiva. Sotto la soglia più bassa non compare nessuna frase; lo stesso vale per un intervallo la cui frase è vuota.
Esempio: soglie −200, 0, 500 → con Disponibilità 300 compare la frase della soglia 0; con 500 o più quella della soglia 500; sotto −200 nessuna frase.

${FRASI_SMART}

${SMART}`],

  backup: ['Backup ed esportazione', `${RISCHI_BACKUP}

• Esporta backup: salva tutti i dati in un file .json.
• Importa backup: sostituisce i dati attuali con quelli del file (anche un backup fatto con l'app Android).
• Esporta in Excel: crea un foglio di calcolo (.xlsx) con Home, Proiezione mese per mese, Voci, Salvadanai e Impostazioni. Si apre con Excel, Numbers o Google Fogli. È solo una copia da consultare: non si può reimportare.
• Carica i dati di esempio: sostituisce i dati attuali con un esempio generico.`],

  reset: ['Reset', 'Cancella tutti i dati: voci, salvadanai, valori mensili e dati correnti. La proiezione riparte da zero dal mese corrente. L\'operazione non si può annullare: esporta prima un backup se vuoi conservarli.'],
};
