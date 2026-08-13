import { clean } from "./templates.js";
import { buildOrderModel } from "./core.js";

export const AUGUST_PACKAGE_BLUEPRINT = Object.freeze([
  [1, "Про організацію освітнього процесу", "Основна діяльність", "school-year-organization"],
  [2, "Про затвердження режиму роботи закладу", "Основна діяльність", "school-work-regime"],
  [3, "Про затвердження освітньої програми", "Основна діяльність", "educational-program-introduction"],
  [4, "Про виконання алгоритму дій під час повітряної тривоги", "Основна діяльність", "air-raid-actions"],
  [5, "Про підготовку до нового навчального року", "Основна діяльність", "new-school-year-preparation"],
  [6, "Про підготовку до роботи в осінньо-зимовий період", "Адміністративно-господарські питання", "autumn-winter-readiness"],
  [7, "Про організацію роботи з охорони праці та безпеки життєдіяльності", "Основна діяльність", "occupational-safety-organization"],
  [8, "Про організацію інклюзивного навчання", "Основна діяльність", "inclusive-education-organization"],
  [9, "Про організацію заходів із безпеки життєдіяльності та дорожнього руху", "Основна діяльність", "road-traffic-safety"],
  [10, "Про підготовку спортивних споруд", "Адміністративно-господарські питання", "sports-facilities-readiness"],
  [11, "Про створення постійно діючої технічної комісії", "Адміністративно-господарські питання", "technical-inspection-commission"],
  [12, "Про призначення відповідального за електрогосподарство", "Адміністративно-господарські питання", "electrical-facilities-responsible"],
  [13, "Про затвердження протипожежного режиму", "Адміністративно-господарські питання", "fire-safety-regime"],
  [14, "Про призначення завідувачів кабінетів", "Кадрові питання", "room-managers"],
  [15, "Про призначення класних керівників та організацію їх роботи", "Кадрові питання", "class-teachers"],
  [16, "Про організацію роботи з профілактики тютюнопаління", "Основна діяльність", "harmful-habits-prevention"],
  [17, "Про організацію харчування", "Основна діяльність", "school-meals"],
  [18, "Про результати підготовки до нового навчального року", "Основна діяльність", "school-readiness-results"],
  [19, "Про медичне обслуговування учнів", "Основна діяльність", "student-medical-care"],
  [20, "Про проходження працівниками медичних оглядів", "Кадрові питання", "employee-medical-examinations"],
  [21, "Про затвердження мережі класів", "Основна діяльність", "class-network-approval"],
  [22, "Про розподіл педагогічного навантаження", "Кадрові питання", "pedagogical-workload"],
  [23, "Про проведення тренування з евакуації", "Основна діяльність", "evacuation-training"],
  [24, "Про розподіл учнів першого класу", "Рух здобувачів освіти", "first-grade-distribution"],
  [25, "Про організацію роботи Класу безпеки", "Основна діяльність", "safety-class-operation"],
  [26, "Про введення в дію рішень педагогічної ради", "Основна діяльність", "pedagogical-council-decisions"],
  [27, "Про стан реалізації Національної стратегії розбудови безпечного і здорового освітнього середовища", "Основна діяльність", "safe-healthy-school-strategy"],
  [28, "Про проведення Першого уроку", "Основна діяльність", "first-lesson"],
  [29, "Про призначення відповідального за укриття", "Кадрові питання", "shelter-responsible"],
  [30, "Про проведення конкурсу «Учитель року»", "Кадрові питання", "teacher-of-year-participation"],
  [31, "Про проведення інструктажів", "Основна діяльність", "primary-workplace-briefings"],
  [32, "Про затвердження системи та загальних критеріїв оцінювання", "Основна діяльність", "assessment-system-approval"],
].map(([number, title, recordSeries, templateId = "free-order"]) => Object.freeze({ number, title, recordSeries, templateId })));

export function createAugustPackageRecords({ schoolYear, orderDate, packageId, createdAt } = {}) {
  const year = clean(schoolYear) || "2026/2027";
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(String(orderDate || "")) ? orderDate : "2026-08-01";
  const stamp = createdAt || new Date().toISOString();
  const id = clean(packageId) || `august-${stamp.replace(/\D/g, "").slice(0, 14)}`;
  return AUGUST_PACKAGE_BLUEPRINT.map((item) => ({
    id: `${id}-${String(item.number).padStart(2, "0")}`,
    templateId: item.templateId,
    title: item.title,
    category: "Серпневий пакет",
    recordSeries: item.recordSeries,
    orderDate: date,
    orderNumber: "",
    status: "draft",
    createdAt: stamp,
    updatedAt: stamp,
    formData: item.templateId === "free-order" ? {
      packageId: id,
      packageNumber: item.number,
      schoolYear: year,
      customTitle: item.title,
      preamble: `З метою належної організації роботи закладу у ${year} навчальному році`,
      points: [{ level: "0", executor: "", text: "Визначити конкретні заходи, виконавців і строки виконання після перевірки нормативних та фактичних даних.", deadlineKind: "", deadlineValue: "" }],
      legalBasis: [],
      extraDirectives: [],
      acknowledgements: [],
      bodyTables: [],
    } : {
      packageId: id,
      packageNumber: item.number,
      schoolYear: year,
    },
  }));
}

export async function persistOrderPackage(records, saveRecord) {
  if (!Array.isArray(records) || typeof saveRecord !== "function") throw new TypeError("Некоректні дані пакетного збереження");
  const saved = [];
  for (const record of records) saved.push(await saveRecord(record));
  return saved;
}

export function validateOrderPackage(records, templates, profile) {
  const results = [];
  const push = (level, title, detail = "") => results.push({ level, title, detail });
  const models = [];
  (records || []).forEach((record) => {
    const template = (templates || []).find((item) => item.id === record.templateId);
    if (!template) return push("warn", "Для збереженого наказу не знайдено шаблон", record.title);
    try {
      models.push({ record, model: buildOrderModel(template, record.formData || {}, profile || {}, record) });
    } catch (error) {
      push("error", "Не вдалося побудувати наказ для пакетної перевірки", `${record.title}: ${error.message || error}`);
    }
  });

  const registrations = new Map();
  models.forEach(({ record, model }) => {
    if (!model.orderNumber) return;
    const key = `${String(model.orderDate).slice(0, 4)}|${model.recordSeries}|${model.orderNumber}`.toLocaleLowerCase("uk-UA");
    if (registrations.has(key)) push("error", "Дубль номера в одній реєстраційній серії", `${registrations.get(key)}; ${record.title} — № ${model.orderNumber}.`);
    else registrations.set(key, record.title);
  });

  const networkClasses = collectClasses(models, /мереж[аії]/iu);
  const safetyClasses = collectClasses(models, /евакуац|повітрян|укритт/iu);
  if (networkClasses.size && safetyClasses.size) {
    const missing = [...networkClasses].filter((className) => !safetyClasses.has(className));
    const extra = [...safetyClasses].filter((className) => !networkClasses.has(className));
    if (missing.length) push("error", "Не всі класи з мережі охоплено безпековими таблицями", `Відсутні: ${missing.join(", ")}.`);
    if (extra.length) push("warn", "У безпекових таблицях є класи поза затвердженою мережею", `Зайві або інакше названі: ${extra.join(", ")}.`);
  }

  const packageCounts = new Map();
  (records || []).forEach((record) => {
    const id = clean(record.formData?.packageId);
    if (id) packageCounts.set(id, (packageCounts.get(id) || 0) + 1);
  });
  packageCounts.forEach((count, id) => {
    if (count !== AUGUST_PACKAGE_BLUEPRINT.length) push("warn", "Серпневий пакет неповний", `${id}: збережено ${count} із ${AUGUST_PACKAGE_BLUEPRINT.length} чернеток.`);
  });

  if (!results.length) push("ok", "Міжнаказових суперечностей не знайдено", `Перевірено наказів: ${models.length}.`);
  return results;
}

function collectClasses(models, titlePattern) {
  const classes = new Set();
  models.forEach(({ model }) => {
    if (!titlePattern.test(model.title)) return;
    (model.bodyTables || []).forEach((table) => {
      const columns = table.columns || [];
      const classColumnIndexes = columns.map((column, index) => /клас/iu.test(column) ? index : -1).filter((index) => index >= 0);

      (table.rows || []).forEach((row) => {
        classColumnIndexes.forEach((index) => addClass(classes, parseClassCell(row[index])));
      });

      [...columns, ...(table.rows || []).flat()].forEach((cell) => {
        const value = String(cell || "");
        for (const match of value.matchAll(/(?:^|[^\d])(\d{1,2}(?:[-–—][А-ЯІЇЄҐ])?)\s*клас(?:у|и|ів)?(?=$|[^\p{L}\d])/giu)) {
          addClass(classes, match[1]);
        }
      });
    });
  });
  return classes;
}

function parseClassCell(value) {
  const match = String(value || "").match(/^\s*(\d{1,2}(?:[-–—][А-ЯІЇЄҐ])?)\s*(?:клас(?:у|и|ів)?)?\s*$/iu);
  return match?.[1] || "";
}

function addClass(classes, rawValue) {
  const normalized = String(rawValue || "").toLocaleUpperCase("uk-UA").replace(/[–—]/g, "-");
  const grade = Number.parseInt(normalized, 10);
  if (grade >= 1 && grade <= 12) classes.add(normalized);
}
