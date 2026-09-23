# XUS — xus.co

Marketing site for XUS: AI agents and autonomous AI automation.

**Stack:** Astro 7 (static output) · React 19 islands · Three.js + React Three Fiber (+ Drei) · GSAP ScrollTrigger · Geist fonts (self-hosted) · Netlify.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # type-check + production build → dist/
npm run preview
```

Node 22.12 or newer.

## Where things live

| Concern | Path |
| --- | --- |
| Brand, nav, CTAs (`siteConfig`) | `src/config/site.ts` |
| SEO titles, descriptions, organization schema (`seoConfig`) | `src/config/seo.ts` |
| Contact form fields and transport (`formConfig`) | `src/config/forms.ts` |
| Services, capabilities, pricing factors, process | `src/content/services.ts` |
| Insurance use case | `src/content/insurance.ts` |
| Work demonstrations (`workItems`) | `src/content/work.ts` |
| Founders copy (`founders`) | `src/content/founders.ts` |
| About copy | `src/content/about.ts` |
| Homepage story chapters and copy | `src/content/story.ts` |
| Layout, header, footer | `src/layouts`, `src/components/layout` |
| Page sections | `src/components/sections`, `src/components/home`, `src/components/work` |
| SEO component (meta, OG, canonical, JSON-LD) | `src/components/seo/Seo.astro` |
| Form transport adapters | `src/lib/forms/submit.ts` |
| Scroll and animation scripts | `src/scripts` |
| 3D: timeline, rig, objects, scenes | `src/three` |

### Homepage film

The homepage is one scroll-driven 3D shot. `src/content/story.ts` defines the chapters. Each chapter's index is a unit of the timeline in `src/three/timeline.ts`, which holds the camera keyframes and the story envelopes (chaos, AI reveal, workflow, dusk). The whole scene is a pure function of scroll position, so it scrubs both ways. The world is built procedurally, with no model downloads:

- `objects/building.ts`: the HQ, the XUS sign and the plaza
- `objects/office.ts`, `crowd.ts`, `taskCards.ts`: the office, its instanced people and the workload
- `objects/aiCore.ts`, `workflowRing.ts`: the AI system and its eight-step workflow
- `rig/figure.ts`, `poses.ts`, `founderPair.ts`: the articulated founders, with an IK high-five
- `objects/terrace.ts`: the owner resting at dusk

The device tier (`hooks/useDeviceTier.ts`) scales crowd size, particle count, shadows and DPR. With `prefers-reduced-motion`, the camera snaps between beats instead of flying. Without WebGL, the page falls back to a static poster. All copy is plain HTML either way.

Append `?debug` to the homepage URL to expose `window.__xusStory` for visual QA.

## Contact form

The form markup never changes. Set `PUBLIC_FORM_PROVIDER` to choose the transport:

- `netlify` (default): Netlify Forms. Enable form detection in the Netlify UI.
- `function`: POSTs JSON to `netlify/functions/contact.mjs`, which forwards server-side to `CONTACT_WEBHOOK_URL`. Use this for a CRM, Zapier/Make or an email API; it keeps secrets out of the browser.
- `endpoint`: POSTs JSON directly to `PUBLIC_FORM_ENDPOINT`.

To add a new provider, add an adapter in `src/lib/forms/submit.ts`.

## Deploy (Netlify)

`netlify.toml` sets the build command, the publish directory, Node 22, caching and security headers, and a `www` → apex redirect. See `.env.example` for environment variables (`PUBLIC_BOOKING_URL` sends every "Book a call" button to a scheduler).

1. Connect the repo in Netlify. The build settings are picked up automatically.
2. Add the custom domain `xus.co` (plus `www.xus.co`) and enable HTTPS.
3. If using Netlify Forms, enable form detection.

## Content rules

- Work items are **demonstrations**, not case studies. Don't add invented clients, testimonials or metrics.
- Founder names and roles are intentionally not published.
- No prices. Pricing is scoped per business.

## Assets

`scripts/generate-assets.mjs` regenerates the OG image and icons with Playwright:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/generate-assets.mjs
```
