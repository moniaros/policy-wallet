# What we transmit to AI providers

Report item, not a fix. Established by reading the code and by correlating it
with production runtime logs from the 2026-08-21 03:41Z and 03:42Z analysis
runs, which is why the per-step model names below are observed rather than
inferred.

## 1. What leaves our boundary, per analysis

A full policy analysis is **8 steps**. Four call a model; **exactly one
transmits the document**.

| # | Step | Model (observed) | Document sent? | What is sent |
|---|------|------------------|----------------|--------------|
| 1 | `document_load_and_validation` | — (`model:"none"`) | no | nothing; local fetch + checks |
| 2 | `metadata_extraction_and_verification` | `gemini-3.5-flash` | **YES** | **the whole file, base64** + prompt |
| 3 | `plain_language_translation` | `gemini-3.1-flash-lite` | no | extracted `AcordData` fields |
| 4 | `coverage_mapping` | — (`model:"none"`) | no | deterministic, local |
| 5 | `gap_detection` | `gemini-3-flash-preview` | no | `AcordData` + gap definitions (`hasDocument:false`, `hasStructuredContext:true`) |
| 6 | `savings_detection` | — (`model:"none"`) | no | deterministic, local |
| 7 | `checklist_scoring_and_actions` | — (`model:"none"`) | no | deterministic, local |
| 8 | `persistence_and_finalize` | — (`model:"none"`) | no | local writes |

**It is the whole document, not extracted text.** There is no server-side PDF
parser in this codebase — no pdf-parse, pdfjs, unpdf, poppler or mupdf. The
file is read from storage, `Buffer.from(arrayBuffer).toString("base64")`, and
handed to the model as a document part. The model does the reading.

Consequence worth stating plainly: for step 2 the provider receives **every
page of the policy**, including anything on it we never extract or display —
AMKA/AFM, addresses, beneficiaries, medical annexes.

Steps 3 and 5 send only what step 2 already extracted. So a second and third
provider call happen per analysis, but they carry structured fields, not pages.

The same is true of the **upload-time path** (`app/api/policies/extract`, which
the bulk-upload modal uses): same base64 whole-file transmission, one call.

**The file name is not sent.** `AIDocument` has no `fileName` field; all 12
provider call sites pass the constant from `providerDocumentFileName()`.

## 2. Which providers

Selected by which key is set (`lib/services/ai/ai-service.factory.ts`).
Production logs show two initialising: `serviceType:"gemini"` and
`serviceType:"openai"`. Anthropic does not initialise, so `ANTHROPIC_API_KEY`
is unset in production — the Claude arm of the failover chain is dormant.

- **Google Gemini** — primary. Every model call in the observed runs.
- **OpenAI** — configured, reachable as failover only.
- **Anthropic** — coded, not configured in production.

Failover order is Gemini → Claude → OpenAI. It is gated: sending the
**document** to a second provider additionally requires `isFullFailoverAllowed`
(`canSendFailoverData = !includesDocumentContext || failoverDataAllowed`), so a
step that carries only structured fields may fail over more freely than the one
carrying the pages. That distinction is deliberate and correctly implemented.

## 3. EU endpoint / zero-retention: **neither is configured**

This is the substantive finding of this report.

- **No regional endpoint.** All three clients are constructed with the API key
  and nothing else — `createGoogleGenerativeAI(...)`, `createAnthropic({apiKey})`,
  `createOpenAI({apiKey})`. There is no `baseURL`, no `location`, no
  `europe-west*`. Each SDK therefore uses its **default global endpoint**, which
  for Gemini's `generativelanguage.googleapis.com` means no regional pinning at
  all. Greek policyholders' documents are processed wherever the provider
  routes them.
- **No zero-retention or no-train setting.** Nothing in the codebase sets a
  ZDR header, a `no_train` flag, or any retention option. Whatever the
  account-level defaults are on the Google AI Studio / OpenAI accounts is what
  applies, and those are configured outside this repo — a Gemini **API key**
  from AI Studio has materially different default retention terms from Vertex
  AI, and this code uses the former.

Two routes exist if this needs to change, and both are outside a code fix
alone: move Gemini traffic to **Vertex AI** with an EU location (a different
SDK and auth model, plus a GCP project), or obtain zero-retention terms on the
provider accounts. Neither is a change I should make unattended.

## 4. Consent, which is the gate that does exist

`aiProcessingConsentVersion` is checked on **both** paths that reach a provider
— the deep pipeline and the upload-time extract route — and in the extract
route the check runs **before `req.formData()` is read**, so a refusal never
touches the bytes. That ordering is deliberate and load-bearing.

## 5. What this means for `/trust`

The public page should not be read as promising regional processing or
non-retention, because the code configures neither. It is accurate about
consent and about signed, short-lived document links. Worth an explicit review
against these facts before any claim about *where* documents are processed.
