# PW-CONTENT-01 — decisions of record

| Id | Date | Decision | Evidence / constraint as restated |
|---|---|---|---|
| D-C1 | 2026-09-06 | **One resolved locale per request.** `resolveUserLanguage` is the only normaliser of the stored preference; every authenticated layout seeds `LanguageProvider` with it; a seeded provider never lets localStorage win; every formatter and the html stamp share one tag table (`resolveLocale`). | Step 0 C6–C8: two sources that never met, 61 hand-rolled normalisations, en-US vs en-GB. Guards demonstrated red on committed probes. |
