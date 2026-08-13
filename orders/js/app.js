import { ORDER_TEMPLATES, TEMPLATE_CATEGORIES, ACADEMIC_MONTHS, RECORD_SERIES_OPTIONS, clean, formatDateUa } from "./templates.js";
import { DEFAULT_PROFILE, buildOrderModel, validateOrder, validateTemplateSchemas, isOrderReady, flattenDirectives, directiveText, directiveDeadlineText } from "./core.js";
import { downloadDocx, triggerDownload, verifyGeneratedDocx } from "./docx.js";
import { loadProfile, saveProfile, loadLetterheadAsset, saveLetterheadAsset, deleteLetterheadAsset, clearAllLocalData, sanitizeProfile, saveOrderRecord, listOrderRecords, deleteOrderRecord, clearOrderRecords, importOrderRecords } from "./storage.js";
import { validateImageFileBytes, decodeImageDimensions } from "./image.js";
import { findDuplicateOrderNumber, registrationStats, suggestOrderNumber } from "./registration.js";
import { createAugustPackageRecords, persistOrderPackage, validateOrderPackage } from "./order-package.js";

const state = {
  profile: loadProfile(),
  template: null,
  selectedMonth: currentMonthId(),
  category: "Усі",
  search: "",
  showAll: false,
  formData: {},
  orderMeta: { orderDate: todayIso(), orderNumber: "", recordSeries: "Основна діяльність" },
  letterheadAsset: null,
  letterheadObjectUrl: "",
  schemaErrors: [],
  savedOrderId: "",
  savedOrders: [],
  savedSearch: "",
  editorDirty: false,
  modalReturnFocus: null,
  previewRefreshTimer: 0,
  draftSaveTimer: 0,
};

const SESSION_DRAFT_KEY = "school-order-constructor.working-draft.v1";

const el = (id) => document.getElementById(id);
const ui = {
  search: el("template-search"),
  categoryFilter: el("category-filter"),
  monthNav: el("month-nav"),
  templateGrid: el("template-grid"),
  universalSection: el("universal-section"),
  catalogTitle: el("catalog-title"),
  catalogSummary: el("catalog-summary"),
  catalogView: el("catalog-view"),
  editorView: el("editor-view"),
  templateCategory: el("template-category"),
  templateTitle: el("template-title"),
  templateDescription: el("template-description"),
  autoTextTitle: el("auto-text-title"),
  autoTextDescription: el("auto-text-description"),
  templateNotice: el("template-notice"),
  templateSamplePanel: el("template-sample-panel"),
  templateSampleText: el("template-sample-text"),
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
  editorValidationBar: el("editor-validation-bar"),
  printRoot: el("print-root"),
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
  restoreSessionDraft();

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
    if (!confirmLeaveEditor()) return;
    if (name === "orders") showCatalog();
    if (name === "saved") void refreshSavedOrders();
    setView(name);
  }));
  el("go-profile").addEventListener("click", () => { if (confirmLeaveEditor()) setView("profile"); });
  el("back-to-orders").addEventListener("click", () => { showCatalog(); setView("orders"); });
  window.addEventListener("beforeunload", (event) => {
    if (!state.editorDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
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
  el("create-free-order").addEventListener("click", () => {
    const freeOrder = ORDER_TEMPLATES.find((template) => template.id === "free-order");
    if (freeOrder) selectTemplate(freeOrder);
  });
}

function bindEditorActions() {
  el("back-to-catalog").addEventListener("click", () => { if (confirmLeaveEditor()) showCatalog(); });
  el("reset-draft").addEventListener("click", () => {
    if (!state.template) return;
    if (!confirm("Очистити всі введені поля цього наказу та повернути початкові значення шаблону?")) return;
    state.formData = defaultFormData(state.template);
    state.orderMeta = { orderDate: todayIso(), orderNumber: "", recordSeries: state.template.recordSeries };
    state.editorDirty = true;
    renderEditor();
    toast("Поля повернуто до стандартних значень шаблону.");
  });
  el("preview-order").addEventListener("click", openPreview);
  el("save-order").addEventListener("click", () => void saveCurrentOrder());
  el("download-docx").addEventListener("click", () => openPreview("download"));
  el("print-order").addEventListener("click", () => openPreview("print"));
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
      if (parsed?.kind !== "school-order-constructor-orders" || parsed?.version !== 1 || !Array.isArray(parsed?.orders)) {
        throw new Error("Файл не є підтримуваною резервною копією наказів версії 1.");
      }
      const { count, evicted } = await importOrderRecords(parsed.orders);
      await refreshSavedOrders();
      const importMessage = count ? `Імпортовано нових або новіших записів: ${count}.` : "Новіших записів для імпорту немає.";
      const evictionWarning = evicted
        ? ` Резервне сховище переповнилося: вилучено ${evicted} найстаріших записів. Рекомендуємо експортувати резервну копію.`
        : "";
      toast(`${importMessage}${evictionWarning}`, evicted ? 0 : 2600);
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

  el("create-august-package")?.addEventListener("click", async () => {
    const schoolYear = clean(el("package-school-year")?.value);
    const orderDate = clean(el("package-order-date")?.value);
    if (!/^\d{4}\/\d{4}$/u.test(schoolYear) || Number(schoolYear.slice(5)) !== Number(schoolYear.slice(0, 4)) + 1) {
      toast("Навчальний рік має бути у форматі 2026/2027.");
      return;
    }
    if (!/^\d{4}-08-\d{2}$/u.test(orderDate)) {
      toast("Для серпневого пакета виберіть дату в серпні.");
      return;
    }
    if (!confirm("Додати до локальної бібліотеки 32 чернетки серпневого пакета?")) return;
    const records = createAugustPackageRecords({ schoolYear, orderDate });
    try {
      await persistOrderPackage(records, saveOrderRecord);
      await refreshSavedOrders();
      toast("Створено 32 чернетки. Кожну потрібно доповнити фактичними даними й перевіреними підставами.", 5000);
    } catch (error) {
      console.error(error);
      toast("Не вдалося зберегти весь серпневий пакет.");
    }
  });

  el("validate-order-package")?.addEventListener("click", async () => {
    await refreshSavedOrders(false);
    renderPackageValidation(validateOrderPackage(state.savedOrders, ORDER_TEMPLATES, state.profile));
  });
}

function renderPackageValidation(results) {
  const target = el("package-validation-results");
  if (!target) return;
  target.replaceChildren();
  (results || []).forEach((result) => {
    const row = document.createElement("div"); row.className = `package-result ${result.level}`;
    const strong = document.createElement("strong"); strong.textContent = result.title;
    row.appendChild(strong);
    if (result.detail) { const detail = document.createElement("div"); detail.textContent = result.detail; row.appendChild(detail); }
    target.appendChild(row);
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
    allowDraft: true,
  });
  const duplicate = findDuplicateRegistration(model);
  if (duplicate) validation.results.push({ level: "warn", title: "Можливий дублікат номера наказу", affectsReadiness: true });
  const existing = state.savedOrderId ? state.savedOrders.find((x) => x.id === state.savedOrderId) : null;
  const now = new Date().toISOString();
  const record = {
    id: state.savedOrderId || createLocalId(),
    templateId: state.template.id,
    title: model.title,
    category: state.template.category,
    recordSeries: model.recordSeries,
    orderDate: state.orderMeta.orderDate,
    orderNumber: state.orderMeta.orderNumber,
    status: isOrderReady(validation) ? "ready" : "draft",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    formData: cloneJson(state.formData),
  };
  try {
    const saved = await saveOrderRecord(record);
    state.savedOrderId = saved.id;
    state.editorDirty = false;
    clearSessionDraft();
    await refreshSavedOrders(false);
    renderEditor();
    const saveMessage = saved.status === "ready"
      ? "Наказ збережено."
      : validation.hasErrors
        ? "Збережено як чернетку: є незаповнені або некоректні обов’язкові дані."
        : "Збережено як чернетку: залишилися перевірки, що впливають на готовність.";
    const evictionWarning = saved.fallbackEvicted
      ? ` Резервне сховище переповнилося: вилучено ${saved.fallbackEvicted} найстаріших записів. Рекомендуємо експортувати резервну копію.`
      : "";
    toast(`${saveMessage}${evictionWarning}`, saved.fallbackEvicted ? 0 : 2600);
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
    recordSeries: record.recordSeries || t.recordSeries,
  };
  state.editorDirty = false;
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
    if (ui.previewModal.classList.contains("is-hidden")) return;
    if (event.key === "Escape") { closePreview(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...ui.previewModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((node) => !node.hidden && node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("afterprint", clearPrintRoot);
  window.addEventListener("resize", updatePreviewScale);
}

function bindProfileActions() {
  ui.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(ui.profileForm);
    const candidate = { ...Object.fromEntries(fd.entries()), staff: collectStaffFromEditor() };
    try {
      state.profile = saveProfile(candidate);
    } catch (error) {
      console.error(error);
      toast(error.message || "Не вдалося зберегти налаштування у цьому браузері.");
      return;
    }

    let persistenceWarning = "";
    if (state.profile.letterheadMode === "image") {
      if (ui.rememberLetterhead.checked && state.letterheadAsset) {
        try { await saveLetterheadAsset(state.letterheadAsset); }
        catch { persistenceWarning = " Браузер не дозволив запам’ятати зображення бланка."; }
      } else {
        try { await deleteLetterheadAsset(); }
        catch { if (typeof indexedDB !== "undefined") persistenceWarning = " Браузер не підтвердив видалення попереднього зображення бланка."; }
      }
    } else {
      try { await deleteLetterheadAsset(); }
      catch { if (typeof indexedDB !== "undefined") persistenceWarning = " Браузер не підтвердив видалення попереднього зображення бланка."; }
      clearLetterheadAsset();
      ui.rememberLetterhead.checked = false;
    }

    populateProfileForm();
    renderStaffEditor();
    renderStaffDatalist();
    renderProfileNudge();
    updateProfileWarning();
    toast(`Налаштування збережено.${persistenceWarning}`);
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
    try {
      await clearAllLocalData();
    } catch (error) {
      console.error(error);
      toast(error.message || "Не всі локальні дані вдалося видалити.");
      return;
    }
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
  state.profile = sanitizeProfile({ ...Object.fromEntries(fd.entries()), staff: collectStaffFromEditor() });
  try { saveProfile(state.profile); }
  catch (error) { console.warn("Profile backup exported without local persistence:", error); }
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
    if (parsed?.kind !== "school-order-constructor-profile" || parsed?.version !== 3 || !parsed?.profile) {
      throw new Error("Файл не є підтримуваною резервною копією профілю версії 3.");
    }
    const importedProfile = sanitizeProfile(parsed.profile);
    let importedLetterhead = null;
    if (parsed?.letterhead?.bytesBase64) {
      const bytes = base64ToBytes(parsed.letterhead.bytesBase64);
      const check = validateImageFileBytes(bytes, parsed.letterhead.mime);
      if (!check.ok) throw new Error("Зображення бланка у JSON не пройшло перевірку.");
      const dims = await decodeImageDimensions(bytes, check.mime);
      importedLetterhead = {
        bytes,
        mime: check.mime,
        width: dims.width,
        height: dims.height,
        name: String(parsed.letterhead.name || "letterhead").slice(0, 120),
      };
    }

    state.profile = saveProfile(importedProfile);
    let persistenceWarning = "";
    if (importedLetterhead) {
      setLetterheadAsset(importedLetterhead);
      ui.rememberLetterhead.checked = true;
      try { await saveLetterheadAsset(state.letterheadAsset); }
      catch (error) {
        console.error(error);
        ui.rememberLetterhead.checked = false;
        persistenceWarning = " Профіль збережено, але зображення бланка доступне лише в цій вкладці.";
      }
    } else {
      clearLetterheadAsset();
      ui.rememberLetterhead.checked = false;
      try { await deleteLetterheadAsset(); }
      catch (error) {
        if (typeof indexedDB !== "undefined") {
          console.error(error);
          persistenceWarning = " Профіль імпортовано, але браузер не підтвердив видалення попереднього зображення бланка.";
        }
      }
    }
    populateProfileForm();
    renderStaffEditor();
    renderStaffDatalist();
    renderProfileNudge();
    updateProfileWarning();
    toast(`Налаштування імпортовано.${persistenceWarning}`);
  } catch (error) {
    console.error(error);
    toast("Не вдалося імпортувати JSON.");
  }
}

function renderCategorySelect() {
  ui.categoryFilter.replaceChildren();
  const populatedCategories = new Set(ORDER_TEMPLATES.map((template) => template.category));
  ["Усі", ...TEMPLATE_CATEGORIES.filter((category) => category !== "Універсальні" && populatedCategories.has(category))].forEach((category) => {
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
    const isActive = month.id === state.selectedMonth && !state.showAll && !clean(state.search);
    button.classList.toggle("is-active", isActive);
    button.dataset.monthId = month.id;
    button.setAttribute("aria-label", `Показати шаблони на ${month.name.toLocaleLowerCase("uk-UA")}`);
    button.setAttribute("aria-pressed", String(isActive));
    const short = document.createElement("span"); short.className = "month-short"; short.textContent = month.short;
    const full = document.createElement("span"); full.className = "month-full"; full.textContent = month.name;
    button.append(short, full);
    button.addEventListener("click", () => {
      state.selectedMonth = month.id;
      state.showAll = false;
      state.search = "";
      ui.search.value = "";
      renderCatalog();
      ui.monthNav.querySelector(`[data-month-id="${month.id}"]`)?.focus();
    });
    ui.monthNav.appendChild(button);
  });
}

function renderCatalog() {
  renderMonthNav();
  const query = clean(state.search).toLocaleLowerCase("uk-UA");
  const normalMode = !state.showAll && !query;
  const templates = ORDER_TEMPLATES.filter((t) => {
    if (t.id === "free-order") return false;
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
  el("show-all-templates").textContent = state.showAll ? "Повернутися до місяця" : "Усі готові шаблони";

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

  ui.universalSection.classList.remove("is-hidden");
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
  return card;
}

function templateSampleText(template) {
  const sampleData = Object.fromEntries((template.fields || []).map((field) => [field.id, sampleFieldValue(field)]));
  try {
    const built = template.build(sampleData);
    const points = (built.points || []).filter(Boolean).map((point, index) => `${index + 1}. ${point}`);
    return [built.preamble, points.length ? "НАКАЗУЮ:" : "", ...points].filter(Boolean).join("\n\n");
  } catch {
    return "Типове формулювання буде сформовано після заповнення обов’язкових полів.";
  }
}

function sampleFieldValue(field) {
  if (field.type === "repeatable" && Array.isArray(field.defaultItems) && field.defaultItems.length) return structuredClone(field.defaultItems);
  if (field.type === "repeatable") return field.required || Number(field.minItems) > 0
    ? [Object.fromEntries((field.fields || []).map((child) => [child.id, sampleFieldValue(child)]))]
    : [];
  if (field.default !== undefined && field.default !== "") return field.default;
  if (field.type === "date") return "2026-09-01";
  if (field.type === "number") return field.min || 1;
  if (field.type === "select") return typeof field.options?.[0] === "string" ? field.options[0] : field.options?.[0]?.value || "значення";
  if (field.id === "customTitle") return "Про організацію роботи";
  if (field.id === "preamble") return "З метою належної організації роботи закладу";
  if (field.id === "documentText") return "1. Загальні положення";
  return field.required ? `[${String(field.label || field.id).replace(/\s*\*$/, "")}]` : "";
}

function selectTemplate(t) {
  state.template = t;
  state.savedOrderId = "";
  state.formData = defaultFormData(t);
  state.orderMeta = { orderDate: todayIso(), orderNumber: "", recordSeries: t.recordSeries };
  state.editorDirty = false;
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
  const isFreeOrder = state.template.id === "free-order";
  ui.autoTextTitle.textContent = isFreeOrder ? "Структура наказу вже готова" : "Стандартний текст уже підготовлено";
  ui.autoTextDescription.textContent = isFreeOrder
    ? "Введіть заголовок, преамбулу та доручення. Нумерація, оформлення строків і пункт контролю формуються автоматично."
    : "Заповнюйте лише змінні дані. Типові формулювання формуються автоматично.";
  ui.templateNotice.replaceChildren();
  const noticeText = [state.template.notice, state.template.legalReview?.source].filter(Boolean).join(" Перевірено в сервісі: ");
  if (noticeText) ui.templateNotice.append(document.createTextNode(noticeText));
  if (state.template.legalReview?.sourceUrl) {
    const link = document.createElement("a");
    link.href = state.template.legalReview.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "text-link";
    link.textContent = " Відкрити офіційний акт";
    ui.templateNotice.appendChild(link);
  }
  ui.templateNotice.classList.toggle("is-hidden", !noticeText && !state.template.legalReview?.sourceUrl);
  renderEditorBadges();
  renderTemplateSample();
  renderOrderForm();
  renderEditorValidation();
  updateProfileWarning();
  if (ui.saveOrderButton) ui.saveOrderButton.textContent = state.savedOrderId ? "Зберегти зміни" : "Зберегти наказ";
}

function renderTemplateSample() {
  if (!ui.templateSamplePanel || !ui.templateSampleText || !state.template) return;
  ui.templateSamplePanel.open = false;
  ui.templateSampleText.textContent = templateSampleText(state.template);
}

function renderEditorBadges() {
  ui.editorBadges.replaceChildren();
  const items = [
    state.template.frequency,
    `Серія: ${state.orderMeta.recordSeries || state.template.recordSeries || "Основна діяльність"}`,
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
  primary.appendChild(createSimpleInput({ id: "orderDate", label: "Дата наказу *", type: "date", required: true }, state.orderMeta, (v) => { state.orderMeta.orderDate = v; markEditorDirty(); }));
  const numberField = createSimpleInput({ id: "orderNumber", label: "Номер наказу *", type: "text", maxlength: 40, placeholder: "наприклад: 125-о", help: registrationNumberHelp() }, state.orderMeta, (v) => { state.orderMeta.orderNumber = v; markEditorDirty(); });
  const suggest = document.createElement("button"); suggest.type = "button"; suggest.className = "text-button number-suggestion"; suggest.textContent = `Запропонувати ${suggestNextOrderNumber()}`;
  suggest.addEventListener("click", () => { state.orderMeta.orderNumber = suggestNextOrderNumber(); renderOrderForm(); markEditorDirty(); ui.form.querySelector('[name="orderNumber"]')?.focus(); });
  const numberWrap = document.createElement("div"); numberWrap.className = "field-with-action"; numberWrap.append(numberField, suggest);
  primary.appendChild(numberWrap);
  primary.appendChild(createSimpleInput({ id: "recordSeries", label: "Серія реєстрації *", type: "select", required: true, options: RECORD_SERIES_OPTIONS, help: "Звірте з локальною інструкцією та номенклатурою справ закладу." }, state.orderMeta, (v) => { state.orderMeta.recordSeries = v; renderEditorBadges(); markEditorDirty(); }));
  ui.form.appendChild(primary);

  const regular = state.template.fields.filter((field) => !field.advanced && !field.collapsed);
  const prepared = state.template.fields.filter((field) => !field.advanced && field.collapsed);
  const advanced = state.template.fields.filter((field) => field.advanced);
  regular.forEach((field) => ui.form.appendChild(createField(field, state.formData)));

  if (prepared.length) {
    const details = document.createElement("details");
    details.className = "prepared-order";
    const summary = document.createElement("summary");
    summary.textContent = state.template.preparedSummary || `Типові налаштування вже заповнено (${prepared.length}) — змінити за потреби`;
    const body = document.createElement("div");
    body.className = "prepared-order-body";
    prepared.forEach((field) => body.appendChild(createField(field, state.formData)));
    details.append(summary, body);
    ui.form.appendChild(details);
  }

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
  return createSimpleInput(field, target, (value) => { target[field.id] = value; markEditorDirty(); });
}

function createSimpleInput(field, target, onChange) {
  const label = document.createElement("label"); label.className = "field"; label.dataset.fieldId = field.id;
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
  if (field.min !== undefined) input.min = String(field.min);
  if (field.max !== undefined) input.max = String(field.max);
  if (field.placeholder) input.placeholder = field.placeholder;
  const eventName = field.type === "select" ? "change" : "input";
  input.addEventListener(eventName, () => {
    label.classList.remove("has-error");
    label.querySelectorAll(".field-error").forEach((node) => node.remove());
    onChange(input.value);
  });
  label.append(caption, input);
  if (field.help) { const small = document.createElement("small"); small.textContent = field.help; label.appendChild(small); }
  return label;
}

function registrationNumberHelp() {
  const year = String(state.orderMeta.orderDate || todayIso()).slice(0, 4);
  const count = registrationStats(state.savedOrders, state.orderMeta, state.template?.recordSeries);
  return count ? `У локальній бібліотеці за ${year} рік у цій серії: ${count}. Підказка є довідковою, звіртеся з журналом реєстрації.` : "У локальній бібліотеці ще немає номерів цієї серії за обраний рік.";
}

function suggestNextOrderNumber() {
  return suggestOrderNumber(state.savedOrders, state.orderMeta, state.template?.recordSeries);
}

function createRepeatable(field, target) {
  if (!Array.isArray(target[field.id])) target[field.id] = [];
  const wrapper = document.createElement("div"); wrapper.className = "repeatable";
  if (field.simple) wrapper.classList.add("is-simple-repeatable");
  wrapper.dataset.repeatableId = field.id;
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
    markEditorDirty();
    const firstVisibleField = field.fields.find((item) => !item.advanced) || field.fields[0];
    const newInputs = ui.form.querySelectorAll(`[name="${firstVisibleField?.id || ""}"]`);
    newInputs[newInputs.length - 1]?.focus();
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
      markEditorDirty();
      ui.form.querySelector(`[data-repeatable-id="${field.id}"] .repeatable-head button`)?.focus();
    });
    const grid = document.createElement("div"); grid.className = "repeatable-item-grid";
    const visibleFields = field.fields.filter((sub) => !sub.advanced);
    const advancedFields = field.fields.filter((sub) => sub.advanced);
    visibleFields.forEach((sub) => grid.appendChild(createSimpleInput(sub, row, (value) => { row[sub.id] = value; markEditorDirty(); })));
    item.append(itemNumber, remove, grid);
    if (advancedFields.length) {
      const details = document.createElement("details"); details.className = "repeatable-item-advanced";
      const summary = document.createElement("summary"); summary.textContent = Number(row.level) > 0 ? "Підпункт налаштовано" : "Зробити підпунктом";
      const advancedGrid = document.createElement("div"); advancedGrid.className = "repeatable-item-grid";
      advancedFields.forEach((sub) => advancedGrid.appendChild(createSimpleInput(sub, row, (value) => { row[sub.id] = value; markEditorDirty(); })));
      details.append(summary, advancedGrid); item.appendChild(details);
    }
    items.appendChild(item);
  });
  wrapper.appendChild(items);
  return wrapper;
}

function defaultFormData(t) {
  const data = {};
  for (const field of t.fields) {
    if (field.type === "repeatable") {
      data[field.id] = Array.isArray(field.defaultItems) && field.defaultItems.length
        ? structuredClone(field.defaultItems)
        : Array.from({ length: field.minItems || 0 }, () => blankRow(field.fields));
    }
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

function openPreview(requestedAction = "") {
  if (!state.template) return;
  state.modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderPreview();
  const report = runValidation({ technical: requestedAction === "download" || requestedAction === "print" });
  renderValidation(report);
  ui.previewModal.classList.remove("is-hidden");
  ui.previewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  el("close-preview")?.focus();
  if (requestedAction === "download" || requestedAction === "print") {
    toast(report.hasErrors ? "Виправте помилки у перевірці." : "Перегляньте документ і підтвердьте дію внизу вікна.");
  }
}

function closePreview() {
  if (ui.previewModal.classList.contains("is-hidden")) return;
  ui.previewModal.classList.add("is-hidden");
  ui.previewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  const target = state.modalReturnFocus;
  state.modalReturnFocus = null;
  if (target?.isConnected) target.focus();
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
  if (model.letterheadMode === "standard") {
    appendPreviewText(ui.preview, model.institutionName || "Назва закладу", "institution", !model.institutionName);
    if (model.edrpou) appendPreviewText(ui.preview, `Код ЄДРПОУ ${model.edrpou}`, "institution-code");
  }
  appendPreviewText(ui.preview, "НАКАЗ", "order-word");

  const meta = document.createElement("div"); meta.className = "date-number";
  const d = document.createElement("span"); d.textContent = model.orderDate ? formatDateUa(model.orderDate) : "дата"; if (!model.orderDate) d.className = "placeholder";
  const place = document.createElement("span"); place.textContent = model.location || "місце"; if (!model.location) place.className = "placeholder";
  const n = document.createElement("span"); n.textContent = model.orderNumber ? `№ ${model.orderNumber}` : "№ ____";
  if (model.placeLayout === "separate") {
    meta.append(d, n); ui.preview.appendChild(meta);
    appendPreviewText(ui.preview, place.textContent, `order-place${!model.location ? " placeholder" : ""}`);
  } else {
    meta.append(d, place, n); ui.preview.appendChild(meta);
  }

  appendPreviewText(ui.preview, model.title || "Про …", "order-title", !model.title);
  const preambleParagraphs = model.preambleParagraphs?.length ? model.preambleParagraphs : [model.preamble || "Преамбула / підстава"];
  preambleParagraphs.forEach((paragraph) => appendPreviewText(ui.preview, paragraph, "preamble", !model.preamble));
  appendPreviewText(ui.preview, "НАКАЗУЮ:", "order-command");
  const flatDirectives = model.directives?.length
    ? flattenDirectives(model.directives)
    : model.points.map((text) => ({ executor: "", text, deadline: null, level: 0 }));
  appendPreviewBodyTables(ui.preview, model.bodyTables, 0);
  if (flatDirectives.length) flatDirectives.forEach((directive, index) => {
    const number = previewDirectiveNumber(flatDirectives, index);
    appendPreviewText(ui.preview, `${number} ${directiveText(directive)}`, `order-point level-${Math.min(2, directive.level || 0)}`);
    if (directive.deadline?.value) appendPreviewText(ui.preview, directiveDeadlineText(directive.deadline), "order-deadline");
    appendPreviewBodyTables(ui.preview, model.bodyTables, index + 1);
  });
  else appendPreviewText(ui.preview, "1. Пункт наказу", "order-point placeholder");
  if (model.grounds) appendPreviewText(ui.preview, `Підстава: ${model.grounds}`, "grounds");

  const sig = document.createElement("div"); sig.className = "signature";
  const pos = document.createElement("span"); pos.textContent = model.signerPosition || "Посада"; if (!model.signerPosition) pos.className = "placeholder";
  const name = document.createElement("span"); name.textContent = model.signerName || "ПІБ"; if (!model.signerName) name.className = "placeholder";
  sig.append(pos, name); ui.preview.appendChild(sig);

  if (model.acknowledgements?.length) {
    const block = document.createElement("section"); block.className = "acknowledgements";
    appendPreviewText(block, "З наказом ознайомлені:", "acknowledgements-title");
    model.acknowledgements.forEach((row) => appendPreviewText(block, `_________________   ${row.name || "Власне ім’я ПРІЗВИЩЕ"}   ${row.date ? formatDateUa(row.date) : "«___» __________ 20__ р."}`, "acknowledgement-row"));
    ui.preview.appendChild(block);
  }

  (model.attachments || []).forEach((attachment, index) => {
    const section = document.createElement("section"); section.className = "preview-attachment";
    const dateNumber = `${model.orderDate ? formatDateUa(model.orderDate) : "___"} № ${model.orderNumber || "___"}`;
    const institution = model.institutionName || "Назва закладу";
    if (attachment.kind === "approved") {
      appendPreviewText(section, `ЗАТВЕРДЖЕНО\nНаказ ${institution}\n${dateNumber}`, "appendix-reference approved-reference");
    } else {
      appendPreviewText(section, `Додаток ${index + 1}\nдо наказу ${institution}\n${dateNumber}`, "appendix-reference");
    }
    appendPreviewText(section, attachment.title || `Додаток ${index + 1}`, "appendix-title");
    if (attachment.note) appendPreviewText(section, attachment.note, "preamble");
    (attachment.paragraphs || []).forEach((paragraph) => appendPreviewText(section, paragraph, "preamble"));
    if (attachment.columns?.length && attachment.rows?.length) {
      const table = document.createElement("table"); table.className = "appendix-table";
      const thead = document.createElement("thead"); const headRow = document.createElement("tr");
      attachment.columns.forEach((column) => { const th = document.createElement("th"); th.textContent = column; headRow.appendChild(th); });
      thead.appendChild(headRow); table.appendChild(thead);
      const tbody = document.createElement("tbody");
      attachment.rows.forEach((row) => { const tr = document.createElement("tr"); attachment.columns.forEach((_, cellIndex) => { const td = document.createElement("td"); td.textContent = row[cellIndex] || ""; tr.appendChild(td); }); tbody.appendChild(tr); });
      table.appendChild(tbody); section.appendChild(table);
    }
    ui.preview.appendChild(section);
  });
  requestAnimationFrame(updatePreviewScale);
}

function previewDirectiveNumber(items, targetIndex) {
  const counters = [0, 0, 0];
  for (let index = 0; index <= targetIndex; index += 1) {
    const level = Math.min(2, Math.max(0, Number(items[index].level) || 0));
    counters[level] += 1;
    for (let deeper = level + 1; deeper < counters.length; deeper += 1) counters[deeper] = 0;
  }
  const level = Math.min(2, Math.max(0, Number(items[targetIndex].level) || 0));
  return `${counters.slice(0, level + 1).join(".")}.`;
}

function appendPreviewBodyTables(parent, tables, afterDirective) {
  (tables || []).filter((table) => Number(table.afterDirective || 0) === afterDirective).forEach((bodyTable) => {
    if (bodyTable.title) appendPreviewText(parent, bodyTable.title, "body-table-title");
    const table = document.createElement("table"); table.className = "appendix-table body-table";
    const thead = document.createElement("thead"); const headRow = document.createElement("tr");
    bodyTable.columns.forEach((column) => { const th = document.createElement("th"); th.textContent = column; headRow.appendChild(th); });
    thead.appendChild(headRow); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    bodyTable.rows.forEach((row) => { const tr = document.createElement("tr"); bodyTable.columns.forEach((_, cellIndex) => { const td = document.createElement("td"); td.textContent = row[cellIndex] || ""; tr.appendChild(td); }); tbody.appendChild(tr); });
    table.appendChild(tbody); parent.appendChild(table);
  });
}

function updatePreviewScale() {
  const stage = ui.preview?.parentElement;
  if (!stage || !ui.preview) return;
  const available = Math.max(280, stage.clientWidth - 20);
  const naturalWidth = 794;
  const scale = window.matchMedia("(max-width: 700px)").matches ? Math.min(1, available / naturalWidth) : 1;
  ui.preview.style.setProperty("--preview-scale", String(scale));
}

function appendPreviewText(parent, textValue, className, placeholder = false) {
  const p = document.createElement("p");
  p.className = className;
  if (placeholder) p.classList.add("placeholder");
  p.textContent = textValue;
  parent.appendChild(p);
}

function runValidation({ technical = false } = {}) {
  let model;
  try { model = currentModel(); }
  catch (error) {
    return { results: [{ level: "error", title: "Не вдалося сформувати наказ", detail: String(error.message || error) }], hasErrors: true };
  }

  const report = validateOrder({ template: state.template, rawData: state.formData, model, profile: state.profile, letterheadAsset: state.letterheadAsset });
  const results = report.results.filter((r) => r.level !== "ok");

  const duplicate = findDuplicateRegistration(model);
  if (duplicate) results.push({ level: "warn", title: "Можливий дублікат номера наказу", detail: `У локальній бібліотеці вже є № ${model.orderNumber} у цій серії за ${model.orderDate.slice(0, 4)} рік. Звірте журнал реєстрації.`, fieldId: "orderNumber", affectsReadiness: true });

  if (state.template.needsVerification) {
    results.unshift({ level: "warn", title: "Потрібна перевірка актуальної нормативної підстави", detail: state.template.notice || "Перевірте чинні правила на дату видання наказу." });
  }

  let technicalResult = null;
  if (technical) {
    technicalResult = verifyGeneratedDocx(model, state.letterheadAsset);
    if (!technicalResult.ok) {
      console.error("DOCX verification errors:", technicalResult.errors);
      results.push({ level: "error", title: "Файл DOCX не пройшов внутрішню перевірку", detail: technicalResult.errors.join(" ") || "Експорт заблоковано. Не використовуйте сформований документ." });
    }
  }

  return { results, hasErrors: report.hasErrors || Boolean(technicalResult && !technicalResult.ok), technical: technicalResult };
}

function findDuplicateRegistration(model) {
  return findDuplicateOrderNumber(state.savedOrders, model, state.savedOrderId, state.template.recordSeries);
}

function renderEditorValidation() {
  if (!ui.editorValidationBar || !state.template) return;
  ui.form.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
  ui.form.querySelectorAll(".field-error").forEach((node) => node.remove());
  if (!state.editorDirty && !state.savedOrderId) {
    ui.editorValidationBar.replaceChildren();
    ui.editorValidationBar.classList.add("is-hidden");
    return;
  }
  const report = runValidation();
  const actionable = report.results.filter((result) => result.level === "error" || result.affectsReadiness === true);
  ui.editorValidationBar.replaceChildren();
  ui.editorValidationBar.classList.toggle("is-hidden", actionable.length === 0);
  if (!actionable.length) return;
  const summary = document.createElement("strong"); summary.textContent = `Потрібно перевірити: ${actionable.length}`; ui.editorValidationBar.appendChild(summary);
  const list = document.createElement("div"); list.className = "editor-validation-links";
  actionable.forEach((result) => {
    const target = result.fieldId ? ui.form.querySelector(`[name="${CSS.escape(result.fieldId)}"]`) : null;
    if (target) {
      const field = target.closest(".field"); field?.classList.add("has-error");
      if (result.level === "error" && field && !field.querySelector(".field-error")) {
        const error = document.createElement("small"); error.className = "field-error"; error.textContent = result.title; field.appendChild(error);
      }
    }
    const button = document.createElement("button"); button.type = "button"; button.className = "inline-link"; button.textContent = result.title;
    button.addEventListener("click", () => focusValidationTarget(result)); list.appendChild(button);
  });
  ui.editorValidationBar.appendChild(list);
}

function focusValidationTarget(result) {
  if (!result?.fieldId) return;
  const target = ui.form.querySelector(`[name="${CSS.escape(result.fieldId)}"]`);
  if (!target) return;
  if (!ui.previewModal.classList.contains("is-hidden")) closePreview();
  let details = target.closest("details");
  while (details) {
    details.open = true;
    details = details.parentElement?.closest("details");
  }
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus({ preventScroll: true });
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
    row.append(icon, body);
    if (r.fieldId) { row.tabIndex = 0; row.setAttribute("role", "button"); row.addEventListener("click", () => focusValidationTarget(r)); row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focusValidationTarget(r); } }); }
    ui.validationResults.appendChild(row);
  });
  el("modal-download").disabled = report.hasErrors;
  el("modal-print").disabled = report.hasErrors;
}

function attemptDownload() {
  if (!state.template) return;
  if (ui.previewModal.classList.contains("is-hidden")) { openPreview("download"); return; }
  if (state.schemaErrors.length) { toast("Експорт заблоковано внутрішньою перевіркою шаблонів."); return; }
  const report = runValidation({ technical: true });
  if (report.hasErrors) {
    renderPreview();
    renderValidation(report);
    openPreview("download");
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
  if (ui.previewModal.classList.contains("is-hidden")) { openPreview("print"); return; }
  const report = runValidation({ technical: true });
  if (report.hasErrors) {
    renderPreview();
    renderValidation(report);
    openPreview("print");
    toast("Друк доступний після заповнення обов’язкових полів.");
    return;
  }
  renderPreview();
  preparePrintRoot();
  requestAnimationFrame(() => window.print());
}

function preparePrintRoot() {
  if (!ui.printRoot) return;
  ui.printRoot.replaceChildren();
  const clone = ui.preview.cloneNode(true);
  clone.id = "print-document";
  clone.style.removeProperty("--preview-scale");
  clone.style.zoom = "1";
  ui.printRoot.appendChild(clone);
  ui.printRoot.setAttribute("aria-hidden", "false");
}

function clearPrintRoot() {
  if (!ui.printRoot) return;
  ui.printRoot.replaceChildren();
  ui.printRoot.setAttribute("aria-hidden", "true");
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
      const buttons = ui.staffEditor.querySelectorAll(".staff-remove");
      buttons[Math.min(index, buttons.length - 1)]?.focus();
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
    const value = [clean(row.position), clean(row.name)].filter(Boolean).join(" ");
    if (!value) return;
    const option = document.createElement("option"); option.value = value; option.label = "Відредагуйте формулювання у потрібному відмінку"; ui.staffSuggestions.appendChild(option);
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
    const button = document.createElement("button"); button.type = "button"; button.className = "inline-link"; button.textContent = "Відкрити налаштування"; button.addEventListener("click", () => { if (confirmLeaveEditor()) setView("profile"); });
    ui.profileWarning.append(text, button);
  }
}

function renderProfileNudge() {
  const complete = Boolean(state.profile.institutionName && state.profile.location && state.profile.signerName);
  ui.profileNudge.classList.toggle("is-hidden", complete);
}

function modeLabel(mode) {
  return mode === "preprinted" ? "Друк на затвердженому готовому бланку" : mode === "image" ? "Затверджений фірмовий бланк" : "Текстова шапка (не офіційний бланк)";
}

function markEditorDirty() {
  state.editorDirty = true;
  window.clearTimeout(state.previewRefreshTimer);
  state.previewRefreshTimer = window.setTimeout(() => {
    refreshPreviewIfOpen();
    renderEditorValidation();
  }, 250);
  window.clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = window.setTimeout(saveSessionDraft, 350);
}

function confirmLeaveEditor() {
  const editorVisible = !ui.editorView.classList.contains("is-hidden") && el("view-orders")?.classList.contains("is-active");
  if (!editorVisible || !state.editorDirty) return true;
  if (!confirm("Є незбережені зміни в наказі. Вийти без збереження?")) return false;
  state.editorDirty = false;
  clearSessionDraft();
  return true;
}

function saveSessionDraft() {
  if (!state.template || !state.editorDirty) return;
  try {
    sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify({
      version: 1,
      templateId: state.template.id,
      formData: state.formData,
      orderMeta: state.orderMeta,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Session draft was not saved", error);
  }
}

function clearSessionDraft() {
  window.clearTimeout(state.draftSaveTimer);
  try { sessionStorage.removeItem(SESSION_DRAFT_KEY); } catch { /* storage may be unavailable */ }
}

function restoreSessionDraft() {
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem(SESSION_DRAFT_KEY) || "null"); } catch { clearSessionDraft(); return; }
  const template = ORDER_TEMPLATES.find((item) => item.id === draft?.templateId);
  if (!template || draft?.version !== 1) { clearSessionDraft(); return; }
  if (!confirm(`Знайдено незавершену робочу чернетку від ${formatDateTimeUa(draft.updatedAt)}. Відновити її?`)) { clearSessionDraft(); return; }
  state.template = template;
  state.savedOrderId = "";
  state.formData = { ...defaultFormData(template), ...cloneJson(draft.formData || {}) };
  state.orderMeta = { orderDate: todayIso(), orderNumber: "", recordSeries: template.recordSeries, ...cloneJson(draft.orderMeta || {}) };
  state.editorDirty = true;
  renderEditor();
  ui.catalogView.classList.add("is-hidden");
  ui.editorView.classList.remove("is-hidden");
  setView("orders");
  toast("Робочу чернетку відновлено.");
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
function toast(message, duration = 2600) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  ui.toast.classList.toggle("is-persistent", duration <= 0);
  ui.toast.title = duration <= 0 ? "Натисніть, щоб закрити" : "";
  ui.toast.onclick = duration <= 0 ? () => { ui.toast.classList.remove("is-visible", "is-persistent"); ui.toast.onclick = null; } : null;
  clearTimeout(toastTimer);
  if (duration > 0) toastTimer = setTimeout(() => ui.toast.classList.remove("is-visible"), duration);
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
