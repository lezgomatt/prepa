# prepa

A utility for preparing static assets.

Get in on npm: `npm install -g prepa` or `yarn global add prepa`


## Features

- `prepa min` - minify your static assets (CSS, JS, SVG)
- `prepa zip` - precompress your static assets (Gzip, Brotli)
- `prepa hash` - fingerprint your static assets (for cache busting) with automatic reference fixing


## Limitations

- Image optimization is not provided (except for SVG) since it is difficult to automate:
  - resizing images based on its actual size on the page
  - use of multiple image sizes and formats (high-DPI displays, WebP with fallback)
  - greater compression (often lossy, which requires subjective judgment)

- Fixing references (after fingerprinting) is limited to the following:
  - `href`, `src`, and `srcset` attributes in HTML
  - `url` functions in CSS (inline styles are not included)

**NOTE:**
For reference fixing, the target directory is assumed to be the root.
References are detected via regular expressions. No actual parsing is done.
This may be problematic in some scenarios.
To handle the fixing yourself, use `prepa rename` to skip automatic fixing
and generate a `prepa-renames.json` file instead.


## Implementation Details

- Minification uses the following libraries:
  - [`csso`](https://github.com/css/csso) for CSS
  - [`terser`](https://github.com/terser/terser) for JS
  - [`svgo`](https://github.com/svg/svgo) for SVG

- Compression uses the built-in `zlib` module of Node.js
  (Brotli support requires Node.js v11.7.0 or later)
- Only CSS, HTML, JS, JSON, SVG, TXT, and XML files are included for compression
  (other file formats are expected to already be in a compressed format)

- Asset fingerprinting uses BLAKE2b-512 as its hash function,
  and truncates it to 16 base64 characters (96 bits)
- HTML, JSON, TXT, and XML files are all excluded from fingerprinting
