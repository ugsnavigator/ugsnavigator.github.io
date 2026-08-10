import { xmlEscape, mmToTwip, mmToEmu, sanitizeFilename, containsPlaceholder } from "./core.js";
import { formatDateUa } from "./templates.js";

const encoder = new TextEncoder();


export function verifyGeneratedDocx(model, letterheadAsset = null) {
  const errors = [];
  const warnings = [];
  let files;
  let bytes;
  try {
    files = buildDocxFiles(model, letterheadAsset);
    bytes = makeZip(files);
  } catch (error) {
    return { ok: false, errors: [`Помилка побудови DOCX: ${error.message || error}`], warnings, bytes: null, files: null };
  }

  const required = ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"];
  for (const name of required) if (!files.has(name)) errors.push(`У DOCX відсутній обов’язковий файл: ${name}`);

  const documentXmlBytes = files.get("word/document.xml");
  const documentText = documentXmlBytes ? new TextDecoder().decode(documentXmlBytes) : "";
  if (!documentText.includes("<w:document") || !documentText.includes("<w:body>")) errors.push("Некоректна структура word/document.xml.");
  if (!documentText.includes(xmlEscape(model.title))) errors.push("Заголовок наказу не потрапив до DOCX.");
  if (!documentText.includes(xmlEscape(model.signerName))) errors.push("ПІБ підписанта не потрапив до DOCX.");
  if (containsPlaceholder(documentText)) errors.push("У сформованому DOCX залишилися службові заповнювачі.");

  if (model.letterheadMode === "image") {
    const hasMedia = [...files.keys()].some((name) => name.startsWith("word/media/letterhead."));
    const rels = files.get("word/_rels/document.xml.rels");
    const relText = rels ? new TextDecoder().decode(rels) : "";
    if (!hasMedia || !relText.includes("rIdLetterhead")) errors.push("Зображення фірмового бланка не вбудовано в пакет DOCX.");
  }

  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)) errors.push("DOCX не має коректного ZIP-заголовка.");
  const end = bytes.length - 22;
  if (end < 0 || !(bytes[end] === 0x50 && bytes[end + 1] === 0x4b && bytes[end + 2] === 0x05 && bytes[end + 3] === 0x06)) errors.push("DOCX не має коректного ZIP-завершення.");
  if (bytes.length > 8 * 1024 * 1024) warnings.push("DOCX має розмір понад 8 МБ. Перевірте розмір фірмового бланка.");

  return { ok: errors.length === 0, errors, warnings, bytes, files };
}

export function buildDocxFiles(model, letterheadAsset = null) {
  const hasImage = model.letterheadMode === "image" && letterheadAsset?.bytes;
  const imageInfo = hasImage ? normalizeImageAsset(letterheadAsset, model.letterheadWidthMm) : null;

  const files = new Map();
  files.set("[Content_Types].xml", textBytes(contentTypesXml(imageInfo)));
  files.set("_rels/.rels", textBytes(rootRelsXml()));
  files.set("docProps/core.xml", textBytes(corePropsXml(model)));
  files.set("docProps/app.xml", textBytes(appPropsXml()));
  files.set("word/document.xml", textBytes(documentXml(model, imageInfo)));
  files.set("word/styles.xml", textBytes(stylesXml()));
  files.set("word/settings.xml", textBytes(settingsXml()));
  files.set("word/_rels/document.xml.rels", textBytes(documentRelsXml(imageInfo)));

  if (imageInfo) files.set(`word/media/${imageInfo.fileName}`, imageInfo.bytes);
  return files;
}

export function buildDocxBytes(model, letterheadAsset = null) {
  return makeZip(buildDocxFiles(model, letterheadAsset));
}

export function buildDocxBlob(model, letterheadAsset = null) {
  const bytes = buildDocxBytes(model, letterheadAsset);
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export function downloadDocx(model, letterheadAsset = null) {
  const verification = verifyGeneratedDocx(model, letterheadAsset);
  if (!verification.ok) throw new Error(verification.errors.join(" "));
  const blob = new Blob([verification.bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const date = model.orderDate ? formatDateUa(model.orderDate).replaceAll(".", "-") : "bez-daty";
  const no = model.orderNumber ? `_${sanitizeFilename(model.orderNumber, "")}` : "";
  const title = sanitizeFilename(model.title.replace(/^Про\s+/u, ""), "nakaz");
  triggerDownload(blob, `${date}${no}_${title}.docx`);
  return verification;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename, "document.docx");
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function textBytes(value) {
  return encoder.encode(String(value));
}

function contentTypesXml(imageInfo) {
  const imageDefault = imageInfo
    ? `<Default Extension="${imageInfo.extension}" ContentType="${imageInfo.mime}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${imageDefault}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml(imageInfo) {
  const imageRel = imageInfo
    ? `<Relationship Id="rIdLetterhead" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageInfo.fileName}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
${imageRel}
</Relationships>`;
}

function corePropsXml(model) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(model.title)}</dc:title>
<dc:subject>Наказ закладу освіти</dc:subject>
<dc:creator>${xmlEscape(model.institutionName || "Конструктор наказів")}</dc:creator>
<cp:lastModifiedBy>Локальний конструктор наказів</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Конструктор наказів</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion>
</Properties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
  <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="uk-UA"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/></w:rPr></w:style>
</w:styles>`;
}

function settingsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/></w:settings>`;
}

function documentXml(model, imageInfo) {
  const topMm = model.letterheadMode === "preprinted" ? model.preprintedTopMm : 20;
  const topTwip = mmToTwip(topMm);
  const leftTwip = mmToTwip(30);
  const rightTwip = mmToTwip(10);
  const bottomTwip = mmToTwip(20);
  const pageWidth = 11906;
  const pageHeight = 16838;
  const body = [];

  if (imageInfo) body.push(imageParagraphXml(imageInfo));
  if (model.letterheadMode === "standard") {
    body.push(paragraphXml(model.institutionName || "[Назва закладу]", { align: "center", bold: true, after: 240 }));
    if (model.edrpou) body.push(paragraphXml(`Код ЄДРПОУ ${model.edrpou}`, { align: "center", size: 22, after: 200 }));
  }

  body.push(paragraphXml("НАКАЗ", { align: "center", bold: true, after: 180 }));
  body.push(dateNumberPlaceXml(model));
  body.push(paragraphXml(model.title || "Про …", { align: "center", bold: true, after: 300 }));
  body.push(paragraphXml(model.preamble || "[Преамбула]", { align: "both", firstLineMm: 10, after: 180 }));
  body.push(paragraphXml("НАКАЗУЮ:", { bold: true, after: 160 }));
  model.points.forEach((point, index) => body.push(numberedParagraphXml(index + 1, point)));
  body.push(signatureXml(model));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
${body.join("\n")}
<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar w:top="${topTwip}" w:right="${rightTwip}" w:bottom="${bottomTwip}" w:left="${leftTwip}" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>
</w:body></w:document>`;
}

function paragraphXml(text, opts = {}) {
  const pPr = [];
  if (opts.align) pPr.push(`<w:jc w:val="${opts.align}"/>`);
  if (opts.firstLineMm) pPr.push(`<w:ind w:firstLine="${mmToTwip(opts.firstLineMm)}"/>`);
  if (opts.after !== undefined) pPr.push(`<w:spacing w:after="${opts.after}" w:line="360" w:lineRule="auto"/>`);
  const rPr = runPropsXml(opts);
  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join("")}</w:pPr>` : ""}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function runPropsXml(opts) {
  const parts = [];
  if (opts.bold) parts.push("<w:b/><w:bCs/>");
  if (opts.size) parts.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
  return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

function dateNumberPlaceXml(model) {
  const date = model.orderDate ? formatDateUa(model.orderDate) : "[дата]";
  const place = model.location || "[місце]";
  const number = model.orderNumber ? `№ ${model.orderNumber}` : "№ ____";
  return `<w:p><w:pPr><w:tabs><w:tab w:val="center" w:pos="4500"/><w:tab w:val="right" w:pos="9500"/></w:tabs><w:spacing w:after="240"/></w:pPr>
<w:r><w:t>${xmlEscape(date)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${xmlEscape(place)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${xmlEscape(number)}</w:t></w:r></w:p>`;
}

function numberedParagraphXml(index, text) {
  const prefix = `${index}. `;
  return `<w:p><w:pPr><w:ind w:left="${mmToTwip(10)}" w:hanging="${mmToTwip(10)}"/><w:jc w:val="both"/><w:spacing w:after="140" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(prefix + text)}</w:t></w:r></w:p>`;
}

function signatureXml(model) {
  const position = model.signerPosition || "[Посада]";
  const name = model.signerName || "[ПІБ]";
  return `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="9500"/></w:tabs><w:spacing w:before="480" w:after="0"/></w:pPr><w:r><w:t>${xmlEscape(position)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${xmlEscape(name)}</w:t></w:r></w:p>`;
}

function imageParagraphXml(imageInfo) {
  const { cx, cy } = imageInfo;
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Фірмовий бланк"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="letterhead.${imageInfo.extension}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLetterhead"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function normalizeImageAsset(asset, widthMm) {
  const mime = asset.mime === "image/jpeg" ? "image/jpeg" : "image/png";
  const extension = mime === "image/jpeg" ? "jpg" : "png";
  const w = Number(asset.width) || 1;
  const h = Number(asset.height) || 1;
  const safeWidthMm = Math.min(180, Math.max(80, Number(widthMm) || 170));
  const safeHeightMm = safeWidthMm * (h / w);
  return {
    bytes: asset.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset.bytes),
    mime,
    extension,
    fileName: `letterhead.${extension}`,
    cx: mmToEmu(safeWidthMm),
    cy: mmToEmu(safeHeightMm),
  };
}

export function makeZip(filesMap) {
  const entries = [];
  const now = new Date();
  const dos = toDosDateTime(now);
  let offset = 0;
  const localParts = [];

  for (const [name, dataRaw] of filesMap.entries()) {
    const data = dataRaw instanceof Uint8Array ? dataRaw : new Uint8Array(dataRaw);
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true); // STORE
    dv.setUint16(10, dos.time, true);
    dv.setUint16(12, dos.date, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, data);
    entries.push({ nameBytes, crc, size: data.length, offset, dos });
    offset += local.length + data.length;
  }

  const centralParts = [];
  let centralSize = 0;
  for (const entry of entries) {
    const c = new Uint8Array(46 + entry.nameBytes.length);
    const dv = new DataView(c.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, entry.dos.time, true);
    dv.setUint16(14, entry.dos.date, true);
    dv.setUint32(16, entry.crc, true);
    dv.setUint32(20, entry.size, true);
    dv.setUint32(24, entry.size, true);
    dv.setUint16(28, entry.nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, entry.offset, true);
    c.set(entry.nameBytes, 46);
    centralParts.push(c);
    centralSize += c.length;
  }

  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  return concatBytes([...localParts, ...centralParts, end]);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

function toDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  return { date: dosDate & 0xffff, time: dosTime & 0xffff };
}

let crcTableCache = null;
function crcTable() {
  if (crcTableCache) return crcTableCache;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  crcTableCache = table;
  return table;
}
export function crc32(bytes) {
  const table = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
