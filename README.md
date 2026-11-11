# Portafoglio – web app

Versione web (PWA) dell'app di contabilità Portafoglio: funziona su **iPhone**, **Android** e computer,
si installa sulla schermata Home come un'app e funziona anche senza internet.

Ha le stesse funzioni dell'app Android 1.5.1 (Home con target e Disponibilità, Proiezione mese per mese,
Voci periodiche e straordinarie, Salvadanai con obiettivi, frasi motivazionali, pulsanti ⓘ), più:

- **Richiesta di backup a ogni avvio**, con la spiegazione dei rischi di perdere i dati.
- **Esportazione in Excel** (.xlsx) con 5 fogli: Home, Proiezione, Voci, Salvadanai, Impostazioni.

I dati restano **solo sul dispositivo** (memoria del browser). Il formato di backup è lo stesso dell'app
Android: un backup esportato da una delle due si importa nell'altra.

## Pubblicarla con GitHub Pages (account gratuito)

Con l'account gratuito GitHub Pages funziona solo con repository **pubblici**. Va bene: qui c'è solo il
codice dell'app con dati di esempio generici, mai i tuoi dati.
Usa un repository **nuovo e separato** da quello dell'app Android (che resta privato con la sua chiave).

1. Su GitHub crea un nuovo repository **pubblico**, per esempio `portafoglio`.
2. **Add file → Upload files** e trascina il **contenuto** di questa cartella
   (`index.html` deve stare nella radice del repository, non dentro una sottocartella). Poi **Commit changes**.
3. Vai in **Settings → Pages**. In "Build and deployment" scegli **Source: Deploy from a branch**,
   **Branch: main** e cartella **/ (root)**, poi **Save**.
4. Dopo uno o due minuti in cima alla pagina compare l'indirizzo, del tipo
   `https://TUO-UTENTE.github.io/portafoglio/`.

## Installarla sul telefono

- **iPhone**: apri l'indirizzo con **Safari** (non con altri browser) → pulsante **Condividi** →
  **Aggiungi alla schermata Home**. Usala sempre dall'icona: così iOS non cancella i dati dopo 7 giorni.
- **Android**: apri l'indirizzo con **Chrome** → menu **⋮** → **Installa app** (o "Aggiungi a schermata Home").

Per portare i tuoi dati dall'app Android: nell'app Android **Opzioni → Esporta backup**, poi nella web app
**Opzioni → Importa backup** e scegli il file.

## Aggiornamenti

Carica i file nuovi nello stesso repository (sostituendo quelli vecchi). Ogni versione nuova ha un valore
diverso di `VERSIONE` in `sw.js`: alla prima apertura con internet l'app scarica i file nuovi e si ricarica
da sola. I dati salvati sul telefono non vengono toccati.

## Backup

I dati sono nella memoria del browser: si perdono se cancelli i dati di Safari/Chrome, se rimuovi l'icona
dalla schermata Home (su iPhone) o se cambi telefono. Per questo l'app chiede a ogni avvio se vuoi esportare
un backup. Salva il file in un posto sicuro (File, iCloud Drive, Google Drive, e-mail).

## Regole di calcolo

- Utile = Entrate nette − Spese fisse
- Periodico = somma delle voci periodiche attive nel mese
- Saldo contabile = Saldo contabile del mese prima + Utile + Extra + Periodico
- Residuo finanziamenti = Residuo del mese prima − Rata
- Saldo al netto dei salvadanai = Saldo contabile − somma dei salvadanai
- Saldo al netto dei finanziamenti = Saldo contabile − Residuo finanziamenti
- Saldo netto totale = Saldo contabile − somma dei salvadanai − Residuo finanziamenti
- Saldo buoni = Buoni residui × Valore buono pasto del mese
- Saldo netto = Saldo corrente − Non addebitato + Non accreditato + Saldo buoni + Welfare
- Spese carte attuali = Plafond − Residuo carte
- Saldo disponibile = Saldo netto − Spese carte attuali
- Disponibilità = Saldo disponibile − Target saldo (Saldo contabile previsto per il mese corrente)
- A inizio mese, alla prima apertura, la Disponibilità del mese finito viene sommata all'Extra di quel mese.

## Struttura

```
index.html            pagina dell'app
manifest.webmanifest  nome, icone e colori per l'installazione
sw.js                 funzionamento offline e aggiornamenti
css/stile.css         grafica (tema chiaro e scuro)
js/model.js           motore di calcolo (stesse regole dell'app Android)
js/app.js             schermate e dialoghi
js/ui.js, js/grafici.js, js/info.js   componenti, grafici, testi dei pulsanti ⓘ
js/xlsx.js, js/esporta.js             esportazione in Excel
icone/                icone dell'app
test/model.test.mjs   test del motore (node --test test/model.test.mjs)
```
