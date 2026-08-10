# Architecture — MVP 1.3

## User flow

`Month/category -> Template -> Variable data -> Preview -> Save locally / DOCX / Print`

Additional flows:

`Saved orders -> Edit / Copy / Delete`

`School profile -> Export JSON -> Move to another computer -> Import JSON`

## UI principles

- catalog content appears above secondary controls;
- months + category share one compact filter bar on wide screens;
- universal templates are separated from the monthly cyclogram;
- no permanent A4 preview;
- high-contrast system typography, restrained navy/gray palette, minimal shadows and decoration;
- controls are designed around ~44 px touch/click targets;
- mobile layout collapses to one column without hiding core actions.

## Files

- `index.html` — catalog, saved orders, editor, profile and preview modal.
- `styles.css` — responsive high-contrast UI and A4 print styles.
- `js/templates.js` — template catalog, month metadata, standard phrases and field schemas.
- `js/app.js` — navigation, editor, local order library, JSON backup UI and preview orchestration.
- `js/core.js` — order model, validation, XML escaping and filename sanitation.
- `js/docx.js` — local OOXML/DOCX generation and structural verification.
- `js/storage.js` — profile, letterhead and explicit local saved-order storage.
- `js/image.js` — PNG/JPEG byte validation.
- `tools/build-browser-bundles.mjs` — creates classic bundles for `file://` compatibility.

## Stored order model

A saved order stores the template id, form data, date/number, status and timestamps. It does not store a server id or cloud reference.

Saved orders are intended as an editable local working library, not as a legally authoritative archive. The signed/registered paper document remains outside this MVP.

## Storage strategy

- profile: `localStorage`;
- letterhead image: IndexedDB, explicit opt-in;
- saved orders: IndexedDB with a localStorage fallback if IndexedDB is unavailable;
- no automatic order saving;
- maximum local working set is capped in code.

## Backup strategy

School settings and saved orders are exported separately:

- school settings JSON: institutional data, staff directory and optionally the graphical letterhead;
- saved-orders JSON: order source data and therefore potentially personal data.

This separation prevents a routine school-settings transfer from silently including order contents.
