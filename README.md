# Nano Motion

Nano Motion is a fictional premium-activewear storefront built for a consent and advertising-measurement interview demo. It is a static website: there is no build step, backend, real authentication, payment processing, or fulfilment.

The storefront includes:

- a homepage, account creation and sign-in;
- five category pages and 15 unique products;
- a persistent browser-only basket;
- a fictional checkout and order-confirmation journey;
- a custom demo consent manager with Consent Mode defaults;
- a consent-gated Google Tag Manager loader;
- `dataLayer` events for the requested OpenAI Ads measurement journey;
- a visible event console and full demo reset on every page.

## Start here

Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md). It explains, in beginner-friendly detail, how to run the site, rehearse the journey, add your GTM container, configure the OpenAI tag, test consent, and publish to GitHub Pages.

For the exact data contract, see [gtm/DATA_LAYER_CONTRACT.md](gtm/DATA_LAYER_CONTRACT.md).

## Run locally

From this folder, run:

```powershell
py -m http.server 8000
```

If `py` is unavailable but `python` works, use:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Do not double-click `index.html` for the final rehearsal. A local web server more accurately matches GitHub Pages and is required for reliable GTM Preview behaviour.

## Important configuration

Open `config.js` and replace `GTM-XXXXXXX` with the Web container ID shown in Google Tag Manager:

```js
window.NANO_MOTION_CONFIG = {
  gtmContainerId: "GTM-ABC1234",
  currency: "GBP",
  locale: "en-GB",
  demoMode: true
};
```

Until you replace the placeholder, no GTM network request is made. The local event console continues to show and validate the event contract.

## Demo limitations

- The consent UI is an intentionally transparent interview-demo implementation, not a certified production CMP.
- The site never stores the password field.
- Contact and delivery form values are never included in measurement payloads.
- The OpenAI vendor tag must be configured in GTM using the template, snippet, pixel ID, and endpoint documentation supplied with your advertiser account. A public official OpenAI browser-pixel specification was not available when this demo was built, so the repository does not invent one.
- GitHub Pages is suitable here because this is a learning/demo site with no actual transactions.

