import { ORDER_TEMPLATES, ACADEMIC_MONTHS } from "./templates.js";
import { DEFAULT_PROFILE, xmlEscape, sanitizeFilename, validateTemplateSchemas, buildOrderModel, validateOrder } from "./core.js";
import { buildDocxFiles, buildDocxBytes, crc32 } from "./docx.js";
import { detectImageMime, validateImageFileBytes } from "./image.js";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (condition, message = "Умова не виконана") => { if (!condition) throw new Error(message); };
const decode = (bytes) => new TextDecoder().decode(bytes);

test("Схеми шаблонів не мають дублів", () => assert(validateTemplateSchemas(ORDER_TEMPLATES).length === 0, validateTemplateSchemas(ORDER_TEMPLATES).join("; ")));
test("Усі штатні заголовки починаються з «Про»", () => assert(ORDER_TEMPLATES.every((t) => /^Про\b/u.test(t.title))));
test("XML-екранування нейтралізує теги і спецсимволи", () => assert(xmlEscape(`<script x="1">a&b</script>`) === "&lt;script x=&quot;1&quot;&gt;a&amp;b&lt;/script&gt;"));
test("XML-екранування прибирає заборонені керівні символи", () => assert(xmlEscape(`a\u0001b`) === "ab"));
test("XML-екранування прибирає U+FFFE та U+FFFF", () => assert(xmlEscape(`a\uFFFEb\uFFFFc`) === "abc"));
test("Валідація схем знаходить дубль id у вкладеному repeatable", () => {
  const bad = [{ id: "x", title: "Про тест", build: () => ({}), fields: [
    { id: "members", type: "repeatable", fields: [{ id: "person", type: "text" }, { id: "person", type: "text" }] },
  ] }];
  assert(validateTemplateSchemas(bad).some((e) => e.includes("дубль поля person")));
});

test("Місячна навігація охоплює всі місяці навчального року", () => {
  const ids = new Set(ACADEMIC_MONTHS.map((m) => m.id));
  assert(ACADEMIC_MONTHS.length === 12);
  assert(ORDER_TEMPLATES.every((t) => Array.isArray(t.months) && t.months.every((m) => ids.has(m))));
});

test("Ризикові шаблони позначені для додаткової перевірки", () => assert(ORDER_TEMPLATES.some((t) => t.needsVerification === true)));

test("Назва файлу прибирає небезпечні символи", () => assert(!/[<>:"/\\|?*]/.test(sanitizeFilename(`../Наказ:<test>?*`))));
test("CRC32 відповідає еталону", () => assert(crc32(new TextEncoder().encode("123456789")) === 0xcbf43926));
test("PNG визначається за magic bytes", () => assert(detectImageMime(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) === "image/png"));
test("SVG/HTML не проходить як зображення бланка", () => assert(validateImageFileBytes(new TextEncoder().encode("<svg><script/></svg>"), "image/svg+xml").ok === false));

test("DOCX-пакет містить обов’язкові OOXML-файли", () => {
  const model = sampleModel();
  const files = buildDocxFiles(model);
  ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"].forEach((name) => assert(files.has(name), `Немає ${name}`));
});

test("ZIP DOCX має коректні сигнатури PK", () => {
  const zip = buildDocxBytes(sampleModel());
  assert(zip[0] === 0x50 && zip[1] === 0x4b && zip[2] === 0x03 && zip[3] === 0x04, "Немає local ZIP header");
  assert(zip[zip.length - 22] === 0x50 && zip[zip.length - 21] === 0x4b && zip[zip.length - 20] === 0x05 && zip[zip.length - 19] === 0x06, "Немає EOCD");
});

test("Шкідливий текст не потрапляє в document.xml як XML-тег", () => {
  const model = sampleModel(); model.points = [`<script>alert("x")</script> & test`];
  const xml = decode(buildDocxFiles(model).get("word/document.xml"));
  assert(!xml.includes("<script>"));
  assert(xml.includes("&lt;script&gt;"));
  assert(xml.includes("&amp; test"));
});

test("Режим паперового бланка змінює верхнє поле DOCX", () => {
  const model = sampleModel(); model.letterheadMode = "preprinted"; model.preprintedTopMm = 61;
  const xml = decode(buildDocxFiles(model).get("word/document.xml"));
  assert(xml.includes(`w:top=\"${Math.round(61 * 56.6929133858)}\"`));
});

test("Цифровий бланк додає локальне зображення до пакета", () => {
  const model = sampleModel(); model.letterheadMode = "image";
  const asset = { bytes: new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]), mime: "image/png", width: 1200, height: 240, name: "letterhead.png" };
  const files = buildDocxFiles(model, asset);
  assert(files.has("word/media/letterhead.png"));
  assert(decode(files.get("word/_rels/document.xml.rels")).includes("rIdLetterhead"));
});

test("Критичні пропуски блокують експорт", () => {
  const template = ORDER_TEMPLATES[0];
  const raw = Object.fromEntries(template.fields.map((f) => [f.id, f.type === "repeatable" ? [] : ""]));
  const profile = { ...DEFAULT_PROFILE };
  const model = buildOrderModel(template, raw, profile, { orderDate: "", orderNumber: "" });
  const report = validateOrder({ template, rawData: raw, model, profile, letterheadAsset: null });
  assert(report.hasErrors === true);
});

run();

async function run() {
  const results = [];
  for (const t of tests) {
    try { await t.fn(); results.push({ name: t.name, ok: true }); }
    catch (error) { results.push({ name: t.name, ok: false, error: error.message || String(error) }); }
  }
  render(results);
}

function render(results) {
  const root = document.getElementById("test-results"); root.replaceChildren();
  for (const r of results) {
    const row = document.createElement("div"); row.className = `validation-item ${r.ok ? "ok" : "error"}`;
    const icon = document.createElement("div"); icon.className = "validation-icon"; icon.textContent = r.ok ? "✓" : "×";
    const body = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = r.name; body.appendChild(strong);
    if (r.error) { const small = document.createElement("small"); small.textContent = r.error; body.appendChild(small); }
    row.append(icon, body); root.appendChild(row);
  }
  const passed = results.filter((r) => r.ok).length;
  document.getElementById("test-stats").textContent = `${passed}/${results.length} тестів пройдено${passed === results.length ? " успішно" : " — є помилки"}.`;
}

function sampleModel() {
  return {
    templateId: "test", category: "test", title: "Про тестування конструктора", preamble: "З метою перевірки роботи конструктора.",
    points: ["Провести перевірку сформованого документа.", "Контроль залишаю за собою."],
    orderDate: "2026-08-10", orderNumber: "1-т", institutionName: "Тестовий заклад освіти", shortName: "ТЗО", location: "Київ", edrpou: "12345678",
    signerPosition: "Директор", signerName: "Тест Тестович", letterheadMode: "standard", preprintedTopMm: 55, letterheadWidthMm: 170,
  };
}
