# IPv4 ↔ Decimal

A small React tool for converting dotted IPv4 addresses to unsigned decimal integers and back. Both inputs are editable; changing one updates the other. Copy either value or its decimal browser URL.

The interface uses Tailwind CSS, with teal actions, square corners, and a responsive layout. Conversion happens in the browser. There is no backend, analytics, or external font loading.

Light and dark modes follow your system preference until you choose a mode with the button beside the title. Your choice is saved on this device and works offline. The theme is applied before the app loads to avoid a flash of the wrong background.

## Development

Use Node.js 24.15+ or 26+. Node.js 22.22.2+ is also supported.

```sh
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run Vitest conversion, component, clipboard, and offline tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Check the TypeScript source |
| `npm run build` | Type-check, build the app, and generate the offline cache |
| `npm run preview` | Serve the production build locally |

## Offline use

The production service worker caches the HTML, generated JavaScript and CSS, and the icon. Once the footer says “Available offline,” the converter can be reopened without a connection.

`npm run build` generates `dist/sw.js` from `scripts/service-worker.template.js`. Cache revisions are derived from the built files and worker template. Each update installs its complete cache before replacing the old version. Failed installation keeps the previous working cache. External links and unrelated requests are not cached.

The development server does not register the worker. To check offline support, run `npm run build` followed by `npm run preview`, visit the page online, wait for the offline-ready note, and then disconnect or use the browser’s offline mode.

## Deployment

Run `npm ci` and `npm run build`, then host `dist/` on HTTPS. The build uses relative asset paths and supports hosting under a subdirectory. Generated output is ignored by Git; source files and `package-lock.json` are tracked.

## Structure

- `src/App.tsx`: converter state and page layout
- `src/components/`: input fields, copy controls, and SVG icons
- `src/hooks/`: clipboard feedback and offline readiness
- `src/utils/`: typed conversion, clipboard, and worker-registration functions
- `src/styles.css`: Tailwind theme and base styles
- `public/`: static assets
- `scripts/`: production cache generation and worker template
- `test/`: service-worker and cache-generation tests

## Accepted values

- IPv4: four decimal octets between 0 and 255. Leading zeros are rejected to avoid browser octal parsing.
- Decimal: a whole number from 0 to 4,294,967,295. Surrounding whitespace is ignored, and leading zeros are removed on blur or Enter.

Decimal URLs include `http://`. Browsers may display the address in dotted notation again. An address displays a website only if a reachable server is running there.

See the [WHATWG URL standard](https://url.spec.whatwg.org/#concept-ipv4-parser) for numeric IPv4 host parsing.
