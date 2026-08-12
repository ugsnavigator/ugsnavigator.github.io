const SERIES_SUFFIX = Object.freeze({
  "Основна діяльність": "-о",
  "Рух здобувачів освіти": "-у",
  "Адміністративно-господарські питання": "-г",
  "Кадрові питання": "-к",
});

function sameRegistrationScope(record, model, fallbackSeries = "Основна діяльність") {
  const year = String(model?.orderDate || "").slice(0, 4);
  return Boolean(year)
    && String(record?.orderDate || "").slice(0, 4) === year
    && String(record?.recordSeries || fallbackSeries) === String(model?.recordSeries || fallbackSeries);
}

export function findDuplicateOrderNumber(records, model, currentId = "", fallbackSeries = "Основна діяльність") {
  const number = String(model?.orderNumber || "").trim();
  if (!number) return null;
  return (Array.isArray(records) ? records : []).find((record) => record?.id !== currentId
    && String(record?.orderNumber || "").trim() === number
    && sameRegistrationScope(record, model, fallbackSeries)) || null;
}

export function registrationStats(records, model, fallbackSeries = "Основна діяльність") {
  return (Array.isArray(records) ? records : []).filter((record) => sameRegistrationScope(record, model, fallbackSeries)).length;
}

export function suggestOrderNumber(records, model, fallbackSeries = "Основна діяльність") {
  const scoped = (Array.isArray(records) ? records : []).filter((record) => sameRegistrationScope(record, model, fallbackSeries));
  const numbers = scoped
    .map((record) => Number(String(record?.orderNumber || "").match(/^\s*(\d+)/)?.[1]))
    .filter(Number.isFinite);
  const series = String(model?.recordSeries || fallbackSeries);
  return `${(numbers.length ? Math.max(...numbers) : 0) + 1}${SERIES_SUFFIX[series] || "-о"}`;
}
