# Vazirmatn fonts (bundled locally — MV3 CSP forbids remote fonts)

Place these three files in this folder:

- Vazirmatn-Regular.woff2
- Vazirmatn-Medium.woff2
- Vazirmatn-Bold.woff2

Download (OFL license) from the official repository:
https://github.com/rastikerdar/vazirmatn/releases
(inside the release zip: `fonts/webfonts/*.woff2`)

The CSS in `styles/styles.css` already declares the matching
`@font-face` rules. Until the files are added, the UI gracefully
falls back to Tahoma / Segoe UI — the extension works either way.
