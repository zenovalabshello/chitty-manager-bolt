# Project memory

## Product intent & audience

- Chitty Manager: a management application (likely rotating savings/chit fund context based on the name), targeting mobile-first users.
- App is intended to be installable as a PWA in future; user is evaluating PWA readiness.

## Brand personality & voice

- Clean, modern, production-worthy aesthetic; avoids cookie-cutter templates.

## Visual design & UX direction

- Mobile-first visual foundation.
- Purple + neutral color theme with light and dark mode support.
- Responsive navigation.
- Uses Lucide React for icons; has a custom Logo component (design can be source for app icons).

## Decisions, constraints & rationale

- **Stack:** Vite 5, React 18, TypeScript, Tailwind CSS. Single-page app.
- **Path alias:** `@/` maps to `src/`.
- **Backend:** Supabase for database and authentication — must not be modified during PWA work.
- **PWA inspection (this turn):** No files modified, no packages installed. Inspection only.
- **Current PWA state:** No web app manifest, no service worker, no `public/` folder, no app icons. `index.html` references a missing favicon at `/vite.svg` (broken). Viewport meta tag is present.
- **Hosting:** Bolt hosting; HTTPS presumed but unconfirmed from code inspection.

## Open questions & assumptions

- **HTTPS:** Need to confirm hosting serves over HTTPS and that manifest/SW files are accessible at site root.
- **PWA approach:** Undecided whether to use `vite-plugin-pwa` (adds dependency, needs user approval) or a hand-made service worker.
- **Offline data strategy:** App reads live data from Supabase; offline writes could conflict. No offline design exists yet.
- **App icons:** Need actual icon files (192×192, 512×512, maskable variant, 180×180 Apple touch icon). Logo component design is a candidate source.
- **Global UI/design instructions** exist in `.bolt/prompt` (authoritative; not duplicated here).