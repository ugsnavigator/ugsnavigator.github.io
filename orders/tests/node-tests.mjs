import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { ORDER_TEMPLATES, ACADEMIC_MONTHS, RECORD_SERIES_OPTIONS } from "../js/templates.js";
import { xmlEscape, sanitizeFilename, validateTemplateSchemas, buildOrderModel, validateOrder, containsPlaceholder, isOrderReady, lintOrderModel, flattenDirectives } from "../js/core.js";
import { buildDocxFiles, buildDocxBytes, crc32, verifyGeneratedDocx } from "../js/docx.js";
import { detectImageMime } from "../js/image.js";
import { sanitizeOrderRecord, saveProfile, clearProfile, saveOrderRecord, importOrderRecords, isQuotaExceeded } from "../js/storage.js";
import { findDuplicateOrderNumber, registrationStats, suggestOrderNumber } from "../js/registration.js";
import { LEGAL_BASIS_AUDIT, LEGAL_BASIS_CATALOG, formatLegalBasis, getLegalBasisAudit } from "../js/legal-basis.js";
import { AUGUST_PACKAGE_BLUEPRINT, createAugustPackageRecords, persistOrderPackage, validateOrderPackage } from "../js/order-package.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "output");
fs.mkdirSync(outDir, { recursive: true });

// Smoke-check the distribution entry points used by a user who double-clicks index.html.
const projectRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const testsHtml = fs.readFileSync(path.join(projectRoot, "tests.html"), "utf8");
assert.ok(indexHtml.includes('src="js/app.bundle.js"'));
assert.ok(indexHtml.includes('id="saved-orders-list"'));
assert.ok(indexHtml.includes('id="create-free-order"'));
assert.ok(indexHtml.includes("Спосіб 1 · готовий шаблон"));
assert.ok(indexHtml.includes("Спосіб 2 · без готового шаблону"));
assert.ok(indexHtml.includes('id="export-profile"'));
assert.ok(indexHtml.includes('id="print-root"'));
assert.ok(indexHtml.includes('id="editor-validation-bar"'));
assert.ok(indexHtml.includes('id="template-sample-panel"'));
assert.ok(indexHtml.includes('id="template-sample-text"'));
assert.ok(indexHtml.includes('id="auto-text-title"'));
assert.ok(indexHtml.includes('id="auto-text-description"'));
assert.ok(indexHtml.includes('id="create-august-package"'));
assert.ok(indexHtml.includes('id="validate-order-package"'));
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
assert.ok(stylesCss.includes(".a4-page .order-title { text-align: left"));
assert.ok(fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8").includes("samples/"));
assert.ok(JSON.parse(fs.readFileSync(path.join(projectRoot, "firebase.json"), "utf8")).hosting.ignore.includes("samples/**"));

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
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "class-teachers").recordSeries, "Кадрові питання");
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "pedagogical-workload").recordSeries, "Кадрові питання");
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "student-enrollment").recordSeries, "Рух здобувачів освіти");
assert.equal(ORDER_TEMPLATES.find((template) => template.id === "attestation-results").recordSeries, "Кадрові питання");
assert.equal(containsPlaceholder("Кабінет XXX, завдання TODO"), false);
assert.equal(containsPlaceholder("Заповніть {{person}}"), true);
assert.equal(containsPlaceholder("[ПІБ працівника]"), true);
assert.equal(containsPlaceholder("протокол №"), true);
assert.equal(containsPlaceholder("рішення від ___"), true);
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
assert.match(stylesXmlText, /Order Title[\s\S]*?<w:jc w:val="left"\/>/);
assert.ok(!new TextDecoder().decode(files.get("docProps/core.xml")).includes(model.institutionName));

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
let selectBranchScenarioCount = 0;
for (const [index, template] of ORDER_TEMPLATES.entries()) {
  const raw = sampleDataForTemplate(template);
  const orderDate = template.id === "attestation-results" ? "2026-09-03" : "2026-08-10";
  const order = buildOrderModel(template, raw, completeProfile, { orderDate, orderNumber: `T-${index + 1}` });
  const validation = validateOrder({ template, rawData: raw, model: order, profile: completeProfile, letterheadAsset: null });
  assert.equal(validation.hasErrors, false, `${template.id}: ${validation.results.filter((x) => x.level === "error").map((x) => x.title).join("; ")}`);
  const generated = verifyGeneratedDocx(order);
  assert.equal(generated.ok, true, `${template.id}: ${generated.errors.join("; ")}`);
  // Шаблон не має сам породжувати те, що лінтер вважає дефектом:
  // биті роки, минулі строки, ручну нумерацію чи порожні комірки таблиць.
  const lint = lintOrderModel(order);
  assert.deepEqual(lint, [], `${template.id}: лінтер — ${lint.map((x) => x.title).join("; ")}`);
  // Виконавець відкриває пункт, тому завжди має бути з великої літери.
  for (const directive of flattenDirectives(order.directives)) {
    const first = directive.executor.charAt(0);
    assert.ok(
      !first || first !== first.toLocaleLowerCase("uk-UA") || first === first.toLocaleUpperCase("uk-UA"),
      `${template.id}: виконавець з малої літери — «${directive.executor}»`,
    );
  }

  const baselineFingerprint = orderOutputFingerprint(order);
  for (const scenario of selectBranchScenarios(template, raw)) {
    const branchOrder = buildOrderModel(template, scenario.rawData, completeProfile, { orderDate, orderNumber: `B-${index + 1}` });
    const branchValidation = validateOrder({ template, rawData: scenario.rawData, model: branchOrder, profile: completeProfile, letterheadAsset: null });
    assert.equal(
      branchValidation.hasErrors,
      false,
      `${template.id} [${scenario.name}]: ${branchValidation.results.filter((x) => x.level === "error").map((x) => x.title).join("; ")}`,
    );
    const branchLint = lintOrderModel(branchOrder);
    assert.deepEqual(branchLint, [], `${template.id} [${scenario.name}]: лінтер — ${branchLint.map((x) => x.title).join("; ")}`);
    const branchDocx = verifyGeneratedDocx(branchOrder);
    assert.equal(branchDocx.ok, true, `${template.id} [${scenario.name}]: ${branchDocx.errors.join("; ")}`);
    if (scenario.expectsOutputChange) {
      assert.notEqual(orderOutputFingerprint(branchOrder), baselineFingerprint, `${template.id} [${scenario.name}]: значення select не вплинуло на документ`);
    }
    selectBranchScenarioCount += 1;
  }
}
assert.ok(selectBranchScenarioCount >= 35, `очікувалося щонайменше 35 сценаріїв select, отримано ${selectBranchScenarioCount}`);

const corpusSafetyTemplateIds = [
  "air-raid-actions",
  "occupational-safety-organization",
  "road-traffic-safety",
  "fire-safety-regime",
  "evacuation-training",
  "primary-workplace-briefings",
];
assert.ok(corpusSafetyTemplateIds.every((id) => ORDER_TEMPLATES.some((template) => template.id === id)));

const airRaidTemplate = ORDER_TEMPLATES.find((template) => template.id === "air-raid-actions");
const airRaidRaw = {
  ...sampleDataForTemplate(airRaidTemplate),
  legalBasis: [],
  classRoutes: [
    { className: "1-А клас", route: "Вхід № 3", shelterPlace: "Кімната 1", students: 24 },
    { className: "2-А клас", route: "Вхід № 4", shelterPlace: "Кімната 2", students: 22 },
  ],
};
const airRaidModel = buildOrderModel(airRaidTemplate, airRaidRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "4-о" });
assert.deepEqual(airRaidModel.legalBasisIds, ["code-civil-protection-5403", "cmu-evacuation-841"]);
assert.equal(airRaidModel.bodyTables[0].rows.length, 2);
assert.equal(airRaidModel.bodyTables[0].rows[1][0], "2-А клас");
assert.equal(airRaidModel.attachments[0].kind, "approved");
assert.ok(flattenDirectives(airRaidModel.directives).some((directive) => directive.level === 1));
const airRaidVerification = verifyGeneratedDocx(airRaidModel);
assert.equal(airRaidVerification.ok, true, airRaidVerification.errors.join("; "));
const airRaidXml = new TextDecoder().decode(airRaidVerification.files.get("word/document.xml"));
assert.ok(airRaidXml.includes("До 01.09.2026"));
assert.ok(!airRaidXml.includes(">2026-09-01<"));
assert.ok(airRaidXml.includes("Маршрути переміщення класів до укриття"));
fs.writeFileSync(path.join(outDir, "qa-air-raid.docx"), airRaidVerification.bytes);

const fireTemplate = ORDER_TEMPLATES.find((template) => template.id === "fire-safety-regime");
const fireModel = buildOrderModel(fireTemplate, { ...sampleDataForTemplate(fireTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "13-аг" });
assert.deepEqual(fireModel.legalBasisIds, ["code-civil-protection-5403", "mvs-fire-rules-1417", "mon-fire-schools-974"]);
assert.equal(fireModel.recordSeries, "Адміністративно-господарські питання");
assert.ok(fireModel.attachments[0].paragraphs.length >= 6);

const schoolStartTemplateIds = [
  "school-year-organization",
  "school-work-regime",
  "educational-program-introduction",
  "new-school-year-preparation",
  "class-network-approval",
  "pedagogical-council-decisions",
];
assert.ok(schoolStartTemplateIds.every((id) => ORDER_TEMPLATES.some((template) => template.id === id)));

const schoolYearTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-year-organization");
const schoolYearModel = buildOrderModel(schoolYearTemplate, { ...sampleDataForTemplate(schoolYearTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "1-о" });
assert.ok(schoolYearModel.title.includes("2026/2027"));
assert.deepEqual(schoolYearModel.legalBasisIds, ["law-education-2145", "law-secondary-463", "cmu-school-year-847"]);
assert.ok(flattenDirectives(schoolYearModel.directives).some((directive) => directive.level === 1));

const workRegimeTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-work-regime");
const workRegimeModel = buildOrderModel(workRegimeTemplate, { ...sampleDataForTemplate(workRegimeTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "2-о" });
assert.equal(workRegimeModel.attachments.length, 1);
assert.ok(workRegimeModel.attachments[0].paragraphs.some((paragraph) => paragraph.includes("1 класи — 35 хвилин")));
assert.ok(workRegimeModel.title.includes("2026/2027"));

const educationalProgramTemplate = ORDER_TEMPLATES.find((template) => template.id === "educational-program-introduction");
const educationalProgramRaw = {
  ...sampleDataForTemplate(educationalProgramTemplate),
  legalBasis: [],
  hourRedistribution: [
    { className: "5 клас", subject: "Українська мова", hours: "1" },
    { className: "5 клас", subject: "Пізнаємо природу", hours: "0,5" },
  ],
};
const educationalProgramModel = buildOrderModel(educationalProgramTemplate, educationalProgramRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "3-о" });
assert.equal(educationalProgramModel.bodyTables[0].title, "Перерозподіл навчальних годин");
assert.equal(educationalProgramModel.bodyTables[0].rows.length, 2);
assert.ok(educationalProgramModel.preamble.includes("протокол № 1"));

const preparationTemplate = ORDER_TEMPLATES.find((template) => template.id === "new-school-year-preparation");
const preparationModel = buildOrderModel(preparationTemplate, { ...sampleDataForTemplate(preparationTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-01", orderNumber: "5-о" });
assert.equal(preparationModel.attachments.length, 2);
assert.ok(preparationModel.attachments[1].rows.length >= 6);
assert.ok(preparationModel.attachments[1].rows.every((row) => row.every(Boolean)));

const classNetworkTemplate = ORDER_TEMPLATES.find((template) => template.id === "class-network-approval");
const classNetworkRaw = {
  ...sampleDataForTemplate(classNetworkTemplate),
  legalBasis: [],
  classes: [
    { className: "1-А клас", students: 24, features: "" },
    { className: "2-А клас", students: 22, features: "інклюзивний" },
  ],
  individualStudents: [],
  classGroups: [],
};
const classNetworkModel = buildOrderModel(classNetworkTemplate, classNetworkRaw, completeProfile, { orderDate: "2026-08-31", orderNumber: "21-о" });
assert.equal(classNetworkModel.bodyTables[0].rows[0][2], "—");
assert.equal(classNetworkModel.bodyTables[0].rows.length, 2);
assert.equal(validateOrder({ template: classNetworkTemplate, rawData: classNetworkRaw, model: classNetworkModel, profile: completeProfile }).hasErrors, false);

const thirdStageTemplateIds = [
  "sports-facilities-readiness",
  "electrical-facilities-responsible",
  "room-managers",
  "class-teachers",
  "school-readiness-results",
  "pedagogical-workload",
  "shelter-responsible",
];
assert.ok(thirdStageTemplateIds.every((id) => ORDER_TEMPLATES.some((template) => template.id === id)));

const sportsTemplate = ORDER_TEMPLATES.find((template) => template.id === "sports-facilities-readiness");
const sportsModel = buildOrderModel(sportsTemplate, { ...sampleDataForTemplate(sportsTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "10-аг" });
assert.deepEqual(sportsModel.legalBasisIds, ["law-labor-protection-2694", "mon-safety-1669", "mon-physical-safety-521"]);
assert.equal(sportsModel.attachments[0].kind, "approved");
assert.ok(sportsModel.attachments[0].rows.length >= 3);

const electricalTemplate = ORDER_TEMPLATES.find((template) => template.id === "electrical-facilities-responsible");
const electricalModel = buildOrderModel(electricalTemplate, { ...sampleDataForTemplate(electricalTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "12-аг" });
assert.deepEqual(electricalModel.legalBasisIds, ["law-labor-protection-2694", "energy-operation-258", "electrical-safety-4", "mvs-fire-rules-1417"]);
assert.ok(flattenDirectives(electricalModel.directives).some((directive) => directive.text.includes("Підстава кваліфікації")));

const roomManagersTemplate = ORDER_TEMPLATES.find((template) => template.id === "room-managers");
const roomManagersModel = buildOrderModel(roomManagersTemplate, { ...sampleDataForTemplate(roomManagersTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "14-к" });
assert.equal(roomManagersModel.bodyTables[0].title, "Закріплення кабінетів і спеціалізованих приміщень");
assert.ok(roomManagersModel.bodyTables[0].rows.every((row) => row.every(Boolean)));

const classTeachersTemplate = ORDER_TEMPLATES.find((template) => template.id === "class-teachers");
const classTeachersRaw = { ...sampleDataForTemplate(classTeachersTemplate), legalBasis: [], deputy: "заступника директора з виховної роботи" };
const classTeachersModel = buildOrderModel(classTeachersTemplate, classTeachersRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "15-к" });
assert.equal(classTeachersModel.bodyTables[0].title, "Класні керівники");
assert.ok(flattenDirectives(classTeachersModel.directives).some((directive) => directive.text.includes("заступника директора з виховної роботи")));

const readinessTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-readiness-results");
const readinessModel = buildOrderModel(readinessTemplate, { ...sampleDataForTemplate(readinessTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "18-о" });
assert.equal(readinessModel.bodyTables[0].title, "Результати готовності за напрямами");
assert.ok(readinessModel.bodyTables[0].rows.length >= 5);
assert.ok(readinessModel.bodyTables[0].rows.every((row) => row.every(Boolean)));

const workloadTemplate = ORDER_TEMPLATES.find((template) => template.id === "pedagogical-workload");
const workloadModel = buildOrderModel(workloadTemplate, { ...sampleDataForTemplate(workloadTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "22-к" });
assert.deepEqual(workloadModel.legalBasisIds, ["law-education-2145", "law-secondary-463", "labor-code-322"]);
assert.equal(workloadModel.bodyTables[0].columns.length, 7);
assert.ok(workloadModel.bodyTables[0].rows.every((row) => row.every(Boolean)));

const shelterTemplate = ORDER_TEMPLATES.find((template) => template.id === "shelter-responsible");
const shelterModel = buildOrderModel(shelterTemplate, { ...sampleDataForTemplate(shelterTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "29-к" });
assert.deepEqual(shelterModel.legalBasisIds, ["code-civil-protection-5403", "mvs-shelter-579"]);
assert.ok(shelterModel.preamble.includes("місткістю"));

const fourthStageTemplateIds = [
  "inclusive-education-organization",
  "school-meals",
  "student-medical-care",
  "employee-medical-examinations",
  "first-grade-distribution",
];
assert.ok(fourthStageTemplateIds.every((id) => ORDER_TEMPLATES.some((template) => template.id === id)));

const inclusionTemplate = ORDER_TEMPLATES.find((template) => template.id === "inclusive-education-organization");
const inclusionModel = buildOrderModel(inclusionTemplate, { ...sampleDataForTemplate(inclusionTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "8-о" });
assert.deepEqual(inclusionModel.legalBasisIds, ["law-education-2145", "law-secondary-463", "cmu-inclusive-957", "mon-support-team-609", "cmu-assistive-tools-1289", "mon-assistive-list-414"]);
assert.equal(inclusionModel.attachments[0].title, "Склад команди психолого-педагогічного супроводу");
assert.ok(inclusionModel.attachments[0].rows.length >= 4);
assert.ok(flattenDirectives(inclusionModel.directives).some((directive) => directive.text.includes("індивідуальну програму розвитку")));

const mealsTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-meals");
const mealsModel = buildOrderModel(mealsTemplate, { ...sampleDataForTemplate(mealsTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "17-о" });
assert.deepEqual(mealsModel.legalBasisIds, ["law-education-2145", "law-secondary-463", "cmu-school-meals-305", "moh-sanitary-2205"]);
assert.equal(mealsModel.bodyTables[0].title, "Графік харчування учнів");
assert.equal(mealsModel.attachments.length, 2);
assert.ok(mealsModel.attachments.every((attachment) => attachment.rows.every((row) => row.every(Boolean))));

const studentMedicalTemplate = ORDER_TEMPLATES.find((template) => template.id === "student-medical-care");
const studentMedicalModel = buildOrderModel(studentMedicalTemplate, { ...sampleDataForTemplate(studentMedicalTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "19-о" });
assert.deepEqual(studentMedicalModel.legalBasisIds, ["law-education-2145", "law-secondary-463", "cmu-student-medical-31", "law-infectious-diseases-1645", "law-public-health-2573", "moh-sanitary-2205"]);
assert.ok(flattenDirectives(studentMedicalModel.directives).some((directive) => directive.deadline?.value === "Негайно"));

const employeeMedicalTemplate = ORDER_TEMPLATES.find((template) => template.id === "employee-medical-examinations");
const employeeMedicalModel = buildOrderModel(employeeMedicalTemplate, { ...sampleDataForTemplate(employeeMedicalTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "20-к" });
assert.ok(employeeMedicalModel.legalBasisIds.includes("cmu-preventive-medical-559"));
assert.ok(employeeMedicalModel.legalBasisIds.includes("moh-employee-medical-1393"));
assert.ok(flattenDirectives(employeeMedicalModel.directives).some((directive) => directive.text.includes("без розкриття надлишкових")));
assert.ok(!employeeMedicalModel.preamble.includes("усіх працівників"));

const distributionTemplate = ORDER_TEMPLATES.find((template) => template.id === "first-grade-distribution");
const distributionRaw = {
  ...sampleDataForTemplate(distributionTemplate),
  legalBasis: [],
  classes: [
    { className: "1-А", teacher: "учитель 1-А класу" },
    { className: "1-Б", teacher: "учитель 1-Б класу" },
  ],
  students: [
    { student: "Тестовий Учень Один", className: "1-А" },
    { student: "Тестова Учениця Два", className: "1-Б" },
  ],
};
const distributionModel = buildOrderModel(distributionTemplate, distributionRaw, completeProfile, { orderDate: "2026-08-29", orderNumber: "24-у" });
assert.equal(distributionModel.bodyTables[0].rows.length, 2);
assert.equal(distributionModel.attachments[0].rows.length, 2);
assert.equal(validateOrder({ template: distributionTemplate, rawData: distributionRaw, model: distributionModel, profile: completeProfile }).hasErrors, false);
const badDistributionRaw = { ...distributionRaw, students: [{ student: "Тестовий Учень", className: "1-В" }] };
const badDistributionModel = buildOrderModel(distributionTemplate, badDistributionRaw, completeProfile, { orderDate: "2026-08-29", orderNumber: "24-у" });
assert.ok(validateOrder({ template: distributionTemplate, rawData: badDistributionRaw, model: badDistributionModel, profile: completeProfile }).results.some((result) => result.title === "Учня прив’язано до неоголошеного класу"));

const fifthStageTemplateIds = [
  "autumn-winter-readiness",
  "technical-inspection-commission",
  "harmful-habits-prevention",
  "safety-class-operation",
  "safe-healthy-school-strategy",
  "first-lesson",
  "teacher-of-year-participation",
  "assessment-system-approval",
];
assert.equal(ORDER_TEMPLATES.length, 54);
assert.ok(fifthStageTemplateIds.every((id) => ORDER_TEMPLATES.some((template) => template.id === id)));

const winterReadinessTemplate = ORDER_TEMPLATES.find((template) => template.id === "autumn-winter-readiness");
const winterReadinessModel = buildOrderModel(winterReadinessTemplate, { ...sampleDataForTemplate(winterReadinessTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "6-а" });
assert.deepEqual(winterReadinessModel.legalBasisIds, ["law-labor-protection-2694", "heat-preparation-620-378", "mon-safety-1669"]);
assert.equal(winterReadinessModel.bodyTables[0].columns.length, 4);
assert.equal(winterReadinessModel.attachments[0].title, "Склад робочої групи з перевірки готовності");

const technicalCommissionTemplate = ORDER_TEMPLATES.find((template) => template.id === "technical-inspection-commission");
const technicalCommissionModel = buildOrderModel(technicalCommissionTemplate, { ...sampleDataForTemplate(technicalCommissionTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "11-а" });
assert.equal(technicalCommissionModel.attachments[0].rows.length, 3);
assert.ok(flattenDirectives(technicalCommissionModel.directives).some((directive) => directive.deadline?.value === "Негайно"));

const preventionTemplate = ORDER_TEMPLATES.find((template) => template.id === "harmful-habits-prevention");
const preventionModel = buildOrderModel(preventionTemplate, { ...sampleDataForTemplate(preventionTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "16-о" });
assert.ok(preventionModel.legalBasisIds.includes("law-tobacco-2899"));
assert.equal(preventionModel.bodyTables[0].title, "План профілактичних заходів");

const safetyClassTemplate = ORDER_TEMPLATES.find((template) => template.id === "safety-class-operation");
const safetyClassModel = buildOrderModel(safetyClassTemplate, { ...sampleDataForTemplate(safetyClassTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "25-о" });
assert.ok(safetyClassModel.legalBasisIds.includes("mon-safety-class-135"));
assert.equal(safetyClassModel.bodyTables[0].rows.length, 6);

const safeSchoolTemplate = ORDER_TEMPLATES.find((template) => template.id === "safe-healthy-school-strategy");
const safeSchoolModel = buildOrderModel(safeSchoolTemplate, { ...sampleDataForTemplate(safeSchoolTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-12", orderNumber: "27-о" });
assert.equal(safeSchoolModel.bodyTables.length, 1);
assert.equal(safeSchoolModel.attachments.length, 1);
assert.ok(safeSchoolModel.legalBasisIds.includes("president-safe-school-195-2020"));

const firstLessonTemplate = ORDER_TEMPLATES.find((template) => template.id === "first-lesson");
const firstLessonRaw = { ...sampleDataForTemplate(firstLessonTemplate), legalBasis: [], theme: "Мова гідності", currentGuidance: "листа МОН від 01.08.2026 № 1/1234-26" };
const firstLessonModel = buildOrderModel(firstLessonTemplate, firstLessonRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "28-о" });
assert.ok(firstLessonModel.title.includes("Мова гідності"));
assert.ok(firstLessonModel.preamble.includes("№ 1/1234-26"));

const teacherYearTemplate = ORDER_TEMPLATES.find((template) => template.id === "teacher-of-year-participation");
const teacherYearRaw = { ...sampleDataForTemplate(teacherYearTemplate), legalBasis: [], annualOrder: "наказу МОН від 01.08.2026 № 999" };
const teacherYearModel = buildOrderModel(teacherYearTemplate, teacherYearRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "30-к" });
assert.equal(teacherYearModel.legalBasisIds.length, 3);
const badTeacherYearRaw = { ...teacherYearRaw, registrationFrom: "2026-11-10", registrationTo: "2026-11-09" };
const badTeacherYearModel = buildOrderModel(teacherYearTemplate, badTeacherYearRaw, completeProfile, { orderDate: "2026-08-12", orderNumber: "30-к" });
assert.ok(validateOrder({ template: teacherYearTemplate, rawData: badTeacherYearRaw, model: badTeacherYearModel, profile: completeProfile }).results.some((result) => result.title === "Некоректне реєстраційне вікно"));

const assessmentTemplate = ORDER_TEMPLATES.find((template) => template.id === "assessment-system-approval");
const assessmentModel = buildOrderModel(assessmentTemplate, { ...sampleDataForTemplate(assessmentTemplate), legalBasis: [] }, completeProfile, { orderDate: "2026-08-29", orderNumber: "32-о" });
assert.ok(assessmentModel.legalBasisIds.includes("law-academic-integrity-4742"));
assert.ok(assessmentModel.legalBasisIds.includes("mon-assessment-system-722"));
assert.equal(assessmentModel.attachments[0].rows.length, 4);
assert.ok(assessmentModel.preamble.includes("протокол № 1"));

const packageBase = { category: "Серпневий пакет", recordSeries: "Основна діяльність", orderDate: "2026-08-12", orderNumber: "", status: "draft" };
const structuredNetworkRecord = { ...packageBase, id: "structured-network", title: classNetworkModel.title, templateId: classNetworkTemplate.id, formData: classNetworkRaw };
const structuredSafetyRecord = { ...packageBase, id: "structured-safety", title: airRaidModel.title, templateId: airRaidTemplate.id, formData: airRaidRaw };
assert.ok(!validateOrderPackage([structuredNetworkRecord, structuredSafetyRecord], ORDER_TEMPLATES, completeProfile).some((result) => result.title.includes("Не всі класи")));
const missingStructuredSafetyRecord = { ...structuredSafetyRecord, id: "structured-safety-missing", formData: { ...airRaidRaw, classRoutes: airRaidRaw.classRoutes.slice(0, 1) } };
assert.equal(validateOrderPackage([structuredNetworkRecord, missingStructuredSafetyRecord], ORDER_TEMPLATES, completeProfile).find((result) => result.title.includes("Не всі класи"))?.detail, "Відсутні: 2-А.");

const councilTemplate = ORDER_TEMPLATES.find((template) => template.id === "pedagogical-council-decisions");
const councilRaw = {
  ...sampleDataForTemplate(councilTemplate),
  legalBasis: [],
  decisions: [{ title: "Про організацію освітнього процесу", executor: "Учителям закладу", action: "Забезпечити виконання рішення педагогічної ради", deadlineKind: "preset", deadlineValue: "Постійно" }],
};
const councilModel = buildOrderModel(councilTemplate, councilRaw, completeProfile, { orderDate: "2026-08-29", orderNumber: "26-о" });
assert.equal(flattenDirectives(councilModel.directives)[1].level, 1);
assert.equal(containsPlaceholder([councilModel.title, councilModel.preamble, ...councilModel.points].join("\n")), false);

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
const freePointField = freeTemplate.fields.find((field) => field.id === "points");
assert.deepEqual(freePointField.fields.filter((field) => !field.advanced).map((field) => field.id), ["executor", "text", "deadlineValue"]);
assert.equal(freePointField.fields.find((field) => field.id === "level")?.advanced, true);
assert.equal(freePointField.fields.some((field) => field.id === "deadlineKind"), false);
assert.equal(freeTemplate.fields.find((field) => field.id === "bodyTables")?.advanced, true);
const freeModel = buildOrderModel(freeTemplate, {
  customTitle: "Про тестову нумерацію", preamble: "З метою перевірки нумерації", points: [{ text: "1. Виконати перевірку" }],
}, completeProfile, { orderDate: "2026-08-10", orderNumber: "126-о" });
assert.equal(freeModel.points[0], "Виконати перевірку.");
assert.equal(verifyGeneratedDocx(freeModel).ok, true);

const automaticDeadlineModel = buildOrderModel(freeTemplate, {
  customTitle: "Про автоматичне визначення строку",
  preamble: "З метою перевірки строку",
  points: [{ executor: "Заступнику директора", text: "Підготувати матеріали", deadlineValue: "2026-08-20" }],
}, completeProfile, { orderDate: "2026-08-10", orderNumber: "126/1-о" });
assert.equal(flattenDirectives(automaticDeadlineModel.directives)[0].deadline.kind, "date");
assert.equal(flattenDirectives(automaticDeadlineModel.directives)[0].deadline.value, "2026-08-20");

const freeDeadlineModel = buildOrderModel(freeTemplate, {
  customTitle: "Про автоматичне визначення строку",
  preamble: "З метою перевірки строку",
  points: [{ text: "Проводити перевірку", deadlineValue: "Постійно" }],
}, completeProfile, { orderDate: "2026-08-10", orderNumber: "126/2-о" });
assert.equal(flattenDirectives(freeDeadlineModel.directives)[0].deadline.kind, "free");
assert.equal(flattenDirectives(freeDeadlineModel.directives)[0].deadline.value, "Постійно");

const simplifiedHeavyTemplates = new Map([
  ["school-work-regime", 7],
  ["educational-program-introduction", 7],
  ["inclusive-education-organization", 10],
  ["school-meals", 7],
]);
for (const [templateId, maximumPrimaryFields] of simplifiedHeavyTemplates) {
  const currentTemplate = ORDER_TEMPLATES.find((template) => template.id === templateId);
  const primaryFields = currentTemplate.fields.filter((field) => !field.advanced && !field.collapsed);
  const preparedFields = currentTemplate.fields.filter((field) => !field.advanced && field.collapsed);
  assert.ok(primaryFields.length <= maximumPrimaryFields, `${templateId}: забагато полів показано одразу`);
  assert.ok(preparedFields.length > 0, `${templateId}: типові налаштування не згорнуто`);
  assert.ok(preparedFields.every((field) => field.default !== undefined || field.defaultItems?.length), `${templateId}: згорнуте поле не має готового значення`);
}

const structuredModel = buildOrderModel(freeTemplate, {
  customTitle: "Про структуровану перевірку у 2026/2027 навчальному році",
  preamble: "Відповідно до локального рішення\nЗ метою перевірки багатoабзацної преамбули у 2026/2027 навчальному році",
  points: [
    { level: "0", executor: "Класним керівникам", text: "Організувати роботу", deadlineKind: "preset", deadlineValue: "Постійно" },
    { level: "1", executor: "", text: "Провести інструктаж", deadlineKind: "date", deadlineValue: "2026-08-20" },
  ],
  bodyTables: [{ title: "Мережа класів", columns: "Клас;Кількість", rows: "1 клас;20\n2 клас;18", afterDirective: "1" }],
  legalBasis: [{ id: "law-education-2145" }], extraDirectives: [], acknowledgements: [],
}, completeProfile, { orderDate: "2026-08-10", orderNumber: "127-о" });
assert.ok(structuredModel.preambleParagraphs.length >= 2);
assert.equal(flattenDirectives(structuredModel.directives)[1].level, 1);
assert.equal(structuredModel.bodyTables.length, 1);
const structuredVerification = verifyGeneratedDocx(structuredModel);
assert.equal(structuredVerification.ok, true, structuredVerification.errors.join("; "));
const structuredXml = new TextDecoder().decode(structuredVerification.files.get("word/document.xml"));
assert.ok(structuredXml.includes('<w:ilvl w:val="1"/>'));
assert.ok(structuredXml.includes("Постійно"));
assert.ok(structuredXml.includes("Мережа класів"));
assert.ok(new TextDecoder().decode(structuredVerification.files.get("word/numbering.xml")).includes('w:multiLevelType w:val="multilevel"'));

const badLint = lintOrderModel({
  title: "Про режим роботи у 2025/2025 навчальному році",
  preamble: "З метою роботи у 2026/2027 навчальному році",
  points: ["Розпочати роботу з 01.09.206."],
  orderDate: "2026-08-10",
  directives: [{ executor: "", text: "Виконати", deadline: { kind: "date", value: "2026-06-20" }, children: [] }],
  bodyTables: [],
});
assert.ok(badLint.some((result) => result.title.includes("Некоректно зазначено навчальний рік")));
assert.ok(badLint.some((result) => result.title.includes("Строк виконання передує")));
assert.ok(badLint.some((result) => result.title.includes("не збігається")));

// Таблиця розпорядчої частини і додаток так само потрапляють у підписаний наказ,
// тому биті роки, биті дати й порожні комірки в них мають виявлятися нарівні з текстом пунктів.
const cleanBase = {
  title: "Про роботу у 2026/2027 навчальному році",
  preamble: "З метою організації роботи у 2026/2027 навчальному році",
  points: ["Затвердити план заходів."],
  orderDate: "2026-08-10",
  directives: [{ executor: "", text: "Затвердити план заходів", deadline: null, children: [] }],
};
assert.deepEqual(lintOrderModel(cleanBase), [], "контрольний коректний наказ не має давати зауважень");

const tableYearLint = lintOrderModel({
  ...cleanBase,
  bodyTables: [{ title: "План заходів", columns: ["Захід", "Термін"], rows: [["Інструктаж", "2026/207 н.р."]], afterDirective: 1 }],
});
assert.ok(tableYearLint.some((result) => result.title.includes("Некоректно зазначено навчальний рік")), "битий навчальний рік у таблиці розпорядчої частини");

const tableDateLint = lintOrderModel({
  ...cleanBase,
  bodyTables: [{ title: "План заходів", columns: ["Захід", "Термін"], rows: [["Огляд", "до 01.09.206"]], afterDirective: 1 }],
});
assert.ok(tableDateLint.some((result) => result.title.includes("дату з неповним або зайвим роком")), "бита дата в таблиці розпорядчої частини");

const attachmentLint = lintOrderModel({
  ...cleanBase,
  attachments: [{ kind: "approved", title: "План роботи", note: "", paragraphs: [], columns: ["Захід", "Термін"], rows: [["Навчання", "2025/2025 н.р."], ["Тренування", ""]] }],
});
assert.ok(attachmentLint.some((result) => result.title.includes("Некоректно зазначено навчальний рік")), "битий навчальний рік у додатку");
assert.ok(attachmentLint.some((result) => result.title.includes("У додатку є порожні комірки")), "порожня комірка в додатку");

const shortBodyTableRowLint = lintOrderModel({
  ...cleanBase,
  bodyTables: [{ title: "Мережа", columns: ["Клас", "Кількість учнів"], rows: [["1 клас"]], afterDirective: 1 }],
});
assert.ok(shortBodyTableRowLint.some((result) => result.title.includes("В основній частині є порожні комірки")), "відсутня хвостова комірка в таблиці розпорядчої частини");

const shortAttachmentRowLint = lintOrderModel({
  ...cleanBase,
  attachments: [{ kind: "approved", title: "Список", columns: ["Клас", "Кількість учнів"], rows: [["1 клас"]] }],
});
assert.ok(shortAttachmentRowLint.some((result) => result.title.includes("У додатку є порожні комірки")), "відсутня хвостова комірка в додатку");

const attachmentParagraphLint = lintOrderModel({
  ...cleanBase,
  attachments: [{ kind: "approved", title: "Порядок", note: "", paragraphs: ["Провести до 01.09.206 включно."], columns: [], rows: [] }],
});
assert.ok(attachmentParagraphLint.some((result) => result.title.includes("дату з неповним або зайвим роком")), "бита дата в абзаці додатка");

// Решта дефектів, знайдених у реальному серпневому корпусі, — щоб набір відтворювався через `npm test`.
assert.ok(
  lintOrderModel({ ...cleanBase, points: ["Забезпечити відвідування занять. 2026/207 н.р."] })
    .some((result) => result.title.includes("Некоректно зазначено навчальний рік")),
  "«2026/207» у тексті пункту",
);
assert.ok(
  lintOrderModel({ ...cleanBase, bodyTables: [{ title: "Мережа", columns: ["Клас", "Кількість учнів"], rows: [["1", ""]], afterDirective: 1 }] })
    .some((result) => result.title.includes("В основній частині є порожні комірки")),
  "порожня комірка в таблиці розпорядчої частини",
);
assert.ok(
  lintOrderModel({ ...cleanBase, points: ["3.1. Визначити готовність навчальних кабінетів."] })
    .some((result) => result.title.includes("ручна нумерація")),
  "ручна нумерація в тексті пункту",
);

assert.ok(LEGAL_BASIS_CATALOG.every((act) => ["zakon.rada.gov.ua", "mon.gov.ua"].includes(new URL(act.sourceUrl).hostname) && /^\d{4}-\d{2}-\d{2}$/.test(act.citedAt)));
// Довідник фіксує реквізити акта й дату, коли їх взято з офіційної сторінки.
// Він свідомо не стверджує чинність: автоматичної звірки статусу немає,
// тому поля виду `status`/`checkedAt` не повинні з'являтися знову.
assert.ok(LEGAL_BASIS_CATALOG.every((act) => !Object.hasOwn(act, "checkedAt") && !Object.hasOwn(act, "status") && !Object.hasOwn(act, "statusCheckedAt")));
assert.equal(LEGAL_BASIS_AUDIT.length, LEGAL_BASIS_CATALOG.length);
assert.equal(new Set(LEGAL_BASIS_AUDIT.map((entry) => entry.id)).size, LEGAL_BASIS_CATALOG.length);
assert.equal(LEGAL_BASIS_AUDIT.filter((entry) => entry.status === "active").length, 40);
assert.equal(LEGAL_BASIS_AUDIT.filter((entry) => entry.status === "unclear").length, 11);
assert.ok(LEGAL_BASIS_AUDIT.every((entry) => ["active", "unclear"].includes(entry.status) && entry.statusCheckedAt === "2026-08-12" && entry.statusSourceUrl && entry.evidence));
assert.equal(getLegalBasisAudit("cmu-primary-standard-87")?.currentEditionAt, "2026-08-12");
assert.equal(getLegalBasisAudit("mon-primary-programs-743")?.status, "unclear");
const legalBasisCatalogIds = new Set(LEGAL_BASIS_CATALOG.map((act) => act.id));
assert.ok(ORDER_TEMPLATES.every((template) => (template.fields.find((field) => field.id === "legalBasis")?.defaultItems || []).every((row) => legalBasisCatalogIds.has(row.id))));
assert.ok(formatLegalBasis(["law-education-2145"]).includes("№ 2145-VIII"));

const unclearBasisTemplate = ORDER_TEMPLATES.find((template) => template.id === "educational-program-introduction");
const unclearBasisRaw = sampleDataForTemplate(unclearBasisTemplate);
const unclearBasisModel = buildOrderModel(unclearBasisTemplate, unclearBasisRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "QA-NPA-1" });
const unclearBasisValidation = validateOrder({ template: unclearBasisTemplate, rawData: unclearBasisRaw, model: unclearBasisModel, profile: completeProfile });
assert.ok(unclearBasisValidation.results.some((result) => result.level === "warn" && result.title.includes("Чинність частини нормативних підстав")));

const activeBasisTemplate = ORDER_TEMPLATES.find((template) => template.id === "school-year-organization");
const activeBasisRaw = sampleDataForTemplate(activeBasisTemplate);
const activeBasisModel = buildOrderModel(activeBasisTemplate, activeBasisRaw, completeProfile, { orderDate: "2026-08-10", orderNumber: "QA-NPA-2" });
const activeBasisValidation = validateOrder({ template: activeBasisTemplate, rawData: activeBasisRaw, model: activeBasisModel, profile: completeProfile });
assert.ok(!activeBasisValidation.results.some((result) => result.title.includes("Чинність частини нормативних підстав")));

const augustRecords = createAugustPackageRecords({ schoolYear: "2026/2027", orderDate: "2026-08-12", packageId: "test-pack", createdAt: "2026-08-12T10:00:00.000Z" });
assert.equal(AUGUST_PACKAGE_BLUEPRINT.length, 32);
assert.ok(AUGUST_PACKAGE_BLUEPRINT.every((item) => item.templateId !== "free-order"));
assert.equal(augustRecords.length, 32);
assert.equal(new Set(augustRecords.map((record) => record.id)).size, 32);
assert.ok(new Set(augustRecords.map((record) => record.recordSeries)).size > 1);
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 1)?.templateId, "school-year-organization");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 8)?.templateId, "inclusive-education-organization");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 10)?.templateId, "sports-facilities-readiness");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 12)?.templateId, "electrical-facilities-responsible");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 14)?.templateId, "room-managers");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 15)?.templateId, "class-teachers");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 18)?.templateId, "school-readiness-results");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 19)?.templateId, "student-medical-care");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 20)?.templateId, "employee-medical-examinations");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 21)?.templateId, "class-network-approval");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 22)?.templateId, "pedagogical-workload");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 24)?.templateId, "first-grade-distribution");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 26)?.templateId, "pedagogical-council-decisions");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 29)?.templateId, "shelter-responsible");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 6)?.templateId, "autumn-winter-readiness");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 11)?.templateId, "technical-inspection-commission");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 16)?.templateId, "harmful-habits-prevention");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 25)?.templateId, "safety-class-operation");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 27)?.templateId, "safe-healthy-school-strategy");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 28)?.templateId, "first-lesson");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 30)?.templateId, "teacher-of-year-participation");
assert.equal(augustRecords.find((record) => record.formData.packageNumber === 32)?.templateId, "assessment-system-approval");
assert.equal(augustRecords.filter((record) => record.templateId !== "free-order").length, 32);
const persistedAugustRecords = [];
const persistedResult = await persistOrderPackage(augustRecords, async (record) => { persistedAugustRecords.push(record.id); return record; });
assert.equal(persistedResult.length, 32);
assert.deepEqual(persistedAugustRecords, augustRecords.map((record) => record.id));
assert.ok(validateOrderPackage(augustRecords.slice(0, 31), ORDER_TEMPLATES, completeProfile).some((result) => result.title === "Серпневий пакет неповний"));

const makePackageRecord = (source, id, title, columns, rows) => ({
  ...source,
  id,
  title,
  templateId: "free-order",
  formData: { ...source.formData, packageId: "", customTitle: title, bodyTables: [{ title, columns, rows, afterDirective: "1" }] },
});
const networkRows = Array.from({ length: 9 }, (_, index) => `${index + 1};${[24, 22, 25, 21, 19, 23, 20, 18, 17][index]}`).join("\n");
const missingSafetyRows = [1, 3, 4, 5, 6, 7, 9].map((grade, index) => `${grade};Кімната ${index + 1}`).join("\n");
const fullSafetyRows = Array.from({ length: 9 }, (_, index) => `${index + 1};Кімната ${index + 1}`).join("\n");
const networkRecord = makePackageRecord(augustRecords[0], "network", "Про затвердження мережі класів", "Клас;Кількість учнів", networkRows);
const missingSafetyRecord = makePackageRecord(augustRecords[1], "safety-missing", "Про евакуацію", "Клас;Приміщення", missingSafetyRows);
const fullSafetyRecord = makePackageRecord(augustRecords[1], "safety-full", "Про евакуацію", "Клас;Приміщення", fullSafetyRows);
const missingClassResults = validateOrderPackage([networkRecord, missingSafetyRecord], ORDER_TEMPLATES, completeProfile);
const missingClassError = missingClassResults.find((result) => result.title.includes("Не всі класи"));
assert.equal(missingClassError?.detail, "Відсутні: 2, 8.");
assert.ok(!missingClassError.detail.includes("24"));
const fullClassResults = validateOrderPackage([networkRecord, fullSafetyRecord], ORDER_TEMPLATES, completeProfile);
assert.ok(!fullClassResults.some((result) => result.title.includes("Не всі класи")));
assert.ok(!fullClassResults.some((result) => result.title.includes("поза затвердженою мережею")));
assert.ok(freeTemplate.fields.find((field) => field.id === "points").maxItems >= 100);

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
      if (Array.isArray(field.defaultItems) && field.defaultItems.length) return [field.id, structuredClone(field.defaultItems)];
      const count = field.required || Number(field.minItems) > 0 ? Math.max(field.minItems || 1, 1) : 0;
      return [field.id, Array.from({ length: count }, () => make(field.fields))];
    }
    if (field.default !== undefined && field.default !== "") return [field.id, field.default];
    if (field.type === "date") return [field.id, "2026-09-01"];
    if (field.type === "number") return [field.id, Number(field.min) || 1];
    if (field.type === "select") {
      const first = field.options?.[0];
      return [field.id, typeof first === "string" ? first : (first && Object.hasOwn(first, "value") ? first.value : "тестове значення")];
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

function selectBranchScenarios(template, baseRawData) {
  const scenarios = [];
  const visit = (fields, currentValue, path = []) => {
    for (const field of fields || []) {
      const fieldPath = [...path, field.id];
      if (field.type === "repeatable") {
        // Нормативний довідник тестується один раз як окремий каталог. Обхід усіх
        // 51 актів у кожному шаблоні не перевіряв би гілки build(), а лише множив час тестів.
        if (field.id === "legalBasis") continue;
        const rows = currentValue?.[field.id];
        if (Array.isArray(rows) && rows.length) visit(field.fields, rows[0], [...fieldPath, 0]);
        continue;
      }
      if (field.type !== "select") continue;
      const currentOption = currentValue?.[field.id];
      for (const option of field.options || []) {
        const optionValue = typeof option === "string" ? option : option.value;
        if (optionValue === currentOption) continue;
        const rawData = structuredClone(baseRawData);
        setNestedValue(rawData, fieldPath, optionValue);
        if (field.id === "deadlineKind") {
          const parentPath = fieldPath.slice(0, -1);
          setNestedValue(rawData, [...parentPath, "deadlineValue"], optionValue === "date" ? "2026-08-20" : (optionValue ? "Постійно" : ""));
        }
        scenarios.push({
          name: `${formatFieldPath(fieldPath)}=${JSON.stringify(optionValue)}`,
          rawData,
          // Рівень вкладеності одного кореневого пункту може не змінити результат:
          // коректність самої багаторівневої моделі перевіряє окремий structuredModel.
          expectsOutputChange: field.id !== "level",
        });
      }
    }
  };
  visit(template.fields, baseRawData);
  return scenarios;
}

function setNestedValue(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) cursor = cursor[path[index]];
  cursor[path.at(-1)] = value;
}

function formatFieldPath(path) {
  return path.reduce((result, part) => typeof part === "number" ? `${result}[${part}]` : (result ? `${result}.${part}` : part), "");
}

function orderOutputFingerprint(order) {
  return JSON.stringify({
    title: order.title,
    preamble: order.preamble,
    directives: order.directives,
    bodyTables: order.bodyTables,
    attachments: order.attachments,
    grounds: order.grounds,
  });
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

console.log(`OK: ${ORDER_TEMPLATES.length} templates, ${selectBranchScenarioCount} select branch scenarios; standard + image-letterhead DOCX samples written to ${outDir}`);
