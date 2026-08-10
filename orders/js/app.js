import { ORDER_TEMPLATES, TEMPLATE_CATEGORIES, ACADEMIC_MONTHS, clean, formatDateUa } from "./templates.js";
import { DEFAULT_PROFILE, buildOrderModel, validateOrder, validateTemplateSchemas } from "./core.js";
import { downloadDocx, triggerDownload, verifyGeneratedDocx } from "./docx.js";
import { loadProfile, saveProfile, loadLetterheadAsset, saveLetterheadAsset, deleteLetterheadAsset, clearAllLocalData, sanitizeProfile, saveOrderRecord, listOrderRecords, deleteOrderRecord, clearOrderRecords, importOrderRecords } from "./storage.js";
import { validateImageFileBytes, decodeImageDimensions } from "./image.js";

const state = {
  profile: loadProfile(),
  template: null,
  selectedMonth: currentMonthId(),
  category: "Усі",
  search: "",
  showAll: false,
  formData: {},
  orderMeta: { orderDate: todayIso(), orderNumber: "" },
  letterheadAsset: null,
  letterheadObjectUrl: "",
  schemaErrors: [],
  savedOrderId: "",
  savedOrders: [],
  savedSearch: "",
};

const el = (id) => document.getElementById(id);
const ui = {
  search: el("template-search"),
  categoryFilter: el("category-filter"),
  monthNav: el("month-nav"),
  templateGrid: el("template-grid"),
  universalGrid: el("universal-grid"),
  universalSection: el("universal-section"),
  catalogTitle: el("catalog-title"),
  catalogSummary: el("catalog-summary"),
  catalogView: el("catalog-view"),
  editorView: el("editor-view"),
  templateCategory: el("template-category"),
  templateTitle: el("template-title"),
  templateDescription: el("template-description"),
  templateNotice: el("template-notice"),
  editorBadges: el("editor-badges"),
  form: el("order-form"),
  preview: el("order-preview"),
  previewMode: el("preview-mode-label"),
  previewModal: el("preview-modal"),
  validationSummary: el("validation-summary"),
  validationDetails: el("validation-details"),
  validationResults: el("validation-results"),
  profileWarning: el("profile-warning"),
  profileNudge: el("profile-nudge"),
  profileForm: el("profile-form"),
  preprintedOptions: el("preprinted-options"),
  imageOptions: el("image-options"),
  letterheadFile: el("letterhead-file"),
  letterheadStatus: el("letterhead-file-status"),
  rememberLetterhead: el("remember-letterhead"),
  staffEditor: el("staff-editor"),
  staffSuggestions: el("staff-suggestions"),
  toast: el("toast"),
  selfTestSummary: el("self-test-summary"),
  savedOrdersList: el("saved-orders-list"),
  savedSearch: el("saved-search"),
  saveOrderButton: el("save-order"),
};

init();

async function init() {
  bindNavigation();
  bindCatalogActions();
  bindEditorActions();
  bindProfileActions();
  bindSavedOrderActions();
  bindModalActions();
  runStartupSelfCheck();
  renderCategorySelect();
  renderMonthNav();
  renderCatalog();
  populateProfileForm();
  renderStaffEditor();
  renderStaffDatalist();
  renderProfileNudge();
  await refreshSavedOrders();

  try {
    const savedAsset = await loadLetterheadAsset();
    if (savedAsset?.bytes?.length) {
      setLetterheadAsset(savedAsset);
      ui.rememberLetterhead.checked = true;
      setFileStatus(`Збережено: ${savedAsset.width}×${savedAsset.height} px.`);
    }
  } catch {
    setFileStatus("Зображення можна використати в цій вкладці, але браузер не дозволив зберегти його локально.");
  }
}

function runStartupSelfCheck() {
  state.schemaErrors = validateTemplateSchemas(ORDER_TEMPLATES);
  if (!ui.selfTestSummary) return;
  ui.selfTestSummary.textContent = state.schemaErrors.length
    ? `Виявлено помилок схем: ${state.schemaErrors.length}`
    : `Самоперевірка пройдена: ${ORDER_TEMPLATES.length} шаблонів.`;
  if (state.schemaErrors.length) console.error("Template schema errors:", state.schemaErrors);
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach((button) => button.addEventListener("click", () => {
    const name = button.dataset.view;
    if (name === "orders") showCatalog();
    if (name === "saved") void refreshSavedOrders();
    setView(name);
  }));
  el("go-profile").addEventListener("click", () => setView("profile"));
  el("back-to-orders").addEventListener("click", () => { showCatalog(); setView("orders"); });
}

function setView(name) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  el(`view-${name}`)?.classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindCatalogActions() {
  ui.search.addEventListener("input", () => {
    state.search = ui.search.value;
    if (clean(state.search)) state.showAll = false;
    renderCatalog();
  });
  ui.categoryFilter.addEventListener("change", () => {
    state.category = ui.categoryFilter.value;
    renderCatalog();
  });
  el("show-all-templates").addEventListener("click", () => {
    state.showAll = !state.showAll;
    state.search = "";
    ui.search.value = "";
    if (state.showAll) {
      state.category = "Усі";
      ui.categoryFilter.value = "Усі";
    }
    renderCatalog();
  });
}

function bindEditorActions() {
  el("back-to-catalog").addEventListener("click", showCatalog);
  el("reset-draft").addEventListener("click", () => {
    if (!state.template) return;
    state.formData = defaultFormData(state.template);
    state.orderMeta = { orderDate: todayIso(), orderNumber: "" };
    renderEditor();
    toast("Поля повернуто до стандартних значень шаблону.");
  });
  el("preview-order").addEventListener("click", openPreview);
  el("save-order").addEventListener("click", () => void saveCurrentOrder());
  el("download-docx").addEventListener("click", attemptDownload);
  el("print-order").addEventListener("click", attemptPrint);
  el("modal-download").addEventListener("click", attemptDownload);
  el("modal-print").addEventListener("click", attemptPrint);
}

function bindSavedOrderActions() {
  ui.savedSearch?.addEventListener("input", () => {
    state.savedSearch = ui.savedSearch.value;
    renderSavedOrders();
  });

  el("export-orders")?.addEventListener("click", async () => {
    await refreshSavedOrders();
    const payload = { version: 1, kind: "school-order-constructor-orders", exportedAt: new Date().toISOString(), orders: state.savedOrders };
    triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "zberezheni-nakazy.json");
  });

  el("import-orders")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast("JSON завеликий. Максимум 8 МБ."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      const count = await importOrderRecords(parsed?.orders || parsed);
      await refreshSavedOrders();
      toast(`Імпортовано: ${count}.`);
    } catch (error) {
      console.error(error);
      toast("Не вдалося імпортувати збережені накази.");
    }
  });

  el("clear-saved-orders")?.addEventListener("click", async () => {
    if (!confirm("Видалити всі збережені накази з цього браузера? Цю дію не можна скасувати.")) return;
    try {
      await clearOrderRecords();
      state.savedOrders = [];
      state.savedOrderId = "";
      renderSavedOrders();
      toast("Збережені накази видалено.");
    } catch {
      toast("Браузер не дозволив видалити локальні записи.");
    }
  });
}

async function saveCurrentOrder() {
  if (!state.template) return;
  let model;
  try { model = currentModel(); } catch { toast("Не вдалося підготувати наказ для збереження."); return; }
  const validation = validateOrder({
    template: state.template,
    rawData: state.formData,
    model,
    profile: state.profile,
    letterheadAsset: state.letterheadAsset,
  });
  const existing = state.savedOrderId ? state.savedOrders.find((x) => x.id === state.savedOrderId) : null;
  const now = new Date().toISOString();
  const record = {
    id: state.savedOrderId || createLocalId(),
    templateId: state.template.id,
    title: state.template.title,
    category: state.template.category,
    orderDate: state.orderMeta.orderDate,
    orderNumber: state.orderMeta.orderNumber,
    status: validation.hasErrors ? "draft" : "ready",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    formData: cloneJson(state.formData),
  };
  try {
    const saved = await saveOrderRecord(record);
    state.savedOrderId = saved.id;
    await refreshSavedOrders(false);
    renderEditor();
    toast(saved.status === "ready" ? "Наказ збережено." : "Збережено як чернетку: є незаповнені обов’язкові дані.");
  } catch (error) {
    console.error(error);
    toast("Не вдалося зберегти наказ у цьому браузері.");
  }
}

async function refreshSavedOrders(render = true) {
  try {
    state.savedOrders = await listOrderRecords();
  } catch (error) {
    console.error(error);
    state.savedOrders = [];
  }
  if (render) renderSavedOrders();
}

function renderSavedOrders() {
  if (!ui.savedOrdersList) return;
  const query = clean(state.savedSearch).toLocaleLowerCase("uk-UA");
  const orders = state.savedOrders.filter((record) => {
    if (!query) return true;
    return `${record.title} ${record.category} ${record.orderNumber} ${record.orderDate}`.toLocaleLowerCase("uk-UA").includes(query);
  });
  ui.savedOrdersList.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    const strong = document.createElement("strong"); strong.textContent = query ? "Нічого не знайдено" : "Збережених наказів ще немає";
    const span = document.createElement("span"); span.textContent = query ? "Змініть пошуковий запит." : "Під час створення наказу натисніть «Зберегти наказ».";
    empty.append(strong, span);
    ui.savedOrdersList.appendChild(empty);
    return;
  }

  orders.forEach((record) => {
    const row = document.createElement("article"); row.className = "saved-order-row";
    const date = document.createElement("div"); date.className = "saved-order-date";
    date.textContent = record.orderDate ? formatDateUa(record.orderDate) : "Без дати";
    if (record.orderNumber) {
      const n = document.createElement("small"); n.textContent = `№ ${record.orderNumber}`; n.style.display = "block"; date.appendChild(n);
    }
    const main = document.createElement("div"); main.className = "saved-order-main";
    const title = document.createElement("strong"); title.textContent = record.title;
    const meta = document.createElement("small"); meta.textContent = `${record.category} · змінено ${formatDateTimeUa(record.updatedAt)}`;
    main.append(title, meta);
    const status = document.createElement("span"); status.className = `saved-order-status ${record.status === "ready" ? "ready" : ""}`; status.textContent = record.status === "ready" ? "Готовий" : "Чернетка";
    const actions = document.createElement("div"); actions.className = "saved-order-actions";
    const edit = actionButton("Редагувати", () => openSavedOrder(record, false));
    const copy = actionButton("Копія", () => openSavedOrder(record, true));
    const del = actionButton("Видалити", () => void removeSavedOrder(record), true);
    actions.append(edit, copy, del);
    row.append(date, main, status, actions);
    ui.savedOrdersList.appendChild(row);
  });
}

function actionButton(label, handler, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `btn btn-small ${danger ? "btn-danger" : "btn-ghost"}`;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function openSavedOrder(record, asCopy) {
  const t = ORDER_TEMPLATES.find((item) => item.id === record.templateId);
  if (!t) { toast("Шаблон цього наказу більше не знайдено у поточній версії."); return; }
  state.template = t;
  state.savedOrderId = asCopy ? "" : record.id;
  state.formData = { ...defaultFormData(t), ...cloneJson(record.formData || {}) };
  state.orderMeta = {
    orderDate: asCopy ? todayIso() : (record.orderDate || todayIso()),
    orderNumber: asCopy ? "" : (record.orderNumber || ""),
  };
  renderEditor();
  ui.catalogView.classList.add("is-hidden");
  ui.editorView.classList.remove("is-hidden");
  setView("orders");
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast(asCopy ? "Створено копію. Номер наказу очищено." : "Наказ відкрито для редагування.");
}

async function removeSavedOrder(record) {
  if (!confirm(`Видалити збережений наказ «${record.title}»?`)) return;
  try {
    await deleteOrderRecord(record.id);
    if (state.savedOrderId === record.id) state.savedOrderId = "";
    await refreshSavedOrders();
    toast("Наказ видалено.");
  } catch {
    toast("Не вдалося видалити наказ.");
  }
}

function bindModalActions() {
  el("close-preview").addEventListener("click", closePreview);
  ui.previewModal.addEventListener("click", (event) => {
    if (event.target?.dataset?.closeModal === "true") closePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ui.previewModal.classList.contains("is-hidden")) closePreview();
  });
}

function bindProfileActions() {
  ui.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(ui.profileForm);
    const candidate = { ...Object.fromEntries(fd.entries()), staff: collectStaffFromEditor() };
    state.profile = saveProfile(candidate);

    if (state.profile.letterheadMode === "image") {
      if (ui.rememberLetterhead.checked && state.letterheadAsset) {
        try { await saveLetterheadAsset(state.letterheadAsset); }
        catch { toast("Налаштування збережено, але браузер не дозволив запам’ятати зображення бланка."); }
      } else {
        try { await deleteLetterheadAsset(); } catch { /* ignore unavailable IndexedDB */ }
      }
    }

    populateProfileForm();
    renderStaffEditor();
    renderStaffDatalist();
    renderProfileNudge();
    updateProfileWarning();
    toast("Налаштування збережено.");
  });

  ui.profileForm.addEventListener("change", updateLetterheadOptionsFromForm);
  ui.letterheadFile.addEventListener("change", handleLetterheadFile);

  el("add-staff").addEventListener("click", () => {
    const current = collectStaffFromEditor();
    current.push({ position: "", name: "" });
    renderStaffEditor(current);
    ui.staffEditor.querySelector(".staff-row:last-child input")?.focus();
  });

  ["export-profile", "export-profile-secondary"].forEach((id) => {
    el(id)?.addEventListener("click", () => void exportProfileBackup());
  });
  ["import-profile", "import-profile-secondary"].forEach((id) => {
    el(id)?.addEventListener("change", (event) => void importProfileBackup(event));
  });

  el("clear-local-data").addEventListener("click", async () => {
    if (!confirm("Видалити профіль закладу, фірмовий бланк і всі збережені накази з цього браузера? Цю дію не можна скасувати.")) return;
    await clearAllLocalData();
    state.profile = { ...DEFAULT_PROFILE, staff: [] };
    state.savedOrders = [];
    state.savedOrderId = "";
    clearLetterheadAsset();
    ui.rememberLetterhead.checked = false;
    populateProfileForm();
    renderStaffEditor();
    renderStaffDatalist();
    renderProfileNudge();
    updateProfileWarning();
    renderSavedOrders();
    toast("Локальні дані видалено.");
  });
}

async function exportProfileBackup() {
  const fd = new FormData(ui.profileForm);
  state.profile = saveProfile({ ...Object.fromEntries(fd.entries()), staff: collectStaffFromEditor() });
  let letterhead = null;
  if (state.letterheadAsset?.bytes?.length) {
    letterhead = {
      mime: state.letterheadAsset.mime,
      width: state.letterheadAsset.width,
      height: state.letterheadAsset.height,
      name: state.letterheadAsset.name || "letterhead",
      bytesBase64: bytesToBase64(state.letterheadAsset.bytes),
    };
  }
  const payload = { version: 3, kind: "school-order-constructor-profile", exportedAt: new Date().toISOString(), profile: state.profile, letterhead };
  triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "nalashtuvannia-zakladu.json");
}

async function importProfileBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) { toast("JSON завеликий. Максимум 4 МБ."); return; }
  try {
    const parsed = JSON.parse(await file.text());
    state.profile = saveProfile(sanitizeProfile(parsed?.profile || parsed));
    if (parsed?.letterhead?.bytesBase64) {
      const bytes = base64ToBytes(parsed.letterhead.bytesBase64);
      const check = validateImageFileBytes(bytes, parsed.letterhead.mime);
      if (!check.ok) throw new Error("Зображення бланка у JSON не пройшло перевірку.");
      const dims = await decodeImageDimensions(bytes, check.mime);
      setLetterheadAsset({
        bytes,
        mime: check.mime,
        width: dims.width,
        height: dims.height,
        name: String(parsed.letterhead.name || "letterhead").slice(0, 120),
      });
      ui.rememberLetterhead.checked = true;
      try { await saveLetterheadAsset(state.letterheadAsset); } catch { /* still usable in current tab */ }
    }
    populateProfileForm();
    renderStaffEditor();
    renderStaffDatalist();
    renderProfileNudge();
    updateProfileWarning();
    toast("Налаштування імпортовано.");
  } catch (error) {
    console.error(error);
    toast("Не вдалося імпортувати JSON.");
  }
}

function renderCategorySelect() {
  ui.categoryFilter.replaceChildren();
  ["Усі", ...TEMPLATE_CATEGORIES.filter((category) => category !== "Універсальні")].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    ui.categoryFilter.appendChild(option);
  });
  ui.categoryFilter.value = state.category;
}

function renderMonthNav() {
  ui.monthNav.replaceChildren();
  ACADEMIC_MONTHS.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-button";
    button.classList.toggle("is-active", month.id === state.selectedMonth && !state.showAll && !clean(state.search));
    const short = document.createElement("span"); short.className = "month-short"; short.textContent = month.short;
    const full = document.createElement("span"); full.className = "month-full"; full.textContent = month.name;
    button.append(short, full);
    button.addEventListener("click", () => {
      state.selectedMonth = month.id;
      state.showAll = false;
      state.search = "";
      ui.search.value = "";
      renderMonthNav();
      renderCatalog();
    });
    ui.monthNav.appendChild(button);
  });
}

function renderCatalog() {
  renderMonthNav();
  const query = clean(state.search).toLocaleLowerCase("uk-UA");
  const normalMode = !state.showAll && !query;
  const templates = ORDER_TEMPLATES.filter((t) => {
    const categoryOk = state.category === "Усі" || t.category === state.category;
    const searchText = `${t.title} ${t.description} ${(t.tags || []).join(" ")}`.toLocaleLowerCase("uk-UA");
    const searchOk = !query || searchText.includes(query);
    if (!categoryOk || !searchOk) return false;
    if (normalMode) return t.category !== "Універсальні" && (t.months || []).includes(state.selectedMonth);
    return true;
  });

  const month = ACADEMIC_MONTHS.find((m) => m.id === state.selectedMonth);
  ui.catalogTitle.textContent = query
    ? "Результати пошуку"
    : state.showAll
      ? "Усі шаблони наказів"
      : `Накази на ${monthNameLocative(month?.name || "місяць")}`;

  ui.catalogSummary.textContent = `${templates.length} ${nounTemplate(templates.length)}`;
  el("show-all-templates").textContent = state.showAll ? "Повернутися до місяця" : "Усі шаблони";

  ui.templateGrid.replaceChildren();
  templates.forEach((t) => ui.templateGrid.appendChild(createTemplateCard(t)));

  if (!templates.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const strong = document.createElement("strong"); strong.textContent = "Нічого не знайдено";
    const span = document.createElement("span"); span.textContent = "Спробуйте інший місяць, категорію або пошук.";
    empty.append(strong, span);
    ui.templateGrid.appendChild(empty);
  }

  const showUniversalSeparately = normalMode;
  ui.universalSection.classList.toggle("is-hidden", !showUniversalSeparately);
  if (showUniversalSeparately) renderUniversalSection();
}

function renderUniversalSection() {
  ui.universalGrid.replaceChildren();
  ORDER_TEMPLATES.filter((t) => t.category === "Універсальні").slice(0, 4)
    .forEach((t) => ui.universalGrid.appendChild(createTemplateCard(t, true)));
}

function createTemplateCard(t, compact = false) {
  const card = document.createElement("article");
  card.className = "template-card";
  if (compact) card.classList.add("is-compact");
  if (t.needsVerification) card.classList.add("needs-verification");

  const top = document.createElement("div"); top.className = "template-card-top";
  const category = document.createElement("span"); category.className = "mini-badge"; category.textContent = t.category;
  const freq = document.createElement("span"); freq.className = "frequency"; freq.textContent = t.frequency;
  top.append(category, freq);

  const title = document.createElement("h3"); title.textContent = t.title;
  const description = document.createElement("p"); description.textContent = t.description;
  const footer = document.createElement("div"); footer.className = "template-card-footer";

  const months = document.createElement("span"); months.className = "template-months";
  months.textContent = t.months?.length ? t.months.map(monthShortById).join(" · ") : "У будь-який час";
  const button = document.createElement("button"); button.type = "button"; button.className = "card-action"; button.textContent = "Створити";
  button.addEventListener("click", () => selectTemplate(t));
  footer.append(months, button);

  card.append(top, title, description);
  if (t.needsVerification) {
    const warn = document.createElement("div"); warn.className = "card-warning"; warn.textContent = "Перед використанням перевірте актуальну нормативну підставу."; card.appendChild(warn);
  }
  card.appendChild(footer);
  card.addEventListener("dblclick", () => selectTemplate(t));
  return card;
}

function selectTemplate(t) {
  state.template = t;
  state.savedOrderId = "";
  state.formData = defaultFormData(t);
  state.orderMeta = { orderDate: todayIso(), orderNumber: "" };
  renderEditor();
  ui.catalogView.classList.add("is-hidden");
  ui.editorView.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCatalog() {
  closePreview();
  ui.editorView.classList.add("is-hidden");
  ui.catalogView.classList.remove("is-hidden");
  renderCatalog();
}

function renderEditor() {
  if (!state.template) return;
  ui.templateCategory.textContent = state.template.category;
  ui.templateTitle.textContent = state.template.title;
  ui.templateDescription.textContent = state.template.description;
  ui.templateNotice.textContent = state.template.notice || "";
  ui.templateNotice.classList.toggle("is-hidden", !state.template.notice);
  renderEditorBadges();
  renderOrderForm();
  updateProfileWarning();
  if (ui.saveOrderButton) ui.saveOrderButton.textContent = state.savedOrderId ? "Зберегти зміни" : "Зберегти наказ";
}

function renderEditorBadges() {
  ui.editorBadges.replaceChildren();
  const items = [
    state.template.frequency,
    state.template.months?.length ? state.template.months.map(monthShortById).join(" · ") : "У будь-який час",
  ];
  items.forEach((textValue) => {
    const span = document.createElement("span"); span.className = "mini-badge"; span.textContent = textValue; ui.editorBadges.appendChild(span);
  });
}

function renderOrderForm() {
  ui.form.replaceChildren();

  const primary = document.createElement("div");
  primary.className = "form-grid two-col form-section";
  primary.appendChild(createSimpleInput({ id: "orderDate", label: "Дата наказу *", type: "date", required: true }, state.orderMeta, (v) => { state.orderMeta.orderDate = v; refreshPreviewIfOpen(); }));
  primary.appendChild(createSimpleInput({ id: "orderNumber", label: "Номер наказу", type: "text", maxlength: 40, placeholder: "наприклад: 125-о" }, state.orderMeta, (v) => { state.orderMeta.orderNumber = v; refreshPreviewIfOpen(); }));
  ui.form.appendChild(primary);

  const regular = state.template.fields.filter((field) => !field.advanced);
  const advanced = state.template.fields.filter((field) => field.advanced);
  regular.forEach((field) => ui.form.appendChild(createField(field, state.formData)));

  if (advanced.length) {
    const details = document.createElement("details");
    details.className = "advanced-order";
    const summary = document.createElement("summary");
    summary.textContent = "Додаткові налаштування";
    const body = document.createElement("div");
    body.className = "advanced-order-body";
    advanced.forEach((field) => body.appendChild(createField(field, state.formData)));
    details.append(summary, body);
    ui.form.appendChild(details);
  }
}

function createField(field, target) {
  if (field.type === "repeatable") return createRepeatable(field, target);
  return createSimpleInput(field, target, (value) => { target[field.id] = value; refreshPreviewIfOpen(); });
}

function createSimpleInput(field, target, onChange) {
  const label = document.createElement("label"); label.className = "field";
  const caption = document.createElement("span"); caption.textContent = field.label;
  let input;

  if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else if (field.type === "select") {
    input = document.createElement("select");
    (field.options || []).forEach((opt) => {
      const option = document.createElement("option");
      if (typeof opt === "string") { option.value = opt; option.textContent = opt; }
      else { option.value = opt.value; option.textContent = opt.label || opt.value; }
      input.appendChild(option);
    });
  } else {
    input = document.createElement("input");
    input.type = field.type === "person" ? "text" : (field.type || "text");
    if (field.type === "person") input.setAttribute("list", "staff-suggestions");
  }

  input.name = field.id;
  input.value = target[field.id] ?? "";
  if (field.required) input.required = true;
  if (field.maxlength) input.maxLength = field.maxlength;
  if (field.placeholder) input.placeholder = field.placeholder;
  const eventName = field.type === "select" ? "change" : "input";
  input.addEventListener(eventName, () => onChange(input.value));
  label.append(caption, input);
  if (field.help) { const small = document.createElement("small"); small.textContent = field.help; label.appendChild(small); }
  return label;
}

function createRepeatable(field, target) {
  if (!Array.isArray(target[field.id])) target[field.id] = [];
  const wrapper = document.createElement("div"); wrapper.className = "repeatable";
  const head = document.createElement("div"); head.className = "repeatable-head";
  const textWrap = document.createElement("div");
  const title = document.createElement("strong"); title.textContent = field.label;
  textWrap.appendChild(title);
  if (field.help) { const help = document.createElement("small"); help.textContent = field.help; textWrap.appendChild(help); }
  const add = document.createElement("button"); add.type = "button"; add.className = "btn btn-ghost btn-small"; add.textContent = "+ Додати";
  add.disabled = target[field.id].length >= (field.maxItems || 99);
  add.addEventListener("click", () => {
    target[field.id].push(blankRow(field.fields));
    renderOrderForm();
    refreshPreviewIfOpen();
  });
  head.append(textWrap, add); wrapper.appendChild(head);

  const items = document.createElement("div"); items.className = "repeatable-items";
  target[field.id].forEach((row, index) => {
    const item = document.createElement("div"); item.className = "repeatable-item";
    const itemNumber = document.createElement("span"); itemNumber.className = "item-number"; itemNumber.textContent = String(index + 1);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-row"; remove.textContent = "Видалити";
    remove.disabled = target[field.id].length <= (field.minItems || 0);
    remove.addEventListener("click", () => {
      target[field.id].splice(index, 1);
      renderOrderForm();
      refreshPreviewIfOpen();
    });
    const grid = document.createElement("div"); grid.className = "repeatable-item-grid";
    field.fields.forEach((sub) => grid.appendChild(createSimpleInput(sub, row, (value) => { row[sub.id] = value; refreshPreviewIfOpen(); })));
    item.append(itemNumber, remove, grid); items.appendChild(item);
  });
  wrapper.appendChild(items);
  return wrapper;
}

function defaultFormData(t) {
  const data = {};
  for (const field of t.fields) {
    if (field.type === "repeatable") data[field.id] = Array.from({ length: field.minItems || 0 }, () => blankRow(field.fields));
    else data[field.id] = field.default ?? "";
  }
  return data;
}

function blankRow(fields) {
  return Object.fromEntries(fields.map((field) => [field.id, field.default ?? ""]));
}

function currentModel() {
  if (!state.template) throw new Error("Шаблон не обрано");
  return buildOrderModel(state.template, state.formData, state.profile, state.orderMeta);
}

function openPreview() {
  if (!state.template) return;
  renderPreview();
  const report = runValidation();
  renderValidation(report);
  ui.previewModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function closePreview() {
  ui.previewModal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function refreshPreviewIfOpen() {
  if (!ui.previewModal.classList.contains("is-hidden")) {
    renderPreview();
    renderValidation(runValidation());
  }
}

function renderPreview() {
  let model;
  try { model = currentModel(); } catch { return; }
  ui.preview.replaceChildren();
  ui.preview.classList.toggle("preprinted", model.letterheadMode === "preprinted");
  ui.preview.style.setProperty("--preprinted-top", `${model.preprintedTopMm}mm`);
  ui.previewMode.textContent = modeLabel(model.letterheadMode);

  if (model.letterheadMode === "image" && state.letterheadObjectUrl) {
    const img = document.createElement("img");
    img.className = "letterhead-image";
    img.alt = "Фірмовий бланк";
    img.src = state.letterheadObjectUrl;
    img.style.width = `${model.letterheadWidthMm}mm`;
    ui.preview.appendChild(img);
  }
  if (model.letterheadMode === "standard") appendPreviewText(ui.preview, model.institutionName || "Назва закладу", "institution", !model.institutionName);
  appendPreviewText(ui.preview, "НАКАЗ", "order-word");

  const meta = document.createElement("div"); meta.className = "date-number";
  const d = document.createElement("span"); d.textContent = model.orderDate ? formatDateUa(model.orderDate) : "дата"; if (!model.orderDate) d.className = "placeholder";
  const place = document.createElement("span"); place.textContent = model.location || "місце"; if (!model.location) place.className = "placeholder";
  const n = document.createElement("span"); n.textContent = model.orderNumber ? `№ ${model.orderNumber}` : "№ ____";
  meta.append(d, place, n); ui.preview.appendChild(meta);

  appendPreviewText(ui.preview, model.title || "Про …", "order-title", !model.title);
  appendPreviewText(ui.preview, model.preamble || "Преамбула / підстава", "preamble", !model.preamble);
  appendPreviewText(ui.preview, "НАКАЗУЮ:", "order-command");
  if (model.points.length) model.points.forEach((point, i) => appendPreviewText(ui.preview, `${i + 1}. ${point}`, "order-point"));
  else appendPreviewText(ui.preview, "1. Пункт наказу", "order-point placeholder");

  const sig = document.createElement("div"); sig.className = "signature";
  const pos = document.createElement("span"); pos.textContent = model.signerPosition || "Посада"; if (!model.signerPosition) pos.className = "placeholder";
  const name = document.createElement("span"); name.textContent = model.signerName || "ПІБ"; if (!model.signerName) name.className = "placeholder";
  sig.append(pos, name); ui.preview.appendChild(sig);
}

function appendPreviewText(parent, textValue, className, placeholder = false) {
  const p = document.createElement("p");
  p.className = className;
  if (placeholder) p.classList.add("placeholder");
  p.textContent = textValue;
  parent.appendChild(p);
}

function runValidation() {
  let model;
  try { model = currentModel(); }
  catch (error) {
    return { results: [{ level: "error", title: "Не вдалося сформувати наказ", detail: String(error.message || error) }], hasErrors: true };
  }

  const report = validateOrder({ template: state.template, rawData: state.formData, model, profile: state.profile, letterheadAsset: state.letterheadAsset });
  const results = report.results.filter((r) => r.level !== "ok");

  if (state.template.needsVerification) {
    results.unshift({ level: "warn", title: "Потрібна перевірка актуальної нормативної підстави", detail: state.template.notice || "Перевірте чинні правила на дату видання наказу." });
  }

  const technical = verifyGeneratedDocx(model, state.letterheadAsset);
  if (!technical.ok) {
    console.error("DOCX verification errors:", technical.errors);
    results.push({ level: "error", title: "Файл DOCX не пройшов внутрішню перевірку", detail: "Експорт заблоковано. Не використовуйте сформований документ." });
  }

  return { results, hasErrors: report.hasErrors || !technical.ok, technical };
}

function renderValidation(report) {
  const errors = report.results.filter((r) => r.level === "error");
  const warnings = report.results.filter((r) => r.level === "warn");
  ui.validationSummary.className = "validation-summary";

  if (errors.length) {
    ui.validationSummary.classList.add("has-errors");
    ui.validationSummary.textContent = `${errors.length} ${nounProblem(errors.length)} потрібно виправити перед експортом.`;
  } else if (warnings.length) {
    ui.validationSummary.classList.add("has-warnings");
    ui.validationSummary.textContent = `Документ можна переглянути. Є ${warnings.length} ${nounCheck(warnings.length)} для вашої уваги.`;
  } else {
    ui.validationSummary.classList.add("is-ready");
    ui.validationSummary.textContent = "Основні перевірки пройдено. Документ готовий до експорту.";
  }

  const visible = [...errors, ...warnings];
  ui.validationDetails.classList.toggle("is-hidden", visible.length === 0);
  ui.validationResults.replaceChildren();
  visible.forEach((r) => {
    const row = document.createElement("div"); row.className = `validation-item ${r.level}`;
    const icon = document.createElement("div"); icon.className = "validation-icon"; icon.textContent = r.level === "warn" ? "!" : "×";
    const body = document.createElement("div");
    const strong = document.createElement("strong"); strong.textContent = r.title; body.appendChild(strong);
    if (r.detail) { const small = document.createElement("small"); small.textContent = r.detail; body.appendChild(small); }
    row.append(icon, body); ui.validationResults.appendChild(row);
  });
}

function attemptDownload() {
  if (!state.template) return;
  if (state.schemaErrors.length) { toast("Експорт заблоковано внутрішньою перевіркою шаблонів."); return; }
  const report = runValidation();
  if (report.hasErrors) {
    renderPreview();
    renderValidation(report);
    ui.previewModal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    toast("Заповніть обов’язкові поля перед завантаженням.");
    return;
  }
  try {
    downloadDocx(currentModel(), state.letterheadAsset);
    toast("DOCX сформовано.");
  } catch (error) {
    console.error(error);
    toast("Не вдалося сформувати DOCX.");
  }
}

function attemptPrint() {
  if (!state.template) return;
  const report = runValidation();
  if (report.hasErrors) {
    renderPreview();
    renderValidation(report);
    ui.previewModal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    toast("Друк доступний після заповнення обов’язкових полів.");
    return;
  }
  renderPreview();
  window.print();
}

function populateProfileForm() {
  for (const [key, value] of Object.entries(state.profile)) {
    if (key === "staff") continue;
    const field = ui.profileForm.elements.namedItem(key);
    if (!field) continue;
    if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) field.value = String(value ?? "");
    else field.value = value ?? "";
  }
  updateLetterheadOptionsFromForm();
}

function renderStaffEditor(source = state.profile.staff || []) {
  const rows = Array.isArray(source) ? source : [];
  ui.staffEditor.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "staff-empty";
    empty.textContent = "Довідник порожній. Додайте працівників, яких часто вказуєте відповідальними.";
    ui.staffEditor.appendChild(empty);
    return;
  }
  rows.forEach((row, index) => {
    const wrap = document.createElement("div"); wrap.className = "staff-row";
    const position = document.createElement("input"); position.type = "text"; position.placeholder = "Посада"; position.maxLength = 120; position.value = row.position || ""; position.dataset.staffPosition = String(index);
    const name = document.createElement("input"); name.type = "text"; name.placeholder = "ПІБ"; name.maxLength = 160; name.value = row.name || ""; name.dataset.staffName = String(index);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "icon-button staff-remove"; remove.textContent = "×"; remove.title = "Видалити";
    remove.addEventListener("click", () => {
      const next = collectStaffFromEditor();
      next.splice(index, 1);
      renderStaffEditor(next);
    });
    wrap.append(position, name, remove);
    ui.staffEditor.appendChild(wrap);
  });
}

function collectStaffFromEditor() {
  const rows = [...ui.staffEditor.querySelectorAll(".staff-row")];
  return rows.map((row) => ({
    position: row.querySelector("[data-staff-position]")?.value || "",
    name: row.querySelector("[data-staff-name]")?.value || "",
  })).filter((row) => clean(row.position) || clean(row.name));
}

function renderStaffDatalist() {
  ui.staffSuggestions.replaceChildren();
  (state.profile.staff || []).forEach((row) => {
    const value = [clean(row.position), clean(row.name)].filter(Boolean).join(" — ");
    if (!value) return;
    const option = document.createElement("option"); option.value = value; ui.staffSuggestions.appendChild(option);
  });
}

function updateLetterheadOptionsFromForm() {
  const mode = new FormData(ui.profileForm).get("letterheadMode") || "standard";
  ui.preprintedOptions.classList.toggle("is-hidden", mode !== "preprinted");
  ui.imageOptions.classList.toggle("is-hidden", mode !== "image");
}

async function handleLetterheadFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateImageFileBytes(bytes, file.type);
    if (!check.ok) throw new Error(check.error);
    const dims = await decodeImageDimensions(bytes, check.mime);
    setLetterheadAsset({ bytes, mime: check.mime, width: dims.width, height: dims.height, name: file.name.slice(0, 120) });
    setFileStatus(`${file.name}: ${dims.width}×${dims.height} px, ${(file.size / 1024).toFixed(0)} КБ.`);
    refreshPreviewIfOpen();
  } catch (error) {
    setFileStatus(error.message || "Файл відхилено.", true);
    toast("Зображення бланка не пройшло перевірку.");
  }
}

function setLetterheadAsset(asset) {
  clearLetterheadObjectUrl();
  state.letterheadAsset = { ...asset, bytes: asset.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset.bytes || []) };
  const blob = new Blob([state.letterheadAsset.bytes], { type: state.letterheadAsset.mime });
  state.letterheadObjectUrl = URL.createObjectURL(blob);
}

function clearLetterheadAsset() {
  state.letterheadAsset = null;
  clearLetterheadObjectUrl();
  setFileStatus("");
}

function clearLetterheadObjectUrl() {
  if (state.letterheadObjectUrl) URL.revokeObjectURL(state.letterheadObjectUrl);
  state.letterheadObjectUrl = "";
}

function setFileStatus(message, error = false) {
  ui.letterheadStatus.textContent = message;
  ui.letterheadStatus.classList.toggle("has-error", error);
}

function updateProfileWarning() {
  if (!ui.profileWarning) return;
  const missing = [];
  if (!state.profile.institutionName) missing.push("назву закладу");
  if (!state.profile.location) missing.push("населений пункт");
  if (!state.profile.signerName) missing.push("підписанта");
  ui.profileWarning.classList.toggle("is-hidden", !missing.length);
  if (missing.length) {
    ui.profileWarning.replaceChildren();
    const text = document.createElement("span"); text.textContent = `Перед експортом заповніть ${missing.join(", ")} у розділі «Мій заклад». `;
    const button = document.createElement("button"); button.type = "button"; button.className = "inline-link"; button.textContent = "Відкрити налаштування"; button.addEventListener("click", () => setView("profile"));
    ui.profileWarning.append(text, button);
  }
}

function renderProfileNudge() {
  const complete = Boolean(state.profile.institutionName && state.profile.location && state.profile.signerName);
  ui.profileNudge.classList.toggle("is-hidden", complete);
}

function modeLabel(mode) {
  return mode === "preprinted" ? "Друк на готовому бланку" : mode === "image" ? "Фірмовий бланк" : "Стандартний бланк";
}

function currentMonthId() {
  return String(new Date().getMonth() + 1).padStart(2, "0");
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function monthShortById(id) {
  return ACADEMIC_MONTHS.find((m) => m.id === id)?.short || id;
}

function monthNameLocative(name) {
  const map = {
    "Серпень": "серпень", "Вересень": "вересень", "Жовтень": "жовтень", "Листопад": "листопад", "Грудень": "грудень",
    "Січень": "січень", "Лютий": "лютий", "Березень": "березень", "Квітень": "квітень", "Травень": "травень", "Червень": "червень", "Липень": "липень",
  };
  return map[name] || name.toLocaleLowerCase("uk-UA");
}

function nounTemplate(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "шаблон";
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return "шаблони";
  return "шаблонів";
}

function nounProblem(n) {
  return n === 1 ? "помилку" : "помилки";
}

function nounCheck(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пункт";
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return "пункти";
  return "пунктів";
}

let toastTimer;
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-visible"), 2600);
}

function createLocalId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* file:// or older browser */ }
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function formatDateTimeUa(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "невідомо";
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function bytesToBase64(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, Math.min(i + chunk, data.length)));
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const raw = atob(String(text || ""));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
