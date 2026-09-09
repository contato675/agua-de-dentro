# Águas de Dentro · browser and publication audit

Date: 2026-09-09

## Build

- `npm run verify`: PASS.
- Locales: ES canonical at `/`; PT-BR `/pt-br/`; FR `/fr/`; EN `/en/`.
- Static HTML pages: 25.
- Complete localized galleries: 20 routes (5 collections × 4 languages).
- Field archive: 78 Caeté-Açu photographs (30 water, 29 stone/path, 19 vegetation).
- Historical educational/exhibition archive: 54 photographs.
- Atlas of Colour: 8 entries.
- Existing field → sketchbook → painting sequences: Ponte Nova, Poço da Maternidade and Áureo.

## Browser matrix

Chrome 152 on Windows; widths 320, 390, 480, 768, 1024, 1440 and 1920 px in ES, PT-BR, FR and EN: 28 combinations.

- horizontal overflow: 0 failures;
- one H1 per tested route: PASS;
- broken loaded images: 0;
- heading viewport overflow: 0;
- controls below the 44 px project target: 0;
- four locale targets on every tested home: PASS;
- eight Atlas of Colour entries on every locale: PASS.
## Interaction checks

- mobile menu opens as a dialog and closes from its close control;
- desktop language disclosure opens and closes with Escape;
- locale switch preserves reading position on equivalent home pages;
- MAV archive loads all 13 photographs on mobile and desktop;
- EducaMais archive loads all 41 photographs on mobile and desktop.
- audiovisual references open inside an in-site modal using YouTube no-cookie embeds;
- Sound Atlas cards expose a non-interactive play affordance as a delivery preview.

## Media safety

149 public WebP derivatives were inspected with Pillow after conversion.

- EXIF findings: 0;
- GPS findings: 0;
- XMP findings: 0;
- public image payload: approximately 30.16 MiB.

Original JPEGs, source filenames, private documents and source metadata are not part of the public repository.

## Human review

Desktop/mobile home, field research, Atlas of Colour, EducaMais archive and MAV mobile gallery were visually inspected. The site keeps the same white/graphite, system-font, Müller-grid visual language as Renata Alberigi's main portfolio. This is not an Apple or WCAG certification; real-device screen-reader and gesture checks remain separate.
