# Changelog

## 1.5.0 — reliable export, records workflow and regression coverage

- Fixed false DOCX blocking when an attachment contains text beginning with `1.`.
- Moved printing into an isolated top-level print tree with recurring A4 page margins.
- Split informational warnings from checks that actually affect Ready/Draft status.
- Added approved-document marks, complete annex references, optional grounds and acknowledgement blocks.
- Made registration series explicit per template and editable for the local file plan.
- Added duplicate-number warnings and advisory next-number suggestions per year and series.
- Added inline validation, focus restoration, responsive A4 preview and session draft recovery.
- Debounced live preview updates and limited full ZIP/CRC verification to export and print.
- Corrected WordprocessingML element order, table margins and UTF-8 ZIP flags.
- Expanded Node and browser self-tests for document, storage and registration workflows.

## 1.3.0 — compact production UI + local order library

- Reworked the catalog into a compact, higher-contrast, more formal interface.
- Reduced header and catalog control height so order cards appear earlier on screen.
- Put month navigation and category selection into one responsive filter row.
- Moved universal templates to a separate section at the bottom of the catalog.
- Added a third top-level section: `Збережені`.
- Added explicit local saving of orders with Ready/Draft status.
- Added edit, copy and delete actions for saved orders.
- Copy action clears the order number and uses today's date.
- Added saved-order JSON export/import with a personal-data warning.
- Added profile JSON export/import suitable for moving to another computer.
- Profile backup can include the graphical letterhead.
- Saved-order JSON is sanitized recursively and protects against prototype-pollution keys.
- Saved orders use IndexedDB with localStorage fallback; no cloud sync was introduced.
- Kept explicit no-network CSP and local DOCX generation.

## 1.2.0 — UX/cyclogram redesign

- Removed permanent A4 preview from the main workspace; preview opens in a modal.
- Added academic-year month navigation and 26 templates.
- Added automatic standard clauses and collapsed advanced fields.
- Added a local staff directory.

## 1.1.0

- Rebuilt browser entry point as a classic JS bundle for `file://` use.
- Improved XML filtering and nested schema validation.
