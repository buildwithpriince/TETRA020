# Fonts required for the branded PDF report

Place these two font files here before running in production (they are not
bundled in this repo for licensing/size reasons — both are free/open
licenses and can be downloaded directly):

- `Fraunces-Variable.ttf` (or a static weight, e.g. `Fraunces-SemiBold.ttf`)
  — Google Fonts: https://fonts.google.com/specimen/Fraunces
- `IBMPlexMono-Regular.ttf`
  — Google Fonts: https://fonts.google.com/specimen/IBM+Plex+Mono

`pdf_builder.py` looks for:
- `app/pdf/fonts/Fraunces-SemiBold.ttf`
- `app/pdf/fonts/IBMPlexMono-Regular.ttf`

If a font file is missing, `pdf_builder.py` falls back to a generic serif
(for headings) / monospace (for numeric values) font rather than failing
report generation — but this is a genuine visual regression from the
spec's branding requirement, so treat a missing font file as a deploy
blocker, not a silently-acceptable fallback.
