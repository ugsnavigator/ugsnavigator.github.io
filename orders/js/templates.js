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
  "pedagogical-workload": "Основна діяльність",
  "responsible-safety": "Основна діяльність",
  "student-enrollment": "Рух здобувачів освіти",
  "school-meals": "Основна діяльність",
  "class-teachers": "Основна діяльність",
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
  "preliminary-tariffication": "Основна діяльність",
  "responsible-person": "Основна діяльність",
  "commission": "Основна діяльність",
  "approve-document": "Основна діяльність",
  "free-order": "Основна діяльність",
});

function template(config) {
  const needsVerification = Boolean(config.needsVerification || LEGAL_SENSITIVE_TEMPLATES.has(config.id));
  const hasVerificationField = (config.fields || []).some((field) => field.id === "verifiedBasis");
  const fields = needsVerification && !hasVerificationField
    ? [...(config.fields || []), textarea("verifiedBasis", "Перевірена чинна нормативна підстава *", {
        required: true,
        advanced: true,
        maxlength: 1600,
        placeholder: "Назва, дата, номер і чинна редакція акта, перевірені на дату видання наказу",
        help: "Це поле є журналом юридичної перевірки й не підставляється автоматично в текст наказу.",
      })]
    : (config.fields || []);
  return {
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
}

export const ORDER_TEMPLATES = [
  template({
    id: "school-year-organization",
    category: "Початок року",
    months: ["08", "09"],
    title: "Про організацію освітнього процесу та режим роботи",
    description: "Базовий наказ на початок навчального року: старт освітнього процесу, режим роботи та організаційні доручення.",
    tags: ["початок року", "режим роботи", "освітній процес"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("startDate", "Початок навчальних занять *", { required: true, default: "2026-09-01" }),
      select("format", "Основний формат роботи", [
        { value: "очному форматі", label: "Очний" },
        { value: "змішаному форматі", label: "Змішаний" },
        { value: "дистанційному форматі", label: "Дистанційний" },
      ], { default: "очному форматі" }),
      ...baseAdvanced(),
    ],
    build(data) {
      const preamble = withBasis(`З метою організованого початку ${clean(data.schoolYear)} навчального року, належної організації освітнього процесу та узгодження режиму роботи закладу`, data.basis);
      const points = [
        `Організувати освітній процес у ${clean(data.schoolYear)} навчальному році з ${formatDateUa(data.startDate)} у ${clean(data.format)}.`,
        "Затвердити та забезпечити дотримання режиму роботи закладу відповідно до освітньої програми, навчального плану та затвердженого розкладу.",
        "Заступникам директора та педагогічним працівникам забезпечити виконання освітньої програми, дотримання вимог безпеки та належну організацію роботи з учнями.",
      ];
      return finish(this.title, preamble, points, data);
    },
  }),
  template({
    id: "pedagogical-workload",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про тарифікацію та розподіл педагогічного навантаження",
    description: "Для оформлення педагогічного навантаження та введення його в дію на навчальний рік.",
    tags: ["тарифікація", "навантаження", "педагоги"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      date("effectiveDate", "Дата введення в дію *", { required: true, default: "2026-09-01" }),
      person("responsible", "Відповідальний за оформлення тарифікації", { maxlength: 220 }),
      ...baseAdvanced(),
    ],
    build(data) {
      const points = [
        `Затвердити розподіл педагогічного навантаження на ${clean(data.schoolYear)} навчальний рік та ввести його в дію з ${formatDateUa(data.effectiveDate)}.`,
        "Під час оформлення тарифікаційних матеріалів врахувати затверджений навчальний план, штатний розпис та фактичний розподіл педагогічної роботи.",
      ];
      if (clean(data.responsible)) points.push(`Відповідальним за підготовку та актуалізацію тарифікаційних матеріалів визначити: ${clean(data.responsible)}.`);
      return finish(this.title, withBasis(`З метою впорядкування педагогічного навантаження у ${clean(data.schoolYear)} навчальному році`, data.basis), points, data);
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
    title: "Про організацію харчування учнів",
    description: "Старт організації харчування: дата, відповідальна особа, контроль режиму та безпечності.",
    tags: ["харчування", "їдальня", "безпека"],
    fields: [
      date("startDate", "Початок організації харчування *", { required: true, default: "2026-09-01" }),
      person("responsible", "Відповідальний за організацію харчування *", { required: true, maxlength: 220 }),
      text("schedule", "Режим харчування", { default: "відповідно до затвердженого графіка харчування", maxlength: 300 }),
      ...baseAdvanced(),
    ],
    build(data) {
      return finish(this.title,
        withBasis("З метою забезпечення належної організації харчування учнів, дотримання санітарних вимог та безпечності харчових продуктів", data.basis),
        [
          `Організувати харчування учнів з ${formatDateUa(data.startDate)} ${clean(data.schedule)}.`,
          `Відповідальним за організацію харчування, координацію роботи та ведення передбаченої документації визначити: ${clean(data.responsible)}.`,
          "Забезпечити дотримання затвердженого меню, режиму харчування, вимог до приймання, зберігання та використання харчових продуктів.",
          "Працівникам, залученим до організації харчування, неухильно дотримуватися вимог особистої гігієни та правил безпечної роботи.",
        ], data);
    },
  }),
  template({
    id: "class-teachers",
    category: "Кадрові",
    months: ["08", "09"],
    title: "Про призначення класних керівників та завідувачів кабінетів",
    description: "Один шаблон для класних керівників і, за потреби, закріплення навчальних кабінетів.",
    tags: ["класні керівники", "кабінети", "педагоги"],
    fields: [
      text("schoolYear", "Навчальний рік *", { required: true, default: CURRENT_SCHOOL_YEAR, maxlength: 20 }),
      repeatable("classTeachers", "Класні керівники *", [
        text("className", "Клас *", { required: true, maxlength: 30 }),
        person("person", "Класний керівник *", { required: true, maxlength: 220 }),
      ], { required: true, minItems: 1, maxItems: 40 }),
      repeatable("cabinets", "Завідувачі кабінетів", [
        text("room", "Кабінет / приміщення *", { required: true, maxlength: 120 }),
        person("person", "Відповідальна особа *", { required: true, maxlength: 220 }),
      ], { minItems: 0, maxItems: 30, advanced: true }),
      ...baseAdvanced(),
    ],
    build(data) {
      const classList = (data.classTeachers || []).map((x) => `${clean(x.className)} — ${clean(x.person)}`).filter(Boolean).join("; ");
      const points = [`Призначити на ${clean(data.schoolYear)} навчальний рік класних керівників: ${classList}.`];
      const cabinetList = (data.cabinets || []).map((x) => `${clean(x.room)} — ${clean(x.person)}`).filter(Boolean).join("; ");
      if (cabinetList) points.push(`Закріпити навчальні кабінети та приміщення за відповідальними особами: ${cabinetList}.`);
      points.push("Класним керівникам та завідувачам кабінетів забезпечити належну організацію роботи, збереження майна та дотримання вимог безпеки в межах визначених повноважень.");
      return finish(this.title, withBasis(`З метою належної організації роботи закладу у ${clean(data.schoolYear)} навчальному році`, data.basis), points, data);
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
    title: "Про …",
    description: "Вільний шаблон, якщо потрібної теми немає в каталозі.",
    tags: ["вільний", "універсальний"],
    fields: [
      text("customTitle", "Заголовок наказу *", { required: true, maxlength: 320, placeholder: "Про ..." }),
      textarea("preamble", "Преамбула / підстава *", { required: true, maxlength: 2000 }),
      repeatable("points", "Пункти наказу *", [
        textarea("text", "Текст пункту *", { required: true, maxlength: 2200 }),
      ], { required: true, minItems: 1, maxItems: 20 }),
    ],
    build(data) {
      return {
        title: clean(data.customTitle),
        preamble: normalizeSentence(data.preamble),
        points: (Array.isArray(data.points) ? data.points : []).map((p) => normalizeSentence(stripManualPointNumber(p.text))).filter(Boolean),
      };
    },
  }),
];

function finish(title, preamble, points, data) {
  const out = [...points.filter(Boolean)];
  if (clean(data.extraPoint)) out.push(normalizeSentence(data.extraPoint));
  out.push(controlPoint(data.controlPerson));
  return { title, preamble: normalizeSentence(preamble), points: out };
}

function withBasis(sentence, basis) {
  const base = endingDot(sentence);
  const b = endingDot(basis);
  return b ? `${base}, з урахуванням ${lowerFirst(b)}.` : `${base}.`;
}

function stripManualPointNumber(value) {
  return clean(value).replace(/^\d{1,3}[.)]\s+/u, "");
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

export function formatDateUa(value) {
  const v = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const [y, m, d] = v.split("-");
  return `${d}.${m}.${y}`;
}
