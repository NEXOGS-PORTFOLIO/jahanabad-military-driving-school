Certificate artwork is copied without modification from:

- `client/src/assets/certificate/badge.certificate.png`
- `client/src/assets/certificate/border.certificate.png`

These server copies allow the PDF generator to work in the standalone deployment
package, which includes `server/assets` but not the client source directory.
Keep the copies synchronized if the source artwork changes.

Bundled fonts are distributed under the SIL Open Font License. Their licenses
are included beside the fonts:

- UnifrakturMaguntia: https://github.com/google/fonts/tree/main/ofl/unifrakturmaguntia
- Lobster: https://github.com/google/fonts/tree/main/ofl/lobster
