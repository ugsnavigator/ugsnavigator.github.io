import { clean } from "./templates.js";

export const DEFAULT_PROFILE = Object.freeze({
  institutionName: "",
  shortName: "",
  location: "",
  edrpou: "",
  signerPosition: "Директор",
  signerName: "",
  letterheadMode: "standard",
  preprintedTopMm: 55,
  letterheadWidthMm: 170,
  staff: [],
});

export function xmlEscape(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sanitizeFilename(value, fallback = "nakaz") {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (normalized || fallback).slice(0, 120);
}

export function mmToTwip(mm) {
  return Math.round(Number(mm || 0) * 56.6929133858);
}
export function mmToEmu(mm) {
  return Math.round(Number(mm || 0) * 36000);
}

export function buildOrderModel(template, formData, profile, orderMeta) {
  const built = template.build(formData);
  return {
    templateId: template.id,
    category: template.category,
    title: clean(built.title),
    preamble: clean(built.preamble),
    points: (built.points || []).map(clean).filter(Boolean),
    orderDate: clean(orderMeta.orderDate),
    orderNumber: clean(orderMeta.orderNumber),
    institutionName: clean(profile.institutionName),
    shortName: clean(profile.shortName),
    location: clean(profile.location),
    edrpou: clean(profile.edrpou),
    signerPosition: clean(profile.signerPosition),
    signerName: clean(profile.signerName),
    letterheadMode: profile.letterheadMode || "standard",
    preprintedTopMm: clampNumber(profile.preprintedTopMm, 25, 100, 55),
    letterheadWidthMm: clampNumber(profile.letterheadWidthMm, 80, 180, 170),
  };
}

export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function containsPlaceholder(text) {
  return /\{\{|\}\}|\[\s*(?:встав|ПІБ|дата|номер|назва|посада)|TODO|XXX/iu.test(String(text ?? ""));
}

export function validateOrder({ template, rawData, model, profile, letterheadAsset }) {
  const results = [];
  const push = (level, title, detail = "") => results.push({ level, title, detail });

  if (!clean(profile.institutionName)) push("error", "Не заповнено повну назву закладу", "Заповніть профіль у розділі «Мій заклад». ");
  else push("ok", "Назва закладу заповнена");

  if (!clean(profile.location)) push("error", "Не вказано населений пункт");
  else push("ok", "Місце складення документа заповнене");

  if (!clean(profile.signerPosition) || !clean(profile.signerName)) push("error", "Не заповнено підписанта");
  else push("ok", "Підписант заповнений");

  if (!model.orderDate) push("error", "Не вказано дату наказу");
  else push("ok", "Дата наказу заповнена");

  if (!model.orderNumber) push("warn", "Не вказано номер наказу", "Для чернетки це допустимо; перед друком номер варто перевірити.");
  else push("ok", "Номер наказу заповнений");

  validateFields(template.fields, rawData, push);

  if (!/^Про\b/u.test(model.title)) push("warn", "Заголовок не починається зі слова «Про»", "Для наказів закладу освіти зазвичай використовується заголовок, що починається з «Про». ");
  else push("ok", "Заголовок починається зі слова «Про»");

  if (!model.preamble) push("error", "Преамбула порожня");
  if (!model.points.length) push("error", "Немає жодного пункту наказу");
  else push("ok", `Сформовано пунктів: ${model.points.length}`);

  const allText = [model.title, model.preamble, ...model.points, model.signerName, model.institutionName].join("\n");
  if (containsPlaceholder(allText)) push("error", "У документі залишилися службові заповнювачі", "Приберіть {{...}}, TODO, XXX або незаповнені позначки.");
  else push("ok", "Службових заповнювачів не знайдено");

  if (model.letterheadMode === "preprinted") push("warn", "Обрано друк на готовому паперовому бланку", `Перевірте пробним друком верхній відступ ${model.preprintedTopMm} мм.`);
  if (model.letterheadMode === "image") {
    if (!letterheadAsset?.bytes) push("error", "Не завантажено зображення фірмового бланка");
    else push("ok", "Зображення бланка готове до вбудовування в DOCX");
  }

  if (model.preamble.length < 15) push("warn", "Преамбула дуже коротка", "Перевірте, чи достатньо описано мету або підставу.");
  if (model.points.some((p) => p.length < 4)) push("warn", "Є надто короткий пункт наказу");

  const hasErrors = results.some((r) => r.level === "error");
  return { results, hasErrors };
}

function validateFields(fields, data, push, prefix = "") {
  for (const field of fields) {
    const label = `${prefix}${field.label || field.id}`;
    const value = data?.[field.id];
    if (field.type === "repeatable") {
      const items = Array.isArray(value) ? value : [];
      if (field.required && items.length < (field.minItems || 1)) push("error", `Недостатньо записів: ${label}`);
      items.forEach((item, index) => validateFields(field.fields, item, push, `${label} ${index + 1}: `));
      continue;
    }
    if (field.required && !clean(value)) push("error", `Обов’язкове поле не заповнено: ${label}`);
    if (field.maxlength && String(value ?? "").length > field.maxlength) push("error", `Перевищено допустиму довжину: ${label}`);
  }
}

export function validateTemplateSchemas(templates) {
  const errors = [];
  const templateIds = new Set();

  for (const t of templates || []) {
    const templateId = t?.id || "(без id)";
    if (!t?.id || templateIds.has(t.id)) errors.push(`Некоректний або дубльований template id: ${templateId}`);
    if (t?.id) templateIds.add(t.id);
    if (!t?.title || typeof t.build !== "function") errors.push(`Шаблон ${templateId} не має title/build`);

    const checkFields = (fields, path = "root") => {
      if (!Array.isArray(fields)) {
        errors.push(`Шаблон ${templateId} (${path}): fields має бути масивом`);
        return;
      }
      const fieldIds = new Set();
      for (const f of fields) {
        const fieldId = f?.id || "(без id)";
        const fieldPath = `${path}.${fieldId}`;
        if (!f?.id) errors.push(`Шаблон ${templateId} (${path}): поле без id`);
        else if (fieldIds.has(f.id)) errors.push(`Шаблон ${templateId} (${path}): дубль поля ${f.id}`);
        else fieldIds.add(f.id);

        if (f?.type === "repeatable") {
          if (!Array.isArray(f.fields) || f.fields.length === 0) errors.push(`Шаблон ${templateId} (${fieldPath}): repeatable не має вкладених fields`);
          else checkFields(f.fields, fieldPath);
        }
      }
    };

    checkFields(t?.fields || [], "root");
  }
  return errors;
}
