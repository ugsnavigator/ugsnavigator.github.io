import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { ORDER_TEMPLATES, ACADEMIC_MONTHS } from "../js/templates.js";
import { xmlEscape, sanitizeFilename, validateTemplateSchemas, buildOrderModel, validateOrder } from "../js/core.js";
import { buildDocxFiles, buildDocxBytes, crc32, verifyGeneratedDocx } from "../js/docx.js";
import { detectImageMime } from "../js/image.js";
import { sanitizeOrderRecord } from "../js/storage.js";

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
assert.ok(!indexHtml.includes('type="module" src="js/app.js"'));
assert.ok(testsHtml.includes('src="js/tests.bundle.js"'));
const appBundle = fs.readFileSync(path.join(projectRoot, "js/app.bundle.js"), "utf8");
const testsBundle = fs.readFileSync(path.join(projectRoot, "js/tests.bundle.js"), "utf8");
assert.doesNotThrow(() => new vm.Script(appBundle));
assert.doesNotThrow(() => new vm.Script(testsBundle));
assert.ok(!/^\s*import\s/m.test(appBundle));
assert.ok(!/^\s*export\s/m.test(appBundle));

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
assert.equal(Object.prototype.hasOwnProperty.call(sanitizedRecord.formData, "__proto__"), false);

const model = {
  templateId: "test", category: "test", title: "Про технічну перевірку", preamble: "З метою технічної перевірки.",
  points: ["Перевірити структуру DOCX.", `<script>alert(1)</script> & перевірка.`],
  orderDate: "2026-08-10", orderNumber: "QA-1", institutionName: "Тестовий заклад", shortName: "", location: "Київ", edrpou: "12345678",
  signerPosition: "Директор", signerName: "Тестова Особа", letterheadMode: "standard", preprintedTopMm: 55, letterheadWidthMm: 170,
};
const files = buildDocxFiles(model);
assert.ok(files.has("word/document.xml"));
const xml = new TextDecoder().decode(files.get("word/document.xml"));
assert.ok(!xml.includes("<script>"));
assert.ok(xml.includes("&lt;script&gt;"));

const verification = verifyGeneratedDocx(model);
assert.equal(verification.ok, true, verification.errors.join("; "));
const bytes = buildDocxBytes(model);
assert.deepEqual([...bytes.slice(0, 4)], [0x50,0x4b,0x03,0x04]);
const out = path.join(outDir, "qa-sample.docx");
fs.writeFileSync(out, bytes);




const completeProfile = {
  institutionName: "Тестовий заклад освіти", shortName: "ТЗО", location: "Київ", edrpou: "12345678",
  signerPosition: "Директор", signerName: "Тестова Особа", letterheadMode: "standard", preprintedTopMm: 55, letterheadWidthMm: 170,
};
for (const [index, template] of ORDER_TEMPLATES.entries()) {
  const raw = sampleDataForTemplate(template);
  const order = buildOrderModel(template, raw, completeProfile, { orderDate: "2026-08-10", orderNumber: `T-${index + 1}` });
  const validation = validateOrder({ template, rawData: raw, model: order, profile: completeProfile, letterheadAsset: null });
  assert.equal(validation.hasErrors, false, `${template.id}: ${validation.results.filter((x) => x.level === "error").map((x) => x.title).join("; ")}`);
  const generated = verifyGeneratedDocx(order);
  assert.equal(generated.ok, true, `${template.id}: ${generated.errors.join("; ")}`);
}

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
fs.writeFileSync(path.join(outDir, "qa-letterhead.docx"), imageVerification.bytes);

const preprintedModel = { ...model, letterheadMode: "preprinted", preprintedTopMm: 61 };
const preprintedXml = new TextDecoder().decode(buildDocxFiles(preprintedModel).get("word/document.xml"));
assert.ok(preprintedXml.includes(`w:top="${Math.round(61 * 56.6929133858)}"`));

console.log(`OK: ${ORDER_TEMPLATES.length} templates; standard + image-letterhead DOCX samples written to ${outDir}`);
