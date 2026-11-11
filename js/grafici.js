// Grafici SVG: linee su tutto il periodo e barre mese per mese.
import { esc, euro } from './ui.js';

export const COLORI = {
  contabile: '#d32f2f', netto: '#f57c00', delta: '#1e88e5', straordinarie: '#8e24aa',
  palette: ['#1e88e5', '#d81b60', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41', '#c0ca33'],
};

const legenda = (serie) => `<div class="legenda">${serie.map((s) =>
  `<span><i style="background:${s.colore}"></i>${esc(s.nome)}</span>`).join('')}</div>`;

const scala = (min, max) => `<div class="scala"><span>min ${euro(min)}</span><span>max ${euro(max)}</span></div>`;

function card(titolo, sottotitolo, corpo, serie) {
  return `<section class="scheda grafico"><div class="scheda-titolo"><h3>${esc(titolo)}</h3></div>
    ${sottotitolo ? `<p class="sottotitolo">${esc(sottotitolo)}</p>` : ''}${corpo}${legenda(serie)}</section>`;
}

/** serie: [{ nome, colore, valori }]; evidenzia: [primo, ultimo] indici da evidenziare. */
export function graficoLinee(titolo, serie, evidenzia, sottotitolo) {
  const n = Math.max(0, ...serie.map((s) => s.valori.length));
  if (n < 2) return '';
  const tutti = [...serie.flatMap((s) => s.valori), 0];
  const min = Math.min(...tutti);
  const max = Math.max(...tutti);
  const W = 300; const H = 120;
  const range = max - min || 1;
  const x = (i) => (W * i) / (n - 1);
  const y = (v) => H * (1 - (v - min) / range);
  let sfondo = '';
  if (evidenzia && evidenzia[0] >= 0) {
    sfondo = `<rect x="${x(evidenzia[0])}" y="0" width="${Math.max(2, x(evidenzia[1]) - x(evidenzia[0]))}" height="${H}" class="evid"/>`;
  }
  const linee = serie.map((s) => `<polyline fill="none" stroke="${s.colore}" stroke-width="2" vector-effect="non-scaling-stroke"
    stroke-linejoin="round" points="${s.valori.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('');
  const svg = `<svg class="svg-grafico" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(titolo)}">
    ${sfondo}<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="zero" vector-effect="non-scaling-stroke"/>${linee}</svg>`;
  return card(titolo, sottotitolo, scala(min, max) + svg, serie);
}

/** Barre raggruppate: etichette (12 mesi), serie con 12 valori ciascuna. */
export function graficoBarre(titolo, etichette, serie, sottotitolo) {
  const n = etichette.length;
  const tutti = [...serie.flatMap((s) => s.valori), 0];
  const min = Math.min(...tutti);
  const max = Math.max(...tutti);
  const W = 300; const H = 110;
  const range = max - min || 1;
  const y = (v) => H * (1 - (v - min) / range);
  const slot = W / n;
  const gruppo = slot * 0.75;
  const barra = gruppo / Math.max(1, serie.length);
  let barre = '';
  for (let i = 0; i < n; i++) {
    const x0 = slot * i + (slot - gruppo) / 2;
    serie.forEach((s, k) => {
      const v = s.valori[i] || 0;
      if (!v) return;
      const top = Math.min(y(v), y(0));
      const h = Math.max(1.5, Math.abs(y(v) - y(0)));
      barre += `<rect x="${(x0 + barra * k).toFixed(1)}" y="${top.toFixed(1)}" width="${(barra * 0.9).toFixed(1)}" height="${h.toFixed(1)}" fill="${s.colore}"><title>${esc(s.nome)}: ${euro(v)}</title></rect>`;
    });
  }
  if (min === 0 && max === 0) return card(titolo, sottotitolo, '<p class="nota">Nessun valore in questo anno.</p>', serie);
  const svg = `<svg class="svg-grafico barre" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(titolo)}">
    ${barre}<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="zero" vector-effect="non-scaling-stroke"/></svg>
    <div class="etichette-mesi">${etichette.map((e) => `<span>${esc(e)}</span>`).join('')}</div>`;
  return card(titolo, sottotitolo, scala(min, max) + svg, serie);
}
