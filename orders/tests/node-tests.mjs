import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { ORDER_TEMPLATES, ACADEMIC_MONTHS, RECORD_SERIES_OPTIONS } from "../js/templates.js";
import { xmlEscape, sanitizeFilename, validateTemplateSchemas, buildOrderModel, validateOrder, containsPlaceholder, isOrderReady } from "../js/core.js";
import { buildDocxFiles, buildDocxBytes, crc32, verifyGeneratedDocx } from "../js/docx.js";
import { detectImageMime } from "../js/image.js";
import { sanitizeOrderRecord, saveProfile, clearProfile, saveOrderRecord, importOrderRecords, isQuotaExceeded } from "../js/storage.js";
import { findDuplicateOrderNumber, registrationStats, suggestOrderNumber } from "../js/registration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "output");
fs.mkdirSync(outDir, { recursive: true });

// Smoke-check the distribution entry points used by a user who double-clicks index.html.
const projectRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const testsHtml = fs.readFileSync(path.join(projectRoot, "tests.html"), "utf8");
assert.ok(indexHtml.includes('src="js/app.bundle.js"'));
assert.ok(indexHtml.includes('id="saved-orders-list"'));
assert.ok(indexHtml.includes('id="universal-grid"'));
assert.ok(indexHtml.includes('id="export-profile"'));
assert.ok(indexHtml.includes('id="print-root"'));
assert.ok(indexHtml.includes('id="editor-validation-bar"'));
assert.ok(indexHtml.includes('id="template-sample-panel"'));
assert.ok(indexHtml.includes('id="template-sample-text"'));
assert.ok(!indexHtml.includes('type="module" src="js/app.js"'));
assert.ok(testsHtml.includes('src="js/tests.bundle.js"'));
const appBundle = fs.readFileSync(path.join(projectRoot, "js/app.bundle.js"), "utf8");
const testsBundle = fs.readFileSync(path.join(projectRoot, "js/tests.bundle.js"), "utf8");
assert.doesNotThrow(() => new vm.Script(appBundle));
assert.doesNotThrow(() => new vm.Script(testsBundle));
assert.ok(!/^\s*import\s/m.test(appBundle));
assert.ok(!/^\s*export\s/m.test(appBundle));
assert.ok(appBundle.includes("confirmLeaveEditor"));
assert.ok(appBundle.includes('aria-hidden", "false"'));
assert.ok(appBundle.includes("school-order-constructor-orders"));
assert.ok(appBundle.includes("school-order-constructor.working-draft.v1"));
assert.ok(appBundle.includes("preparePrintRoot"));
assert.ok(appBundle.includes("title: model.title"));
assert.ok(!appBundle.includes('sample.className = "template-sample"'));
// A module missing from the bundler list still parses, then throws ReferenceError in the browser,
// so every symbol an entry point imports must actually be declared inside the bundle.
function assertImportedSymbolsDeclared(entryFile, bundleSource, bundleName) {
  const entrySource = fs.readFileSync(path.join(projectRoot, "js", entryFile), "utf8");
  const imported = [...entrySource.matchAll(/^import\s+\{([^}]+)\}\s+from\s+"\.\/[\w.-]+\.js";/gm)]
    .flatMap((match) => match[1].split(",").map((name) => name.trim().split(/\s+as\s+/).pop()))
    .filter(Boolean);
  assert.ok(imported.length > 0, `${entryFile}: не знайдено жодного локального імпорту`);
  for (const name of imported) {
    const declared = new RegExp(`(?:function|const|let|var|class)\\s+${name}\\b`).test(bundleSource);
    assert.ok(declared, `${bundleName}: символ ${name} використовується, але не оголошений у бандлі`);
  }
}
assertImportedSymbolsDeclared("app.js", appBundle, "app.bundle.js");
assertImportedSymbolsDeclared("tests.js", testsBundle, "tests.bundle.js");

const stylesCss = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
assert.ok(stylesCss.includes("@page { size: A4; margin: 20mm 10mm 20mm 30mm; }"));
assert.ok(stylesCss.includes("body > :not(.print-root)"));
assert.ok(stylesCss.includes("zoom: var(--preview-scale, 1)"));

assert.deepEqual(validateTemplateSchemas(ORDER_TEMPLATES), []);
assert.equal(xmlEscape(`<x a="1">&</x>`), "&lt;x a=&quot;1&quot;&gt;&amp;&lt;/x&gt;");
assert.equal(xmlEscape(`a\u0001b`), "ab");
assert.equal(xmlEscape(`a\uFFFEb\uFFFFc`), "abc");
const nestedDuplicateSchema = [{
  id: "nested-duplicate", title: "Про тест", build: () => ({}),
  fields: [{ id: "members", type: "repeatable", fields: [{ id: "person", type: "text" }, { id: "person", type: "text" }] }],
}];
assert.ok(validateTemplateSchemas(nestedDuplicateSchema).some((e) => e.includes("дубль поля person")));
const monthIds = new Set(ACADEMIC_MONTHS.map((m) => m.id));
assert.ok(ORDER_TEMPLATES.every((t) => Array.isArray(t.months) && t.months.every((m) => monthIds.has(m))));
assert.ok(ORDER_TEMPLATES.some((t) => t.needsVerification === true));
assert.ok(ORDER_TEMPLATES.every((template) => RECORD_SERIES_OPTIONS.includes(template.recordSeries)));
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "class-teachers").recordSeries, "Основна діяльність");
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "student-enrollment").recordSeries, "Рух здобувачів освіти");
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "attestation-results").recordSeries, "Кадрові питання");
assert.equal(containsPlaceholder("Кабінет XXX, завдання TODO"), false);
assert.equal(containsPlaceholder("Заповніть {{person}}"), true);
assert.equal(containsPlaceholder("[ПІБ працівника]"), true);
assert.equal(isOrderReady({ hasErrors: false, results: [{ level: "warn" }] }), true);
assert.equal(isOrderReady({ hasErrors: false, results: [{ level: "warn", affectsReadiness: true }] }), false);
assert.equal(isOrderReady({ hasErrors: true, results: [] }), false);
assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
assert.equal(detectImageMime(new Uint8Array([0xff,0xd8,0xff,0xe0])), "image/jpeg");
assert.ok(!/[<>:"/\\|?*]/.test(sanitizeFilename(`../bad:name?.docx`)));

const sanitizedRecord = sanitizeOrderRecord({
  id: " rec-1 ", templateId: "test", title: "Тест\u0001", formData: JSON.parse('{"__proto__":"bad","safe":"ok"}'),
  createdAt: "2026-08-10T10:00:00.000Z", updatedAt: "2026-08-10T11:00:00.000Z", status: "ready",
});
assert.equal(sanitizedRecord.id, "rec-1");
assert.equal(sanitizedRecord.title, "Тест");
assert.equal(sanitizedRecord.formData.safe, "ok");
assert.equal(sanitizeOrderRecord({ recordSeries: "Кадрові питання" }).recordSeries, "Кадрові питання");
assert.equal(Object.prototype.hasOwnProperty.call(sanitizedRecord.formData, "__proto__"), false);

const model = {
  templateId: "test", category: "test", title: "Про технічну перевірку", preamble: "З метою технічної перевірки.",
  points: ["Перевірити структуру DOCX.", `<script>alert(1)</script> & перевірка.`],
  orderDate: "2026-08-10", orderNumber: "QA-1", institutionName: "Тестовий заклад", shortName: "", location: "Київ", edrpou: "12345678",
  signerPosition: "Директор", signerName: "Тестова Особа", letterheadMode: "standard", preprintedTopMm: 55, letterheadWidthMm: 170,
};
const files = buildDocxFiles(model);
assert.ok(files.has("word/document.xml"));
assert.ok(files.has("word/numbering.xml"));
assert.ok(files.has("word/header1.xml"));
const xml = new TextDecoder().decode(files.get("word/document.xml"));
const stylesXmlText = new TextDecoder().decode(files.get("word/styles.xml"));
assert.ok(!xml.includes("<script>"));
assert.ok(xml.includes("&lt;script&gt;"));
assert.ok(xml.includes("<w:numPr>"));
assert.ok(xml.includes("<w:titlePg/>"));
assert.ok(xml.includes('w:type="default" r:id="rIdHeader"'));
assert.ok(xml.includes('w:header="720"'));
assert.ok(new TextDecoder().decode(files.get("word/header1.xml")).includes(" PAGE "));
assert.ok(stylesXmlText.includes('<w:tab w:val="center" w:pos="4819"/>'));
assert.match(stylesXmlText, /Order Institution[\s\S]*?<w:spacing w:after="200"\/><w:jc w:val="center"\/>/);

const verification = verifyGeneratedDocx(model);
assert.equal(verification.ok, true, verification.errors.join("; "));
const bytes = buildDocxBytes(model);
assert.deepEqual([...bytes.slice(0, 4)], [0x50,0x4b,0x03,0x04]);
assert.equal(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(6, true), 0x0800);
const centralOffset = bytes.findIndex((value, index) => value === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x01 && bytes[index + 3] === 0x02);
assert.ok(centralOffset > 0);
assert.equal(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(centralOffset + 8, true), 0x0800);
const out = path.join(outDir, "qa-sample.docx");
fs.writeFileSync(out, bytes);




const completeProfile = {
  institutionName: "Тестовий заклад освіти", shortName: "ТЗО", location: "Київ", edrpou: "12345678",
  signerPosition: "Директор", signerName: "Тестова Особа", letterheadMode: "standard", preprintedTopMm: 55, letterheadWidthMm: 170,
};
for (const [index, template] of ORDER_TEMPLATES.entries()) {
  const raw = sampleDataForTemplate(template);
  const orderDate = template.id === "attestation-results" ? "2026-09-03" : "2026-08-10";
  const order = buildOrderModel(template, raw, completeProfile, { orderDate, orderNumber: `T-${index + 1}` });
  const validation = validateOrder({ template, rawData: raw, model: order, profile: completeProfile, letterheadAsset: null });
  assert.equal(validation.hasErrors, false, `${template.id}: ${validation.results.filter((x) => x.level === "error").map((x) => x.title).join("; ")}`);
  const generated = verifyGeneratedDocx(order);
  assert.equal(generated.ok, true, `${template.id}: ${generated.errors.join("; ")}`);
}

// Regression: numbered text inside an approved document must not be confused with manually numbered order points.
const approveTemplate = ORDER_TEMPLATES.find((template) => template.id === "approve-document");
const approveRaw = { ...sampleDataForTemplate(approveTemplate), documentName: "Положення про внутрішню систему", documentText: "1. Загальні положення\n2. Основні завдання" };
const approveModel = buildOrderModel(approveTemplate, approveRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "125-о" });
const approveVerification = verifyGeneratedDocx(approveModel);
assert.equal(approveVerification.ok, true, approveVerification.errors.join("; "));
const approveXml = new TextDecoder().decode(approveVerification.files.get("word/document.xml"));
assert.ok(approveXml.includes("1. Загальні положення"));
assert.ok(approveXml.includes("ЗАТВЕРДЖЕНО"));
assert.ok(approveXml.includes("Наказ Тестовий заклад освіти"));
assert.ok(!approveXml.includes("Додаток 1"));

const annexModel = { ...model, attachments: [{ kind: "annex", title: "Перелік", paragraphs: ["XXX-42 є легітимним інвентарним кодом"] }] };
const annexVerification = verifyGeneratedDocx(annexModel);
assert.equal(annexVerification.ok, true, annexVerification.errors.join("; "));
const annexXml = new TextDecoder().decode(annexVerification.files.get("word/document.xml"));
assert.ok(annexXml.includes("Додаток 1"));
assert.ok(annexXml.includes("до наказу Тестовий заклад"));

const enrichedModel = {
  ...model,
  grounds: "заява Ірини ІВАНОВОЇ від 01.08.2026",
  acknowledgements: [{ name: "Ірина ІВАНОВА", date: "2026-08-10" }],
  placeLayout: "separate",
};
const enrichedXml = new TextDecoder().decode(buildDocxFiles(enrichedModel).get("word/document.xml"));
assert.ok(enrichedXml.includes("Підстава: заява Ірини ІВАНОВОЇ"));
assert.ok(enrichedXml.includes("З наказом ознайомлені:"));
assert.ok(enrichedXml.includes("Ірина ІВАНОВА"));
assert.match(enrichedXml, /OrderMeta[\s\S]*?<w:tab w:val="right" w:pos="9638"\/>/);

const tableModel = { ...model, attachments: [{ kind: "annex", title: "Таблиця", columns: ["A", "B"], rows: [["1", "2"]] }] };
const tableDocumentXml = new TextDecoder().decode(buildDocxFiles(tableModel).get("word/document.xml"));
assert.match(tableDocumentXml, /<w:tblPr>[\s\S]*?<w:tblBorders>[\s\S]*?<\/w:tblBorders><w:tblLayout w:type="fixed"\/>/);
assert.ok(tableDocumentXml.includes("<w:left w:w=\"120\""));
assert.ok(tableDocumentXml.includes("<w:right w:w=\"120\""));
assert.ok(!tableDocumentXml.includes("<w:start w:w=\"120\""));

const freeTemplate = ORDER_TEMPLATES.find((template) => template.id === "free-order");
const freeModel = buildOrderModel(freeTemplate, {
  customTitle: "Про тестову нумерацію", preamble: "З метою перевірки нумерації", points: [{ text: "1. Виконати перевірку" }],
}, completeProfile, { orderDate: "2026-08-10", orderNumber: "126-о" });
assert.equal(freeModel.points[0], "Виконати перевірку.");
assert.equal(verifyGeneratedDocx(freeModel).ok, true);

const dpaTemplate = ORDER_TEMPLATES.find((template) => template.id === "dpa-exemption");
assert.ok(dpaTemplate.fields.some((field) => field.id === "documentBasis"));
assert.ok(dpaTemplate.fields.some((field) => field.id === "verifiedBasis"));
const dpaRaw = { ...sampleDataForTemplate(dpaTemplate), documentBasis: "На підставі чинного рішення", verifiedBasis: "Перевірено за офіційним джерелом" };
const dpaModel = buildOrderModel(dpaTemplate, dpaRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "5-о" });
assert.equal(dpaModel.preamble, "На підставі чинного рішення.");
assert.equal(dpaModel.reviewedLegalBasis, "Перевірено за офіційним джерелом");

const studentTemplate = ORDER_TEMPLATES.find((template) => template.id === "student-enrollment");
const incompleteStudentRaw = { ...sampleDataForTemplate(studentTemplate), students: [{ name: "Іван ІВАНОВ", className: "" }] };
const incompleteStudentModel = buildOrderModel(studentTemplate, incompleteStudentRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "7-у" });
assert.ok(!incompleteStudentModel.points.join(" ").includes("Іван ІВАНОВ — до  класу"));
assert.ok(validateOrder({ template: studentTemplate, rawData: incompleteStudentRaw, model: incompleteStudentModel, profile: completeProfile }).hasErrors);

const registrationRecords = [
  { id: "a", orderDate: "2026-01-01", orderNumber: "1-о", recordSeries: "Основна діяльність" },
  { id: "b", orderDate: "2026-02-01", orderNumber: "9-о", recordSeries: "Основна діяльність" },
  { id: "c", orderDate: "2026-03-01", orderNumber: "4-к", recordSeries: "Кадрові питання" },
];
const registrationModel = { orderDate: "2026-08-10", orderNumber: "9-о", recordSeries: "Основна діяльність" };
assert.equal(registrationStats(registrationRecords, registrationModel), 2);
assert.equal(suggestOrderNumber(registrationRecords, registrationModel), "10-о");
assert.equal(suggestOrderNumber(registrationRecords, { ...registrationModel, recordSeries: "Кадрові питання" }), "5-к");
assert.equal(findDuplicateOrderNumber(registrationRecords, registrationModel)?.id, "b");
assert.equal(findDuplicateOrderNumber(registrationRecords, registrationModel, "b"), null);

function sampleDataForTemplate(template) {
  const make = (fields) => Object.fromEntries(fields.map((field) => {
    if (field.type === "repeatable") {
      const count = Math.max(field.minItems || 1, 1);
      return [field.id, Array.from({ length: count }, () => make(field.fields))];
    }
    if (field.default !== undefined && field.default !== "") return [field.id, field.default];
    if (field.type === "date") return [field.id, "2026-09-01"];
    if (field.type === "select") {
      const first = field.options?.[0];
      return [field.id, typeof first === "string" ? first : (first?.value || "тестове значення")];
    }
    if (field.type === "person") return [field.id, field.required ? "Заступник директора — Тестова Особа" : ""];
    if (field.id === "customTitle") return [field.id, "Про тестову перевірку"];
    if (field.id === "preamble") return [field.id, "З метою проведення тестової перевірки конструктора наказів"];
    if (field.id === "verifiedBasis") return [field.id, "На підставі перевіреного нормативного рішення"];
    if (field.id === "decision") return [field.id, "Підтвердити відповідність займаній посаді та результати атестації педагогічного працівника"];
    if (field.id === "text") return [field.id, "Виконати тестове доручення"];
    return [field.id, field.required ? "тестове значення" : ""];
  }));
  return make(template.fields);
}

const imageModel = { ...model, title: "Про перевірку фірмового бланка", letterheadMode: "image", orderNumber: "QA-IMG" };
const pngBytes = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
const imageAsset = { bytes: pngBytes, mime: "image/png", width: 1200, height: 220, name: "letterhead.png" };
const imageVerification = verifyGeneratedDocx(imageModel, imageAsset);
assert.equal(imageVerification.ok, true, imageVerification.errors.join("; "));
assert.ok(imageVerification.files.has("word/media/letterhead.png"));
assert.ok(new TextDecoder().decode(imageVerification.files.get("word/document.xml")).includes('descr="Фірмовий бланк закладу освіти'));
fs.writeFileSync(path.join(outDir, "qa-letterhead.docx"), imageVerification.bytes);

const tallImage = { ...imageAsset, width: 500, height: 2000, name: "tall.png" };
const tallImageXml = new TextDecoder().decode(buildDocxFiles(imageModel, tallImage).get("word/document.xml"));
assert.ok(tallImageXml.includes(`cy="${60 * 36000}"`), "Letterhead height must be capped at 60 mm");

const preprintedModel = { ...model, letterheadMode: "preprinted", preprintedTopMm: 61 };
const preprintedXml = new TextDecoder().decode(buildDocxFiles(preprintedModel).get("word/document.xml"));
assert.ok(preprintedXml.includes(`w:top="${Math.round(61 * 56.6929133858)}"`));

const baseTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-year-organization");
const baseRaw = sampleDataForTemplate(baseTemplate);
const missingNumberModel = buildOrderModel(baseTemplate, baseRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "" });
assert.ok(validateOrder({ template: baseTemplate, rawData: baseRaw, model: missingNumberModel, profile: completeProfile }).hasErrors);
const draftValidation = validateOrder({ template: baseTemplate, rawData: baseRaw, model: missingNumberModel, profile: completeProfile, allowDraft: true });
assert.equal(draftValidation.hasErrors, false);
assert.ok(draftValidation.results.some((result) => result.level === "warn" && result.title.includes("номер")));
assert.equal(isOrderReady(draftValidation), false);
const completeBaseModel = buildOrderModel(baseTemplate, baseRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "20-о" });
const completeBaseValidation = validateOrder({ template: baseTemplate, rawData: baseRaw, model: completeBaseModel, profile: completeProfile, allowDraft: true });
assert.ok(completeBaseValidation.results.some((result) => result.level === "warn" && result.title.includes("шапка")));
assert.equal(isOrderReady(completeBaseValidation), true);

const commissionTemplate = ORDER_TEMPLATES.find((template) => template.id === "attestation-commission");
const commissionRaw = { ...sampleDataForTemplate(commissionTemplate), employeeCount: 14 };
const commissionModel = buildOrderModel(commissionTemplate, commissionRaw, completeProfile, { orderDate: "2026-09-10", orderNumber: "12-к" });
assert.ok(validateOrder({ template: commissionTemplate, rawData: commissionRaw, model: commissionModel, profile: completeProfile }).results.some((result) => result.level === "error" && result.title.includes("не може створити")));

const appendixTemplate = ORDER_TEMPLATES.find((template) => template.id === "attestation-list-schedule");
const appendixRaw = sampleDataForTemplate(appendixTemplate);
const appendixModel = buildOrderModel(appendixTemplate, appendixRaw, completeProfile, { orderDate: "2026-10-10", orderNumber: "18-к" });
assert.equal(appendixModel.attachments.length, 2);
const appendixXml = new TextDecoder().decode(buildDocxFiles(appendixModel).get("word/document.xml"));
assert.ok(appendixXml.includes("<w:tbl>"));
assert.ok(appendixXml.includes("Графік засідань атестаційної комісії"));
assert.equal((appendixXml.match(/<w:pgNumType w:start="1"\/>/g) || []).length, 3);
assert.equal((appendixXml.match(/<w:type w:val="nextPage"\/>/g) || []).length, 2);
fs.writeFileSync(path.join(outDir, "qa-appendices.docx"), buildDocxBytes(appendixModel));
const lateAppendixModel = buildOrderModel(appendixTemplate, appendixRaw, completeProfile, { orderDate: "2026-10-21", orderNumber: "19-о" });
assert.ok(validateOrder({ template: appendixTemplate, rawData: appendixRaw, model: lateAppendixModel, profile: completeProfile }).results.some((result) => result.level === "error" && result.title.includes("20 жовтня")));

const attestationResultsTemplate = ORDER_TEMPLATES.find((template) => template.id === "attestation-results");
const lateAttestationRaw = { ...sampleDataForTemplate(attestationResultsTemplate), decisionDate: "2026-03-02" };
const lateAttestationModel = buildOrderModel(attestationResultsTemplate, lateAttestationRaw, completeProfile, { orderDate: "2026-03-20", orderNumber: "21-к" });
const lateAttestationValidation = validateOrder({ template: attestationResultsTemplate, rawData: lateAttestationRaw, model: lateAttestationModel, profile: completeProfile });
const workingDayWarning = lateAttestationValidation.results.find((result) => result.title.includes("7-денний"));
assert.equal(workingDayWarning?.level, "warn");
assert.equal(workingDayWarning?.affectsReadiness, true);
assert.equal(lateAttestationValidation.hasErrors, false);

const originalLocalStorage = globalThis.localStorage;
const originalIndexedDB = globalThis.indexedDB;
delete globalThis.indexedDB;

assert.equal(isQuotaExceeded({ name: "QuotaExceededError" }), true);
assert.equal(isQuotaExceeded({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
assert.equal(isQuotaExceeded({ code: 22 }), true);
assert.equal(isQuotaExceeded(new Error("quota")), false);

const fallbackKey = "school-order-constructor.saved-orders.v1";
const quotaRecords = Array.from({ length: 5 }, (_, index) => ({
  id: `quota-${index + 1}`,
  templateId: "test",
  title: `Про тест ${index + 1}`,
  category: "test",
  orderDate: "2026-08-12",
  orderNumber: String(index + 1),
  status: "draft",
  createdAt: `2026-08-12T10:0${index}:00.000Z`,
  updatedAt: `2026-08-12T10:0${index}:00.000Z`,
  formData: { text: "x".repeat(180) },
}));
const fallbackCapacity = JSON.stringify(quotaRecords.slice(1, 4).map(sanitizeOrderRecord)).length;
const quotaStorageValues = new Map();
globalThis.localStorage = {
  getItem(key) { return quotaStorageValues.get(String(key)) ?? null; },
  setItem(key, value) {
    const serialized = String(value);
    if (String(key) === fallbackKey && serialized.length > fallbackCapacity) {
      const error = new Error("quota reached");
      error.name = "QuotaExceededError";
      throw error;
    }
    quotaStorageValues.set(String(key), serialized);
  },
  removeItem(key) { quotaStorageValues.delete(String(key)); },
};

let quotaSaveResult;
for (const record of quotaRecords.slice(0, 4)) quotaSaveResult = await saveOrderRecord(record);
assert.equal(quotaSaveResult.fallbackEvicted, 1);
assert.deepEqual(JSON.parse(quotaStorageValues.get(fallbackKey)).map((record) => record.id), ["quota-4", "quota-3", "quota-2"]);

const importResult = await importOrderRecords(quotaRecords.slice(4));
assert.deepEqual(importResult, { count: 1, evicted: 1 });
assert.deepEqual(JSON.parse(quotaStorageValues.get(fallbackKey)).map((record) => record.id), ["quota-5", "quota-4", "quota-3"]);

globalThis.localStorage = {
  getItem() { return null; },
  setItem() { throw new Error("quota"); },
  removeItem() { throw new Error("denied"); },
};
assert.throws(() => saveProfile(completeProfile), /Не вдалося зберегти профіль/);
assert.throws(() => clearProfile(), /Не вдалося видалити профіль/);
await assert.rejects(() => saveOrderRecord({ id: "storage-test", templateId: "test", title: "Про тест" }), /Не вдалося зберегти наказ/);
if (originalLocalStorage === undefined) delete globalThis.localStorage;
else globalThis.localStorage = originalLocalStorage;
if (originalIndexedDB === undefined) delete globalThis.indexedDB;
else globalThis.indexedDB = originalIndexedDB;

console.log(`OK: ${ORDER_TEMPLATES.length} templates; standard + image-letterhead DOCX samples written to ${outDir}`);
