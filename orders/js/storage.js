import { DEFAULT_PROFILE, clampNumber } from "./core.js";

const PROFILE_KEY = "school-order-constructor.profile.v2";
const DB_NAME = "school-order-constructor.local-assets.v1";
const DB_VERSION = 2;
const ASSET_STORE = "assets";
const ORDER_STORE = "orders";
const LETTERHEAD_KEY = "letterhead";
const ORDER_FALLBACK_KEY = "school-order-constructor.saved-orders.v1";
const MAX_SAVED_ORDERS = 300;

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return sanitizeProfile(JSON.parse(raw));
    const oldRaw = localStorage.getItem("school-order-constructor.profile.v1");
    if (oldRaw) return sanitizeProfile(JSON.parse(oldRaw));
    return { ...DEFAULT_PROFILE, staff: [] };
  } catch {
    return { ...DEFAULT_PROFILE, staff: [] };
  }
}

export function saveProfile(profile) {
  const safe = sanitizeProfile(profile);
  const serialized = JSON.stringify(safe);
  try {
    localStorage.setItem(PROFILE_KEY, serialized);
    if (localStorage.getItem(PROFILE_KEY) !== serialized) {
      throw new Error("Браузер не підтвердив запис профілю");
    }
  } catch (error) {
    throw storageError("Не вдалося зберегти профіль у цьому браузері", error);
  }
  return safe;
}

export function sanitizeProfile(profile = {}) {
  const mode = ["standard", "preprinted", "image"].includes(profile.letterheadMode) ? profile.letterheadMode : "standard";
  return {
    institutionName: safeString(profile.institutionName, 240),
    shortName: safeString(profile.shortName, 120),
    location: safeString(profile.location, 120),
    edrpou: safeString(profile.edrpou, 8).replace(/[^0-9]/g, ""),
    signerPosition: safeString(profile.signerPosition || "Директор", 120),
    signerName: safeString(profile.signerName, 160),
    letterheadMode: mode,
    preprintedTopMm: clampNumber(profile.preprintedTopMm, 25, 100, 55),
    letterheadWidthMm: clampNumber(profile.letterheadWidthMm, 80, 180, 170),
    staff: sanitizeStaff(profile.staff),
  };
}

export function sanitizeStaff(staff) {
  if (!Array.isArray(staff)) return [];
  return staff.slice(0, 80).map((row) => ({
    position: safeString(row?.position, 120),
    name: safeString(row?.name, 160),
  })).filter((row) => row.position || row.name);
}

export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem("school-order-constructor.profile.v1");
    if (localStorage.getItem(PROFILE_KEY) !== null || localStorage.getItem("school-order-constructor.profile.v1") !== null) {
      throw new Error("Браузер не підтвердив видалення профілю");
    }
  } catch (error) {
    throw storageError("Не вдалося видалити профіль", error);
  }
}

export async function saveLetterheadAsset(asset) {
  const db = await openDb();
  await txPromise(db, ASSET_STORE, "readwrite", (store) => store.put({ key: LETTERHEAD_KEY, ...asset }));
  db.close();
}

export async function loadLetterheadAsset() {
  const db = await openDb();
  const value = await txPromise(db, ASSET_STORE, "readonly", (store) => store.get(LETTERHEAD_KEY));
  db.close();
  if (!value) return null;
  const bytes = value.bytes instanceof Uint8Array ? value.bytes : new Uint8Array(value.bytes || []);
  return { ...value, bytes };
}

export async function deleteLetterheadAsset() {
  const db = await openDb();
  await txPromise(db, ASSET_STORE, "readwrite", (store) => store.delete(LETTERHEAD_KEY));
  db.close();
}

export function sanitizeOrderRecord(record = {}) {
  const now = new Date().toISOString();
  return {
    id: safeString(record.id, 80),
    templateId: safeString(record.templateId, 100),
    title: safeString(record.title, 260),
    category: safeString(record.category, 100),
    orderDate: safeString(record.orderDate, 20),
    orderNumber: safeString(record.orderNumber, 80),
    status: record.status === "ready" ? "ready" : "draft",
    createdAt: safeIso(record.createdAt) || now,
    updatedAt: safeIso(record.updatedAt) || now,
    formData: sanitizeJsonTree(record.formData, 0),
  };
}

export async function saveOrderRecord(record) {
  const safe = sanitizeOrderRecord(record);
  if (!safe.id || !safe.templateId) throw new Error("Некоректний запис наказу");
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.put(safe));
    db.close();
    await trimSavedOrders();
    return safe;
  } catch (indexedDbError) {
    const current = loadFallbackOrders().filter((item) => item.id !== safe.id);
    current.unshift(safe);
    try {
      const fallback = saveFallbackOrders(current);
      return fallback.evicted ? { ...safe, fallbackEvicted: fallback.evicted } : safe;
    } catch (fallbackError) {
      throw storageError("Не вдалося зберегти наказ ані в IndexedDB, ані в резервному сховищі", fallbackError, indexedDbError);
    }
  }
}

export async function listOrderRecords() {
  try {
    const db = await openDb();
    const values = await txPromise(db, ORDER_STORE, "readonly", (store) => store.getAll());
    db.close();
    const indexed = (Array.isArray(values) ? values : []).map(sanitizeOrderRecord);
    const fallback = loadFallbackOrders();
    const merged = new Map();
    [...indexed, ...fallback].forEach((item) => {
      const existing = merged.get(item.id);
      if (!existing || String(item.updatedAt) > String(existing.updatedAt)) merged.set(item.id, item);
    });
    return [...merged.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  } catch {
    return loadFallbackOrders().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
}

export async function getOrderRecord(id) {
  const safeId = safeString(id, 80);
  if (!safeId) return null;
  try {
    const db = await openDb();
    const value = await txPromise(db, ORDER_STORE, "readonly", (store) => store.get(safeId));
    db.close();
    if (value) return sanitizeOrderRecord(value);
  } catch { /* fallback below */ }
  return loadFallbackOrders().find((item) => item.id === safeId) || null;
}

export async function deleteOrderRecord(id) {
  const safeId = safeString(id, 80);
  if (!safeId) throw new Error("Некоректний ідентифікатор наказу");
  let indexedDbError = null;
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.delete(safeId));
    db.close();
  } catch (error) {
    indexedDbError = error;
  }
  try {
    saveFallbackOrders(loadFallbackOrders().filter((item) => item.id !== safeId));
  } catch (fallbackError) {
    throw storageError("Не вдалося підтвердити видалення наказу з локальних сховищ", fallbackError, indexedDbError);
  }
  if (indexedDbError && typeof indexedDB !== "undefined") {
    throw storageError("Наказ видалено з резервного сховища, але IndexedDB не підтвердила видалення", indexedDbError);
  }
}

export async function clearOrderRecords() {
  let indexedDbError = null;
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.clear());
    db.close();
  } catch (error) {
    indexedDbError = error;
  }
  try {
    localStorage.removeItem(ORDER_FALLBACK_KEY);
    if (localStorage.getItem(ORDER_FALLBACK_KEY) !== null) throw new Error("Браузер не підтвердив очищення резервного сховища");
  } catch (fallbackError) {
    throw storageError("Не вдалося очистити локальні накази", fallbackError, indexedDbError);
  }
  if (indexedDbError && typeof indexedDB !== "undefined") {
    throw storageError("Резервне сховище очищено, але IndexedDB не підтвердила очищення", indexedDbError);
  }
}

export async function importOrderRecords(records) {
  if (!Array.isArray(records)) throw new Error("Невірний формат резервної копії");
  const safeRecords = records.slice(0, MAX_SAVED_ORDERS).map(sanitizeOrderRecord).filter((x) => x.id && x.templateId);
  const existing = new Map((await listOrderRecords()).map((record) => [record.id, record]));
  const accepted = safeRecords.filter((record) => {
    const current = existing.get(record.id);
    return !current || String(record.updatedAt) > String(current.updatedAt);
  });
  if (!accepted.length) return { count: 0, evicted: 0 };
  let evicted = 0;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ORDER_STORE, "readwrite");
      const store = tx.objectStore(ORDER_STORE);
      accepted.forEach((record) => store.put(record));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
    db.close();
    await trimSavedOrders();
  } catch {
    const merged = new Map(loadFallbackOrders().map((item) => [item.id, item]));
    accepted.forEach((item) => merged.set(item.id, item));
    evicted = saveFallbackOrders([...merged.values()]).evicted;
  }
  return { count: accepted.length, evicted };
}

export async function clearAllLocalData() {
  const failures = [];
  try { clearProfile(); } catch (error) { failures.push(error); }
  try { await deleteLetterheadAsset(); } catch (error) {
    if (typeof indexedDB !== "undefined") failures.push(storageError("Не вдалося видалити зображення бланка", error));
  }
  try { await clearOrderRecords(); } catch (error) { failures.push(error); }
  if (failures.length) {
    throw new AggregateError(failures, "Не всі локальні дані вдалося видалити. Перевірте дозволи браузера та повторіть дію.");
  }
}

async function trimSavedOrders() {
  const all = await listOrderRecords();
  if (all.length <= MAX_SAVED_ORDERS) return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ORDER_STORE, "readwrite");
    const store = tx.objectStore(ORDER_STORE);
    all.slice(MAX_SAVED_ORDERS).forEach((record) => store.delete(record.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
  db.close();
}

function loadFallbackOrders() {
  try {
    const raw = localStorage.getItem(ORDER_FALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_ORDERS).map(sanitizeOrderRecord).filter((x) => x.id && x.templateId) : [];
  } catch {
    return [];
  }
}

function saveFallbackOrders(records) {
  const merged = new Map();
  records.forEach((record) => {
    if (!record?.id) return;
    const existing = merged.get(record.id);
    if (!existing || String(record.updatedAt) > String(existing.updatedAt)) merged.set(record.id, record);
  });
  const evictedByLimit = Math.max(0, merged.size - MAX_SAVED_ORDERS);
  const ordered = [...merged.values()]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, MAX_SAVED_ORDERS);

  try {
    writeFallbackOrders(ordered);
    return { saved: ordered.length, evicted: evictedByLimit };
  } catch (error) {
    if (!isQuotaExceeded(error)) throw storageError("Резервне локальне сховище недоступне", error);

    let low = 1;
    let high = ordered.length - 1;
    let best = 0;
    let bestSerialized = "";

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      try {
        bestSerialized = writeFallbackOrders(ordered.slice(0, middle));
        best = middle;
        low = middle + 1;
      } catch (candidateError) {
        if (!isQuotaExceeded(candidateError)) throw storageError("Резервне локальне сховище недоступне", candidateError);
        high = middle - 1;
      }
    }

    if (!best) {
      throw storageError("У резервному сховищі недостатньо місця навіть для одного наказу. Експортуйте поточний наказ або звільніть місце в браузері", error);
    }

    try {
      if (localStorage.getItem(ORDER_FALLBACK_KEY) !== bestSerialized) {
        throw new Error("Резервне сховище було змінено в іншій вкладці");
      }
    } catch (verificationError) {
      throw storageError("Не вдалося підтвердити запис резервної копії наказів", verificationError);
    }

    return { saved: best, evicted: evictedByLimit + ordered.length - best };
  }
}

function writeFallbackOrders(records) {
  const serialized = JSON.stringify(records);
  localStorage.setItem(ORDER_FALLBACK_KEY, serialized);
  if (localStorage.getItem(ORDER_FALLBACK_KEY) !== serialized) {
    throw new Error("Браузер не підтвердив запис резервної копії наказів");
  }
  return serialized;
}

export function isQuotaExceeded(error) {
  return Boolean(error) && (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function storageError(message, ...causes) {
  const details = causes.filter(Boolean).map((error) => error?.message || String(error)).filter(Boolean).join("; ");
  return new Error(details ? `${message}: ${details}` : message);
}

function safeString(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .trim()
    .slice(0, max);
}

function safeIso(value) {
  const text = safeString(value, 40);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function sanitizeJsonTree(value, depth) {
  if (depth > 7) return "";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeJsonTree(item, depth + 1));
  if (value && typeof value === "object") {
    const out = Object.create(null);
    Object.entries(value).slice(0, 120).forEach(([key, item]) => {
      const safeKey = safeString(key, 100);
      if (!safeKey || ["__proto__", "constructor", "prototype"].includes(safeKey)) return;
      out[safeKey] = sanitizeJsonTree(item, depth + 1);
    });
    return out;
  }
  if (typeof value === "boolean" || typeof value === "number") return value;
  return safeString(value, 5000);
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB недоступна"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("IndexedDB error"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(ORDER_STORE)) db.createObjectStore(ORDER_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function txPromise(db, storeName, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);
    let result;
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error("IndexedDB request error"));
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}
