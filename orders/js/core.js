import { clean } from "./templates.js";

export const DEFAULT_PROFILE = Object.freeze({
  institutionName: "",
  shortName: "",
  location: "",
  edrpou: "",
  signerPosition: "Директор",
  signerName: "",
  placeLayout: "inline",
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
    recordSeries: clean(orderMeta.recordSeries || template.recordSeries || "Основна діяльність"),
    title: clean(built.title),
    preamble: clean(built.preamble),
    points: (built.points || []).map(clean).filter(Boolean),
    attachments: sanitizeAttachments(built.attachments),
    reviewedLegalBasis: clean(formData?.verifiedBasis),
    grounds: clean(formData?.grounds),
    acknowledgements: sanitizeAcknowledgements(formData?.acknowledgements),
    orderDate: clean(orderMeta.orderDate),
    orderNumber: clean(orderMeta.orderNumber),
    institutionName: clean(profile.institutionName),
    shortName: clean(profile.shortName),
    location: clean(profile.location),
    edrpou: clean(profile.edrpou),
    signerPosition: clean(profile.signerPosition),
    signerName: clean(profile.signerName),
    placeLayout: profile.placeLayout === "separate" ? "separate" : "inline",
    letterheadMode: profile.letterheadMode || "standard",
    preprintedTopMm: clampNumber(profile.preprintedTopMm, 25, 100, 55),
    letterheadWidthMm: clampNumber(profile.letterheadWidthMm, 80, 180, 170),
  };
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.slice(0, 20).map((attachment) => ({
    kind: attachment?.kind === "approved" ? "approved" : "annex",
    title: clean(attachment?.title),
    note: clean(attachment?.note),
    paragraphs: Array.isArray(attachment?.paragraphs) ? attachment.paragraphs.map(clean).filter(Boolean).slice(0, 500) : [],
    columns: Array.isArray(attachment?.columns) ? attachment.columns.map((column) => clean(column)).filter(Boolean).slice(0, 12) : [],
    rows: Array.isArray(attachment?.rows)
      ? attachment.rows.slice(0, 500).map((row) => (Array.isArray(row) ? row.slice(0, 12).map(clean) : []))
      : [],
  })).filter((attachment) => attachment.title || attachment.paragraphs.length || attachment.rows.length);
}

function sanitizeAcknowledgements(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 100).map((row) => ({
    name: clean(row?.name),
    date: clean(row?.date),
  })).filter((row) => row.name || row.date);
}

export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function containsPlaceholder(text) {
  return /\{\{[^}]*\}\}|\[\s*(?:встав(?:те)?|ПІБ|дата|номер|назва|посада)(?:[^\]]*)\]/iu.test(String(text ?? ""));
}

export function isOrderReady(validation) {
  return !validation?.hasErrors && !validation?.results?.some((result) => result.affectsReadiness === true);
}

export function validateOrder({ template, rawData, model, profile, letterheadAsset, allowDraft = false }) {
  const results = [];
  const push = (level, title, detail = "", meta = {}) => results.push({ level, title, detail, ...meta });

  if (!clean(profile.institutionName)) push("error", "Не заповнено повну назву закладу", "Заповніть профіль у розділі «Мій заклад». ");
  else push("ok", "Назва закладу заповнена");

  if (!clean(profile.location)) push("error", "Не вказано населений пункт");
  else push("ok", "Місце складення документа заповнене");

  if (clean(profile.edrpou) && !/^\d{8}$/.test(clean(profile.edrpou))) push("error", "Код ЄДРПОУ має містити рівно 8 цифр");

  if (!clean(profile.signerPosition) || !clean(profile.signerName)) push("error", "Не заповнено підписанта");
  else push("ok", "Підписант заповнений");

  if (!model.orderDate) push("error", "Не вказано дату наказу", "", { fieldId: "orderDate" });
  else {
    push("ok", "Дата наказу заповнена");
    const orderDate = new Date(`${model.orderDate}T00:00:00`);
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    if (!Number.isNaN(orderDate.getTime()) && orderDate >= tomorrow) {
      push("warn", "Дата наказу ще не настала", "Датою наказу має бути дата його підписання. Перевірте значення перед реєстрацією.", { fieldId: "orderDate", affectsReadiness: true });
    }
  }

  if (!model.orderNumber) push(allowDraft ? "warn" : "error", "Не вказано номер наказу", allowDraft ? "Для чернетки це допустимо; фінальний експорт заблоковано до присвоєння номера." : "Присвойте номер у відповідній реєстраційній серії перед фінальним експортом.", { fieldId: "orderNumber", affectsReadiness: true });
  else push("ok", "Номер наказу заповнений");

  validateFields(template.fields, rawData, push);

  if (!/^Про(?:\s|$)/u.test(model.title)) push("error", "Заголовок не починається зі слова «Про»", "Виправте заголовок перед фінальним експортом наказу.");
  else push("ok", "Заголовок починається зі слова «Про»");

  if (!model.preamble) push("error", "Преамбула порожня");
  if (!model.points.length) push("error", "Немає жодного пункту наказу");
  else push("ok", `Сформовано пунктів: ${model.points.length}`);

  const attachmentText = (model.attachments || []).flatMap((attachment) => [attachment.title, attachment.note, ...(attachment.paragraphs || []), ...(attachment.rows || []).flat()]);
  const allText = [model.title, model.preamble, ...model.points, model.grounds, model.signerName, model.institutionName, ...attachmentText].join("\n");
  if (containsPlaceholder(allText)) push("error", "У документі залишилися службові заповнювачі", "Приберіть {{...}}, TODO, XXX або незаповнені позначки.");
  else push("ok", "Службових заповнювачів не знайдено");

  if (model.letterheadMode === "preprinted") push("warn", "Обрано друк на готовому паперовому бланку", `Перевірте пробним друком верхній відступ ${model.preprintedTopMm} мм.`);
  if (model.letterheadMode === "standard") push("warn", "Текстова шапка не є затвердженим бланком закладу", "Для фінального документа використайте затверджений паперовий або графічний бланк відповідно до локальної інструкції з діловодства.");
  if (model.letterheadMode === "image") {
    if (!letterheadAsset?.bytes) push("error", "Не завантажено зображення фірмового бланка");
    else push("ok", "Зображення бланка готове до вбудовування в DOCX");
  }

  if (model.preamble.length < 15) push("warn", "Преамбула дуже коротка", "Перевірте, чи достатньо описано мету або підставу.");
  if (model.points.some((p) => p.length < 4)) push("warn", "Є надто короткий пункт наказу");

  if (typeof template.validate === "function") {
    const customResults = template.validate(rawData, model);
    if (Array.isArray(customResults)) customResults.forEach((result) => {
      if (result && ["error", "warn", "ok"].includes(result.level) && result.title) {
        push(result.level, result.title, result.detail || "", result);
      }
    });
  }

  const hasErrors = results.some((r) => r.level === "error");
  return { results, hasErrors };
}

function validateFields(fields, data, push, prefix = "", parentPath = "") {
  for (const field of fields) {
    const label = `${prefix}${field.label || field.id}`;
    const value = data?.[field.id];
    const fieldPath = parentPath ? `${parentPath}.${field.id}` : field.id;
    if (field.type === "repeatable") {
      const items = Array.isArray(value) ? value : [];
      if (field.required && items.length < (field.minItems || 1)) push("error", `Недостатньо записів: ${label}`, "", { fieldId: field.id, fieldPath });
      items.forEach((item, index) => validateFields(field.fields, item, push, `${label} ${index + 1}: `, `${fieldPath}.${index}`));
      continue;
    }
    const meta = { fieldId: field.id, fieldPath };
    if (field.required && !clean(value)) push("error", `Обов’язкове поле не заповнено: ${label}`, "", meta);
    if (field.maxlength && String(value ?? "").length > field.maxlength) push("error", `Перевищено допустиму довжину: ${label}`, "", meta);
    if (clean(value) && field.type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number)) push("error", `Некоректне число: ${label}`, "", meta);
      if (Number.isFinite(number) && Number.isFinite(Number(field.min)) && number < Number(field.min)) push("error", `Значення менше дозволеного (${field.min}): ${label}`, "", meta);
      if (Number.isFinite(number) && Number.isFinite(Number(field.max)) && number > Number(field.max)) push("error", `Значення більше дозволеного (${field.max}): ${label}`, "", meta);
    }
    if (clean(value) && field.type === "date" && Number.isNaN(new Date(`${value}T00:00:00`).getTime())) push("error", `Некоректна дата: ${label}`, "", meta);
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
