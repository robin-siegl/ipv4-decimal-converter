# IPv4 ↔ Decimal

A small browser tool for converting dotted IPv4 addresses to unsigned decimal integers and back. Both inputs are editable; changing one updates the other. Each value and the decimal browser URL can be copied individually.

All conversion happens locally. The site has no runtime dependencies, analytics, or external font requests.

The service worker caches the page, styles, scripts, and icon. Once the footer says “Available offline,” the converter can be reopened and used without a connection.

## Development

Serve `dist/` with a static HTTP server on localhost or HTTPS. The JavaScript uses native ES modules.

Run the checks with:

```sh
node --test test/*.test.mjs
```

Before publishing any source changes, regenerate the offline cache:

```sh
node scripts/prepare-offline-cache.mjs
```

The script hashes every cached asset and the worker template. A new revision installs the complete updated cache before activating and removes only older caches belonging to this tool. Subsequent navigations use the new version. External links and unrelated requests are not cached. If cache installation fails, an existing working version is retained.

Edit `scripts/service-worker.template.js` to change the worker logic; `dist/sw.js` is generated and checked in for static hosting. See [Using service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) for browser lifecycle details.

## Accepted values

- IPv4: four decimal octets between 0 and 255. Leading zeros are rejected to avoid the browser's octal address parsing.
- Decimal: a whole number from 0 to 4,294,967,295. Surrounding whitespace is ignored, and leading zeros are removed when the input loses focus.

Decimal URLs use the canonical integer and include `http://`. A browser can normalize the URL back to dotted notation. An address only displays a website if a reachable server is running there.

See the [WHATWG URL standard](https://url.spec.whatwg.org/#concept-ipv4-parser) for numeric IPv4 host parsing.
