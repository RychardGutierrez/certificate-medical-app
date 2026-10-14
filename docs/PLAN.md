# Medical Certificate App — Plan

## Goal

A simple local web app for a single doctor in Bolivia. The doctor writes a medical certificate on the official Ministerio de Salud form (`docs/Certificado-MedicoMS.pdf`), then either:

- saves it locally in the browser (`localStorage`), or
- generates a PDF to print, sign and stamp.

The printed certificate must look exactly like the official form. Per DS 3174 (2017), this form is the only valid medical certificate nationwide, and it must be printed with the doctor's signature and stamp.

## Research summary

- **Official format.** DS 3174 (10 May 2017) approved this form as the only valid certificate nationwide and made it free on the Ministry website. It replaced the paid "certificado valorado". No official online generator exists. Doctors download the blank PDF and fill it by hand or in a PDF editor.
- **Similar tools.** Existing options are generic: Word/WPS templates, fillable PDFs (Carepatron), and online PDF editors (SignNow). They are not tailored to the Bolivian form, need an account or upload data to a server, and do not remember the doctor's details or past certificates.
- **Gap this app fills.** It is offline and private (no server, no upload). It uses the exact official form, pre-fills the doctor's data, and offers reusable text snippets plus a history for reprinting.
- **Integrity caution.** The 2017 debate noted that a free printable form is easy to falsify. The app must not add a digital signature or stamp image. The handwritten signature and physical stamp stay mandatory.

## Technology decision

**Astro + React islands + shadcn/ui + Tailwind CSS v4, static output.**

The user chose Astro as a learning goal, with shadcn/ui and Tailwind for the UI. shadcn officially supports Astro ([docs](https://ui.shadcn.com/docs/installation/astro)) through Astro's React integration: shadcn components are React (`.tsx`) files copied into `src/components/ui/`.

| Need | Choice | Why |
|---|---|---|
| Framework | [Astro](https://astro.build), `output: 'static'` | Pages, layouts and static parts in `.astro`. Builds to plain files in `dist/`. |
| UI components | [shadcn/ui](https://ui.shadcn.com) via `npx shadcn@latest init -t astro` | Accessible components (Button, Input, Textarea, Card, Label, Badge, Table, Tabs, Sonner toasts). Code lives in the repo and can be edited. |
| Interactivity | React islands: `<CertificateEditor client:load />` and `<HistoryTable client:load />` | Form state, live preview and storage need JavaScript. Static parts (header, layout) stay Astro with zero JS. |
| Styles | Tailwind CSS v4 + shadcn theme variables in `src/styles/global.css` | Orange primary (`#C2410C`, orange-700), zinc neutrals, Geist font, as in the approved mockups. |
| PDF generation | [pdf-lib](https://pdf-lib.js.org) via npm | Edits an existing PDF in the browser. Writes text onto the official template so the output matches it exactly. |
| PDF preview | Browser's built-in viewer in an `<iframe>` (Blob URL) | No extra library needed. |
| Storage | `localStorage` + JSON export/import | Matches the requirement. Export gives a backup because browser storage can be cleared. |
| Template loading | `public/templates/certificado-ms.pdf`, loaded with `fetch()` | The app always runs over HTTP (dev server, `astro preview`, or a static host), so no base64 embedding is needed. |
| Fonts in PDF | pdf-lib `StandardFonts.Helvetica` | Supports Spanish characters (á é í ó ú ñ ü ¿ ¡) through WinAnsi encoding. No font file needed. |

How the doctor runs it:

- **Development:** `npm run dev`, then open `http://localhost:4321`.
- **Daily use:** `npm run build`, then `npm run preview`. Or deploy `dist/` free to Netlify, Vercel or GitHub Pages. Data still stays in the doctor's browser.
- The app cannot open by double-clicking `dist/index.html`. Astro uses absolute asset paths, so it needs an HTTP server.

Concepts this project teaches:

- Astro: project structure, `.astro` components, props, layouts, slots, `public/` vs `src/`, static build.
- Astro islands: `client:load`, and when a component needs it. Without a directive, a React component renders as static HTML with no JS.
- React basics inside the islands: components, props, `useState`, `useEffect`.
- Tailwind utility classes and shadcn theming with CSS variables.
- Phase 2: PWA via `@vite-pwa/astro` (optional).

Rejected options:

- **Next.js.** Too complex for one form.
- **Plain `<script>` tags without React.** Not possible with official shadcn, which is React-based.
- **Astro-native shadcn ports (Starwind UI, Fulldev UI).** Considered. The user prefers official shadcn.
- **HTML/CSS print page instead of a PDF.** It cannot guarantee a pixel-exact match with the official form.
- **jsPDF.** It is good for drawing new PDFs but weaker at editing an existing template.

## Features

### MVP

1. **Doctor data remembered.** No separate profile screen (removed in the mockup review). The doctor's name and Matrícula are saved in `localStorage` from the last certificate and pre-filled on the next one.
2. **Certificate form.**
   - `Lugar` (default from profile, e.g. "La Paz") and `Fecha` (date picker, default today). Rendered as "La Paz, 13 de octubre de 2026".
   - `Nombres y Apellidos (del Médico)` and `Matrícula` from profile, editable.
   - Body: a large textarea for the text under "El médico que suscribe Certifica:".
3. **Body helper (optional).** Fields for patient name, CI, age and diagnosis. The rest-day fields were removed in the mockup review; the "+ Reposo médico" phrase button covers them. A button inserts a standard paragraph into the body, which stays editable. Example: "Que el/la Sr(a). … con C.I. … de … años de edad, fue atendido(a) en fecha … presentando diagnóstico de … Se indica reposo médico de … días, del … al …"
4. **Live preview.** The generated PDF shows in an iframe and refreshes 500 ms after typing stops.
5. **Generate PDF.** Downloads as `certificado_<paciente>_<yyyy-mm-dd>.pdf` and offers a print button.
6. **Save locally.** Saves the certificate to history in `localStorage`, as a draft or as issued.
7. **History.** Lists saved certificates (date, patient, first line of body). Each one can be opened, duplicated, reprinted or deleted.
8. **Overflow control.** A character/line counter. The body text wraps to the box width and shrinks from 11 pt to a minimum of 9 pt. If it still does not fit, the app warns and blocks PDF generation.

### Phase 2

- Snippet library: saved phrases such as "Se indica reposo de 3 días", with insert-on-click.
- JSON export/import of profile, history and snippets.
- "Clear all data" button, plus a warning that health data is stored in this browser.
- Installable PWA for offline use with an app icon. This needs serving over `http://localhost` or HTTPS.

## Data model (`localStorage`)

```js
// key: "mc.profile"
{ name: "Dr. Juan Pérez", matricula: "P-1234", defaultPlace: "La Paz" }

// key: "mc.certificates"
[{
  id: "uuid",
  status: "draft" | "issued",
  place: "La Paz",
  date: "2026-10-13",
  doctorName: "Dr. Juan Pérez",
  matricula: "P-1234",
  patient: { name: "", ci: "", age: null },  // optional, for history search
  body: "Que el Sr. ...",
  createdAt: "ISO", updatedAt: "ISO"
}]

// key: "mc.snippets"  (phase 2)
[{ id: "uuid", label: "Reposo 3 días", text: "..." }]

// key: "mc.version" — schema version for future migrations
```

## Project structure

```
MedicalCertificate/
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
├─ public/
│  └─ templates/certificado-ms.pdf   # copy of docs/Certificado-MedicoMS.pdf
├─ components.json                   # shadcn config
├─ src/
│  ├─ layouts/
│  │  └─ BaseLayout.astro            # <html>, <head>, global CSS
│  ├─ components/
│  │  ├─ Header.astro                # app name + nav (static, no JS)
│  │  ├─ ui/                         # shadcn components (button.tsx, input.tsx, …)
│  │  ├─ editor/
│  │  │  ├─ CertificateEditor.tsx    # island: form state, wires the parts below
│  │  │  ├─ PlaceDateCard.tsx        # lugar, fecha
│  │  │  ├─ DoctorCard.tsx           # médico, matrícula
│  │  │  ├─ BodyHelper.tsx           # patient fields, "Insertar texto"
│  │  │  ├─ BodyEditor.tsx           # textarea, phrase buttons, counter
│  │  │  ├─ ActionBar.tsx            # Generar PDF, Imprimir, Guardar, Limpiar
│  │  │  └─ PdfPreview.tsx           # <iframe> preview + print note
│  │  └─ history/
│  │     └─ HistoryTable.tsx         # island: search, filters, table, backup
│  ├─ lib/
│  │  ├─ pdf.ts         # load template, write text, wrap/shrink, save
│  │  ├─ layout.ts      # field coordinates on the template (points)
│  │  ├─ storage.ts     # localStorage CRUD + versioning + export/import
│  │  ├─ format.ts      # Spanish date formatting, filename slug
│  │  ├─ utils.ts       # shadcn cn() helper
│  │  └─ types.ts       # DoctorInfo, Certificate, Snippet
│  ├─ pages/
│  │  ├─ index.astro    # <CertificateEditor client:load />
│  │  └─ historial.astro # <HistoryTable client:load />
│  └─ styles/global.css # Tailwind + shadcn theme (orange primary)
├─ tests/               # Vitest unit tests for format.ts and wrap logic
└─ docs/
   ├─ Certificado-MedicoMS.pdf
   └─ PLAN.md
```

## Implementation steps

### Step 0. Setup and template analysis

- Inspect the template. The text extraction shows the form three times. Confirm whether it has 3 pages or 3 copies on one page. The output keeps only one page (`PDFDocument.copyPages` with page 0).
- Check whether the PDF has AcroForm fields. If it does, fill them by name. If not (more likely), use coordinates.
- Measure the box coordinates in PDF points (origin bottom-left): Lugar y Fecha, Médico, Matrícula, and the body area between the top divider and the "Firma y sello" line. Store them in `layout.ts`.
- Create the project with shadcn's Astro template: `npx shadcn@latest init -t astro` (sets up Astro, React integration, Tailwind v4 and the `@/*` path alias). Then `npm install pdf-lib` and `npm install -D vitest`.
- Add components: `npx shadcn@latest add button input textarea label card badge table tabs sonner`.
- Set the theme in `global.css`: orange primary, zinc neutrals, Geist font.
- Copy the template to `public/templates/certificado-ms.pdf`.

### Step 1. PDF engine (`pdf.ts`)

- `generateCertificate(data) -> Uint8Array`: load the template, keep page 1, draw the 3 header fields, then draw the wrapped body.
- Word-wrap uses `font.widthOfTextAtSize`, keeps the user's line breaks, and auto-shrinks the font size.
- Return `{ bytes, overflow: boolean }`.
- Test with long text, accents and `ñ`, empty fields, and a single very long word.

### Step 2. UI (`src/components/editor/*`, `index.astro`)

- Build the screens from the approved mockups: https://claude.ai/artifact/AxQGnHkJCiAZgF81qvwhjn
- `index.astro` renders `BaseLayout` + `Header` (static) and `<CertificateEditor client:load />` (island).
- `CertificateEditor` keeps the form state with `useState` and passes it to child components as props.
- Two-column layout with Tailwind: form on the left, PDF preview on the right. Stacked on narrow screens.
- Body helper panel, collapsible.
- Buttons: **Generar PDF**, **Imprimir**, **Guardar**, **Limpiar**.
- UI text in Spanish.

### Step 3. Storage (`storage.ts`)

- CRUD for doctor info and certificates. Wrap every call in try/catch, because storage can be full or disabled.
- `historial.astro` page with `<HistoryTable client:load />`: search, filters (Todos / Emitidos / Borradores), table actions, backup buttons.
- Autosave the current draft every few seconds, so work survives a closed tab.

### Step 4. Polish and phase 2

- Validation: required fields and a date that is not in the future (warning only).
- Snippets, export/import, clear data.
- Print test on real A4 and Letter paper. Confirm the text aligns with the boxes, and adjust `layout.ts`.
- Optional PWA via `@vite-pwa/astro`, for offline use and an app icon.
- `npm run build`, then deploy or run `npm run preview`.

## Testing

- Manual checklist per step, plus a print test on paper.
- Vitest unit tests for `format.ts` (Spanish dates, filename slug) and the wrap/shrink function in `pdf.ts`.
- `npm run build` must finish with no errors. `astro check` runs type checks.
- Browsers: Chrome and Edge (primary), Firefox.

## Risks

| Risk | Mitigation |
|---|---|
| Text misaligned with boxes when printed | Print at "Actual size" (no scaling). Show a note in the UI. Calibrate `layout.ts` with a paper test. |
| Body text too long | Wrap and shrink to 9 pt, then warn and block generation. |
| `localStorage` cleared or browser changed | JSON export/import. A visible note on the history panel. |
| Patient health data on a shared computer | Local only, never sent anywhere. "Clear all data" button. Recommend a personal OS account. |
| Official template changes | Replace `public/templates/certificado-ms.pdf`, recalibrate `layout.ts`. |
| Doctor finds `npm run preview` inconvenient | Deploy `dist/` to a free static host and bookmark it. |
| Misuse or falsification | No signature or stamp images. Handwritten signature and physical stamp stay required. |

## Sources

- [Decreto Supremo Nº 3174, 10 de mayo de 2017 (Lexivox)](https://www.lexivox.org/norms/BO-DS-N3174.html)
- [Certificado enfrenta a médicos con Gobierno — Correo del Sur, 2017](https://correodelsur.com/sociedad/20170513/certificado-enfrenta-a-medicos-con-gobierno.html)
- [pdf-lib](https://github.com/hopding/pdf-lib) / [pdf-lib.js.org](https://pdf-lib.js.org)
- [Astro docs](https://docs.astro.build)
- [shadcn/ui — Astro installation](https://ui.shadcn.com/docs/installation/astro)
- [Free Medical Certificate Templates — WPS](https://www.wps.com/template/free-medical-certificate-templates-download-edit/)
- [15 Medical Certificate Templates — Certifier](https://certifier.io/blog/medical-certificate-templates)
