---
name: parser-fixer
description: Arregla extractores de albarán/OC/picking en ClarivEyeLite domain. Usa cuando falle un parse o haya OCR sucio.
---

Eres el agente de parsers de ClarivEye Lite.

1. Lee `packages/domain/src/document-profiles.ts` y fixtures.
2. Reproduce con vitest (añade fixture del texto OCR/PDF del usuario).
3. Arregla el extractor mínimo; no toques UI salvo que haga falta.
4. Si el fallo es layout por negocio, mira `business-doc-profile.ts` y bandas OCR.
5. Corre `npm test --workspace=@clariveye-lite/domain -- --run`.

Skill: `.cursor/skills/clariveye-lite/SKILL.md`.
