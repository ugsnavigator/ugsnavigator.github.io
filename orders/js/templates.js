import { LEGAL_BASIS_OPTIONS, formatLegalBasis } from "./legal-basis.js";

export const ACADEMIC_MONTHS = [
  { id: "08", name: "Серпень", short: "Сер" },
  { id: "09", name: "Вересень", short: "Вер" },
  { id: "10", name: "Жовтень", short: "Жов" },
  { id: "11", name: "Листопад", short: "Лис" },
  { id: "12", name: "Грудень", short: "Гру" },
  { id: "01", name: "Січень", short: "Січ" },
  { id: "02", name: "Лютий", short: "Лют" },
  { id: "03", name: "Березень", short: "Бер" },
  { id: "04", name: "Квітень", short: "Кві" },
  { id: "05", name: "Травень", short: "Тра" },
  { id: "06", name: "Червень", short: "Чер" },
  { id: "07", name: "Липень", short: "Лип" },
];

export const TEMPLATE_CATEGORIES = [
  "Початок року",
  "Освітній процес",
  "Безпека",
  "Кадрові",
  "Учні",
  "Харчування",
  "Контроль",
  "Адміністративно-господарські",
  "Універсальні",
];

const CURRENT_SCHOOL_YEAR = "2026/2027";
const NEXT_SCHOOL_YEAR = "2027/2028";

const text = (id, label, options = {}) => ({ type: "text", id, label, ...options });
const textarea = (id, label, options = {}) => ({ type: "textarea", id, label, ...options });
const date = (id, label, options = {}) => ({ type: "date", id, label, ...options });
const number = (id, label, options = {}) => ({ type: "number", id, label, ...options });
const person = (id, label, options = {}) => ({ type: "person", id, label, ...options });
const select = (id, label, optionsList, options = {}) => ({ type: "select", id, label, options: optionsList, ...options });
const repeatable = (id, label, fields, options = {}) => ({ type: "repeatable", id, label, fields, ...options });

const baseAdvanced = () => [
  repeatable("legalBasis", "Нормативні підстави з довідника", [
    select("id", "Нормативний акт *", LEGAL_BASIS_OPTIONS, { required: true }),
  ], {
    advanced: true,
    maxItems: 20,
    help: "Конструктор підставить реквізити акта. Для 40 записів реєстр прямо підтвердив чинність 12.08.2026; для 11 статус лишився неоднозначним, і форма покаже попередження. Перед підписанням перевірте актуальність та застосовність підстави.",
  }),
  textarea("basis", "Додаткова підстава", {
    advanced: true,
    maxlength: 1200,
    placeholder: "Наприклад: рішення педагогічної ради від 28.08.2026, протокол № 1",
    help: "Необов’язково. Додавайте лише перевірену й актуальну підставу.",
  }),
  text("extraPoint", "Додаткове доручення", {
    advanced: true,
    maxlength: 1200,
    placeholder: "Необов’язково",
  }),
  repeatable("extraDirectives", "Структуровані доручення", [
    select("level", "Рівень", [
      { value: "0", label: "Основний пункт" },
      { value: "1", label: "Підпункт" },
      { value: "2", label: "Підпункт другого рівня" },
    ], { default: "0" }),
    text("executor", "Виконавець за посадою", { maxlength: 220, placeholder: "Класним керівникам" }),
    textarea("text", "Доручення *", { required: true, maxlength: 2200 }),
    select("deadlineKind", "Тип строку", [
      { value: "", label: "Без окремого строку" },
      { value: "date", label: "Конкретна дата (РРРР-ММ-ДД)" },
      { value: "preset", label: "Типовий строк" },
      { value: "free", label: "Власне формулювання" },
    ], { default: "" }),
    text("deadlineValue", "Строк", { maxlength: 120, placeholder: "Постійно / 2026-08-20 / За потреби" }),
  ], {
    advanced: true,
    maxItems: 100,
    help: "Виконавець зазначається за посадою. Рівні формують автоматичну багаторівневу нумерацію, строк друкується окремо праворуч.",
  }),
  text("controlPerson", "Контроль за виконанням", {
    advanced: true,
    maxlength: 220,
    placeholder: "Залиште порожнім — директор залишить контроль за собою",
  }),
  textarea("grounds", "Підстава (окремий реквізит)", {
    advanced: true,
    maxlength: 1600,
    placeholder: "Наприклад: заява Ірини ІВАНОВОЇ від 01.09.2026",
    help: "Необов’язково. Використовуйте для наказів, де після розпорядчої частини потрібен окремий реквізит «Підстава:».",
  }),
  repeatable("acknowledgements", "З наказом ознайомлені", [
    person("name", "Власне ім’я та ПРІЗВИЩЕ *", { required: true, maxlength: 220 }),
    date("date", "Дата ознайомлення", {}),
  ], { advanced: true, maxItems: 100, help: "Необов’язковий блок підписів. За локальною інструкцією замість нього може використовуватися окремий аркуш ознайомлення." }),
];

const LEGAL_SENSITIVE_TEMPLATES = new Set([
  "pedagogical-workload",
  "responsible-safety",
  "student-enrollment",
  "school-meals",
  "attestation-commission",
  "attestation-list-schedule",
  "winter-safety",
  "attestation-results",
  "first-grade-admission",
  "dpa-exemption",
  "education-documents",
  "student-promotion",
  "preliminary-tariffication",
]);

export const RECORD_SERIES_OPTIONS = Object.freeze([
  "Основна діяльність",
  "Рух здобувачів освіти",
  "Адміністративно-господарські питання",
  "Кадрові питання",
]);

const RECORD_SERIES_BY_TEMPLATE = Object.freeze({
  "school-year-organization": "Основна діяльність",
  "pedagogical-workload": "Кадрові питання",
  "responsible-safety": "Основна діяльність",
  "student-enrollment": "Рух здобувачів освіти",
  "school-meals": "Основна діяльність",
  "class-teachers": "Кадрові питання",
  "attestation-commission": "Основна діяльність",
  "adaptation-grade-1-5": "Основна діяльність",
  "school-olympiad": "Основна діяльність",
  "documentation-check": "Основна діяльність",
  "attestation-list-schedule": "Основна діяльність",
  "semester-results": "Основна діяльність",
  "winter-break-plan": "Основна діяльність",
  "winter-safety": "Основна діяльність",
  "olympiad-results": "Основна діяльність",
  "attestation-results": "Кадрові питання",
  "school-year-end": "Основна діяльність",
  "first-grade-admission": "Рух здобувачів освіти",
  "dpa-exemption": "Основна діяльність",
  "education-documents": "Основна діяльність",
  "student-promotion": "Рух здобувачів освіти",
  "preliminary-tariffication": "Кадрові питання",
  "responsible-person": "Основна діяльність",
  "commission": "Основна діяльність",
  "approve-document": "Основна діяльність",
  "free-order": "Основна діяльність",
});

function template(config) {
  const needsVerification = Boolean(config.needsVerification || LEGAL_SENSITIVE_TEMPLATES.has(config.id));
  const hasVerificationField = (config.fields || []).some((field) => field.id === "verifiedBasis");
  const verifiedFields = needsVerification && !hasVerificationField
    ? [...(config.fields || []), textarea("verifiedBasis", "Перевірена чинна нормативна підстава *", {
        required: true,
        advanced: true,
        maxlength: 1600,
        placeholder: "Назва, дата, номер і чинна редакція акта, перевірені на дату видання наказу",
        help: "Це поле є журналом юридичної перевірки й не підставляється автоматично в текст наказу.",
      })]
    : (config.fields || []);
  const legalBasisIds = Array.isArray(config.legalBasisIds) ? config.legalBasisIds : [];
  const fields = legalBasisIds.length
    ? verifiedFields.map((field) => field.id === "legalBasis"
      ? { ...field, defaultItems: legalBasisIds.map((id) => ({ id })) }
      : field)
    : verifiedFields;
  const result = {
    frequency: "Щорічно",
    tags: [],
    months: [],
    ...config,
    fields,
    needsVerification,
    recordSeries: config.recordSeries || RECORD_SERIES_BY_TEMPLATE[config.id] || "Основна діяльність",
    legalReview: needsVerification ? {
      reviewedAt: "2026-08-10",
      note: "Перед підписанням звірте підставу з чинною редакцією акта та локальною інструкцією з діловодства.",
      ...(config.legalReview || {}),
    } : null,
  };
  if (legalBasisIds.length && typeof config.build === "function") {
    result.build = (data) => {
      const selected = Array.isArray(data.legalBasis) ? data.legalBasis.filter((item) => clean(item?.id)) : [];
      const effectiveData = selected.length ? data : { ...data, legalBasis: legalBasisIds.map((id) => ({ id })) };
      return config.build.call(result, effectiveData);
    };
  }
  return result;
}

export const ORDER_TEMPLATES = [
  template({
    id: "school-year-organization",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про організацію освітнього процесу у навчальному році",
    description: "Комплексний наказ про строки навчального року, формат освітнього процесу, хвилину мовчання, гнучкий режим, індивідуальні форми та першочергові доручення класним керівникам.",
    tags: ["початок року", "організація освітнього процесу", "навчальний рік", "хвилина мовчання", "формат навчання"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-school-year-847"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("startDate", "Початок навчального року *", { required: true, default: "2026-09-01" }),
      date("endDate", "Завершення навчального року *", { required: true, default: "2027-06-30" }),
      select("format", "Основний формат роботи", [
        { value: "очному форматі", label: "Очний" },
        { value: "змішаному форматі", label: "Змішаний" },
        { value: "дистанційному форматі", label: "Дистанційний" },
      ], { default: "очному форматі" }),
      text("classRange", "Класи, охоплені наказом *", { required: true, default: "1–9", maxlength: 80 }),
      text("inclusiveClasses", "Інклюзивні класи", { maxlength: 160, placeholder: "Наприклад: 4 клас" }),
      text("minuteSilenceTime", "Час загальнонаціональної хвилини мовчання", { default: "09:00", maxlength: 20 }),
      text("firstLessonTheme", "Тема Першого уроку", { maxlength: 300, placeholder: "Якщо тему вже визначено" }),
      select("allowIndividualForms", "Передбачити індивідуальні форми здобуття освіти", [
        { value: "yes", label: "Так" },
        { value: "no", label: "Ні" },
      ], { default: "yes" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective("Колективу закладу", `розпочати ${clean(data.schoolYear)} навчальний рік ${formatDateUa(data.startDate)} та завершити ${formatDateUa(data.endDate)}.`),
        orderDirective("Колективу закладу", `організувати освітній процес для ${clean(data.classRange)} класів у ${clean(data.format)} з дотриманням вимог цивільного захисту та локальних алгоритмів безпеки.`, 1, deadlinePreset(`Із ${formatDateUa(data.startDate)}`)),
        orderDirective("Колективу закладу", "забезпечувати гнучку організацію освітнього процесу та коригування розкладу, календарного планування або формату роботи у разі загрози безпеці, аварійних відключень чи інших надзвичайних обставин.", 1, deadlinePreset("За потреби")),
      ];
      if (clean(data.minuteSilenceTime)) points.push(orderDirective("Колективу закладу", `забезпечувати проведення загальнонаціональної хвилини мовчання о ${clean(data.minuteSilenceTime)}.`, 1, deadlinePreset("Щоденно")));
      if (data.allowIndividualForms !== "no") points.push(orderDirective("Адміністрації закладу", "організовувати здобуття освіти за індивідуальною формою для учнів, які мають на це законні підстави, після отримання й перевірки необхідних документів.", 0, deadlinePreset("За заявами та у встановленому порядку")));
      if (clean(data.inclusiveClasses)) points.push(orderDirective("Адміністрації закладу", `організувати інклюзивне навчання у таких класах: ${clean(data.inclusiveClasses)}.`, 0, deadlinePreset(`Із ${formatDateUa(data.startDate)}`)));
      points.push(orderDirective("Класним керівникам", "провести вступні бесіди й інструктажі щодо збереження життя і здоров’я, правил поведінки та дій у надзвичайних ситуаціях.", 0, deadlineDate(data.startDate)));
      if (clean(data.firstLessonTheme)) points.push(orderDirective("Класним керівникам", `провести Перший урок за темою «${clean(data.firstLessonTheme).replace(/[«»"]/gu, "")}».`, 1, deadlinePreset(formatDateUa(data.startDate))));
      return finish(`Про організацію освітнього процесу у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`З метою організованого початку ${clean(data.schoolYear)} навчального року, забезпечення права здобувачів освіти на якісну освіту та створення безпечного освітнього середовища`, data.basis),
        points, data);
    },
  }),
  template({
    id: "school-work-regime",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про затвердження режиму роботи закладу у навчальному році",
    description: "Робочий тиждень, години роботи, зміни, початок занять, тривалість уроків і перерв, хвилина мовчання та дії під час сигналу небезпеки.",
    tags: ["режим роботи", "графік роботи", "тривалість уроків", "перерви", "зміни", "розклад"],
    preparedSummary: "Типовий режим уже заповнено — перевірити тривалість уроків, перерви та відповідальних",
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-school-year-847", "moh-sanitary-2205"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("effectiveDate", "Дата введення режиму в дію *", { required: true, default: "2026-09-01" }),
      text("workingWeek", "Робочий тиждень *", { required: true, default: "п’ятиденний, з понеділка по п’ятницю", maxlength: 220, collapsed: true }),
      text("openingTime", "Початок роботи закладу *", { required: true, default: "08:00", maxlength: 20 }),
      text("closingTime", "Завершення роботи закладу *", { required: true, default: "18:00", maxlength: 20 }),
      number("shifts", "Кількість змін *", { required: true, default: 1, min: 1, max: 3 }),
      text("classRange", "Класи *", { required: true, default: "1–9", maxlength: 80 }),
      text("lessonStart", "Початок навчальних занять *", { required: true, default: "08:30", maxlength: 20 }),
      repeatable("lessonDurations", "Тривалість уроків *", [
        text("classGroup", "Класи *", { required: true, maxlength: 80, placeholder: "1 класи" }),
        number("minutes", "Хвилин *", { required: true, min: 20, max: 60 }),
      ], {
        required: true,
        maxItems: 20,
        collapsed: true,
        defaultItems: [
          { classGroup: "1 класи", minutes: 35 },
          { classGroup: "2–4 класи", minutes: 40 },
          { classGroup: "5–9 класи", minutes: 45 },
        ],
      }),
      text("breakDuration", "Тривалість перерв *", { required: true, default: "від 10 до 20 хвилин з урахуванням часу на харчування", maxlength: 220, collapsed: true }),
      text("minuteSilenceTime", "Час хвилини мовчання", { default: "09:00", maxlength: 20, collapsed: true }),
      text("scheduleResponsible", "Хто складає розклад (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220, collapsed: true }),
      select("includeAfterSchoolGroup", "Передбачити групу продовженого дня", [
        { value: "yes", label: "Так" },
        { value: "no", label: "Ні" },
      ], { default: "no", collapsed: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const durations = (data.lessonDurations || [])
        .filter((row) => clean(row.classGroup) && clean(row.minutes))
        .map((row) => `${clean(row.classGroup)} — ${clean(row.minutes)} хвилин`);
      const points = [
        orderDirective("", `Затвердити Режим роботи закладу на ${clean(data.schoolYear)} навчальний рік та ввести його в дію з ${formatDateUa(data.effectiveDate)} (додаток 1).`),
        orderDirective("", `Установити ${clean(data.workingWeek)} робочий тиждень для учасників освітнього процесу.`),
        orderDirective("", `Установити час роботи закладу з ${clean(data.openingTime)} до ${clean(data.closingTime)}.`),
        orderDirective("", `Організувати навчання у ${clean(data.shifts)} ${Number(data.shifts) === 1 ? "зміну" : "зміни"} для ${clean(data.classRange)} класів; початок занять — о ${clean(data.lessonStart)}.`),
        orderDirective("", `Установити тривалість перерв: ${normalizeSentence(data.breakDuration)}.`),
      ];
      if (clean(data.minuteSilenceTime)) points.push(orderDirective("Колективу закладу", `забезпечувати проведення загальнонаціональної хвилини мовчання о ${clean(data.minuteSilenceTime)}.`, 0, deadlinePreset("Щоденно")));
      points.push(orderDirective("Учасникам освітнього процесу", "під час сигналу небезпеки припиняти роботу в навчальних приміщеннях та діяти за затвердженим алгоритмом переміщення до укриття.", 0, deadlinePreset("Під час сигналу оповіщення")));
      if (data.includeAfterSchoolGroup === "yes") points.push(orderDirective("Адміністрації закладу", "організувати роботу групи продовженого дня відповідно до затвердженого режиму та окремого розкладу."));
      points.push(orderDirective(data.scheduleResponsible, "скласти розклад навчальних занять відповідно до затвердженого режиму роботи й санітарних вимог.", 0, deadlineDate(data.effectiveDate)));
      const order = finish(`Про затвердження режиму роботи закладу у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`З метою впорядкування режиму роботи закладу та належної організації освітнього процесу у ${clean(data.schoolYear)} навчальному році`, data.basis),
        points, data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: `Режим роботи закладу на ${clean(data.schoolYear)} навчальний рік`,
          paragraphs: [
            `1. Робочий тиждень: ${normalizeSentence(data.workingWeek)}.`,
            `2. Час роботи закладу: з ${clean(data.openingTime)} до ${clean(data.closingTime)}.`,
            `3. Навчання організовано у ${clean(data.shifts)} ${Number(data.shifts) === 1 ? "зміну" : "зміни"}; початок занять — о ${clean(data.lessonStart)}.`,
            `4. Тривалість уроків: ${durations.join("; ")}.`,
            `5. Перерви: ${normalizeSentence(data.breakDuration)}.`,
            "6. Розклад занять, харчування та роботи гуртків затверджується окремо з урахуванням цього режиму.",
            "7. Під час сигналів небезпеки діє затверджений алгоритм оповіщення та переміщення до укриття.",
          ],
        }],
      };
    },
  }),
  template({
    id: "educational-program-introduction",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про введення в дію освітньої програми та річних навчальних планів",
    description: "Введення освітньої програми й навчальних планів, перерозподіл годин, календарне планування, оприлюднення та аналіз виконання.",
    tags: ["освітня програма", "навчальний план", "перерозподіл годин", "рішення педради", "календарне планування"],
    preparedSummary: "Виконавці й типові строки вже заповнені — змінити за потреби",
    needsVerification: true,
    legalBasisIds: ["law-secondary-463", "cmu-primary-standard-87", "cmu-basic-standard-898", "mon-primary-programs-743", "mon-basic-program-235"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("programName", "Назва освітньої програми *", { required: true, default: "наскрізна освітня програма закладу для початкового та базового рівнів середньої освіти", maxlength: 500 }),
      text("classRange", "Класи, для яких затверджено навчальні плани *", { required: true, default: "1–9", maxlength: 80 }),
      date("effectiveDate", "Дата введення в дію *", { required: true, default: "2026-09-01" }),
      date("councilDate", "Дата рішення педагогічної ради *", { required: true, default: "2026-08-28" }),
      text("protocolNumber", "Номер протоколу педагогічної ради *", { required: true, default: "1", maxlength: 30 }),
      repeatable("hourRedistribution", "Перерозподіл навчальних годин", [
        text("className", "Клас *", { required: true, maxlength: 30 }),
        text("subject", "Предмет / інтегрований курс *", { required: true, maxlength: 220 }),
        text("hours", "Кількість годин *", { required: true, maxlength: 30, placeholder: "0,5" }),
      ], { maxItems: 200 }),
      text("teachers", "Виконавець для педагогічних працівників (посада) *", { required: true, default: "учителям закладу", maxlength: 220, collapsed: true }),
      text("deputy", "Відповідальний за оприлюднення й аналіз (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220, collapsed: true }),
      date("planningDeadline", "Строк підготовки календарно-тематичних планів *", { required: true, default: "2026-09-01", collapsed: true }),
      date("publicationDeadline", "Строк оприлюднення програми *", { required: true, default: "2026-09-01", collapsed: true }),
      date("analysisDeadline", "Строк аналізу виконання програми *", { required: true, default: "2027-06-28", collapsed: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const redistributionRows = (data.hourRedistribution || [])
        .filter((row) => clean(row.className) || clean(row.subject) || clean(row.hours))
        .map((row) => [clean(row.className), clean(row.subject), clean(row.hours)]);
      const points = [
        orderDirective("", `Ввести в дію з ${formatDateUa(data.effectiveDate)} ${clean(data.programName)}.`),
        orderDirective("", `Ввести в дію річні навчальні плани для ${clean(data.classRange)} класів на ${clean(data.schoolYear)} навчальний рік.`),
      ];
      if (redistributionRows.length) points.push(orderDirective("", "Затвердити перерозподіл навчальних годин між освітніми галузями та навчальними предметами згідно з таблицею у розпорядчій частині цього наказу."));
      points.push(
        orderDirective(data.teachers, "використовувати затверджену освітню програму й річні навчальні плани під час організації освітньої діяльності.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
        orderDirective(data.teachers, "підготувати календарно-тематичні плани відповідно до освітньої програми та річних навчальних планів.", 1, deadlineDate(data.planningDeadline)),
        orderDirective(data.deputy, "оприлюднити освітню програму та річні навчальні плани на офіційному вебсайті закладу.", 0, deadlineDate(data.publicationDeadline)),
        orderDirective(data.deputy, "проаналізувати стан виконання освітньої програми й підготувати управлінські висновки за результатами навчального року.", 1, deadlineDate(data.analysisDeadline)),
        orderDirective("Класним керівникам", "оформити класні журнали та розподіл сторінок навчальних предметів відповідно до затверджених навчальних планів.", 0, deadlineDate(data.planningDeadline)),
      );
      const order = finish(`Про введення в дію освітньої програми та річних навчальних планів на ${clean(data.schoolYear)} навчальний рік`,
        withBasis(`На підставі рішення педагогічної ради від ${formatDateUa(data.councilDate)}, протокол № ${clean(data.protocolNumber)}, та з метою реалізації права на освіту, забезпечення її якості й належної організації освітнього процесу`, data.basis),
        points, data);
      return {
        ...order,
        bodyTables: redistributionRows.length ? [{
          title: "Перерозподіл навчальних годин",
          columns: ["Клас", "Предмет / інтегрований курс", "Кількість годин"],
          rows: redistributionRows,
          afterDirective: 3,
        }] : [],
      };
    },
  }),
  template({
    id: "new-school-year-preparation",
    category: "Початок року",
    months: ["05", "06", "07", "08"],
    title: "Про підготовку закладу до нового навчального року",
    description: "Робоча група, план готовності приміщень та укриття, пожежна й санітарна безпека, медичні огляди та комісійне обстеження.",
    tags: ["підготовка до навчального року", "готовність закладу", "робоча група", "акт готовності", "укриття", "ремонт"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "law-labor-protection-2694", "code-civil-protection-5403", "mon-fire-schools-974", "mon-safety-1669"],
    fields: [
      text("schoolYear", "Новий навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      repeatable("workingGroup", "Склад робочої групи за посадами *", [
        text("role", "Роль у групі *", { required: true, maxlength: 100, placeholder: "Керівник групи" }),
        text("position", "Посада *", { required: true, maxlength: 220, placeholder: "Директор" }),
      ], {
        required: true,
        maxItems: 30,
        defaultItems: [
          { role: "Керівник групи", position: "директор" },
          { role: "Член групи", position: "завідуючий господарством" },
          { role: "Член групи", position: "сестра медична" },
          { role: "Член групи", position: "робітник з комплексного обслуговування будівель" },
        ],
      }),
      text("facilitiesOfficer", "Господарська підготовка (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      text("medicalOfficer", "Медичні та санітарні питання (посада) *", { required: true, default: "сестрі медичній", maxlength: 220 }),
      text("safetyOfficer", "Пожежна безпека й укриття (посада) *", { required: true, default: "відповідальному за пожежну безпеку та функціонування укриття", maxlength: 220 }),
      date("readinessDeadline", "Строк основних заходів готовності *", { required: true, default: "2026-08-20" }),
      date("healthDeadline", "Строк медичної перевірки *", { required: true, default: "2026-09-01" }),
      text("inspectionSchedule", "Строк комісійного обстеження *", { required: true, default: "Згідно із затвердженим графіком", maxlength: 180 }),
      repeatable("extraPlanItems", "Додаткові заходи місцевого плану", [
        textarea("action", "Захід *", { required: true, maxlength: 1200 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
        text("responsible", "Відповідальний за посадою *", { required: true, maxlength: 220 }),
      ], { maxItems: 100 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const planRows = [
        ["1", "Обстежити приміщення, інженерні комунікації, обладнання, спортивні споруди та територію; зафіксувати недоліки й організувати їх усунення.", `До ${formatDateUa(data.readinessDeadline)}`, clean(data.facilitiesOfficer)],
        ["2", "Перевірити готовність укриття, евакуаційних шляхів, покажчиків руху та доступність маршрутів для осіб з особливими освітніми потребами.", `До ${formatDateUa(data.readinessDeadline)}`, clean(data.safetyOfficer)],
        ["3", "Перевірити наявність, доступність і належний стан первинних засобів пожежогасіння та документації з пожежної безпеки.", `До ${formatDateUa(data.readinessDeadline)}`, clean(data.safetyOfficer)],
        ["4", "Перевірити санітарний стан, питний і температурний режими, організацію медичного обслуговування та відомості про обов’язкові медичні огляди.", `До ${formatDateUa(data.healthDeadline)}`, clean(data.medicalOfficer)],
        ["5", "Підготувати акти обстеження, акти-дозволи та інші документи, необхідні для підтвердження готовності закладу до нового навчального року.", `До ${formatDateUa(data.readinessDeadline)}`, "Робоча група"],
        ["6", "Забезпечити проведення комісійного обстеження готовності закладу та укриття.", clean(data.inspectionSchedule), "Керівник робочої групи"],
      ];
      (data.extraPlanItems || []).filter((row) => clean(row.action) || clean(row.deadline) || clean(row.responsible)).forEach((row) => {
        planRows.push([String(planRows.length + 1), clean(row.action), clean(row.deadline), clean(row.responsible)]);
      });
      const order = finish(`Про підготовку закладу до нового ${clean(data.schoolYear)} навчального року`,
        withBasis(`З метою своєчасної підготовки закладу, створення безпечних і належних умов для організації освітнього процесу у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          orderDirective("", "Створити робочу групу з підготовки закладу до нового навчального року у складі згідно з додатком 1."),
          orderDirective("", `Затвердити План заходів щодо підготовки закладу до ${clean(data.schoolYear)} навчального року (додаток 2).`),
          orderDirective("Робочій групі", "забезпечити виконання затвердженого Плану заходів.", 0, deadlineDate(data.readinessDeadline)),
          orderDirective("Керівнику робочої групи", "забезпечити доступ уповноважених представників до приміщень і документів під час комісійного обстеження.", 0, deadlinePreset(data.inspectionSchedule)),
          orderDirective(data.medicalOfficer, "перевірити санітарні умови, організацію медичного обслуговування та проходження обов’язкових медичних оглядів працівниками.", 0, deadlineDate(data.healthDeadline)),
          orderDirective(data.safetyOfficer, "забезпечити готовність укриття, евакуаційних шляхів і первинних засобів пожежогасіння.", 0, deadlineDate(data.readinessDeadline)),
        ], data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: "Склад робочої групи з підготовки закладу до нового навчального року",
          columns: ["№ з/п", "Роль у групі", "Посада"],
          rows: (data.workingGroup || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.position)]),
        }, {
          kind: "approved",
          title: `План заходів щодо підготовки закладу до ${clean(data.schoolYear)} навчального року`,
          columns: ["№ з/п", "Захід", "Строк", "Відповідальний"],
          rows: planRows,
        }],
      };
    },
  }),
  template({
    id: "class-network-approval",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про затвердження мережі класів у навчальному році",
    description: "Мережа класів і кількість учнів, індивідуальні форми навчання, поділ на групи та інклюзивні класи. Дані використовуються для міжнаказової перевірки безпекових маршрутів.",
    tags: ["мережа класів", "кількість учнів", "контингент", "поділ на групи", "інклюзивні класи", "екстернат"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-child-records-684", "mon-enrollment-367"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("effectiveDate", "Дата затвердження мережі *", { required: true, default: "2026-09-01" }),
      repeatable("classes", "Класи та кількість учнів *", [
        text("className", "Клас *", { required: true, maxlength: 30, placeholder: "1 клас / 1-А клас" }),
        number("students", "Кількість учнів *", { required: true, min: 0, max: 60 }),
        text("features", "Особливості", { maxlength: 180, placeholder: "Наприклад: інклюзивний" }),
      ], { required: true, minItems: 1, maxItems: 200 }),
      repeatable("individualStudents", "Учні на індивідуальних формах", [
        text("className", "Клас *", { required: true, maxlength: 30 }),
        text("form", "Форма здобуття освіти *", { required: true, maxlength: 180, placeholder: "Екстернатна / сімейна / педагогічний патронаж" }),
        number("students", "Кількість учнів *", { required: true, min: 0, max: 60 }),
      ], { maxItems: 100 }),
      repeatable("classGroups", "Поділ класів на групи", [
        text("className", "Клас *", { required: true, maxlength: 30 }),
        text("subject", "Предмет *", { required: true, maxlength: 220 }),
        number("groups", "Кількість груп *", { required: true, min: 1, max: 10 }),
      ], { maxItems: 100 }),
      text("recordsResponsible", "Хто оновлює облікові документи (посада) *", { required: true, default: "відповідальному за ведення обліку здобувачів освіти", maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const classRows = (data.classes || []).map((row) => [clean(row.className), clean(row.students), clean(row.features) || "—"]);
      const individualRows = (data.individualStudents || []).filter((row) => clean(row.className) || clean(row.form) || clean(row.students)).map((row) => [clean(row.className), clean(row.form), clean(row.students)]);
      const groupRows = (data.classGroups || []).filter((row) => clean(row.className) || clean(row.subject) || clean(row.groups)).map((row) => [clean(row.className), clean(row.subject), clean(row.groups)]);
      const points = [
        orderDirective("", `Затвердити з ${formatDateUa(data.effectiveDate)} мережу класів закладу на ${clean(data.schoolYear)} навчальний рік згідно з таблицею 1.`),
      ];
      if (individualRows.length) points.push(orderDirective("", "Затвердити кількість здобувачів освіти, які навчаються за індивідуальними формами, згідно з таблицею 2."));
      if (groupRows.length) points.push(orderDirective("", `Затвердити поділ класів на групи під час вивчення окремих навчальних предметів згідно з таблицею ${individualRows.length ? "3" : "2"}.`));
      points.push(
        orderDirective(data.recordsResponsible, "внести зміни до алфавітної книги та інших облікових документів відповідно до затвердженої мережі.", 0, deadlineDate(data.effectiveDate)),
        orderDirective("Класним керівникам", "оформити класні журнали відповідно до фактичної мережі класів.", 0, deadlinePreset(`Із ${formatDateUa(data.effectiveDate)}`)),
      );
      const bodyTables = [{
        title: "Таблиця 1. Мережа класів",
        columns: ["Клас", "Кількість учнів", "Особливості"],
        rows: classRows,
        afterDirective: 1,
      }];
      if (individualRows.length) bodyTables.push({
        title: "Таблиця 2. Індивідуальні форми здобуття освіти",
        columns: ["Клас", "Форма здобуття освіти", "Кількість учнів"],
        rows: individualRows,
        afterDirective: 2,
      });
      if (groupRows.length) bodyTables.push({
        title: `Таблиця ${individualRows.length ? "3" : "2"}. Поділ класів на групи`,
        columns: ["Клас", "Навчальний предмет", "Кількість груп"],
        rows: groupRows,
        afterDirective: 1 + Number(individualRows.length > 0) + Number(groupRows.length > 0),
      });
      const order = finish(`Про затвердження мережі класів у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`З метою належної організації освітнього процесу, ведення достовірного обліку здобувачів освіти та забезпечення доступності освіти у ${clean(data.schoolYear)} навчальному році`, data.basis),
        points, data);
      return { ...order, bodyTables };
    },
  }),
  template({
    id: "pedagogical-council-decisions",
    category: "Початок року",
    months: ["08", "09", "01", "03", "05", "06"],
    frequency: "Після засідання педагогічної ради",
    title: "Про введення в дію рішень педагогічної ради",
    description: "Одне або кілька рішень педагогічної ради з конкретними виконавцями, діями та строками — без незаповнених «рибок». Новий наказ можна створювати після кожного засідання.",
    tags: ["педагогічна рада", "рішення педради", "протокол", "введення в дію"],
    needsVerification: true,
    legalBasisIds: ["law-secondary-463"],
    fields: [
      date("councilDate", "Дата засідання педагогічної ради *", { required: true, default: "2026-08-28" }),
      text("protocolNumber", "Номер протоколу *", { required: true, default: "1", maxlength: 30 }),
      repeatable("decisions", "Рішення педагогічної ради *", [
        text("title", "Назва питання / рішення *", { required: true, maxlength: 500, placeholder: "Про організацію освітнього процесу…" }),
        text("executor", "Виконавець за посадою *", { required: true, maxlength: 220, placeholder: "Учителям закладу" }),
        textarea("action", "Що потрібно виконати *", { required: true, maxlength: 1600 }),
        select("deadlineKind", "Тип строку", [
          { value: "preset", label: "Типовий / текстовий строк" },
          { value: "date", label: "Конкретна дата РРРР-ММ-ДД" },
        ], { default: "preset" }),
        text("deadlineValue", "Строк *", { required: true, default: "Постійно", maxlength: 120 }),
      ], { required: true, minItems: 1, maxItems: 50 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [];
      (data.decisions || []).forEach((decision) => {
        points.push(orderDirective("", `Ввести в дію рішення педагогічної ради від ${formatDateUa(data.councilDate)}, протокол № ${clean(data.protocolNumber)}, «${clean(decision.title).replace(/[«»"]/gu, "")}».`));
        points.push(orderDirective(decision.executor, decision.action, 1, clean(decision.deadlineValue) ? {
          kind: decision.deadlineKind === "date" ? "date" : "preset",
          value: clean(decision.deadlineValue),
        } : null));
      });
      return finish(this.title,
        withBasis(`На підставі протоколу засідання педагогічної ради від ${formatDateUa(data.councilDate)} № ${clean(data.protocolNumber)} та з метою забезпечення виконання ухвалених рішень`, data.basis),
        points, data);
    },
  }),
  template({
    id: "sports-facilities-readiness",
    category: "Адміністративно-господарські",
    months: ["08", "09"],
    title: "Про підготовку спортивних споруд до використання у навчальному році",
    description: "Комісійна перевірка спортзалу, майданчиків та інвентарю, акт готовності, технічне обстеження, журнали занять і усунення недоліків.",
    tags: ["спортивні споруди", "спортзал", "спортивний майданчик", "акт готовності", "фізична культура"],
    recordSeries: "Адміністративно-господарські питання",
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "mon-safety-1669", "mon-physical-safety-521"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      repeatable("commission", "Склад комісії за посадами *", [
        text("role", "Роль *", { required: true, maxlength: 100 }),
        text("position", "Посада *", { required: true, maxlength: 220 }),
      ], {
        required: true,
        maxItems: 20,
        defaultItems: [
          { role: "Голова комісії", position: "заступник директора" },
          { role: "Член комісії", position: "учитель фізичної культури" },
          { role: "Член комісії", position: "завідуючий господарством" },
        ],
      }),
      repeatable("facilities", "Спортивні споруди та об’єкти *", [
        text("name", "Назва об’єкта *", { required: true, maxlength: 220, placeholder: "Спортивний зал / майданчик" }),
        text("location", "Розташування", { maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 50 }),
      text("physicalTeacher", "Відповідальний учитель (посада) *", { required: true, default: "учителю фізичної культури", maxlength: 220 }),
      text("facilitiesOfficer", "Господарська підготовка (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      date("inspectionDeadline", "Строк комісійної перевірки й акта *", { required: true, default: "2026-08-29" }),
      date("documentsDeadline", "Строк підготовки журналів і розкладів *", { required: true, default: "2026-09-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const facilityNames = (data.facilities || []).map((item) => clean(item.name)).filter(Boolean).join(", ");
      const order = finish(`Про підготовку спортивних споруд до використання у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`З метою своєчасної та якісної підготовки спортивних споруд, безпечного проведення занять і належного утримання спортивного обладнання у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          orderDirective("", "Створити комісію з перевірки готовності спортивних споруд у складі згідно з додатком 1."),
          orderDirective("Комісії", `провести перевірку готовності таких об’єктів: ${facilityNames}; перевірити надійність кріплень, стійкість конструкцій, справність інвентарю та відповідність вимогам безпеки.`),
          orderDirective("Комісії", "за результатами перевірки скласти акт готовності спортивних споруд і подати його директору на затвердження.", 1, deadlineDate(data.inspectionDeadline)),
          orderDirective(data.physicalTeacher, "підготувати спортивні споруди та обладнання до проведення занять і спортивних заходів.", 0, deadlineDate(data.inspectionDeadline)),
          orderDirective(data.physicalTeacher, "забезпечити ведення необхідних журналів обліку та наявність затверджених розкладів роботи секцій і спортивних груп.", 1, deadlineDate(data.documentsDeadline)),
          orderDirective(data.facilitiesOfficer, "організувати усунення виявлених недоліків, ремонт і збереження спортивного обладнання, забезпечення засобами пожежогасіння та домедичної допомоги.", 0, deadlineDate(data.documentsDeadline)),
          orderDirective("Працівникам закладу", "не допускати використання спортивних споруд та обладнання, безпечність яких не підтверджена або щодо яких виявлено несправності.", 0, deadlinePreset("Постійно")),
        ], data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: "Склад комісії з перевірки готовності спортивних споруд",
          columns: ["№ з/п", "Роль", "Посада"],
          rows: (data.commission || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.position)]),
        }],
      };
    },
  }),
  template({
    id: "electrical-facilities-responsible",
    category: "Адміністративно-господарські",
    months: ["08", "09"],
    title: "Про призначення відповідального за електрогосподарство",
    description: "Безпечна експлуатація електроустановок, технічне обслуговування, огляди мереж, інструктажі, облік електроенергії та дії працівників у разі несправності.",
    tags: ["електрогосподарство", "електробезпека", "електроустановки", "відповідальний", "заземлення"],
    recordSeries: "Адміністративно-господарські питання",
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "energy-operation-258", "electrical-safety-4", "mvs-fire-rules-1417"],
    fields: [
      text("responsible", "Відповідальний за електрогосподарство (посада або ПІБ) *", { required: true, maxlength: 220 }),
      text("qualification", "Підтверджена кваліфікація / група з електробезпеки *", { required: true, maxlength: 300, placeholder: "Група, протокол перевірки знань, строк дії" }),
      date("maintenanceDeadline", "Строк первинної перевірки й плану обслуговування *", { required: true, default: "2026-08-20" }),
      text("meterReportingDeadline", "Строк подання показників електроенергії *", { required: true, default: "Щомісяця до 5 числа", maxlength: 120 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis("З метою забезпечення справного стану й безпечної експлуатації електроустановок, запобігання електротравматизму та належного утримання електрогосподарства закладу", data.basis),
        [
          orderDirective("", `Призначити відповідальним за справний стан і безпечну експлуатацію електрогосподарства: ${clean(data.responsible)}. Підстава кваліфікації: ${clean(data.qualification)}.`),
          orderDirective(data.responsible, "забезпечувати надійну, безпечну та раціональну експлуатацію електроустановок і електрообладнання відповідно до затвердженої експлуатаційної документації."),
          orderDirective(data.responsible, "організувати технічне обслуговування, планово-попереджувальні ремонти, профілактичні вимірювання та випробування.", 1, deadlineDate(data.maintenanceDeadline)),
          orderDirective(data.responsible, "систематично контролювати стан електромереж, заземлення, електрощитів, вимикачів, розеток, освітлювальних приладів та аварійного живлення.", 1, deadlinePreset("Постійно")),
          orderDirective(data.responsible, "проводити передбачені інструктажі з електробезпеки та реєструвати їх у відповідних журналах.", 1, deadlinePreset("У встановлені строки та за потреби")),
          orderDirective(data.responsible, "подавати показники використаної електроенергії до визначеного структурного підрозділу.", 1, deadlinePreset(data.meterReportingDeadline)),
          orderDirective("Працівникам закладу", "не використовувати несправні, пошкоджені або саморобні електроприлади, подовжувачі, розетки та інше електрообладнання.", 0, deadlinePreset("Постійно")),
          orderDirective("Працівникам закладу", "після завершення роботи вимикати обладнання, яке не повинно працювати цілодобово; у разі іскріння, запаху горілої ізоляції, нагрівання або іншої несправності припинити використання та повідомити відповідального.", 1, deadlinePreset("Негайно")),
        ], data);
    },
  }),
  template({
    id: "room-managers",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про призначення завідувачів кабінетів, майстерень і спортивних залів",
    description: "Призначення відповідальних за приміщення із доплатами, підготовка інструкцій, обладнання, паспортів кабінетів, інвентаризація та технічний контроль.",
    tags: ["завідувач кабінету", "майстерня", "спортивний зал", "доплата", "інвентаризація"],
    recordSeries: "Кадрові питання",
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-labor-protection-2694", "cmu-education-supplements-1391", "mon-safety-1669"],
    fields: [
      repeatable("assignments", "Відповідальні за приміщення *", [
        select("type", "Тип приміщення *", [
          { value: "Навчальний кабінет", label: "Навчальний кабінет" },
          { value: "Майстерня", label: "Майстерня" },
          { value: "Спортивний зал", label: "Спортивний зал" },
          { value: "Інше приміщення", label: "Інше" },
        ], { required: true, default: "Навчальний кабінет" }),
        text("room", "Назва / номер приміщення *", { required: true, maxlength: 180 }),
        person("person", "Педагогічний працівник *", { required: true, maxlength: 220 }),
        text("supplement", "Доплата", { maxlength: 80, placeholder: "Розмір або посилання на тарифікацію" }),
      ], { required: true, minItems: 1, maxItems: 100 }),
      text("facilitiesOfficer", "Господарський контроль (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      date("readinessDeadline", "Строк перевірки готовності приміщень *", { required: true, default: "2026-08-20" }),
      date("inventoryDeadline", "Строк інвентаризації *", { required: true, default: "2026-10-15" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(this.title,
        withBasis("З метою створення безпечного освітнього середовища, збереження обладнання та визначення відповідальних за навчальні кабінети й спеціалізовані приміщення", data.basis),
        [
          orderDirective("", "Призначити завідувачів кабінетів, майстерень, спортивних залів та встановити доплати згідно з таблицею у розпорядчій частині цього наказу."),
          orderDirective("Завідувачам кабінетів і спеціалізованих приміщень", "забезпечити наявність актуальних інструкцій з охорони праці та безпеки життєдіяльності, правил поведінки й схеми евакуації."),
          orderDirective("Завідувачам кабінетів і спеціалізованих приміщень", "до початку занять перевірити справність обладнання, інструментів, інвентарю та аптечок домедичної допомоги.", 1, deadlineDate(data.readinessDeadline)),
          orderDirective("Завідувачам кабінетів і спеціалізованих приміщень", "не допускати до експлуатації несправне, пошкоджене або саморобне обладнання.", 1, deadlinePreset("Постійно")),
          orderDirective("Завідувачам кабінетів і спеціалізованих приміщень", "актуалізувати паспорт і план розвитку приміщення та провести інвентаризацію матеріальних цінностей.", 1, deadlineDate(data.inventoryDeadline)),
          orderDirective(data.facilitiesOfficer, "контролювати технічний стан освітлення, вентиляції, опалення, електромереж і забезпечення приміщень первинними засобами пожежогасіння.", 0, deadlinePreset("Постійно")),
        ], data);
      return {
        ...order,
        bodyTables: [{
          title: "Закріплення кабінетів і спеціалізованих приміщень",
          columns: ["№ з/п", "Тип", "Кабінет / приміщення", "Відповідальний", "Доплата"],
          rows: (data.assignments || []).map((row, index) => [String(index + 1), clean(row.type), clean(row.room), clean(row.person), clean(row.supplement) || "Відповідно до тарифікації"]),
          afterDirective: 1,
        }],
      };
    },
  }),
  template({
    id: "school-readiness-results",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про результати підготовки закладу до нового навчального року",
    description: "Фіксація результатів комісійного обстеження без довгої ручної преамбули: укриття, пожежна й електрична безпека, санітарний стан, територія, опалення та невиконані заходи.",
    tags: ["результати готовності", "акт готовності", "обстеження закладу", "опалювальний сезон", "недоліки"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-labor-protection-2694", "code-civil-protection-5403", "mon-fire-schools-974", "mon-safety-1669"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("inspectionDate", "Дата завершення обстеження *", { required: true, default: "2026-08-28" }),
      text("inspectionBasis", "Акт / документ про результати обстеження *", { required: true, maxlength: 500, placeholder: "Акт готовності від … № …" }),
      select("overallAssessment", "Загальна оцінка готовності *", [
        { value: "задовільною", label: "Задовільна" },
        { value: "умовно задовільною", label: "Умовно задовільна" },
        { value: "незадовільною", label: "Незадовільна" },
      ], { required: true, default: "задовільною" }),
      repeatable("areas", "Результати за напрямами *", [
        text("area", "Напрям *", { required: true, maxlength: 180 }),
        select("status", "Стан *", [
          { value: "Готово", label: "Готово" },
          { value: "Потребує усунення недоліків", label: "Є недоліки" },
          { value: "Не готово", label: "Не готово" },
        ], { required: true, default: "Готово" }),
        textarea("finding", "Висновок / виявлені недоліки *", { required: true, maxlength: 1200 }),
        text("responsible", "Відповідальний за подальші дії *", { required: true, maxlength: 220 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
      ], {
        required: true,
        maxItems: 50,
        defaultItems: [
          { area: "Укриття та цивільний захист", status: "Готово", finding: "Готовність підтверджено актом обстеження", responsible: "відповідальний за укриття", deadline: "Постійно" },
          { area: "Пожежна безпека", status: "Готово", finding: "Шляхи евакуації та первинні засоби пожежогасіння перевірено", responsible: "відповідальний за пожежну безпеку", deadline: "Постійно" },
          { area: "Електрогосподарство", status: "Готово", finding: "Стан електромереж і захисних пристроїв перевірено", responsible: "відповідальний за електрогосподарство", deadline: "Постійно" },
          { area: "Санітарний і медичний стан", status: "Готово", finding: "Приміщення та медичне забезпечення підготовлено", responsible: "сестра медична", deadline: "Постійно" },
          { area: "Територія та приміщення", status: "Готово", finding: "Територію, меблі й обладнання підготовлено", responsible: "завідуючий господарством", deadline: "Постійно" },
        ],
      }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про результати підготовки закладу до ${clean(data.schoolYear)} навчального року`,
        withBasis(`За результатами обстеження, завершеного ${formatDateUa(data.inspectionDate)}, відповідно до ${clean(data.inspectionBasis)}, та з метою забезпечення безпечного функціонування закладу`, data.basis),
        [
          orderDirective("", `Визнати підготовку закладу до ${clean(data.schoolYear)} навчального року та опалювального сезону ${clean(data.overallAssessment)}.`),
          orderDirective("Відповідальним за напрями", "підтримувати готовність систем, приміщень і обладнання та виконати подальші заходи, зазначені у таблиці результатів цього наказу."),
          orderDirective("Колективу закладу", "дотримуватися затверджених алгоритмів дій під час сигналів оповіщення, правил евакуації, пожежної та техногенної безпеки.", 0, deadlinePreset("Постійно")),
          orderDirective("Колективу закладу", "продовжити роботу зі створення безпечного, доступного й безбар’єрного освітнього середовища.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
        ], data);
      return {
        ...order,
        bodyTables: [{
          title: "Результати готовності за напрямами",
          columns: ["№ з/п", "Напрям", "Стан", "Висновок / недоліки", "Відповідальний", "Строк"],
          rows: (data.areas || []).map((row, index) => [String(index + 1), clean(row.area), clean(row.status), clean(row.finding), clean(row.responsible), clean(row.deadline)]),
          afterDirective: 1,
        }],
      };
    },
  }),
  template({
    id: "shelter-responsible",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про призначення відповідального за утримання та функціонування укриття",
    description: "Технічний, санітарний і протипожежний стан укриття, системи життєзабезпечення, запаси, виходи, покажчики, журнали, безбар’єрність і медичні аптечки.",
    tags: ["укриття", "відповідальний за укриття", "захисна споруда", "готовність укриття", "генератор"],
    needsVerification: true,
    legalBasisIds: ["code-civil-protection-5403", "mvs-shelter-579"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("responsible", "Відповідальний за укриття (посада або ПІБ) *", { required: true, maxlength: 220 }),
      number("capacity", "Підтверджена місткість укриття, осіб *", { required: true, min: 1, max: 5000 }),
      text("capacityBasis", "Документ, що підтверджує місткість *", { required: true, maxlength: 400, placeholder: "Акт оцінки стану готовності від … № …" }),
      text("medicalOfficer", "Медичний супровід (посада) *", { required: true, default: "сестрі медичній", maxlength: 220 }),
      date("accessibilityDeadline", "Строк облаштування місць і доступності *", { required: true, default: "2026-09-01" }),
      date("fuelDeadline", "Строк створення запасу пального (якщо є генератор)", { default: "2026-10-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою підтримання готовності укриття місткістю ${clean(data.capacity)} осіб, підтвердженої документом: ${clean(data.capacityBasis)}, та забезпечення безпеки учасників освітнього процесу у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          orderDirective("", `Призначити відповідальним за утримання, стан готовності та функціонування укриття: ${clean(data.responsible)}.`),
          orderDirective(data.responsible, "забезпечувати належний технічний, санітарний і протипожежний стан приміщень укриття.", 0, deadlinePreset("Постійно")),
          orderDirective(data.responsible, "контролювати справність вентиляції, основного й аварійного освітлення, водопостачання, каналізації та резервних джерел живлення.", 1, deadlinePreset("Постійно")),
          orderDirective(data.responsible, "контролювати наявність і поповнення запасів води, засобів гігієни, інструменту та первинних засобів пожежогасіння.", 1, deadlinePreset("Постійно")),
          orderDirective(data.responsible, "перевіряти доступність входів, аварійних виходів та евакуаційних шляхів; оновлювати покажчики, схеми й правила поведінки.", 1, deadlinePreset("Не рідше одного разу на семестр та після змін")),
          orderDirective(data.responsible, "вести журнали стану готовності укриття та перевірок резервних джерел живлення.", 1, deadlinePreset("Постійно")),
          orderDirective(data.responsible, `забезпечити місця для сидіння в межах підтвердженої місткості ${clean(data.capacity)} осіб та доступність для людей з особливими потребами.`, 1, deadlineDate(data.accessibilityDeadline)),
          orderDirective(data.responsible, "забезпечувати безперешкодний доступ учасників освітнього процесу до укриття під час сигналів оповіщення.", 1, deadlinePreset("Під час кожного сигналу")),
          orderDirective(data.medicalOfficer, "перевіряти й поповнювати аптечки домедичної допомоги та контролювати стан здоров’я людей під час перебування в укритті.", 0, deadlinePreset("Щомісяця та за потреби")),
          ...(clean(data.fuelDeadline) ? [orderDirective(data.responsible, "створити й надалі підтримувати безпечний резерв пального для наявних альтернативних джерел живлення відповідно до встановлених вимог.", 0, deadlineDate(data.fuelDeadline))] : []),
        ], data);
    },
  }),
  template({
    id: "pedagogical-workload",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про розподіл педагогічного навантаження на навчальний рік",
    description: "Таблиця педагогічного навантаження з предметами, класами, спеціальністю та підвищенням кваліфікації; ознайомлення працівників і календарне планування.",
    tags: ["тарифікація", "педагогічне навантаження", "години", "педагоги", "письмова згода"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "labor-code-322"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("effectiveDate", "Дата введення в дію *", { required: true, default: "2026-09-01" }),
      repeatable("workloads", "Розподіл педагогічного навантаження *", [
        person("person", "Педагогічний працівник *", { required: true, maxlength: 220 }),
        text("speciality", "Спеціальність / кваліфікація *", { required: true, maxlength: 220 }),
        text("subjects", "Предмети / інтегровані курси *", { required: true, maxlength: 400 }),
        text("classes", "Класи *", { required: true, maxlength: 160 }),
        text("professionalDevelopment", "Рік і напрям підвищення кваліфікації", { maxlength: 400 }),
        text("hours", "Навантаження, годин *", { required: true, maxlength: 40, placeholder: "18 / 18,5" }),
      ], { required: true, minItems: 1, maxItems: 200 }),
      text("responsible", "Відповідальний за оформлення тарифікації (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      date("acknowledgementDeadline", "Строк ознайомлення працівників *", { required: true, default: "2026-08-29" }),
      date("planningDeadline", "Строк календарно-тематичного планування *", { required: true, default: "2026-09-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective("", `Розподілити педагогічне навантаження на ${clean(data.schoolYear)} навчальний рік та ввести його в дію з ${formatDateUa(data.effectiveDate)} згідно з таблицею у розпорядчій частині цього наказу.`),
        orderDirective(data.responsible, "оформити тарифікаційні матеріали з урахуванням освітньої програми, річних навчальних планів, штатного розпису та фактичного розподілу педагогічної роботи."),
        orderDirective("Педагогічним працівникам", `ознайомитися з установленим педагогічним навантаженням на ${clean(data.schoolYear)} навчальний рік.`, 0, deadlineDate(data.acknowledgementDeadline)),
        orderDirective("Педагогічним працівникам", "надати письмову згоду у випадках, коли така згода необхідна для встановлення навантаження менше норми на ставку.", 1, deadlinePreset("За потреби")),
        orderDirective("Педагогічним працівникам", "розробити календарно-тематичне планування відповідно до встановленого навантаження та затверджених навчальних планів.", 1, deadlineDate(data.planningDeadline)),
      ];
      const order = finish(`Про розподіл педагогічного навантаження на ${clean(data.schoolYear)} навчальний рік`,
        withBasis(`З метою належного розподілу педагогічного навантаження, забезпечення виконання освітньої програми та річних навчальних планів у ${clean(data.schoolYear)} навчальному році`, data.basis),
        points, data);
      return {
        ...order,
        bodyTables: [{
          title: "Розподіл педагогічного навантаження",
          columns: ["№ з/п", "Педагогічний працівник", "Спеціальність / кваліфікація", "Предмети", "Класи", "Підвищення кваліфікації", "Години"],
          rows: (data.workloads || []).map((row, index) => [String(index + 1), clean(row.person), clean(row.speciality), clean(row.subjects), clean(row.classes), clean(row.professionalDevelopment) || "—", clean(row.hours)]),
          afterDirective: 1,
        }],
      };
    },
  }),
  template({
    id: "responsible-safety",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про призначення відповідальної особи з питань безпеки",
    description: "Швидкий шаблон для охорони праці, пожежної безпеки, безпеки життєдіяльності або іншого напряму.",
    tags: ["відповідальний", "охорона праці", "пожежна безпека"],
    fields: [
      select("area", "Напрям *", [
        { value: "охорони праці", label: "Охорона праці" },
        { value: "пожежної безпеки", label: "Пожежна безпека" },
        { value: "безпеки життєдіяльності", label: "Безпека життєдіяльності" },
        { value: "електробезпеки", label: "Електробезпека" },
        { value: "цивільного захисту", label: "Цивільний захист" },
      ], { required: true, default: "охорони праці" }),
      person("responsible", "Відповідальна особа *", { required: true, maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(
        `Про призначення відповідальної особи з питань ${clean(data.area)}`,
        withBasis(`З метою належної організації роботи з питань ${clean(data.area)} та визначення персональної відповідальності`, data.basis),
        [
          `Визначити відповідальною особою з питань ${clean(data.area)}: ${clean(data.responsible)}.`,
          `Відповідальній особі організувати роботу за напрямом ${clean(data.area)}, контролювати виконання встановлених вимог та своєчасне ведення необхідної документації.`,
          "Працівникам закладу виконувати законні вимоги відповідальної особи в межах визначеного напряму роботи.",
        ],
        data,
      );
    },
  }),
  template({
    id: "air-raid-actions",
    category: "Безпека",
    months: ["08", "09"],
    frequency: "Щорічно та після зміни маршруту",
    title: "Про виконання алгоритму дій учасників освітнього процесу під час сигналу «Повітряна тривога»",
    description: "Алгоритм оповіщення, супроводу до укриття, обліку людей і повернення після відбою. Формує таблицю маршрутів для кожного класу.",
    tags: ["повітряна тривога", "укриття", "евакуація", "маршрути", "цивільний захист"],
    needsVerification: true,
    legalBasisIds: ["code-civil-protection-5403", "cmu-evacuation-841"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("evacuationResponsible", "Відповідальний за евакуацію (посада) *", { required: true, default: "відповідальному за евакуацію", maxlength: 220 }),
      text("dutyResponsible", "Хто подає сигнал оповіщення (посада) *", { required: true, default: "черговому працівнику", maxlength: 220 }),
      text("medicalResponsible", "Медичний супровід (посада)", { default: "сестрі медичній", maxlength: 220 }),
      text("psychologicalService", "Психологічний супровід (посада)", { default: "працівникам психологічної служби", maxlength: 220 }),
      date("briefingDeadline", "Строк ознайомлення з алгоритмом *", { required: true, default: "2026-09-01" }),
      repeatable("classRoutes", "Маршрути класів до укриття *", [
        text("className", "Клас *", { required: true, maxlength: 20, placeholder: "2-А клас" }),
        text("route", "Маршрут / вхід *", { required: true, maxlength: 160, placeholder: "Вхід № 3" }),
        text("shelterPlace", "Місце в укритті *", { required: true, maxlength: 160, placeholder: "Кімната 4" }),
        number("students", "Планова кількість осіб", { min: 0, max: 99 }),
      ], { required: true, minItems: 1, maxItems: 100 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective("", "Затвердити та ввести в дію Алгоритм дій учасників освітнього процесу під час сигналу «Повітряна тривога» та сигналу «Відбій повітряної тривоги» (додаток 1)."),
        orderDirective("Учасникам освітнього процесу", "під час сигналу оповіщення негайно припиняти поточну діяльність, організовано прямувати визначеним маршрутом до укриття та виконувати вказівки відповідальних осіб."),
        orderDirective("Педагогічним працівникам та асистентам учителів", "організувати супровід здобувачів освіти до визначених місць в укритті, перевірити їх присутність і повідомити відповідального за евакуацію про результат перевірки."),
        orderDirective("Класним керівникам", "ознайомити здобувачів освіти та їхніх батьків (інших законних представників) з алгоритмом і маршрутами евакуації.", 0, deadlineDate(data.briefingDeadline)),
        orderDirective("Класним керівникам", "вести оперативний облік здобувачів освіти, які перебувають у закладі.", 1, deadlinePreset("Щоденно")),
        orderDirective(data.evacuationResponsible, "перевіряти завершення евакуації з приміщень, узагальнювати інформацію про кількість людей в укритті та організовувати повернення лише після офіційного сигналу про відбій."),
        orderDirective(data.dutyResponsible, "забезпечувати невідкладне доведення сигналу оповіщення до всіх учасників освітнього процесу.", 0, deadlinePreset("Під час кожного сигналу оповіщення")),
      ];
      if (clean(data.psychologicalService)) points.push(orderDirective(data.psychologicalService, "забезпечувати психологічну підтримку учасників освітнього процесу під час перебування в укритті.", 0, deadlinePreset("За потреби")));
      if (clean(data.medicalResponsible)) points.push(orderDirective(data.medicalResponsible, "контролювати стан здоров’я учасників освітнього процесу та надавати домедичну допомогу в межах компетенції.", 0, deadlinePreset("За потреби")));
      const order = finish(this.title,
        withBasis(`З метою забезпечення узгоджених і безпечних дій учасників освітнього процесу у ${clean(data.schoolYear)} навчальному році під час сигналів оповіщення`, data.basis),
        points, data);
      return {
        ...order,
        bodyTables: [{
          title: "Маршрути переміщення класів до укриття",
          columns: ["Клас", "Маршрут / вхід", "Місце в укритті", "Планова кількість осіб"],
          rows: (data.classRoutes || []).map((row) => [clean(row.className), clean(row.route), clean(row.shelterPlace), clean(row.students)]),
          afterDirective: 1,
        }],
        attachments: [{
          kind: "approved",
          title: "Алгоритм дій учасників освітнього процесу під час сигналу «Повітряна тривога»",
          paragraphs: [
            "1. Після отримання сигналу оповіщення відповідальна особа негайно доводить його до всіх учасників освітнього процесу.",
            "2. Педагогічні працівники припиняють заняття, організовують рух класів визначеними маршрутами, беруть журнал або актуальний список присутніх і перевіряють приміщення в межах безпечного часу.",
            "3. В укритті кожен клас займає визначене місце. Педагогічний працівник проводить перекличку та передає результат відповідальному за евакуацію.",
            "4. Учасники освітнього процесу залишаються в укритті до офіційного сигналу про відбій та виконують вказівки відповідальних осіб.",
            "5. Повернення до приміщень організовується визначеними маршрутами після оцінки безпечності ситуації відповідальною особою.",
          ],
        }],
      };
    },
  }),
  template({
    id: "occupational-safety-organization",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про організацію роботи з охорони праці та безпеки життєдіяльності у закладі",
    description: "Комплексний щорічний наказ: інструктажі, відповідальні за приміщення, документація, профілактика та контроль стану робочих місць.",
    tags: ["охорона праці", "безпека життєдіяльності", "інструктажі", "відповідальні за кабінети"],
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "mon-safety-1669", "mon-safety-training-304", "mon-accidents-659"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("pedagogicalCoordinator", "Інструктажі педагогічних працівників (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      text("technicalCoordinator", "Інструктажі технічних працівників (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      date("documentsDeadline", "Строк актуалізації документації *", { required: true, default: "2026-08-31" }),
      date("initialBriefingDeadline", "Строк первинних інструктажів *", { required: true, default: "2026-09-01" }),
      repeatable("roomResponsibilities", "Відповідальні за кабінети та приміщення *", [
        text("room", "Кабінет / приміщення *", { required: true, maxlength: 160 }),
        text("responsible", "Відповідальний за посадою або ПІБ *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 100 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(this.title,
        withBasis(`З метою створення безпечних і нешкідливих умов праці та навчання, запобігання травматизму у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          orderDirective("", `Організувати у ${clean(data.schoolYear)} навчальному році роботу з охорони праці та безпеки життєдіяльності відповідно до розподілу обов’язків і локальних інструкцій закладу.`),
          orderDirective(data.pedagogicalCoordinator, "проводити вступні, первинні, повторні, позапланові та цільові інструктажі з педагогічними працівниками у випадках і строки, встановлені законодавством та локальними актами."),
          orderDirective(data.technicalCoordinator, "проводити належні інструктажі з технічними працівниками та контролювати безпечний стан робочих місць, обладнання і території."),
          orderDirective("Відповідальним за кабінети та приміщення", "забезпечувати справний і безпечний стан приміщень та обладнання, наявність актуальних інструкцій і своєчасне повідомлення про виявлені ризики."),
          orderDirective("Відповідальним за організацію роботи з охорони праці", "переглянути локальні інструкції, журнали та інші документи й подати директору пропозиції щодо їх актуалізації.", 0, deadlineDate(data.documentsDeadline)),
          orderDirective("Класним керівникам", "провести первинні інструктажі зі здобувачами освіти та зробити записи у відповідних журналах.", 0, deadlineDate(data.initialBriefingDeadline)),
          orderDirective("Працівникам закладу", "негайно повідомляти безпосереднього керівника про небезпечні умови, несправності, травми або інші події, що можуть загрожувати життю і здоров’ю.", 0, deadlinePreset("Постійно")),
        ], data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: "Розподіл відповідальності за кабінети та приміщення",
          columns: ["№ з/п", "Кабінет / приміщення", "Відповідальний"],
          rows: (data.roomResponsibilities || []).map((row, index) => [String(index + 1), clean(row.room), clean(row.responsible)]),
        }],
      };
    },
  }),
  template({
    id: "road-traffic-safety",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про організацію роботи із запобігання дорожньо-транспортному травматизму",
    description: "Робота з учнями й батьками, первинні інструктажі, інформаційні куточки та обстеження прилеглої території.",
    tags: ["дорожній рух", "БДР", "дорожньо-транспортний травматизм", "безпечний маршрут"],
    needsVerification: true,
    legalBasisIds: ["law-road-traffic-3353", "mon-safety-1669", "mon-accidents-659"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("classTeachers", "Виконавець роботи з учнями (посада) *", { required: true, default: "класним керівникам", maxlength: 220 }),
      text("facilitiesOfficer", "Відповідальний за територію (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      text("organizer", "Відповідальний за загальношкільні заходи (посада)", { default: "педагогу-організатору", maxlength: 220 }),
      date("briefingDeadline", "Строк первинного інструктажу *", { required: true, default: "2026-09-01" }),
      date("informationDeadline", "Строк оновлення інформаційних матеріалів *", { required: true, default: "2026-09-05" }),
      date("territoryAuditDeadline", "Строк обстеження території *", { required: true, default: "2026-08-31" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective(data.classTeachers, "організувати системну профілактичну роботу із запобігання дорожньо-транспортному травматизму серед здобувачів освіти."),
        orderDirective(data.classTeachers, "провести первинні інструктажі з безпеки дорожнього руху та зробити записи у відповідних журналах.", 1, deadlineDate(data.briefingDeadline)),
        orderDirective(data.classTeachers, "опрацювати з учнями безпечні маршрути до закладу й додому, правила поведінки пішоходів, пасажирів і велосипедистів."),
        orderDirective(data.classTeachers, "оновити інформаційні матеріали з безпеки дорожнього руху в класах.", 1, deadlineDate(data.informationDeadline)),
        orderDirective(data.classTeachers, "інформувати батьків (інших законних представників) про необхідність особистого прикладу та контролю безпечної поведінки дітей на дорозі."),
        orderDirective(data.facilitiesOfficer, "обстежити територію закладу, під’їзні та пішохідні шляхи, зафіксувати виявлені ризики й подати директору пропозиції щодо їх усунення.", 0, deadlineDate(data.territoryAuditDeadline)),
      ];
      if (clean(data.organizer)) points.push(orderDirective(data.organizer, "передбачити загальношкільні інформаційно-профілактичні заходи з безпеки дорожнього руху.", 0, deadlinePreset("Упродовж навчального року")));
      return finish(this.title,
        withBasis(`З метою запобігання дорожньо-транспортному травматизму та формування навичок безпечної поведінки у ${clean(data.schoolYear)} навчальному році`, data.basis),
        points, data);
    },
  }),
  template({
    id: "fire-safety-regime",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про затвердження протипожежного режиму та призначення відповідального за пожежну безпеку",
    description: "Призначення відповідального, введення локального протипожежного режиму, перевірки шляхів евакуації, навчання та первинні засоби пожежогасіння.",
    tags: ["протипожежний режим", "пожежна безпека", "вогнегасники", "шляхи евакуації"],
    recordSeries: "Адміністративно-господарські питання",
    needsVerification: true,
    legalBasisIds: ["code-civil-protection-5403", "mvs-fire-rules-1417", "mon-fire-schools-974"],
    fields: [
      text("fireResponsible", "Відповідальний за пожежну безпеку (посада або ПІБ) *", { required: true, maxlength: 220 }),
      date("effectiveDate", "Дата введення режиму в дію *", { required: true, default: "2026-09-01" }),
      date("briefingDeadline", "Строк ознайомлення працівників *", { required: true, default: "2026-09-01" }),
      text("evacuationCheckFrequency", "Періодичність огляду шляхів евакуації *", { required: true, default: "Щомісячно", maxlength: 120 }),
      textarea("localRules", "Додаткові локальні правила", { maxlength: 2000, placeholder: "Особливості закладу: порядок знеструмлення, доступ до воріт, використання генератора тощо" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const regimeParagraphs = [
        "1. Територію, будівлі, приміщення, евакуаційні шляхи та виходи утримувати в стані, що забезпечує безпечну евакуацію людей і доступ пожежно-рятувальних підрозділів.",
        "2. Не захаращувати коридори, сходові клітки, проходи, виходи та місця розміщення первинних засобів пожежогасіння.",
        "3. Електрообладнання експлуатувати відповідно до інструкцій виробника; після завершення роботи вимикати обладнання, яке не має працювати цілодобово.",
        "4. Вогневі та інші пожежонебезпечні роботи проводити лише у встановленому порядку з визначенням відповідальних і необхідних заходів безпеки.",
        "5. Первинні засоби пожежогасіння, системи оповіщення та протипожежного захисту утримувати справними, доступними й позначеними.",
        "6. У разі виявлення пожежі або ознак горіння негайно повідомити за номером 101, увімкнути оповіщення, розпочати евакуацію та діяти відповідно до затвердженої інструкції.",
      ];
      if (clean(data.localRules)) regimeParagraphs.push(`7. Локальні особливості: ${normalizeSentence(data.localRules)}.`);
      const order = finish(this.title,
        withBasis("З метою встановлення єдиного протипожежного режиму, запобігання пожежам і забезпечення безпечної евакуації учасників освітнього процесу", data.basis),
        [
          orderDirective("", `Призначити відповідальним за пожежну безпеку закладу: ${clean(data.fireResponsible)}.`),
          orderDirective("", `Затвердити Протипожежний режим закладу та ввести його в дію з ${formatDateUa(data.effectiveDate)} (додаток 1).`),
          orderDirective(data.fireResponsible, "ознайомити працівників із протипожежним режимом і порядком дій у разі пожежі.", 0, deadlineDate(data.briefingDeadline)),
          orderDirective(data.fireResponsible, "перевіряти стан шляхів евакуації, виходів, знаків безпеки та доступність первинних засобів пожежогасіння.", 0, deadlinePreset(data.evacuationCheckFrequency)),
          orderDirective(data.fireResponsible, "організовувати навчання, інструктажі та практичне відпрацювання дій працівників відповідно до затверджених планів і вимог законодавства."),
          orderDirective("Працівникам закладу", "дотримуватися протипожежного режиму та невідкладно повідомляти про виявлені порушення або ознаки пожежі.", 0, deadlinePreset("Постійно")),
        ], data);
      return {
        ...order,
        attachments: [{ kind: "approved", title: "Протипожежний режим закладу", paragraphs: regimeParagraphs }],
      };
    },
  }),
  template({
    id: "evacuation-training",
    category: "Безпека",
    months: ["08", "09", "10"],
    frequency: "За планом підготовки",
    title: "Про проведення практичного тренування з евакуації учасників освітнього процесу",
    description: "Дата й координатор тренування, підготовка класів, відпрацювання маршрутів, перевірка спорядження та підбиття підсумків.",
    tags: ["евакуаційне тренування", "навчальна евакуація", "укриття", "цивільний захист"],
    needsVerification: true,
    legalBasisIds: ["code-civil-protection-5403", "cmu-evacuation-841"],
    fields: [
      date("trainingDate", "Дата тренування *", { required: true, default: "2026-09-10" }),
      text("trainingTime", "Час тренування", { default: "10:00", maxlength: 20 }),
      text("shelter", "Кінцеве місце евакуації / укриття *", { required: true, default: "захисна споруда цивільного захисту закладу", maxlength: 300 }),
      text("coordinator", "Керівник тренування (посада) *", { required: true, default: "відповідальному за цивільний захист", maxlength: 220 }),
      text("classTeachers", "Виконавець підготовки класів (посада) *", { required: true, default: "класним керівникам", maxlength: 220 }),
      date("preparationDeadline", "Строк підготовки учасників *", { required: true, default: "2026-09-09" }),
      select("includeBackpackPractice", "Відпрацювати комплектацію тривожної валізи", [
        { value: "yes", label: "Так" },
        { value: "no", label: "Ні" },
      ], { default: "yes" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective("", `Провести ${formatDateUa(data.trainingDate)}${clean(data.trainingTime) ? ` о ${clean(data.trainingTime)}` : ""} практичне тренування з евакуації учасників освітнього процесу до ${clean(data.shelter)}.`),
        orderDirective(data.coordinator, "розробити сценарій тренування, перевірити готовність маршрутів і місця евакуації, провести вступний інструктаж відповідальних осіб."),
        orderDirective(data.classTeachers, "ознайомити здобувачів освіти з метою тренування, порядком оповіщення, маршрутами руху та правилами поведінки під час евакуації.", 0, deadlineDate(data.preparationDeadline)),
        orderDirective(data.classTeachers, "під час тренування провести облік присутніх, організовано супроводити клас і передати результат переклички керівнику тренування."),
      ];
      if (data.includeBackpackPractice !== "no") points.push(orderDirective(data.classTeachers, "відпрацювати з учнями добір необхідних речей для тривожної валізи та використання доступних засобів індивідуального захисту.", 1, deadlineDate(data.preparationDeadline)));
      points.push(orderDirective(data.coordinator, "після завершення тренування проаналізувати дії учасників, зафіксувати виявлені недоліки та подати директору пропозиції щодо їх усунення.", 0, deadlinePreset("У день проведення тренування")));
      return finish(this.title,
        withBasis("З метою практичного відпрацювання організованої та безпечної евакуації, перевірки готовності учасників освітнього процесу до дій за сигналами оповіщення", data.basis),
        points, data);
    },
  }),
  template({
    id: "primary-workplace-briefings",
    category: "Безпека",
    months: ["08", "09"],
    frequency: "Щорічно та за потреби",
    title: "Про проведення первинних інструктажів з охорони праці на робочому місці",
    description: "Інструктажі працівників за затвердженими інструкціями, перевірка знань, записи в журналах і повідомлення про відсутніх.",
    tags: ["первинний інструктаж", "охорона праці", "журнал інструктажів", "працівники"],
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "mon-safety-training-304", "mon-safety-1669"],
    fields: [
      text("pedagogicalInstructor", "Інструктує педагогічних працівників (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      text("technicalInstructor", "Інструктує технічних працівників (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      date("briefingDeadline", "Строк проведення інструктажів *", { required: true, default: "2026-08-31" }),
      date("reportDeadline", "Строк повідомлення про відсутніх *", { required: true, default: "2026-09-01" }),
      textarea("employeeGroups", "Додаткові групи працівників", { maxlength: 1000, placeholder: "За потреби зазначте групи, для яких установлено окремий порядок" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective(data.pedagogicalInstructor, "провести первинний інструктаж на робочому місці з педагогічними працівниками за чинними інструкціями з охорони праці.", 0, deadlineDate(data.briefingDeadline)),
        orderDirective(data.technicalInstructor, "провести первинний інструктаж на робочому місці з технічними та обслуговуючими працівниками за чинними інструкціями з охорони праці.", 0, deadlineDate(data.briefingDeadline)),
        orderDirective("Особам, які проводять інструктажі", "перевірити засвоєння працівниками вимог безпеки та практичних навичок безпечного виконання робіт."),
        orderDirective("Особам, які проводять інструктажі", "зареєструвати проведення інструктажів у відповідних журналах із підписами особи, яка проводила інструктаж, та працівника."),
        orderDirective("Особам, які проводять інструктажі", "подати директору інформацію про працівників, які не пройшли інструктаж у визначений строк.", 0, deadlineDate(data.reportDeadline)),
      ];
      if (clean(data.employeeGroups)) points.push(orderDirective("Відповідальним за інструктажі", `урахувати особливості таких груп працівників: ${normalizeSentence(data.employeeGroups)}.`));
      return finish(this.title,
        withBasis("З метою забезпечення безпечного виконання працівниками посадових обов’язків і належного документування навчання з питань охорони праці", data.basis),
        points, data);
    },
  }),
  template({
    id: "inclusive-education-organization",
    category: "Освітній процес",
    months: ["08", "09"],
    title: "Про організацію інклюзивного навчання",
    description: "Створення інклюзивного класу на підставі заяви та висновку ІРЦ, команда супроводу, ІПР, корекційно-розвиткові заняття, допоміжні засоби й доступність.",
    tags: ["інклюзивне навчання", "ООП", "ІРЦ", "команда супроводу", "ІПР", "асистент учителя"],
    preparedSummary: "Типові строки та відповідальний за доступність уже заповнені — перевірити за потреби",
    recordSeries: "Основна діяльність",
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-inclusive-957", "mon-support-team-609", "cmu-assistive-tools-1289", "mon-assistive-list-414"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("className", "Інклюзивний клас *", { required: true, maxlength: 30, placeholder: "4 клас / 4-А клас" }),
      person("student", "Учень / учениця *", { required: true, maxlength: 220, help: "Це персональні дані. Вони зберігаються лише локально у вашому наказі." }),
      select("supportLevel", "Рівень підтримки *", [
        { value: "першого", label: "Перший" },
        { value: "другого", label: "Другий" },
        { value: "третього", label: "Третій" },
        { value: "четвертого", label: "Четвертий" },
        { value: "п’ятого", label: "П’ятий" },
      ], { required: true, default: "другого" }),
      text("parentApplication", "Заява одного з батьків / представника *", { required: true, maxlength: 500, placeholder: "Заява від 20.08.2026" }),
      text("ircConclusion", "Висновок ІРЦ *", { required: true, maxlength: 500, placeholder: "Висновок про комплексну оцінку від … № …" }),
      text("councilDecision", "Рішення педагогічної ради *", { required: true, maxlength: 500, placeholder: "Протокол від … № …" }),
      text("teacher", "Учитель класу (посада або ПІБ) *", { required: true, maxlength: 220 }),
      text("assistant", "Асистент учителя (посада або ПІБ) *", { required: true, maxlength: 220 }),
      repeatable("supportTeam", "Команда психолого-педагогічного супроводу *", [
        select("role", "Роль *", [
          { value: "Голова команди", label: "Голова" },
          { value: "Секретар команди", label: "Секретар" },
          { value: "Член команди", label: "Член команди" },
        ], { required: true, default: "Член команди" }),
        text("member", "Посада / ПІБ *", { required: true, maxlength: 220 }),
      ], {
        required: true,
        minItems: 3,
        maxItems: 30,
        defaultItems: [
          { role: "Голова команди", member: "практичний психолог" },
          { role: "Член команди", member: "учитель класу" },
          { role: "Член команди", member: "асистент учителя" },
          { role: "Член команди", member: "один із батьків (інший законний представник)" },
        ],
      }),
      text("facilitiesOfficer", "Відповідальний за доступність (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220, collapsed: true }),
      date("iprDeadline", "Строк розроблення ІПР *", { required: true, default: "2026-09-10", collapsed: true }),
      date("scheduleDeadline", "Строк розкладу корекційно-розвиткових занять *", { required: true, default: "2026-09-04", collapsed: true }),
      date("systemDeadline", "Строк внесення відомостей до системи ІРЦ *", { required: true, default: "2026-09-20", collapsed: true }),
      date("accessibilityDeadline", "Строк первинної перевірки доступності *", { required: true, default: "2026-09-01", collapsed: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про організацію інклюзивного навчання у ${clean(data.className)} у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`На підставі ${clean(data.parentApplication)}, ${clean(data.ircConclusion)}, ${clean(data.councilDecision)} та з метою реалізації права ${clean(data.student)} на освіту з урахуванням визначеного ${clean(data.supportLevel)} рівня підтримки`, data.basis),
        [
          orderDirective("", `Організувати у ${clean(data.schoolYear)} навчальному році інклюзивне навчання ${clean(data.student)} у ${clean(data.className)} з урахуванням визначеного ${clean(data.supportLevel)} рівня підтримки.`),
          orderDirective("", "Затвердити склад команди психолого-педагогічного супроводу згідно з додатком 1."),
          orderDirective(data.teacher, "організовувати освітню діяльність, спостереження за індивідуальними освітніми потребами та оцінювання результатів навчання з урахуванням ІПР.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
          orderDirective(data.assistant, "забезпечувати підтримку учня під час освітнього процесу, брати участь у розробленні й виконанні ІПР та взаємодіяти з учителем і батьками.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
          orderDirective("Команді психолого-педагогічного супроводу", "розробити індивідуальну програму розвитку на підставі висновку ІРЦ, визначити необхідні адаптації, модифікації, допоміжні засоби та способи моніторингу результатів.", 0, deadlineDate(data.iprDeadline)),
          orderDirective("Голові команди супроводу", "скласти й погодити з батьками (іншими законними представниками) розклад корекційно-розвиткових та психолого-педагогічних занять.", 0, deadlineDate(data.scheduleDeadline)),
          orderDirective("Голові команди супроводу", "забезпечити внесення передбачених відомостей та ІПР до автоматизованої системи інклюзивно-ресурсних центрів із дотриманням вимог захисту персональних даних.", 1, deadlineDate(data.systemDeadline)),
          orderDirective("Педагогічним працівникам і працівникам психологічної служби", "забезпечувати психолого-педагогічний супровід, співпрацю з родиною та запобігання дискримінації або негативному ставленню в учнівському колективі.", 0, deadlinePreset("Постійно")),
          orderDirective(data.facilitiesOfficer, "перевірити безперешкодний доступ до приміщень, потребу в розумному пристосуванні, ресурсному осередку та допоміжних засобах відповідно до ІПР.", 0, deadlineDate(data.accessibilityDeadline)),
        ], data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: "Склад команди психолого-педагогічного супроводу",
          columns: ["№ з/п", "Роль", "Посада / ПІБ"],
          rows: (data.supportTeam || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.member)]),
        }],
      };
    },
  }),
  template({
    id: "student-medical-care",
    category: "Освітній процес",
    months: ["08", "09"],
    title: "Про медичне обслуговування учнів та організацію роботи медичного працівника",
    description: "Медичні огляди й щеплення, моніторинг здоров’я, невідкладні стани, інфекційний контроль, харчування, просвітницька робота та забезпечення медичного кабінету.",
    tags: ["медичне обслуговування", "сестра медична", "здоров’я учнів", "щеплення", "медичний кабінет"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-student-medical-31", "law-infectious-diseases-1645", "law-public-health-2573", "moh-sanitary-2205"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("medicalOfficer", "Медичне обслуговування (посада або виконавець) *", { required: true, default: "сестрі медичній", maxlength: 220 }),
      text("facilitiesOfficer", "Матеріальне забезпечення (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      date("recordsDeadline", "Строк перевірки відомостей про профілактичні огляди *", { required: true, default: "2026-09-05" }),
      date("cabinetDeadline", "Строк перевірки медичного кабінету *", { required: true, default: "2026-09-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою організації безпечного та якісного медичного супроводу учнів у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          orderDirective(data.medicalOfficer, "здійснювати медичне обслуговування учнів у межах компетенції та відповідно до встановленого порядку.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
          orderDirective(data.medicalOfficer, "організовувати проведення обов’язкових медичних профілактичних оглядів, контролювати профілактичні щеплення, вести моніторинг стану здоров’я і фізичного розвитку учнів."),
          orderDirective(data.medicalOfficer, "проводити передбачені профілактичні й оздоровчі заходи та брати участь у медико-педагогічному контролі за фізичним вихованням.", 1, deadlinePreset("За планом та у встановлені строки")),
          orderDirective(data.medicalOfficer, "у разі виявлення в учня ознак інфекційної хвороби організувати тимчасову ізоляцію, невідкладно повідомити батьків (інших законних представників) і діяти відповідно до протиепідемічних вимог.", 0, deadlinePreset("У разі виявлення")),
          orderDirective(data.medicalOfficer, "у разі невідкладного стану надати домедичну допомогу в межах компетенції, за потреби викликати екстрену медичну допомогу та повідомити батьків (інших законних представників).", 1, deadlinePreset("Негайно")),
          orderDirective(data.medicalOfficer, "брати участь у бракеражі та контролі санітарно-гігієнічного стану під час організації харчування учнів.", 0, deadlinePreset("Відповідно до режиму харчування")),
          orderDirective(data.medicalOfficer, "перевірити наявність актуальних відомостей про проходження учнями обов’язкових профілактичних медичних оглядів без збирання надлишкових медичних даних.", 0, deadlineDate(data.recordsDeadline)),
          orderDirective(data.medicalOfficer, "проводити консультаційну й просвітницьку роботу щодо здорового способу життя, профілактики інфекційних та неінфекційних захворювань.", 0, deadlinePreset("Постійно")),
          orderDirective(data.facilitiesOfficer, "забезпечити належні матеріально-технічні умови функціонування медичного кабінету, справність інженерних мереж і наявність необхідних засобів за обґрунтованими заявками медичного працівника.", 0, deadlineDate(data.cabinetDeadline)),
        ], data);
    },
  }),
  template({
    id: "employee-medical-examinations",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про організацію обов’язкових медичних оглядів працівників",
    description: "Фактичний список або графік, різні правові режими оглядів, контроль строків, мінімізація медичних даних і недопуск до роботи лише у передбачених законом випадках.",
    tags: ["медогляд працівників", "медична книжка", "профілактичний огляд", "професійний ризик", "допуск до роботи"],
    recordSeries: "Кадрові питання",
    needsVerification: true,
    notice: "Не поширюйте наказ МОЗ № 1393 автоматично на всіх працівників. Перевірте категорію роботи, підставу огляду та погоджений список для кожної особи.",
    legalBasisIds: ["labor-code-322", "law-labor-protection-2694", "law-infectious-diseases-1645", "law-public-health-2573", "cmu-preventive-medical-559", "moh-preventive-medical-280", "moh-employee-medical-1393", "law-personal-data-2297"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      textarea("scopeBasis", "Кого і на якій підставі включено до огляду *", { required: true, maxlength: 1200, placeholder: "Погоджений список працівників / категорії робіт / результати оцінювання професійних ризиків" }),
      text("scheduleBasis", "Фактичний графік або направлення *", { required: true, maxlength: 600, placeholder: "Графік від … № … / направлення закладу охорони здоров’я" }),
      text("medicalOfficer", "Облік проходження оглядів (посада) *", { required: true, default: "сестрі медичній", maxlength: 220 }),
      text("hrResponsible", "Кадрові рішення і допуск до роботи (посада) *", { required: true, default: "відповідальному за кадрову роботу", maxlength: 220 }),
      date("documentsDeadline", "Строк перевірки підтвердних документів *", { required: true, default: "2026-09-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`На підставі ${clean(data.scopeBasis)}, відповідно до ${clean(data.scheduleBasis)} та з метою своєчасного проведення обов’язкових медичних оглядів працівників`, data.basis),
        [
          orderDirective("Працівникам, включеним до фактичного списку", `пройти попередній або періодичний медичний огляд відповідно до індивідуально визначеної правової підстави й ${clean(data.scheduleBasis)}.`, 0, deadlinePreset("Згідно з фактичним графіком або направленням")),
          orderDirective("Працівникам, включеним до фактичного списку", "подати лише передбачений законодавством документ, що підтверджує проходження огляду та можливість виконання роботи, без розкриття надлишкових відомостей про стан здоров’я.", 1, deadlineDate(data.documentsDeadline)),
          orderDirective(data.medicalOfficer, "перевірити наявність і чинність передбачених законодавством документів про проходження оглядів та вести облік строків наступного огляду.", 0, deadlineDate(data.documentsDeadline)),
          orderDirective(data.medicalOfficer, "письмово інформувати керівника про працівників, які не пройшли обов’язковий огляд у встановлений для них строк, не зазначаючи діагнозів або інших надлишкових медичних даних.", 1, deadlinePreset("Негайно після спливу встановленого строку")),
          orderDirective(data.hrResponsible, "оформлювати недопуск або відсторонення від роботи лише за наявності передбаченої законом підстави, із дотриманням установленої процедури та належним документуванням.", 0, deadlinePreset("За потреби")),
          orderDirective("Особам, які обробляють документи про здоров’я", "забезпечити конфіденційність, обмежений доступ і зберігання лише необхідного складу персональних даних.", 0, deadlinePreset("Постійно")),
        ], data);
    },
  }),
  template({
    id: "first-grade-distribution",
    category: "Учні",
    months: ["08", "09"],
    title: "Про розподіл учнів перших класів",
    description: "Розподіл уже зарахованих першокласників між класами, класні керівники, структурована таблиця учнів, перевірка назв класів і захист персональних даних.",
    tags: ["розподіл першокласників", "1 клас", "1-А", "1-Б", "списки учнів", "мережа класів"],
    recordSeries: "Рух здобувачів освіти",
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "law-personal-data-2297", "cmu-child-records-684", "mon-enrollment-367", "moh-sanitary-2205"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("effectiveDate", "Дата початку навчання *", { required: true, default: "2026-09-01" }),
      repeatable("classes", "Перші класи *", [
        text("className", "Клас *", { required: true, maxlength: 30, placeholder: "1-А" }),
        person("teacher", "Класний керівник / учитель *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 20 }),
      repeatable("students", "Розподіл учнів *", [
        person("student", "ПІБ учня *", { required: true, maxlength: 220 }),
        text("className", "Клас *", { required: true, maxlength: 30, placeholder: "1-А" }),
      ], { required: true, minItems: 1, maxItems: 200, help: "Список містить персональні дані й зберігається локально у вашому браузері." }),
      ...baseAdvanced(),
    ],
    build(data) {
      const classNames = (data.classes || []).map((row) => clean(row.className)).filter(Boolean).join(", ");
      const order = finish(`Про розподіл учнів перших класів у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`З метою належної організації освітнього процесу, формування класів ${classNames} та забезпечення захисту персональних даних учнів`, data.basis),
        [
          orderDirective("", "Розподілити учнів перших класів згідно з таблицею у розпорядчій частині цього наказу."),
          orderDirective("Учителям перших класів", `організувати освітній процес відповідно до освітньої програми та річного навчального плану.`, 0, deadlinePreset(`Із ${formatDateUa(data.effectiveDate)}`)),
          orderDirective("Учителям перших класів", "оформити класні журнали й уточнити облікові відомості відповідно до фактичного розподілу учнів.", 1, deadlinePreset(`Із ${formatDateUa(data.effectiveDate)}`)),
          orderDirective("Працівникам, які мають доступ до списків учнів", "використовувати персональні дані лише для визначеної мети, не оприлюднювати повні списки без законної підстави та забезпечити належний режим доступу.", 0, deadlinePreset("Постійно")),
        ], data);
      return {
        ...order,
        bodyTables: [{
          title: "Розподіл учнів перших класів",
          columns: ["№ з/п", "Учень / учениця", "Клас"],
          rows: (data.students || []).map((row, index) => [String(index + 1), clean(row.student), clean(row.className)]),
          afterDirective: 1,
        }],
        attachments: [{
          kind: "approved",
          title: "Перші класи та класні керівники",
          columns: ["№ з/п", "Клас", "Класний керівник / учитель"],
          rows: (data.classes || []).map((row, index) => [String(index + 1), clean(row.className), clean(row.teacher)]),
        }],
      };
    },
    validate(data) {
      const declared = new Set((data.classes || []).map((row) => clean(row.className).toLocaleLowerCase("uk-UA")).filter(Boolean));
      const unknown = [...new Set((data.students || []).map((row) => clean(row.className)).filter((name) => name && !declared.has(name.toLocaleLowerCase("uk-UA"))))];
      return unknown.length ? [{ level: "error", title: "Учня прив’язано до неоголошеного класу", detail: `Перевірте класи: ${unknown.join(", ")}.` }] : [];
    },
  }),
  template({
    id: "student-enrollment",
    category: "Учні",
    months: ["08", "09"],
    frequency: "За потреби",
    title: "Про зарахування учнів до закладу освіти",
    description: "Для одного або кількох учнів. Дані автоматично формуються у перелік.",
    tags: ["зарахування", "учні", "класи"],
    fields: [
      repeatable("students", "Учні *", [
        text("name", "ПІБ учня *", { required: true, maxlength: 180 }),
        text("className", "Клас *", { required: true, maxlength: 30, placeholder: "1-А" }),
      ], { required: true, minItems: 1, maxItems: 50 }),
      date("enrollmentDate", "Дата зарахування *", { required: true, default: "2026-09-01" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const students = (Array.isArray(data.students) ? data.students : [])
        .filter((student) => clean(student?.name) && clean(student?.className))
        .map((student) => `${clean(student.name)} — до ${clean(student.className)} класу`);
      const list = students.join("; ");
      const points = [
        `Зарахувати з ${formatDateUa(data.enrollmentDate)} до складу учнів закладу: ${list}.`,
        "Внести необхідні відомості до облікової документації закладу та забезпечити оформлення особових справ учнів.",
        "Класним керівникам забезпечити організаційний супровід зарахованих учнів та ознайомлення їхніх батьків (інших законних представників) з правилами роботи закладу.",
      ];
      return finish(this.title, withBasis("На підставі поданих документів та з метою організації навчання учнів", data.basis), points, data);
    },
  }),
  template({
    id: "school-meals",
    category: "Харчування",
    months: ["08", "09"],
    title: "Про організацію безоплатного харчування учнів",
    description: "Модель організації й фінансування харчування, групи учнів, меню, структурований графік, дієтичні потреби, документація, відповідальні та бракеражна комісія.",
    tags: ["харчування", "безкоштовне харчування", "безоплатне харчування", "їдальня", "кейтеринг", "аутсорсинг", "бракеражна комісія", "меню"],
    preparedSummary: "Графік, комісія, документація та інші типові налаштування вже заповнені — перевірити",
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "cmu-school-meals-305", "moh-sanitary-2205"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("startDate", "Початок організації харчування *", { required: true, default: "2026-09-01" }),
      text("localBasis", "Рішення засновника / місцева підстава фінансування *", { required: true, maxlength: 700, placeholder: "Рішення / наказ від … № …" }),
      text("studentGroups", "Групи учнів, які харчуються безоплатно *", { required: true, default: "учні 1–9 класів", maxlength: 400 }),
      select("serviceModel", "Спосіб організації харчування *", [
        { value: "кейтеринг", label: "Кейтеринг" },
        { value: "аутсорсинг", label: "Аутсорсинг" },
        { value: "харчування власними силами закладу", label: "Власний харчоблок" },
      ], { required: true, default: "кейтеринг" }),
      select("mealFormat", "Форма меню *", [
        { value: "монопрофільне меню", label: "Монопрофільне меню" },
        { value: "мультипрофільне меню", label: "Мультипрофільне меню" },
      ], { required: true, default: "монопрофільне меню", collapsed: true }),
      text("mealFrequency", "Кратність харчування *", { required: true, default: "одноразове гаряче харчування", maxlength: 160, collapsed: true }),
      text("menuBasis", "Затверджене / погоджене меню *", { required: true, maxlength: 500, placeholder: "Чотиритижневе сезонне меню від …" }),
      text("responsible", "Відповідальний за організацію харчування (посада) *", { required: true, default: "соціальному педагогу", maxlength: 220 }),
      text("medicalOfficer", "Медичний контроль (посада) *", { required: true, default: "сестрі медичній", maxlength: 220, collapsed: true }),
      repeatable("schedule", "Графік харчування *", [
        text("group", "Група / класи *", { required: true, maxlength: 160 }),
        text("time", "Час *", { required: true, maxlength: 60, placeholder: "10:05–10:35" }),
        text("meal", "Приймання їжі", { maxlength: 100, placeholder: "Сніданок / обід" }),
      ], {
        required: true,
        minItems: 1,
        maxItems: 30,
        collapsed: true,
        defaultItems: [
          { group: "1–4 класи", time: "10:05–10:35", meal: "гаряче харчування" },
          { group: "5–9 класи", time: "11:15–11:35", meal: "гаряче харчування" },
        ],
      }),
      repeatable("commission", "Бракеражна комісія *", [
        select("role", "Роль *", [
          { value: "Голова комісії", label: "Голова" },
          { value: "Член комісії", label: "Член комісії" },
        ], { required: true, default: "Член комісії" }),
        text("member", "Посада / ПІБ *", { required: true, maxlength: 220 }),
      ], {
        required: true,
        minItems: 3,
        maxItems: 15,
        collapsed: true,
        defaultItems: [
          { role: "Голова комісії", member: "директор" },
          { role: "Член комісії", member: "відповідальний за організацію харчування" },
          { role: "Член комісії", member: "сестра медична" },
        ],
      }),
      repeatable("documents", "Документація, яку веде заклад *", [
        text("name", "Документ *", { required: true, maxlength: 300 }),
        text("keeper", "Хто веде *", { required: true, maxlength: 220 }),
      ], {
        required: true,
        minItems: 1,
        maxItems: 30,
        collapsed: true,
        defaultItems: [
          { name: "Журнал щоденного обліку учнів, які харчуються", keeper: "відповідальний за організацію харчування" },
          { name: "Затверджене чотиритижневе сезонне меню", keeper: "відповідальний за організацію харчування" },
          { name: "Щоденне меню", keeper: "відповідальний за організацію харчування" },
          { name: "Журнал контролю харчування / бракеражу", keeper: "бракеражна комісія" },
          { name: "Чек-листи контролю організації харчування", keeper: "відповідальний за організацію харчування" },
        ],
      }),
      select("dietaryMeals", "Організація харчування для особливих дієтичних потреб", [
        { value: "yes", label: "Передбачити за наявності медичної довідки" },
        { value: "no", label: "Наразі таких потреб немає" },
      ], { required: true, default: "yes", collapsed: true }),
      text("drinkingMode", "Питний режим *", { required: true, default: "індивідуальний питний режим з особистих ємностей із водою", maxlength: 300, collapsed: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про організацію безоплатного харчування учнів у ${clean(data.schoolYear)} навчальному році`,
        withBasis(`На підставі ${clean(data.localBasis)} та з метою забезпечення збалансованого, якісного й безпечного харчування учнів`, data.basis),
        [
          orderDirective("", `Організувати з ${formatDateUa(data.startDate)} безоплатне ${clean(data.mealFrequency)} для таких груп: ${clean(data.studentGroups)}; спосіб організації — ${clean(data.serviceModel)}.`),
          orderDirective("", `Визначити форму організації харчування: ${clean(data.mealFormat)}. Використовувати ${clean(data.menuBasis)}.`),
          orderDirective("", "Затвердити графік харчування згідно з таблицею у розпорядчій частині цього наказу."),
          orderDirective("", `Організувати ${clean(data.drinkingMode)}.`, 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
          ...(data.dietaryMeals === "yes" ? [orderDirective("Відповідальному за організацію харчування", "забезпечувати харчування учнів з особливими дієтичними потребами за наявності відповідного медичного підтвердження та з дотриманням установлених вимог.", 0, deadlinePreset("За потреби"))] : []),
          orderDirective("", "Призначити відповідальним за координацію організації харчування, облік учнів і ведення документації: " + clean(data.responsible) + "."),
          orderDirective("", "Створити бракеражну комісію у складі згідно з додатком 1."),
          orderDirective(data.responsible, "координувати роботу залучених осіб і оператора ринку харчових продуктів, контролювати якість послуг, санітарний стан і фактичну кількість учнів, які харчуються.", 0, deadlinePreset("Постійно")),
          orderDirective(data.responsible, "забезпечити ведення документації, визначеної у додатку 2, з урахуванням обраного способу організації харчування.", 1, deadlinePreset("Постійно")),
          orderDirective(data.medicalOfficer, "контролювати передбачені законодавством медичні огляди залучених працівників, санітарно-гігієнічні вимоги та брати участь у роботі бракеражної комісії.", 0, deadlinePreset("Постійно")),
          orderDirective("Класним керівникам", "супроводжувати учнів до місця харчування, сприяти культурі харчування й дотриманню особистої гігієни та подавати фактичні дані про присутність учнів.", 0, deadlinePreset("Щоденно")),
        ], data);
      return {
        ...order,
        bodyTables: [{
          title: "Графік харчування учнів",
          columns: ["№ з/п", "Група / класи", "Час", "Приймання їжі"],
          rows: (data.schedule || []).map((row, index) => [String(index + 1), clean(row.group), clean(row.time), clean(row.meal) || "—"]),
          afterDirective: 3,
        }],
        attachments: [
          {
            kind: "approved",
            title: "Склад бракеражної комісії",
            columns: ["№ з/п", "Роль", "Посада / ПІБ"],
            rows: (data.commission || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.member)]),
          },
          {
            kind: "approved",
            title: "Перелік документації з організації харчування",
            columns: ["№ з/п", "Документ", "Відповідальний за ведення"],
            rows: (data.documents || []).map((row, index) => [String(index + 1), clean(row.name), clean(row.keeper)]),
          },
        ],
      };
    },
  }),
  template({
    id: "class-teachers",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про призначення класних керівників та організацію їх роботи",
    description: "Призначення класних керівників із доплатами, планування виховної роботи, журнали, інструктажі, відвідування, взаємодія з батьками та супровід учнів.",
    tags: ["класні керівники", "доплата", "виховна робота", "класні журнали", "батьки"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "labor-code-322", "mon-class-teacher-434", "cmu-education-supplements-1391"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      repeatable("classTeachers", "Класні керівники *", [
        text("className", "Клас *", { required: true, maxlength: 30 }),
        person("person", "Класний керівник *", { required: true, maxlength: 220 }),
        text("supplement", "Доплата", { maxlength: 80, placeholder: "Розмір або посилання на тарифікацію" }),
      ], { required: true, minItems: 1, maxItems: 40 }),
      text("deputy", "Хто контролює виховну роботу (посада) *", { required: true, default: "заступника директора з виховної роботи", maxlength: 220 }),
      date("workPlanDeadline", "Строк плану виховної роботи *", { required: true, default: "2026-09-05" }),
      date("journalsDeadline", "Строк оформлення журналів *", { required: true, default: "2026-09-05" }),
      date("briefingsDeadline", "Строк вступних інструктажів *", { required: true, default: "2026-09-04" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        orderDirective("", `Призначити на ${clean(data.schoolYear)} навчальний рік класних керівників та встановити доплати згідно з таблицею у розпорядчій частині цього наказу.`),
        orderDirective("Класним керівникам", "створювати сприятливі умови для формування учнівських колективів, адаптації здобувачів освіти та належного соціально-педагогічного супроводу."),
        orderDirective("Класним керівникам", "організовувати виховну роботу відповідно до річного плану закладу та з урахуванням безпекових умов.", 1, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
        orderDirective("Класним керівникам", "вести класні журнали, особові справи, облік відвідування та іншу документацію у межах посадових обов’язків.", 1, deadlinePreset("Постійно")),
        orderDirective("Класним керівникам", "підготувати план виховної роботи на перший семестр і розмістити його у визначеному закладом сховищі документів.", 0, deadlineDate(data.workPlanDeadline)),
        orderDirective("Класним керівникам", "оформити класні журнали, уточнити списки учнів і розподіл сторінок навчальних предметів відповідно до освітньої програми.", 1, deadlineDate(data.journalsDeadline)),
        orderDirective("Класним керівникам", "провести вступні та первинні інструктажі з безпеки життєдіяльності та зафіксувати їх у відповідних журналах.", 1, deadlineDate(data.briefingsDeadline)),
        orderDirective("Класним керівникам", "контролювати відвідування, безпечну поведінку учнів під час перерв, харчування, виходу із закладу та позакласних заходів.", 1, deadlinePreset("Постійно")),
        orderDirective("Класним керівникам", "організовувати взаємодію з батьками (іншими законними представниками) з дотриманням законодавства про захист персональних даних.", 1, deadlinePreset("Упродовж навчального року")),
      ];
      const order = finish(this.title,
        withBasis(`З метою чіткої організації виховної роботи, соціально-педагогічного супроводу здобувачів освіти та взаємодії з учнівськими колективами у ${clean(data.schoolYear)} навчальному році`, data.basis),
        points, { ...data, controlPerson: clean(data.controlPerson) || clean(data.deputy) });
      return {
        ...order,
        bodyTables: [{
          title: "Класні керівники",
          columns: ["№ з/п", "Класний керівник", "Клас", "Доплата"],
          rows: (data.classTeachers || []).map((row, index) => [String(index + 1), clean(row.person), clean(row.className), clean(row.supplement) || "Відповідно до тарифікації"]),
          afterDirective: 1,
        }],
      };
    },
  }),
  template({
    id: "attestation-commission",
    category: "Кадрові",
    months: ["09"],
    title: "Про створення атестаційної комісії",
    description: "Шаблон для щорічного створення атестаційної комісії.",
    tags: ["атестація", "комісія", "педагоги"],
    notice: "Комісію І рівня створюють щороку не пізніше 20 вересня у закладі, де працюють 15 і більше педагогічних працівників. Для меншої кількості атестацію проводить комісія ІІ рівня.",
    legalReview: {
      source: "Положення про атестацію педагогічних працівників, наказ МОН № 805 від 09.09.2022, редакція від 24.04.2026",
      sourceUrl: "https://zakon.rada.gov.ua/laws/show/z1649-22",
    },
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      number("employeeCount", "Кількість педагогічних працівників у трудових відносинах із закладом *", { required: true, min: 1, max: 500, default: 15 }),
      repeatable("members", "Склад комісії *", [
        select("role", "Роль *", [
          { value: "Голова комісії", label: "Голова комісії" },
          { value: "Секретар комісії", label: "Секретар комісії" },
          { value: "Член комісії", label: "Член комісії" },
        ], { required: true, default: "Член комісії" }),
        person("person", "Працівник *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 5, maxItems: 15 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const members = (data.members || []).map((m) => `${clean(m.role)} — ${clean(m.person)}`).filter(Boolean).join("; ");
      return finish(this.title,
        withBasis(`З метою організації та проведення атестації педагогічних працівників у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          `Створити атестаційну комісію на ${clean(data.schoolYear)} навчальний рік у такому складі: ${members}.`,
          "Атестаційній комісії організувати роботу відповідно до чинного порядку проведення атестації педагогічних працівників.",
          "Секретарю атестаційної комісії забезпечити оформлення та зберігання документів комісії у встановленому порядку.",
        ], data);
    },
    validate(data, model) {
      const results = [];
      if (Number(data.employeeCount) < 15) {
        results.push({
          level: "error",
          title: "Заклад не може створити атестаційну комісію І рівня",
          detail: "За наявності менш ніж 15 педагогічних працівників атестацію проводить комісія ІІ рівня. Не експортуйте цей наказ.",
        });
      }
      const monthDay = String(model.orderDate || "").slice(5).replace("-", "");
      if (monthDay && monthDay > "0920") {
        results.push({ level: "warn", title: "Дата наказу пізніша за 20 вересня", detail: "Зафіксуйте причину порушення строку та перевірте подальші дії за чинним Положенням." });
      }
      return results;
    },
  }),
  template({
    id: "adaptation-grade-1-5",
    category: "Контроль",
    months: ["10", "11"],
    title: "Про підсумки адаптації учнів 1-х та 5-х класів",
    description: "Підсумки стартового періоду: спостереження, підтримка учнів і подальші дії педагогів.",
    tags: ["адаптація", "1 клас", "5 клас"],
    fields: [
      text("classes", "Класи *", { required: true, default: "1-х та 5-х класів", maxlength: 100 }),
      text("period", "Період спостереження *", { required: true, default: "першого місяця навчання", maxlength: 180 }),
      person("coordinator", "Відповідальний за узагальнення результатів", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        `Взяти до відома результати вивчення адаптації учнів ${clean(data.classes)} за підсумками ${clean(data.period)}.`,
        "Класним керівникам і педагогічним працівникам продовжити спостереження за навчальною та соціально-емоційною адаптацією учнів і своєчасно реагувати на виявлені труднощі.",
        "Працівникам психологічної служби, за потреби, надати учням, педагогам та батькам рекомендації щодо підтримки адаптації.",
      ];
      if (clean(data.coordinator)) points.push(`Узагальнення результатів та координацію подальших заходів доручити: ${clean(data.coordinator)}.`);
      return finish(this.title, withBasis(`З метою оцінювання перебігу адаптації учнів ${clean(data.classes)} та визначення подальших заходів підтримки`, data.basis), points, data);
    },
  }),
  template({
    id: "school-olympiad",
    category: "Освітній процес",
    months: ["10"],
    title: "Про організацію та проведення шкільного етапу учнівських олімпіад",
    description: "Організаційний наказ: строки проведення, координатор, безпечні умови та підбиття підсумків.",
    tags: ["олімпіади", "конкурси", "обдаровані учні"],
    fields: [
      date("dateFrom", "Початок проведення *", { required: true }),
      date("dateTo", "Завершення проведення *", { required: true }),
      person("coordinator", "Координатор *", { required: true, maxlength: 220 }),
      text("scope", "Предмети / напрями", { default: "відповідно до затвердженого переліку та графіка", maxlength: 300 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis("З метою підтримки обдарованих учнів, розвитку їхніх навчальних здібностей та організованого проведення шкільного етапу учнівських олімпіад", data.basis),
        [
          `Провести шкільний етап учнівських олімпіад у період з ${formatDateUa(data.dateFrom)} до ${formatDateUa(data.dateTo)} ${clean(data.scope)}.`,
          `Координацію підготовки, проведення та узагальнення результатів покласти на: ${clean(data.coordinator)}.`,
          "Педагогічним працівникам забезпечити об’єктивність оцінювання робіт учасників, дотримання академічної доброчесності та безпечні умови проведення.",
          "За результатами проведення підготувати підсумкову інформацію та визначити учнів для подальшої участі відповідно до встановленого порядку.",
        ], data);
    },
  }),
  template({
    id: "documentation-check",
    category: "Контроль",
    months: ["10", "11", "01", "04"],
    title: "Про перевірку стану ведення шкільної документації",
    description: "Для журналів, особових справ, планів та іншої документації. Типові формулювання вже включені.",
    tags: ["документація", "журнали", "контроль"],
    fields: [
      text("documents", "Що перевіряємо *", { required: true, default: "класних журналів та особових справ учнів", maxlength: 360 }),
      date("deadline", "Строк завершення перевірки *", { required: true }),
      person("responsible", "Хто проводить перевірку *", { required: true, maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою контролю за належним веденням ${clean(data.documents)} та своєчасністю внесення необхідних відомостей`, data.basis),
        [
          `Провести перевірку стану ведення ${clean(data.documents)} до ${formatDateUa(data.deadline)}.`,
          `Проведення перевірки та узагальнення її результатів доручити: ${clean(data.responsible)}.`,
          "Під час перевірки звернути увагу на повноту, своєчасність і коректність записів, відповідність фактичних даних та усунення виявлених недоліків.",
          "За результатами перевірки надати керівнику закладу коротку узагальнену інформацію та пропозиції щодо усунення недоліків.",
        ], data);
    },
  }),
  template({
    id: "attestation-list-schedule",
    category: "Кадрові",
    months: ["10"],
    title: "Про затвердження списку педагогічних працівників, які підлягають атестації",
    description: "Для списку педагогів, строків атестації та графіка засідань атестаційної комісії.",
    tags: ["атестація", "педагоги", "графік"],
    notice: "Для чергової атестації список, строки та графік засідань комісії затверджують до 20 жовтня.",
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("attachmentName", "Назва додатка", { default: "список педагогічних працівників, які підлягають черговій атестації, строки проведення атестації та графік засідань атестаційної комісії", maxlength: 500 }),
      repeatable("employees", "Педагогічні працівники, які підлягають черговій атестації *", [
        person("person", "ПІБ працівника *", { required: true, maxlength: 220 }),
        date("attestationDate", "Строк / дата атестації *", { required: true }),
      ], { required: true, minItems: 1, maxItems: 200 }),
      repeatable("meetings", "Графік засідань атестаційної комісії *", [
        date("meetingDate", "Дата засідання *", { required: true }),
        text("agenda", "Питання / етап роботи *", { required: true, maxlength: 500 }),
      ], { required: true, minItems: 1, maxItems: 50 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(this.title,
        withBasis(`З метою організації чергової атестації педагогічних працівників у ${clean(data.schoolYear)} навчальному році`, data.basis),
        [
          `Затвердити ${clean(data.attachmentName)} (додається).`,
          "Секретарю атестаційної комісії забезпечити своєчасне ознайомлення педагогічних працівників з інформацією, що стосується проходження ними атестації.",
          "Атестаційній комісії забезпечити дотримання затверджених строків і графіка роботи.",
        ], data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: clean(data.attachmentName),
          columns: ["№ з/п", "Педагогічний працівник", "Строк атестації"],
          rows: (data.employees || []).map((employee, index) => [String(index + 1), clean(employee.person), formatDateUa(employee.attestationDate)]),
        }, {
          kind: "approved",
          title: "Графік засідань атестаційної комісії",
          columns: ["№ з/п", "Дата засідання", "Питання / етап роботи"],
          rows: (data.meetings || []).map((meeting, index) => [String(index + 1), formatDateUa(meeting.meetingDate), clean(meeting.agenda)]),
        }],
      };
    },
    validate(data, model) {
      if (!model.orderDate) return [];
      const dateValue = new Date(`${model.orderDate}T00:00:00`);
      if (Number.isNaN(dateValue.getTime())) return [];
      const deadline = new Date(dateValue.getFullYear(), 9, 20);
      return dateValue > deadline
        ? [{ level: "error", title: "Список і графік затверджуються після 20 жовтня", detail: "Перевірте дату наказу та вимоги чинної редакції Положення про атестацію.", fieldId: "orderDate" }]
        : [];
    },
  }),
  template({
    id: "semester-results",
    category: "Контроль",
    months: ["12", "01"],
    title: "Про підсумки роботи закладу за І семестр",
    description: "Базовий підсумковий наказ із готовими управлінськими формулюваннями.",
    tags: ["семестр", "підсумки", "контроль"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      textarea("summary", "Короткий висновок про результати", { maxlength: 1200, placeholder: "Необов’язково: 2–4 речення про основні результати або проблеми" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        `Взяти до відома підсумки роботи закладу за І семестр ${clean(data.schoolYear)} навчального року.`,
      ];
      if (clean(data.summary)) points.push(normalizeSentence(data.summary));
      points.push("Заступникам директора та керівникам відповідних напрямів проаналізувати результати І семестру та врахувати виявлені потреби під час планування роботи на ІІ семестр.");
      points.push("Педагогічним працівникам забезпечити виконання навчальних програм, об’єктивність оцінювання результатів навчання та своєчасне інформування учнів і батьків про освітній прогрес.");
      return finish(this.title, withBasis(`З метою підбиття підсумків роботи закладу за І семестр ${clean(data.schoolYear)} навчального року та визначення завдань на ІІ семестр`, data.basis), points, data);
    },
  }),
  template({
    id: "winter-break-plan",
    category: "Освітній процес",
    months: ["12"],
    title: "Про організацію роботи закладу під час зимових канікул",
    description: "Готовий каркас для режиму роботи, заходів і відповідальних під час канікул.",
    tags: ["канікули", "зима", "режим роботи"],
    fields: [
      date("dateFrom", "Початок канікул *", { required: true }),
      date("dateTo", "Завершення канікул *", { required: true }),
      person("coordinator", "Відповідальний за організацію роботи", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        `Організувати роботу закладу під час зимових канікул у період з ${formatDateUa(data.dateFrom)} до ${formatDateUa(data.dateTo)}.`,
        "Забезпечити проведення запланованих освітніх, виховних та організаційних заходів із дотриманням вимог безпеки.",
        "Класним керівникам завчасно поінформувати учнів і батьків про графік роботи закладу, заплановані заходи та правила безпечної поведінки під час канікул.",
      ];
      if (clean(data.coordinator)) points.push(`Координацію роботи закладу в канікулярний період доручити: ${clean(data.coordinator)}.`);
      return finish(this.title, withBasis("З метою належної організації роботи закладу та змістовного дозвілля учнів під час зимових канікул", data.basis), points, data);
    },
  }),
  template({
    id: "winter-safety",
    category: "Безпека",
    months: ["12"],
    title: "Про запобігання дитячому травматизму під час зимових канікул",
    description: "Інструктажі, інформування батьків, правила безпечної поведінки та відповідальні.",
    tags: ["травматизм", "канікули", "безпека"],
    fields: [
      person("responsible", "Відповідальний за координацію профілактичної роботи", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        "Класним керівникам провести з учнями профілактичні бесіди та інструктажі з безпечної поведінки під час зимових канікул і святкових заходів.",
        "Звернути особливу увагу на правила дорожнього руху, пожежну безпеку, безпечне користування електроприладами, поведінку біля водойм та дії під час сигналів оповіщення.",
        "Класним керівникам довести до відома батьків (інших законних представників) рекомендації щодо безпечної поведінки дітей у канікулярний період.",
      ];
      if (clean(data.responsible)) points.push(`Координацію профілактичної роботи покласти на: ${clean(data.responsible)}.`);
      return finish(this.title, withBasis("З метою запобігання нещасним випадкам і дитячому травматизму під час зимових канікул та святкових заходів", data.basis), points, data);
    },
  }),
  template({
    id: "olympiad-results",
    category: "Освітній процес",
    months: ["02", "03"],
    title: "Про підсумки участі учнів в етапі учнівських олімпіад",
    description: "Для підбиття підсумків участі, відзначення результатів і планування подальшої підготовки.",
    tags: ["олімпіади", "підсумки", "учні"],
    fields: [
      select("stage", "Етап *", [
        { value: "ІІ етапі", label: "ІІ етап" },
        { value: "ІІІ етапі", label: "ІІІ етап" },
        { value: "відповідному етапі", label: "Інший / уточню пізніше" },
      ], { required: true, default: "ІІ етапі" }),
      textarea("results", "Основні результати", { maxlength: 1200, placeholder: "Необов’язково: переможці, призові місця, предмети" }),
      person("coordinator", "Відповідальний за подальшу підготовку", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [`Взяти до відома підсумки участі учнів закладу в ${clean(data.stage)} учнівських олімпіад.`];
      if (clean(data.results)) points.push(normalizeSentence(data.results));
      points.push("Педагогічним працівникам проаналізувати результати участі учнів та врахувати їх під час подальшої роботи з обдарованими учнями.");
      if (clean(data.coordinator)) points.push(`Координацію подальшої підготовки учнів покласти на: ${clean(data.coordinator)}.`);
      return finish(this.title, withBasis("З метою підбиття підсумків участі учнів у предметних олімпіадах та планування подальшої роботи", data.basis), points, data);
    },
  }),
  template({
    id: "attestation-results",
    category: "Кадрові",
    months: ["03", "04"],
    title: "Про результати атестації педагогічних працівників",
    description: "Каркас наказу за рішенням атестаційної комісії. Рішення комісії потрібно перенести без зміни змісту.",
    tags: ["атестація", "результати", "педагоги"],
    notice: "Наказ видають не пізніше 7 робочих днів від рішення; працівника ознайомлюють і наказ передають до бухгалтерії впродовж 3 робочих днів від видання.",
    legalReview: {
      source: "Положення про атестацію педагогічних працівників, наказ МОН № 805 від 09.09.2022, редакція від 24.04.2026",
      sourceUrl: "https://zakon.rada.gov.ua/laws/show/z1649-22",
    },
    fields: [
      textarea("decision", "Рішення атестаційної комісії *", { required: true, maxlength: 2500, placeholder: "Стисло перенесіть рішення комісії щодо працівника/працівників" }),
      date("decisionDate", "Дата рішення комісії *", { required: true }),
      text("protocolNumber", "Номер протоколу", { maxlength: 60 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const protocol = clean(data.protocolNumber) ? `, протокол № ${clean(data.protocolNumber)}` : "";
      return finish(this.title,
        withBasis(`На підставі рішення атестаційної комісії від ${formatDateUa(data.decisionDate)}${protocol}`, data.basis),
        [
          normalizeSentence(data.decision),
          "Відповідальній особі ознайомити педагогічного працівника з цим наказом під підпис упродовж трьох робочих днів із дати його видання.",
          "Подати цей наказ до бухгалтерії закладу освіти або централізованої бухгалтерії впродовж трьох робочих днів із дня його видання для нарахування заробітної плати та проведення відповідного перерахунку.",
        ],
        data);
    },
    validate(data, model) {
      const elapsed = workingDaysBetween(data.decisionDate, model.orderDate);
      if (elapsed === null) return [];
      if (elapsed < 0) return [{ level: "error", title: "Дата наказу передує рішенню атестаційної комісії" }];
      if (elapsed > 7) return [{ level: "warn", title: "Можливо перевищено 7-денний строк видання наказу", detail: `За базовим календарем понеділок–п’ятниця минуло ${elapsed} робочих днів. Звірте фактичний графік роботи закладу.`, affectsReadiness: true, fieldId: "orderDate" }];
      return [];
    },
  }),
  template({
    id: "school-year-end",
    category: "Освітній процес",
    months: ["04", "05"],
    title: "Про завершення навчального року",
    description: "Організація завершення занять, підбиття підсумків і виконання навчальних програм.",
    tags: ["кінець року", "навчальні заняття", "підсумки"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("lastSchoolDay", "Останній день навчальних занять *", { required: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою організованого завершення ${clean(data.schoolYear)} навчального року та підбиття підсумків освітнього процесу`, data.basis),
        [
          `Завершити навчальні заняття у ${clean(data.schoolYear)} навчальному році ${formatDateUa(data.lastSchoolDay)}.`,
          "Заступникам директора забезпечити контроль за виконанням навчальних програм, оформленням шкільної документації та підбиттям підсумків освітнього процесу.",
          "Класним керівникам забезпечити своєчасне інформування учнів і батьків про результати навчання, завершення навчального року та подальші організаційні заходи.",
          "Педагогічним працівникам завершити оформлення передбаченої документації у встановлені закладом строки.",
        ], data);
    },
  }),
  template({
    id: "first-grade-admission",
    category: "Учні",
    months: ["03", "04", "05"],
    title: "Про організацію прийому учнів до 1-х класів",
    description: "Організація приймання заяв, інформування батьків і відповідальні за комунікацію.",
    tags: ["1 клас", "вступ", "зарахування"],
    fields: [
      text("schoolYear", "Навчальний рік вступу *", { required: true, default: NEXT_SCHOOL_YEAR, maxlength: 20 }),
      date("startDate", "Початок приймання заяв", {}),
      person("responsible", "Відповідальний за організацію прийому", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const datePart = clean(data.startDate) ? ` з ${formatDateUa(data.startDate)}` : "";
      const points = [
        `Організувати приймання заяв та документів для зарахування учнів до 1-х класів на ${clean(data.schoolYear)} навчальний рік${datePart}.`,
        "Забезпечити доступне інформування батьків (інших законних представників) про порядок подання документів, строки та організаційні умови прийому.",
        "Під час приймання та опрацювання документів забезпечити коректне ведення обліку та захист персональних даних.",
      ];
      if (clean(data.responsible)) points.push(`Відповідальним за координацію прийому та комунікацію з батьками визначити: ${clean(data.responsible)}.`);
      return finish(this.title, withBasis(`З метою організації прийому дітей до 1-х класів на ${clean(data.schoolYear)} навчальний рік`, data.basis), points, data);
    },
  }),
  template({
    id: "dpa-exemption",
    category: "Учні",
    months: ["04", "05"],
    frequency: "Лише за наявності чинної підстави",
    title: "Про звільнення учнів від державної підсумкової атестації",
    description: "Шаблон залишено в циклограмі, але його можна використовувати лише після перевірки актуального рішення на відповідний навчальний рік.",
    tags: ["ДПА", "атестація учнів", "потребує перевірки"],
    needsVerification: true,
    notice: "Не використовуйте цей шаблон автоматично. На дату підготовки MVP рішення щодо ДПА за 2026/2027 навчальний рік може змінитися або бути відсутнім.",
    fields: [
      text("classes", "Класи / учні *", { required: true, maxlength: 360 }),
      textarea("documentBasis", "Підстава, що увійде до тексту наказу *", { required: true, maxlength: 1600, placeholder: "Вкажіть актуальний нормативний акт / рішення, перевірене на дату видання наказу" }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        normalizeSentence(clean(data.documentBasis)),
        [`Звільнити від проходження державної підсумкової атестації: ${clean(data.classes)}.`, "Відповідальним працівникам забезпечити коректне відображення відповідної інформації у шкільній документації."],
        data);
    },
  }),
  template({
    id: "education-documents",
    category: "Учні",
    months: ["05", "06"],
    title: "Про оформлення та видачу документів про освіту",
    description: "Для організації оформлення, перевірки та видачі документів випускникам.",
    tags: ["документи про освіту", "випуск", "9 клас"],
    fields: [
      text("graduates", "Кому видаються документи *", { required: true, default: "випускникам 9-х класів", maxlength: 220 }),
      date("issueDate", "Дата видачі", {}),
      person("responsible", "Відповідальний за оформлення та перевірку *", { required: true, maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const issue = clean(data.issueDate) ? ` ${formatDateUa(data.issueDate)}` : " у визначений закладом строк";
      return finish(this.title,
        withBasis(`З метою належного оформлення та організованої видачі документів про освіту ${clean(data.graduates)}`, data.basis),
        [
          `Організувати оформлення, перевірку та видачу документів про освіту ${clean(data.graduates)}${issue}.`,
          `Відповідальним за оформлення, перевірку відомостей та підготовку документів до видачі визначити: ${clean(data.responsible)}.`,
          "До видачі документів забезпечити перевірку правильності персональних даних, результатів навчання та інших відомостей, що вносяться до документів.",
          "Факт видачі документів оформити у передбаченій закладом обліковій документації.",
        ], data);
    },
  }),
  template({
    id: "student-promotion",
    category: "Учні",
    months: ["05", "06"],
    title: "Про переведення учнів до наступних класів",
    description: "Для одного чи кількох класів. Перелік можна сформувати без ручного переписування стандартної частини наказу.",
    tags: ["переведення", "учні", "кінець року"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      repeatable("classes", "Класи *", [
        text("from", "З якого класу *", { required: true, maxlength: 30, placeholder: "1-А" }),
        text("to", "До якого класу *", { required: true, maxlength: 30, placeholder: "2-А" }),
      ], { required: true, minItems: 1, maxItems: 30 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const classList = (data.classes || []).map((x) => `${clean(x.from)} — до ${clean(x.to)} класу`).filter(Boolean).join("; ");
      return finish(this.title,
        withBasis(`За результатами завершення ${clean(data.schoolYear)} навчального року та з метою оформлення переведення учнів`, data.basis),
        [`Перевести учнів до наступних класів: ${classList}.`, "Класним керівникам та відповідальним працівникам внести необхідні відомості до шкільної документації та повідомити учнів і батьків про результати переведення."],
        data);
    },
  }),
  template({
    id: "preliminary-tariffication",
    category: "Кадрові",
    months: ["06", "07"],
    title: "Про підготовку попередньої тарифікації на наступний навчальний рік",
    description: "Підготовчий наказ для планування педагогічного навантаження на наступний навчальний рік.",
    tags: ["тарифікація", "наступний рік", "навантаження"],
    fields: [
      text("schoolYear", "Наступний навчальний рік *", { required: true, default: NEXT_SCHOOL_YEAR, maxlength: 20 }),
      person("responsible", "Відповідальний за підготовку проєкту *", { required: true, maxlength: 220 }),
      date("deadline", "Строк підготовки проєкту *", { required: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою завчасного планування педагогічного навантаження на ${clean(data.schoolYear)} навчальний рік`, data.basis),
        [
          `Розпочати підготовку проєкту попереднього розподілу педагогічного навантаження на ${clean(data.schoolYear)} навчальний рік.`,
          `Відповідальним за підготовку та узагальнення пропозицій визначити: ${clean(data.responsible)}.`,
          `Підготувати проєкт попередньої тарифікації до ${formatDateUa(data.deadline)} з урахуванням прогнозованої мережі класів, навчального плану та кадрового забезпечення.`,
          "Остаточний розподіл педагогічного навантаження оформити після уточнення фактичних умов роботи закладу на початок навчального року.",
        ], data);
    },
  }),
  template({
    id: "autumn-winter-readiness",
    category: "Адміністративно-господарські",
    months: ["08", "09"],
    title: "Про підготовку закладу до роботи в осінньо-зимовий період",
    description: "Робоча група, перевірка інженерних систем, території та запасів, строки усунення недоліків і документування готовності.",
    tags: ["осінньо-зимовий період", "опалення", "готовність", "інженерні мережі", "сніг"],
    recordSeries: "Адміністративно-господарські питання",
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "heat-preparation-620-378", "mon-safety-1669"],
    fields: [
      text("season", "Період готовності *", { required: true, default: "2026/2027", maxlength: 20 }),
      text("responsible", "Відповідальний за господарство (посада) *", { required: true, default: "завідуючому господарством", maxlength: 220 }),
      repeatable("workingGroup", "Робоча група з перевірки готовності *", [
        text("role", "Роль *", { required: true, maxlength: 100 }),
        text("member", "Посада / ПІБ *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 2, maxItems: 20, defaultItems: [
        { role: "Голова робочої групи", member: "директор" },
        { role: "Член робочої групи", member: "завідуючий господарством" },
      ] }),
      repeatable("measures", "Заходи з підготовки *", [
        textarea("action", "Захід *", { required: true, maxlength: 800 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
        text("executor", "Відповідальний *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 40, defaultItems: [
        { action: "Перевірити справність систем опалення, водопостачання, каналізації та електропостачання", deadline: "До 15.09.2026", executor: "завідуючий господарством" },
        { action: "Перевірити стан покрівлі, вікон, дверей, території та захисної споруди", deadline: "До 15.09.2026", executor: "робоча група" },
        { action: "Підготувати інвентар і матеріали для прибирання снігу та протиожеледної обробки", deadline: "До 20.09.2026", executor: "завідуючий господарством" },
      ] }),
      date("inspectionDeadline", "Строк оформлення акта готовності *", { required: true, default: "2026-09-15" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про підготовку закладу до роботи в осінньо-зимовий період ${clean(data.season)} років`,
        withBasis("З метою забезпечення безпечної та безперебійної роботи будівель, споруд та інженерних мереж закладу в осінньо-зимовий період", data.basis), [
          orderDirective("", "Створити робочу групу з перевірки готовності закладу до осінньо-зимового періоду згідно з додатком 1."),
          orderDirective(data.responsible, "організувати виконання заходів з підготовки та невідкладне усунення виявлених недоліків."),
          orderDirective("Робочій групі", "провести підсумкову перевірку й оформити акт готовності із зазначенням виявлених недоліків та строків їх усунення.", 0, deadlineDate(data.inspectionDeadline)),
          orderDirective(data.responsible, "забезпечувати щоденний огляд стану території та інженерних систем у період погіршення погодних умов.", 0, deadlinePreset("Щоденно, за потреби")),
        ], data);
      return { ...order,
        bodyTables: [{ title: "Заходи з підготовки до осінньо-зимового періоду", columns: ["№ з/п", "Захід", "Строк", "Відповідальний"], rows: (data.measures || []).map((row, index) => [String(index + 1), clean(row.action), clean(row.deadline), clean(row.executor)]), afterDirective: 2 }],
        attachments: [{ kind: "approved", title: "Склад робочої групи з перевірки готовності", columns: ["№ з/п", "Роль", "Посада / ПІБ"], rows: (data.workingGroup || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.member)]) }],
      };
    },
  }),
  template({
    id: "technical-inspection-commission",
    category: "Адміністративно-господарські",
    months: ["08", "09"],
    title: "Про створення постійно діючої технічної комісії",
    description: "Склад комісії та структурований перелік оглядів приміщень, обладнання, спортивних споруд і дозвільних актів.",
    tags: ["технічна комісія", "огляд приміщень", "акти-дозволи", "обладнання"],
    needsVerification: true,
    legalBasisIds: ["law-labor-protection-2694", "mon-safety-1669", "mon-physical-safety-521"],
    fields: [
      repeatable("members", "Склад технічної комісії *", [
        text("role", "Роль *", { required: true, maxlength: 100 }),
        text("member", "Посада / ПІБ *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 2, maxItems: 20, defaultItems: [
        { role: "Голова комісії", member: "завідуючий господарством" },
        { role: "Член комісії", member: "відповідальний за охорону праці" },
        { role: "Член комісії", member: "представник профспілкової організації" },
      ] }),
      repeatable("inspections", "Об’єкти й результати перевірки *", [
        text("object", "Об’єкт перевірки *", { required: true, maxlength: 300 }),
        text("document", "Документ / результат *", { required: true, maxlength: 300 }),
        text("frequency", "Строк або періодичність *", { required: true, maxlength: 120 }),
      ], { required: true, minItems: 1, maxItems: 40, defaultItems: [
        { object: "Навчальні кабінети, майстерні та лабораторії", document: "Акти-дозволи на проведення занять", frequency: "До початку навчального року" },
        { object: "Спортивна зала, майданчики та спортивне обладнання", document: "Акти випробування й дозволи на використання", frequency: "До початку навчального року" },
        { object: "Будівлі, споруди та інженерні мережі", document: "Акт технічного огляду", frequency: "Двічі на рік та за потреби" },
      ] }),
      date("readinessDeadline", "Строк первинного огляду *", { required: true, default: "2026-08-28" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(this.title, withBasis("З метою систематичного контролю технічного стану будівель, приміщень, споруд та обладнання закладу", data.basis), [
        orderDirective("", "Створити постійно діючу технічну комісію згідно з додатком 1."),
        orderDirective("Технічній комісії", "провести первинний огляд об’єктів, оформити визначені документи та подати директору узагальнений акт готовності.", 0, deadlineDate(data.readinessDeadline)),
        orderDirective("Технічній комісії", "невідкладно повідомляти директора про дефекти, що створюють загрозу, та припиняти використання небезпечного об’єкта до усунення недоліків.", 0, deadlinePreset("Негайно")),
        orderDirective("Технічній комісії", "здійснювати подальші огляди з періодичністю, визначеною у таблиці цього наказу."),
      ], data);
      return { ...order,
        bodyTables: [{ title: "Об’єкти та результати технічних оглядів", columns: ["№ з/п", "Об’єкт", "Документ / результат", "Строк або періодичність"], rows: (data.inspections || []).map((row, index) => [String(index + 1), clean(row.object), clean(row.document), clean(row.frequency)]), afterDirective: 4 }],
        attachments: [{ kind: "approved", title: "Склад постійно діючої технічної комісії", columns: ["№ з/п", "Роль", "Посада / ПІБ"], rows: (data.members || []).map((row, index) => [String(index + 1), clean(row.role), clean(row.member)]) }],
      };
    },
  }),
  template({
    id: "harmful-habits-prevention",
    category: "Учні",
    months: ["08", "09"],
    title: "Про організацію роботи з профілактики тютюнопаління та інших шкідливих звичок",
    description: "Заборона вживання, профілактичний план, робота психологічної служби, інформування батьків і алгоритм реагування.",
    tags: ["тютюнопаління", "вейпи", "алкоголь", "наркотичні засоби", "здоровий спосіб життя"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-child-protection-2402", "law-tobacco-2899", "president-safe-school-195-2020"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("coordinator", "Координатор профілактичної роботи (посада) *", { required: true, default: "соціальному педагогу", maxlength: 220 }),
      text("psychologist", "Працівник психологічної служби *", { required: true, default: "практичному психологу", maxlength: 220 }),
      repeatable("plan", "План профілактичних заходів *", [
        textarea("event", "Захід *", { required: true, maxlength: 700 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
        text("responsible", "Відповідальний *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 50, defaultItems: [
        { event: "Оновити інформаційні матеріали про ризики тютюнових виробів, електронних сигарет, алкоголю та наркотичних засобів", deadline: "До 15.09.2026", responsible: "соціальний педагог" },
        { event: "Провести тематичні заняття з формування навичок відповідальної відмови", deadline: "Упродовж навчального року", responsible: "класні керівники" },
        { event: "Організувати індивідуальні консультації для учнів і батьків", deadline: "За потреби", responsible: "практичний психолог" },
      ] }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про організацію роботи з профілактики тютюнопаління та інших шкідливих звичок у ${clean(data.schoolYear)} навчальному році`, withBasis("З метою формування безпечної поведінки, збереження здоров’я учнів та запобігання вживанню тютюнових виробів, алкоголю, наркотичних засобів і психотропних речовин", data.basis), [
        orderDirective("Учасникам освітнього процесу", "дотримуватися заборони куріння, вживання тютюнових і нікотиновмісних виробів, алкоголю, наркотичних засобів та психотропних речовин у приміщеннях і на території закладу.", 0, deadlinePreset("Постійно")),
        orderDirective("", "Затвердити план профілактичних заходів згідно з таблицею у розпорядчій частині цього наказу."),
        orderDirective(data.coordinator, "координувати виконання плану, взаємодію з класними керівниками та інформування батьків.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
        orderDirective(data.psychologist, "проводити діагностичну, консультативну та профілактичну роботу з дотриманням конфіденційності й інтересів дитини.", 0, deadlinePreset("За планом та за потреби")),
        orderDirective("Працівникам закладу", "у разі виявлення ознак небезпечної поведінки діяти в межах повноважень, повідомити керівника та не розголошувати надлишкові персональні дані.", 0, deadlinePreset("Негайно")),
      ], data);
      return { ...order, bodyTables: [{ title: "План профілактичних заходів", columns: ["№ з/п", "Захід", "Строк", "Відповідальний"], rows: (data.plan || []).map((row, index) => [String(index + 1), clean(row.event), clean(row.deadline), clean(row.responsible)]), afterDirective: 2 }] };
    },
  }),
  template({
    id: "safety-class-operation",
    category: "Безпека",
    months: ["08", "09"],
    title: "Про організацію роботи Класу безпеки",
    description: "Відповідальний, інвентаризація зон, правила використання та річний план занять із мінної, пожежної, дорожньої й цивільної безпеки.",
    tags: ["Клас безпеки", "мінна безпека", "домедична допомога", "цивільний захист"],
    needsVerification: true,
    legalBasisIds: ["code-civil-protection-5403", "law-education-2145", "mon-safety-class-135", "mon-safety-1669"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("responsible", "Відповідальний за Клас безпеки (посада) *", { required: true, default: "заступнику директора", maxlength: 220 }),
      date("inventoryDeadline", "Строк інвентаризації й зонування *", { required: true, default: "2026-09-10" }),
      repeatable("plan", "Річний план роботи *", [
        text("topic", "Напрям / тема *", { required: true, maxlength: 350 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
        text("responsible", "Відповідальний *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 60, defaultItems: [
        { topic: "Мінна безпека", deadline: "Упродовж навчального року", responsible: "класні керівники" },
        { topic: "Пожежна безпека", deadline: "Упродовж навчального року", responsible: "відповідальний за пожежну безпеку" },
        { topic: "Цивільний захист і дії під час воєнних загроз", deadline: "Упродовж навчального року", responsible: "відповідальний за цивільний захист" },
        { topic: "Домедична допомога", deadline: "За графіком", responsible: "медичний працівник" },
        { topic: "Безпека дорожнього руху", deadline: "За графіком", responsible: "класні керівники" },
        { topic: "Психологічне розвантаження", deadline: "За потреби", responsible: "практичний психолог" },
      ] }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про організацію роботи Класу безпеки у ${clean(data.schoolYear)} навчальному році`, withBasis("З метою системного навчання учасників освітнього процесу правилам безпечної поведінки та діям у надзвичайних ситуаціях", data.basis), [
        orderDirective("", `Організувати роботу Класу безпеки у ${clean(data.schoolYear)} навчальному році.`),
        orderDirective("", "Затвердити річний план роботи Класу безпеки згідно з таблицею у розпорядчій частині цього наказу."),
        orderDirective(data.responsible, "провести інвентаризацію обладнання, перевірити зонування та безпечність навчального простору.", 0, deadlineDate(data.inventoryDeadline)),
        orderDirective(data.responsible, "вести графік використання Класу безпеки та координувати залучення фахівців ДСНС, поліції, медичних та інших служб.", 0, deadlinePreset("Постійно")),
        orderDirective("Класним керівникам", "проводити заняття відповідно до віку учнів і затвердженого плану, фіксувати проведення в установленій документації."),
      ], data);
      return { ...order, bodyTables: [{ title: "Річний план роботи Класу безпеки", columns: ["№ з/п", "Напрям / тема", "Строк", "Відповідальний"], rows: (data.plan || []).map((row, index) => [String(index + 1), clean(row.topic), clean(row.deadline), clean(row.responsible)]), afterDirective: 2 }] };
    },
  }),
  template({
    id: "safe-healthy-school-strategy",
    category: "Контроль",
    months: ["08", "09"],
    title: "Про стан реалізації Національної стратегії розбудови безпечного і здорового освітнього середовища",
    description: "Оцінювання фактичного стану за напрямами та план подальших заходів: доступність, інклюзія, харчування, медицина, безпека й психологічна підтримка.",
    tags: ["Національна стратегія", "безпечне середовище", "здорове середовище", "безбар’єрність", "інклюзія"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "president-safe-school-195-2020", "mon-bullying-1646"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      select("overallAssessment", "Загальна оцінка виконання *", [{ value: "задовільним", label: "Задовільний стан" }, { value: "таким, що потребує поліпшення", label: "Потребує поліпшення" }], { required: true, default: "задовільним" }),
      text("coordinator", "Координатор виконання плану (посада) *", { required: true, default: "заступнику директора", maxlength: 220 }),
      repeatable("results", "Фактичний стан за напрямами *", [
        text("area", "Напрям *", { required: true, maxlength: 250 }),
        textarea("result", "Результат / доказ *", { required: true, maxlength: 700 }),
      ], { required: true, minItems: 1, maxItems: 30, defaultItems: [
        { area: "Фізична безпека й цивільний захист", result: "Функціонують захисна споруда та Клас безпеки; проводяться тренування" },
        { area: "Психологічна безпека", result: "Організовано роботу психологічної служби та заходи із запобігання булінгу" },
        { area: "Здоров’я і харчування", result: "Організовано медичний супровід та контроль безпечності харчування" },
      ] }),
      repeatable("plan", "План подальших заходів *", [
        textarea("event", "Захід *", { required: true, maxlength: 700 }),
        text("deadline", "Строк *", { required: true, maxlength: 120 }),
        text("responsible", "Відповідальний *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 50, defaultItems: [
        { event: "Провести аудит фізичної доступності та визначити необхідні розумні пристосування", deadline: "До 30.09.2026", responsible: "робоча група з доступності" },
        { event: "Актуалізувати індивідуальні програми розвитку та роботу команд супроводу", deadline: "До 10.09.2026", responsible: "голови команд супроводу" },
        { event: "Перевірити маршрути евакуації з урахуванням потреб осіб з інвалідністю", deadline: "До 15.09.2026", responsible: "відповідальний за цивільний захист" },
        { event: "Забезпечити психосоціальну підтримку учасників освітнього процесу", deadline: "Упродовж навчального року", responsible: "практичний психолог" },
      ] }),
      ...baseAdvanced(),
    ],
    build(data) {
      const order = finish(`Про стан реалізації Національної стратегії розбудови безпечного і здорового освітнього середовища у ${clean(data.schoolYear)} навчальному році`, withBasis("За результатами аналізу умов навчання, виховання, охорони здоров’я, інклюзивності та психологічної безпеки у закладі", data.basis), [
        orderDirective("", `Визнати стан реалізації Національної стратегії у закладі ${clean(data.overallAssessment)}.`),
        orderDirective("", "Взяти до відома результати аналізу, наведені в таблиці у розпорядчій частині цього наказу."),
        orderDirective("", "Затвердити план подальших заходів згідно з додатком 1."),
        orderDirective(data.coordinator, "координувати виконання плану, збирати підтвердні матеріали та доповідати директору про ризики або прострочення.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
      ], data);
      return { ...order,
        bodyTables: [{ title: "Результати аналізу безпечного і здорового освітнього середовища", columns: ["№ з/п", "Напрям", "Фактичний результат / доказ"], rows: (data.results || []).map((row, index) => [String(index + 1), clean(row.area), clean(row.result)]), afterDirective: 2 }],
        attachments: [{ kind: "approved", title: "План заходів з розбудови безпечного і здорового освітнього середовища", columns: ["№ з/п", "Захід", "Строк", "Відповідальний"], rows: (data.plan || []).map((row, index) => [String(index + 1), clean(row.event), clean(row.deadline), clean(row.responsible)]) }],
      };
    },
  }),
  template({
    id: "first-lesson",
    category: "Освітній процес",
    months: ["08", "09"],
    title: "Про проведення Першого уроку",
    description: "Тема, дата, охоплені класи, методичний акцент, безпекова складова та публікація матеріалів без жорстко зашитої щорічної теми.",
    tags: ["Перший урок", "1 вересня", "тема уроку", "класні керівники"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("lessonDate", "Дата Першого уроку *", { required: true, default: "2026-09-01" }),
      text("theme", "Офіційна / обрана тема *", { required: true, maxlength: 350, placeholder: "Наприклад: Мова гідності" }),
      text("classes", "Класи *", { required: true, default: "1–9 класи", maxlength: 100 }),
      text("currentGuidance", "Щорічний лист, наказ або методичні рекомендації *", { required: true, maxlength: 700, placeholder: "Назва, дата і номер актуального документа" }),
      text("classTeachers", "Виконавці *", { required: true, default: "класним керівникам", maxlength: 220 }),
      text("deputy", "Методичний супровід (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      text("publication", "Де оприлюднити матеріали", { maxlength: 220, default: "на офіційному вебсайті закладу" }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(`Про проведення Першого уроку на тему «${clean(data.theme)}»`, withBasis(`На виконання ${clean(data.currentGuidance)} та з метою змістовного початку ${clean(data.schoolYear)} навчального року`, data.basis), [
        orderDirective("", `Провести ${formatDateUa(data.lessonDate)} Перший урок на тему «${clean(data.theme)}» для учнів ${clean(data.classes)}.`),
        orderDirective(data.classTeachers, "підготувати сценарії з урахуванням віку учнів, принципів гідності, поваги, інклюзивності, недискримінації та безпечного освітнього середовища.", 0, deadlinePreset(`До ${formatDateUa(data.lessonDate)}`)),
        orderDirective(data.classTeachers, "передбачити алгоритм дій під час сигналу повітряної тривоги та не використовувати матеріали, що можуть завдати психологічної шкоди дітям.", 1, deadlinePreset("Під час підготовки та проведення")),
        orderDirective(data.deputy, "надати методичну допомогу, перевірити готовність матеріалів та узагальнити інформацію про проведення уроку.", 0, deadlinePreset(`До ${formatDateUa(data.lessonDate)}`)),
        ...(clean(data.publication) ? [orderDirective(data.deputy, `оприлюднити добірку матеріалів і підсумкову інформацію ${clean(data.publication)} без надлишкових персональних даних.`, 1, deadlinePreset("Після проведення"))] : []),
      ], data);
    },
  }),
  template({
    id: "teacher-of-year-participation",
    category: "Кадрові",
    months: ["08", "09", "10"],
    title: "Про організацію участі у всеукраїнському конкурсі «Учитель року»",
    description: "Добровільна участь, щорічні номінації, реєстраційне вікно, етапи конкурсу та актуальний річний наказ МОН як змінна підстава.",
    tags: ["Учитель року", "конкурс", "номінації", "реєстрація педагогів"],
    recordSeries: "Кадрові питання",
    needsVerification: true,
    legalBasisIds: ["president-teacher-year-489-95", "cmu-teacher-year-638", "mon-teacher-year-schedule-145"],
    fields: [
      text("contestYear", "Рік конкурсу *", { required: true, default: "2027", maxlength: 4 }),
      text("annualOrder", "Актуальний щорічний наказ МОН *", { required: true, maxlength: 700, placeholder: "Наказ МОН від … № … про проведення конкурсу у відповідному році" }),
      repeatable("nominations", "Номінації поточного року *", [text("name", "Номінація *", { required: true, maxlength: 220 })], { required: true, minItems: 1, maxItems: 20, defaultItems: [
        { name: "Біологія" }, { name: "Захист України" }, { name: "Інформатика" }, { name: "Українська мова та література" },
      ] }),
      date("registrationFrom", "Початок реєстрації *", { required: true, default: "2026-10-18" }),
      date("registrationTo", "Завершення реєстрації *", { required: true, default: "2026-11-09" }),
      text("firstTour", "Строк першого туру *", { required: true, default: "листопад 2026 року — лютий 2027 року", maxlength: 180 }),
      text("secondTour", "Строк другого туру *", { required: true, default: "березень — травень 2027 року", maxlength: 180 }),
      text("coordinator", "Координатор участі (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const nominationList = (data.nominations || []).map((row) => clean(row.name)).filter(Boolean).join(", ");
      return finish(`Про організацію участі у всеукраїнському конкурсі «Учитель року — ${clean(data.contestYear)}»`, withBasis(`На виконання ${clean(data.annualOrder)} та з метою виявлення й підтримки талановитих педагогічних працівників`, data.basis), [
        orderDirective("Педагогічним працівникам", `взяти участь у конкурсі на добровільних засадах у номінаціях: ${nominationList}.`),
        orderDirective("Педагогічним працівникам, які бажають узяти участь", `самостійно зареєструватися на офіційній платформі конкурсу в період із ${formatDateUa(data.registrationFrom)} до ${formatDateUa(data.registrationTo)}.`),
        orderDirective(data.coordinator, "ознайомити педагогічних працівників з умовами конкурсу, надати організаційну й методичну підтримку та не допускати примушування до участі.", 0, deadlinePreset("До завершення реєстрації")),
        orderDirective(data.coordinator, `урахувати строки проведення першого туру: ${clean(data.firstTour)}; другого туру: ${clean(data.secondTour)}.`),
      ], data);
    },
    validate(data) {
      return clean(data.registrationFrom) && clean(data.registrationTo) && clean(data.registrationFrom) > clean(data.registrationTo)
        ? [{ level: "error", title: "Некоректне реєстраційне вікно", detail: "Дата початку реєстрації пізніша за дату завершення." }]
        : [];
    },
  }),
  template({
    id: "assessment-system-approval",
    category: "Освітній процес",
    months: ["08", "09"],
    title: "Про затвердження системи та загальних критеріїв оцінювання результатів навчання учнів",
    description: "Рішення педради, дата введення, принципи оцінювання, предметні критерії, публікація та компактна шкала замість копіювання всього нормативного акта.",
    tags: ["оцінювання", "критерії", "12-бальна шкала", "педагогічна рада", "академічна доброчесність"],
    needsVerification: true,
    legalBasisIds: ["law-education-2145", "law-secondary-463", "law-academic-integrity-4742", "mon-assessment-system-722"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      text("classes", "Класи *", { required: true, default: "1–9 класи", maxlength: 100 }),
      date("councilDate", "Дата рішення педагогічної ради *", { required: true, default: "2026-08-28" }),
      text("protocolNumber", "Номер протоколу педагогічної ради *", { required: true, maxlength: 40, default: "1" }),
      date("effectiveDate", "Дата введення системи в дію *", { required: true, default: "2026-09-01" }),
      date("criteriaDeadline", "Строк розроблення предметних критеріїв *", { required: true, default: "2026-09-05" }),
      text("publicationDeadline", "Строк оприлюднення *", { required: true, default: "Не пізніше 10 робочих днів після затвердження", maxlength: 180 }),
      text("deputy", "Координатор (посада) *", { required: true, default: "заступнику директора з навчально-виховної роботи", maxlength: 220 }),
      repeatable("scales", "Шкала відповідності *", [
        text("verbal", "Вербальна характеристика *", { required: true, maxlength: 220 }),
        text("level", "Рівень *", { required: true, maxlength: 100 }),
        text("points", "Бали *", { required: true, maxlength: 40 }),
      ], { required: true, minItems: 1, maxItems: 20, defaultItems: [
        { verbal: "Потребує значної підтримки", level: "Початковий", points: "1–3" },
        { verbal: "Демонструє результат із ситуативною підтримкою", level: "Середній", points: "4–6" },
        { verbal: "Демонструє помітний прогрес", level: "Достатній", points: "7–9" },
        { verbal: "Демонструє значні успіхи", level: "Високий", points: "10–12" },
      ] }),
      ...baseAdvanced(),
    ],
    build(data) {
      const councilBasis = `рішення педагогічної ради від ${formatDateUa(data.councilDate)}, протокол № ${clean(data.protocolNumber)}`;
      const order = finish(this.title, withBasis(`На підставі ${councilBasis} та з метою встановлення прозорих, об’єктивних і недискримінаційних правил оцінювання`, data.basis), [
        orderDirective("", `Затвердити систему та загальні критерії оцінювання результатів навчання учнів ${clean(data.classes)} згідно з додатком 1 та ввести їх у дію з ${formatDateUa(data.effectiveDate)}.`),
        orderDirective("Педагогічним працівникам", "здійснювати оцінювання справедливо, об’єктивно, конфіденційно, без дискримінації та з дотриманням академічної доброчесності.", 0, deadlinePreset(`Із ${formatDateUa(data.effectiveDate)}`)),
        orderDirective("Педагогічним працівникам", "розробити й довести до відома учнів предметні критерії оцінювання, узгоджені з освітньою програмою та загальною системою.", 0, deadlineDate(data.criteriaDeadline)),
        orderDirective("Педагогічним працівникам", "передбачати необхідні адаптації способів оцінювання для учнів з особливими освітніми потребами та під час дистанційного навчання.", 1, deadlinePreset("За потреби")),
        orderDirective(data.deputy, "координувати впровадження системи, надавати консультації педагогам та здійснювати моніторинг її послідовного застосування.", 0, deadlinePreset(`Упродовж ${clean(data.schoolYear)} навчального року`)),
        orderDirective(data.deputy, "забезпечити оприлюднення затвердженої системи на офіційному вебсайті закладу.", 1, deadlinePreset(clean(data.publicationDeadline))),
      ], data);
      return { ...order, attachments: [{ kind: "approved", title: "Система та загальні критерії оцінювання результатів навчання учнів", columns: ["Вербальна характеристика результату", "Рівень", "Бали"], rows: (data.scales || []).map((row) => [clean(row.verbal), clean(row.level), clean(row.points)]) }] };
    },
  }),
  template({
    id: "responsible-person",
    category: "Універсальні",
    months: [],
    frequency: "За потреби",
    title: "Про визначення відповідальної особи",
    description: "Універсальний шаблон для напряму, процесу, приміщення, обладнання або заходу.",
    tags: ["відповідальний", "універсальний"],
    fields: [
      text("area", "За що визначається відповідальна особа *", { required: true, maxlength: 260 }),
      person("responsible", "Відповідальна особа *", { required: true, maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis(`З метою належної організації роботи за напрямом: ${endingDot(data.area)}`, data.basis),
        [`Визначити відповідальною особою за ${endingDot(data.area)}: ${clean(data.responsible)}.`, `Відповідальній особі забезпечити організацію роботи, виконання необхідних заходів і ведення передбаченої документації за напрямом: ${endingDot(data.area)}.`],
        data);
    },
  }),
  template({
    id: "commission",
    category: "Універсальні",
    months: [],
    frequency: "За потреби",
    title: "Про створення комісії",
    description: "Універсальна комісія зі стандартною преамбулою, складом, завданням і строком роботи.",
    tags: ["комісія", "універсальний"],
    fields: [
      text("purpose", "Предмет роботи комісії *", { required: true, maxlength: 320 }),
      repeatable("members", "Склад комісії *", [
        text("role", "Роль *", { required: true, maxlength: 100, default: "Член комісії" }),
        person("person", "Працівник *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 2, maxItems: 15 }),
      textarea("task", "Завдання комісії *", { required: true, default: "провести роботу за визначеним напрямом, оформити результати та подати їх керівнику закладу", maxlength: 1500 }),
      date("deadline", "Строк виконання", {}),
      ...baseAdvanced(),
    ],
    build(data) {
      const members = (data.members || []).map((m) => `${clean(m.role)} — ${clean(m.person)}`).filter(Boolean).join("; ");
      const deadline = clean(data.deadline) ? ` Строк виконання — до ${formatDateUa(data.deadline)}.` : "";
      return finish(this.title,
        withBasis(`З метою організації роботи щодо ${endingDot(data.purpose)}`, data.basis),
        [`Створити комісію щодо ${endingDot(data.purpose)} у такому складі: ${members}.`, `Комісії ${endingDot(data.task)}.${deadline}`],
        data);
    },
  }),
  template({
    id: "approve-document",
    category: "Універсальні",
    months: [],
    frequency: "За потреби",
    title: "Про затвердження документа",
    description: "Для положення, плану, графіка, інструкції, програми чи іншого додатка.",
    tags: ["затвердження", "додаток", "універсальний"],
    fields: [
      text("documentName", "Назва документа *", { required: true, maxlength: 300, placeholder: "Положення про ..." }),
      textarea("documentText", "Текст документа, що додається *", { required: true, maxlength: 20000, placeholder: "Вставте повний текст положення, плану, графіка чи іншого документа. Кожен абзац починайте з нового рядка." }),
      date("effectiveDate", "Дата введення в дію", {}),
      person("responsible", "Відповідальний за виконання / ознайомлення", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const effective = clean(data.effectiveDate) ? ` та ввести його в дію з ${formatDateUa(data.effectiveDate)}` : "";
      const points = [`Затвердити ${clean(data.documentName)}${effective} (додається).`];
      if (clean(data.responsible)) points.push(`Виконання документа та ознайомлення заінтересованих осіб забезпечити: ${clean(data.responsible)}.`);
      const order = finish(`Про затвердження ${lowerFirst(clean(data.documentName)) || "документа"}`, withBasis(`З метою впорядкування роботи закладу та введення в дію ${lowerFirst(clean(data.documentName)) || "відповідного документа"}`, data.basis), points, data);
      return {
        ...order,
        attachments: [{
          kind: "approved",
          title: clean(data.documentName),
          paragraphs: String(data.documentText || "").split(/\r?\n/).map(clean).filter(Boolean),
        }],
      };
    },
  }),
  template({
    id: "free-order",
    category: "Універсальні",
    months: [],
    frequency: "За потреби",
    title: "Вільний наказ",
    description: "Вільний шаблон, якщо потрібної теми немає в каталозі.",
    tags: ["вільний", "універсальний"],
    fields: [
      text("customTitle", "Заголовок наказу *", { required: true, maxlength: 320, placeholder: "Про ..." }),
      textarea("preamble", "Преамбула / підстава *", { required: true, maxlength: 12000, help: "Кожен абзац починайте з нового рядка." }),
      repeatable("points", "Пункти наказу *", [
        select("level", "Рівень", [
          { value: "0", label: "Основний пункт" },
          { value: "1", label: "Підпункт" },
          { value: "2", label: "Підпункт другого рівня" },
        ], { default: "0", advanced: true }),
        text("executor", "Виконавець за посадою", { maxlength: 220, placeholder: "Класним керівникам" }),
        textarea("text", "Текст пункту *", { required: true, maxlength: 2200 }),
        text("deadlineValue", "Строк виконання", { maxlength: 120, placeholder: "Постійно / 2026-08-20 / За потреби", help: "Тип строку визначиться автоматично. Поле можна залишити порожнім." }),
      ], { required: true, minItems: 1, maxItems: 200, simple: true, help: "Для кожного доручення достатньо вказати виконавця, текст і строк. Нумерація формується автоматично." }),
      repeatable("bodyTables", "Таблиці в розпорядчій частині", [
        text("title", "Назва таблиці", { maxlength: 300 }),
        textarea("columns", "Назви колонок через ; *", { required: true, maxlength: 1000 }),
        textarea("rows", "Рядки таблиці *", { required: true, maxlength: 12000, help: "Кожен рядок — з нового рядка, комірки розділяйте крапкою з комою." }),
        text("afterDirective", "Після пункту №", { maxlength: 4, placeholder: "0 — перед усіма пунктами" }),
      ], { maxItems: 20, advanced: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const rows = (Array.isArray(data.points) ? data.points : []).map(directiveFromRow).filter(Boolean);
      const order = finish(clean(data.customTitle), normalizePreamble(data.preamble), rows, data);
      return { ...order, bodyTables: parseBodyTables(data.bodyTables) };
    },
  }),
];

function orderDirective(executor, textValue, level = 0, deadline = null) {
  return {
    level,
    executor: clean(executor).replace(/:+$/u, ""),
    text: normalizeSentence(textValue),
    deadline,
    children: [],
  };
}

function deadlineDate(value) {
  const normalized = clean(value);
  return normalized ? { kind: "date", value: normalized } : null;
}

function deadlinePreset(value) {
  const normalized = clean(value);
  return normalized ? { kind: "preset", value: normalized } : null;
}

function finish(title, preamble, points, data) {
  const out = [...points.filter(Boolean)];
  if (clean(data.extraPoint)) out.push(normalizeSentence(data.extraPoint));
  const structured = (Array.isArray(data.extraDirectives) ? data.extraDirectives : []).map(directiveFromRow).filter(Boolean);
  const directives = buildDirectiveTree([...out, ...structured, controlPoint(data.controlPerson)]);
  const legalBasisIds = (Array.isArray(data.legalBasis) ? data.legalBasis : []).map((row) => clean(row?.id)).filter(Boolean);
  const legalLead = formatLegalBasis(legalBasisIds);
  const normalizedPreamble = normalizePreamble(preamble);
  const finalPreamble = legalLead ? `${legalLead}.\n${normalizedPreamble}` : normalizedPreamble;
  return {
    title,
    preamble: finalPreamble,
    points: flattenDirectiveText(directives),
    directives,
    legalBasisIds,
  };
}

function withBasis(sentence, basis) {
  const purpose = endingDot(sentence);
  const b = endingDot(basis);
  return b ? `${b} та ${lowerFirst(purpose)}.` : `${purpose}.`;
}

function directiveFromRow(row) {
  const textValue = normalizeSentence(stripManualPointNumber(row?.text));
  const executor = clean(row?.executor).replace(/:+$/u, "");
  if (!textValue && !executor) return null;
  const deadlineValue = clean(row?.deadlineValue);
  return {
    level: Math.min(2, Math.max(0, Number.parseInt(row?.level, 10) || 0)),
    executor,
    text: textValue,
    deadline: deadlineValue ? { kind: inferDeadlineKind(deadlineValue, row?.deadlineKind), value: deadlineValue } : null,
    children: [],
  };
}

function inferDeadlineKind(value, requestedKind) {
  if (["date", "preset", "free"].includes(requestedKind)) return requestedKind;
  return /^\d{4}-\d{2}-\d{2}$/u.test(clean(value)) ? "date" : "free";
}

function buildDirectiveTree(items) {
  const roots = [];
  const stack = [];
  items.forEach((raw) => {
    const item = typeof raw === "string" ? { executor: "", text: raw, deadline: null, children: [] } : { ...raw, children: [] };
    let level = Math.min(2, Math.max(0, Number.parseInt(raw?.level, 10) || 0));
    if (level > stack.length) level = stack.length;
    while (stack.length > level) stack.pop();
    if (level === 0 || !stack[level - 1]) roots.push(item);
    else stack[level - 1].children.push(item);
    stack[level] = item;
    stack.length = level + 1;
  });
  return roots;
}

function flattenDirectiveText(items, out = []) {
  items.forEach((item) => {
    out.push(item.executor ? `${item.executor}: ${item.text}`.trim() : item.text);
    flattenDirectiveText(item.children || [], out);
  });
  return out.filter(Boolean);
}

function parseBodyTables(tables) {
  return (Array.isArray(tables) ? tables : []).map((table) => ({
    title: clean(table?.title),
    columns: String(table?.columns || "").split(";").map(clean).filter(Boolean),
    rows: String(table?.rows || "").split(/\r?\n/u).map((row) => row.split(";").map(clean)).filter((row) => row.some(Boolean)),
    afterDirective: Number.parseInt(table?.afterDirective, 10) || 0,
  })).filter((table) => table.columns.length && table.rows.length);
}

function stripManualPointNumber(value) {
  return clean(value).replace(/^\d{1,3}(?:\.\d{1,3})*[.)]?\s+/u, "");
}

function workingDaysBetween(startValue, endValue) {
  const start = new Date(`${clean(startValue)}T00:00:00`);
  const end = new Date(`${clean(endValue)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return -1;
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeSentence(value) {
  const v = clean(value);
  if (!v) return "";
  return /[.!?…]$/.test(v) ? v : `${v}.`;
}

export function normalizePreamble(value) {
  return String(value ?? "").split(/\r?\n+/u).map(normalizeSentence).filter(Boolean).join("\n");
}

function endingDot(value) {
  return clean(value).replace(/[.!?…]+$/, "");
}

function controlPoint(personValue) {
  return clean(personValue)
    ? `Контроль за виконанням цього наказу покласти на ${clean(personValue)}.`
    : "Контроль за виконанням цього наказу залишаю за собою.";
}

export function lowerFirst(value) {
  const v = clean(value);
  return v ? v.charAt(0).toLocaleLowerCase("uk-UA") + v.slice(1) : "";
}

export function upperFirst(value) {
  const v = clean(value);
  return v ? v.charAt(0).toLocaleUpperCase("uk-UA") + v.slice(1) : "";
}

export function formatDateUa(value) {
  const v = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const [y, m, d] = v.split("-");
  return `${d}.${m}.${y}`;
}
