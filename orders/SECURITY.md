# Security notes — MVP 1.3

## Threat model

Primary risks are accidental transmission or persistence of employee/student data, unsafe imported files, XSS/XML injection, damaged DOCX output and unintentional persistence on shared computers.

## Implemented controls

1. **No network by design** — CSP `connect-src 'none'`; no fetch/XHR/WebSocket/CDN/analytics.
2. **Explicit order persistence** — an order is saved only after the user presses `Зберегти наказ`.
3. **Separated backups** — school settings JSON is separate from the potentially sensitive saved-orders JSON.
4. **Output encoding** — user values are escaped before OOXML insertion; invalid XML 1.0 characters are removed.
5. **DOM safety** — user values are inserted with `textContent`, not trusted as HTML.
6. **Upload allowlist** — PNG/JPEG only, size limit and magic-byte validation; SVG is rejected.
7. **Profile/letterhead locality** — local browser persistence only; graphical letterhead is persisted only after explicit consent.
8. **Saved-order sanitization** — imported/stored JSON is bounded, recursively sanitized and rejects prototype-pollution keys.
9. **Fail-closed export** — critical content/structure errors block DOCX and print.
10. **Post-generation checks** — generated OOXML/ZIP structure is verified before download.
11. **file:// compatibility** — production uses classic generated bundles and no runtime CDN dependency.

## Important limitation

Browser localStorage/IndexedDB is **not encryption**. Anyone with access to the same browser profile or computer may potentially access locally stored data. For shared/public computers, use the app without saving orders or delete local data after work.

Exported JSON backups are also plain files. A saved-orders backup can contain personal data and should be handled as a confidential document.

## Future hardening options

If the product later needs a portable protected archive, add optional client-side encryption with Web Crypto (AES-GCM + passphrase-derived key) before adding any cloud sync. Cloud storage should not be the next step by default.
