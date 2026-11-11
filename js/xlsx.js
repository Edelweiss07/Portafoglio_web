// Generatore minimo di file Excel (.xlsx) senza librerie: XML di Office Open + ZIP non compresso.
// Celle: numero, stringa, oppure { v, s } con s = 'h' (intestazione), 'b' (grassetto),
// 'e' (euro), 'eb' (euro grassetto), 'p' (percentuale).

const STILI = { '': 0, h: 1, b: 2, e: 3, eb: 4, p: 5 };

const esc = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caratteri di controllo non ammessi in XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function colonna(n) {
  let s = '';
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function foglioXml(f) {
  const righe = f.righe.map((riga, r) => {
    const celle = riga.map((c, k) => {
      if (c == null || c === '') return '';
      const cella = typeof c === 'object' ? c : { v: c, s: '' };
      if (cella.v == null || cella.v === '') return '';
      const rif = `${colonna(k)}${r + 1}`;
      const st = STILI[cella.s || ''] ?? 0;
      const sAttr = st ? ` s="${st}"` : '';
      if (typeof cella.v === 'number' && isFinite(cella.v)) return `<c r="${rif}"${sAttr}><v>${cella.v}</v></c>`;
      return `<c r="${rif}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(cella.v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${celle}</row>`;
  }).join('');
  const larghezze = (f.larghezze || []).map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('');
  const blocca = f.bloccaRighe || f.bloccaColonne
    ? `<sheetViews><sheetView workbookViewId="0"><pane ${f.bloccaColonne ? `xSplit="${f.bloccaColonne}" ` : ''}${f.bloccaRighe ? `ySplit="${f.bloccaRighe}" ` : ''}topLeftCell="${colonna(f.bloccaColonne || 0)}${(f.bloccaRighe || 0) + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${blocca}${larghezze ? `<cols>${larghezze}</cols>` : ''}<sheetData>${righe}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;;[Red]\\-#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B6B50"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ---------- ZIP (metodo "store", senza compressione) ----------

const TABELLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(dati) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < dati.length; i++) c = TABELLA_CRC[(c ^ dati[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zip(file) {
  const enc = new TextEncoder();
  const parti = [];
  const centrale = [];
  let offset = 0;
  for (const { nome, testo } of file) {
    const nomeB = enc.encode(nome);
    const dati = enc.encode(testo);
    const crc = crc32(dati);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true);
    loc.setUint16(4, 20, true);
    loc.setUint16(6, 0x0800, true); // nomi in UTF-8
    loc.setUint16(8, 0, true);
    loc.setUint32(14, crc, true);
    loc.setUint32(18, dati.length, true);
    loc.setUint32(22, dati.length, true);
    loc.setUint16(26, nomeB.length, true);
    parti.push(new Uint8Array(loc.buffer), nomeB, dati);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, dati.length, true);
    cen.setUint32(24, dati.length, true);
    cen.setUint16(28, nomeB.length, true);
    cen.setUint32(42, offset, true);
    centrale.push(new Uint8Array(cen.buffer), nomeB);
    offset += 30 + nomeB.length + dati.length;
  }
  const dimCentrale = centrale.reduce((a, b) => a + b.length, 0);
  const fine = new DataView(new ArrayBuffer(22));
  fine.setUint32(0, 0x06054b50, true);
  fine.setUint16(8, file.length, true);
  fine.setUint16(10, file.length, true);
  fine.setUint32(12, dimCentrale, true);
  fine.setUint32(16, offset, true);
  const tutto = [...parti, ...centrale, new Uint8Array(fine.buffer)];
  const out = new Uint8Array(tutto.reduce((a, b) => a + b.length, 0));
  let p = 0;
  for (const b of tutto) { out.set(b, p); p += b.length; }
  return out;
}

/** fogli: [{ nome, righe, larghezze?, bloccaRighe?, bloccaColonne? }] → Uint8Array del file .xlsx */
export function creaXlsx(fogli) {
  const nomi = fogli.map((f, i) => esc(f.nome.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Foglio${i + 1}`));
  const file = [
    {
      nome: '[Content_Types].xml',
      testo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${fogli.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      nome: '_rels/.rels',
      testo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nome: 'xl/workbook.xml',
      testo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomi.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      testo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fogli.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { nome: 'xl/styles.xml', testo: STYLES },
    ...fogli.map((f, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, testo: foglioXml(f) })),
  ];
  return zip(file);
}
