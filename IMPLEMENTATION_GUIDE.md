# Nano Motion: complete implementation and interview guide

This is the start-to-finish guide for the fictional Nano Motion activewear demo. It assumes you understand advertising technology but may be new to websites and Google Tag Manager (GTM). Follow the sections in order.

The site is deliberately static: it needs no Node.js, database, payment provider, or paid hosting. Browser JavaScript provides the demo behaviour. No genuine customer account, payment, order, or fulfilment is created.

The OpenAI implementation in this guide follows the official [Ads Measurement Pixel documentation](https://developers.openai.com/ads/measurement-pixel) and [Supported Events reference](https://developers.openai.com/ads/supported-events). The Pixel ID used throughout is:

```text
NzhurgK4LCJv2zrCDdDyND
```

## 1. What is already built

| Requirement | Nano Motion implementation |
|---|---|
| Homepage | `index.html` |
| Sign up | `signup.html`; creates a browser-only demo account and emits `registration_completed` |
| Sign in | `signin.html`; accepts a valid-looking email and a password of at least six characters |
| Five categories | `running.html`, `training.html`, `outerwear.html`, `accessories.html`, and `yoga.html` |
| Three products per category | 15 catalogue records in `assets/js/data.js` |
| Product pages | `product.html?id=...`, rendered from one reusable template |
| Basket | `basket.html`; stored only in this browser |
| Checkout | `checkout.html`; fictional details and no payment request |
| Complete checkout | `order-complete.html`; emits `order_created` once per order |
| Consent demo | Nano Consent modal and preference centre, denied by default |
| GTM | Dynamically loaded when a real container ID is added to `config.js` |
| OpenAI events | Six supported standard events with consent gating |
| Reset | Available on every page and prominently on the confirmation page |
| Visible evidence | Event console shows blocked/dispatched attempts and their site payloads |

The six site events are:

```text
page_viewed
contents_viewed
items_added
checkout_started
order_created
registration_completed
```

## 2. Architecture in plain language

There are three layers:

1. **The website** detects actions, displays the consent interface, and pushes well-structured events into `dataLayer` only when Nano Consent permits measurement.
2. **Google Tag Manager** listens for the consent lifecycle and the six standard events. It loads, configures, and calls the OpenAI Pixel.
3. **The OpenAI Pixel SDK** applies its own native consent state and sends eligible measurement-event pings.

The intended flow is:

```text
Page starts
  -> Nano Consent establishes denied or saved consent
  -> site pushes nano_consent_bootstrapped
  -> GTM initializes the OpenAI SDK with the same native consent state
  -> visitor action produces a site event
  -> GTM consent checks and OpenAI native consent both permit or block measurement
  -> OpenAI receives the standard event only when consent is granted
```

This deliberately provides three safeguards:

1. The site does not push measurement events while Nano Consent is denied.
2. The GTM measurement tag requires the relevant Google consent types.
3. The OpenAI SDK receives `oaiq("consent", false)` before initialization when consent is denied.

Important distinction: loading the OpenAI SDK is not the same as firing a measurement event. With native consent set to `false`, the official SDK documentation says it does not send measurement-event pings. Section 18 includes an optional stricter architecture if you must make no OpenAI-domain request at all before consent.

## 3. Important files

You do not need to understand every source file before the interview. Know these:

| File | Purpose |
|---|---|
| `config.js` | Stores the GTM container ID and demo settings |
| `assets/js/bootstrap.js` | Establishes Google consent defaults before GTM, pushes the consent bootstrap event, and loads GTM |
| `assets/js/app.js` | Runs Nano Consent, account/cart/checkout behaviour, event dispatch, the event console, and reset |
| `assets/js/data.js` | Stores all product IDs, names, prices, colours, and sizes |
| `gtm/DATA_LAYER_CONTRACT.md` | Documents the raw site event contract sent to GTM |
| `assets/css/styles.css` | Controls the visual presentation |

The HTML pages all use relative paths, so the project works both at `localhost` and under a GitHub Pages project path such as `/nano-motion/`.

## 4. Run the site locally

### 4.1 Open PowerShell in the site folder

On Windows 11:

1. Open File Explorer.
2. Navigate to the `Nano Motion` folder.
3. Click the address bar.
4. Type `powershell` and press Enter.

### 4.2 Start a local web server

Run:

```powershell
py -m http.server 8000
```

If `py` is not recognised, try:

```powershell
python -m http.server 8000
```

Leave the terminal open. It is only serving static files; the site does not otherwise depend on Python. If neither command exists, install Python or use Visual Studio Code's Live Server extension.

### 4.3 Open the site

Visit:

```text
http://localhost:8000/
```

Use the `http://` address rather than double-clicking `index.html`. GTM Preview and browser network tools work more reliably from a web origin than from a `file://` URL.

### 4.4 Verify the fresh state

On a fresh visit you should see:

1. The homepage behind the Nano Consent overlay.
2. A message that measurement is blocked.
3. `Consent: denied` in the top demo rail.
4. A local `page_viewed` attempt marked `blocked - no dispatch` in the event console.

That blocked entry is generated by the site's demonstration console. It is not an OpenAI measurement call and is not pushed as a measurement event to GTM.

## 5. Rehearse the storefront before configuring GTM

With `GTM-XXXXXXX` still in `config.js`, the storefront remains fully usable. The event console reports `GTM placeholder - local contract only`, and no GTM request is made.

Run this functional check:

1. Select **Accept measurement**.
2. Open **Event console**. A new `page_viewed` entry should say `dataLayer dispatched`.
3. Open **Create account**, enter any valid-looking fictional email and a password of six or more characters, and submit.
4. Confirm `registration_completed` appears. The password is not stored, and the email is not included in the measurement event.
5. Open **Running**, then **Aero Knit Runner**. Confirm `contents_viewed`.
6. Set quantity to `2` and select **Add to basket**. Expand the `items_added` JSON.
7. Add another product so checkout contains multiple line items.
8. Open the basket and expand **Measurement payload preview**.
9. Select **Proceed to checkout** and confirm `checkout_started`.
10. Leave the fictional values in the checkout form, keep the acknowledgement checked, and select **Place demo order**.
11. On the confirmation page, confirm `order_created` and inspect its items array.
12. Select **Reset & run again**, confirm the browser prompt, and verify the consent modal returns with an empty basket.

## 6. Create and connect Google Tag Manager

Nano Motion inserts Google's normal web-container endpoints from `config.js` so the same ID works across every static page. Google's current instructions are in [Install a web container](https://support.google.com/tagmanager/answer/14847097?hl=en-GB).

### 6.1 Create the GTM container

1. Go to [Google Tag Manager](https://tagmanager.google.com/).
2. Sign in with the Google account you will use for the demo.
3. Select **Create Account** if necessary.
4. Enter an account name such as `Nano Motion Demo`.
5. Choose your country.
6. Enter a container name such as `Nano Motion Website`.
7. Select **Web** as the target platform.
8. Select **Create** and accept the terms if prompted.
9. Copy the container ID shown at the top of the workspace. It begins with `GTM-`.

Do not confuse a GTM container ID with a GA4 ID (`G-...`) or a Google Ads ID (`AW-...`).

### 6.2 Put the container ID into Nano Motion

1. Open `config.js` in a text editor.
2. Replace `GTM-XXXXXXX` with your real GTM ID.
3. Preserve the quotation marks.
4. Save the file.

Example:

```js
window.NANO_MOTION_CONFIG = {
  gtmContainerId: "GTM-ABC1234",
  currency: "GBP",
  locale: "en-GB",
  demoMode: true
};
```

5. Refresh `http://localhost:8000/`.
6. Open the Nano Motion event console. Its status should say `GTM container loaded`.

If it still reports a placeholder, verify the exact ID, save the correct file, and hard-refresh the browser.

## 7. Understand the two consent systems

### 7.1 Nano Consent and Google consent state

On every page, `assets/js/bootstrap.js` establishes these Google consent types before GTM is loaded:

```text
ad_storage
analytics_storage
ad_user_data
ad_personalization
```

They default to `denied` for a new visitor. A saved Nano Consent choice is applied before GTM on later pages. When the visitor accepts, `assets/js/app.js` updates those values to `granted` before it emits a fresh `page_viewed` event.

This follows Google's ordering principle: establish the default before measurement commands, then update it on the page where the visitor makes a choice. See Google's [Consent Mode setup guide](https://developers.google.com/tag-platform/security/guides/consent).

### 7.2 OpenAI native pixel consent

The OpenAI SDK has its own consent command:

```js
oaiq("consent", false);
oaiq("init", { pixelId: "NzhurgK4LCJv2zrCDdDyND" });

// Run after the visitor grants measurement consent.
oaiq("consent", true);
```

The important rules from the official documentation are:

- Set OpenAI consent before `init`.
- The Pixel otherwise initializes consent to `true` by default unless it finds a stored denial.
- When consent is `false`, it does not send measurement-event pings.
- Changing consent to `true` permits future events; previously blocked events are not replayed.

The GTM setup below keeps Nano Consent, Google consent, and OpenAI native consent synchronized.

### 7.3 Demo disclaimer

Nano Consent is an educational interface, not a certified consent management platform, legal opinion, IAB TCF implementation, or production recommendation. A real retailer needs an approved CMP, legal review, region-specific copy and categories, appropriate vendor disclosures, and documented retention/governance.

## 8. Understand the two event schemas

The website and the OpenAI Pixel do not use identical objects. GTM is the translation layer.

### 8.1 Raw Nano Motion dataLayer event

An `items_added` event from the site resembles:

```js
{
  event: "items_added",
  event_name: "items_added",
  event_id: "EVT-...",
  id: "NM-RUN-001",
  name: "Aero Knit Runner",
  content_type: "product",
  quantity: 2,
  amount: 296,
  currency: "GBP",
  items: [
    {
      id: "NM-RUN-001",
      name: "Aero Knit Runner",
      quantity: 2,
      item_price: 148,
      size: "8",
      color: "Volt"
    }
  ]
}
```

The website uses normal display currency units: `296` means GBP 296.00.

### 8.2 Required OpenAI event shape

OpenAI requires `amount` values to be integers in the currency's ISO 4217 minor unit. For GBP, multiply pounds by 100:

```text
148 GBP -> 14800
296 GBP -> 29600
392 GBP -> 39200
```

The equivalent OpenAI event is:

```js
oaiq("measure", "items_added", {
  type: "contents",
  amount: 29600,
  currency: "GBP",
  contents: [
    {
      id: "NM-RUN-001",
      name: "Aero Knit Runner",
      content_type: "product",
      quantity: 2,
      amount: 14800,
      currency: "GBP"
    }
  ]
}, {
  event_id: "EVT-..."
});
```

OpenAI's JavaScript Pixel supports these `contents[]` fields: `id`, `name`, `content_type`, `quantity`, `amount`, and `currency`. Nano Motion's size and colour are intentionally omitted because `variant_dict` is supported by the Conversions API, not the JavaScript Pixel.

The six mappings are:

| Site event | OpenAI data `type` | Main contents/value behaviour |
|---|---|---|
| `page_viewed` | `contents` | Page path, page title, `content_type: "page"` |
| `contents_viewed` | `contents` | Product ID/name and product value |
| `items_added` | `contents` | Added item(s), quantity, event total, currency |
| `checkout_started` | `contents` | All basket items, basket total, currency |
| `order_created` | `contents` | All purchased items, order total, currency |
| `registration_completed` | `customer_action` | No customer email or password |

## 9. Create the GTM variables

The site pushes values at the root of each event object. Create these Data Layer Variables so GTM can read them.

For every `DLV` row:

1. In GTM, open **Variables**.
2. Under **User-Defined Variables**, select **New**.
3. Select **Variable Configuration**.
4. Choose **Data Layer Variable**.
5. Enter the exact **Data Layer Variable Name** shown below.
6. Leave **Data Layer Version** as **Version 2**.
7. Give it the exact friendly name shown in the first column.
8. Save.

| GTM variable name | Data Layer Variable Name | Example |
|---|---|---|
| `DLV - nano_consent_state` | `nano_consent_state` | `granted` |
| `DLV - event_id` | `event_id` | `EVT-...` |
| `DLV - id` | `id` | `NM-RUN-001` |
| `DLV - name` | `name` | `Aero Knit Runner` |
| `DLV - content_type` | `content_type` | `product` |
| `DLV - quantity` | `quantity` | `2` |
| `DLV - amount` | `amount` | `296` |
| `DLV - currency` | `currency` | `GBP` |
| `DLV - items` | `items` | Array of item objects |
| `DLV - page_title` | `page_title` | `Nano Motion` |
| `DLV - page_path` | `page_path` | `/index.html` or `/nano-motion/` |

You do not need a Data Layer Variable for the event name. GTM's built-in `{{Event}}` variable reads the `event` key automatically. If it is not visible, select **Configure** under Built-In Variables and enable **Event**.

Now create the Pixel ID constant:

1. Under **User-Defined Variables**, select **New**.
2. Name it `CONST - OpenAI Pixel ID`.
3. Choose **Constant**.
4. Enter:

```text
NzhurgK4LCJv2zrCDdDyND
```

5. Save.

Do not create GTM variables for email, password, delivery name, address, postcode, or fictional payment fields.

## 10. Create the three GTM triggers

GTM Custom Event triggers react to the `event` value in each `dataLayer.push`. Create three triggers.

### 10.1 Consent bootstrap trigger

1. Open **Triggers** and select **New**.
2. Name it `CE - Nano Consent Bootstrapped`.
3. Select **Trigger Configuration** -> **Custom Event**.
4. Enter this exact event name:

```text
nano_consent_bootstrapped
```

5. Leave regex matching off.
6. Choose **All Custom Events**.
7. Save.

This queued event is the safe moment to create the OpenAI command queue, set native consent, and initialize the Pixel. It is pushed before the GTM script is requested, so GTM processes it when the container becomes available.

### 10.2 Consent update trigger

1. Create another Custom Event trigger.
2. Name it `CE - Nano Consent Updated`.
3. Enter:

```text
nano_consent_updated
```

4. Leave regex matching off.
5. Choose **All Custom Events** and save.

This event occurs whenever the visitor changes Nano Consent on the current page.

### 10.3 Standard measurement event trigger

1. Create another Custom Event trigger.
2. Name it `CE - OpenAI Standard Events`.
3. Enable **Use regex matching**.
4. Enter this exact expression on one line:

```regex
^(page_viewed|contents_viewed|items_added|checkout_started|order_created|registration_completed)$
```

5. Choose **All Custom Events**.
6. Save.

One regex trigger and one dynamic tag are easier to audit than six near-identical tags. They also reduce the risk that one event receives different consent checks or an outdated Pixel ID.

## 11. Create Tag 1: OpenAI SDK initialization and initial consent

### 11.1 Create the tag

1. Open **Tags** and select **New**.
2. Name it `OpenAI - SDK Init and Initial Consent`.
3. Select **Tag Configuration** -> **Custom HTML**.
4. Paste this exact code:

```html
<script>
(function (w, d, s, u) {
  if (w.oaiq) return;
  var q = function () {
    q.q.push(arguments);
  };
  q.q = [];
  w.oaiq = q;
  var js = d.createElement(s);
  js.async = true;
  js.src = u;
  var firstScript = d.getElementsByTagName(s)[0];
  firstScript.parentNode.insertBefore(js, firstScript);
})(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");

var openAIConsentGranted = "{{DLV - nano_consent_state}}" === "granted";
window.oaiq("consent", openAIConsentGranted);
window.oaiq("init", {
  pixelId: "{{CONST - OpenAI Pixel ID}}",
  debug: true
});
</script>
```

The first part is OpenAI's official asynchronous loader. The important order is `consent` first, then `init`.

Use `debug: true` while building and rehearsing. It enables SDK activity in the browser console. Change it to `false` after the configuration is proven or before treating the container as production-like.

### 11.2 Attach the trigger

Under **Triggering**, select only:

```text
CE - Nano Consent Bootstrapped
```

Do not use `All Pages` as an additional trigger. The custom bootstrap event contains the state the tag needs and avoids duplicate initialization.

### 11.3 Configure consent settings

For this initialization tag, do **not** add additional consent requirements. It has to run in the denied state so it can call OpenAI's native `consent` command before `init`.

Depending on your GTM interface, choose the equivalent of **No additional consent required**. This is not permission to measure: the tag establishes the OpenAI SDK's denied state and does not call `measure`.

Save the tag.

## 12. Create Tag 2: OpenAI consent update

### 12.1 Create the tag

1. Create a new **Custom HTML** tag.
2. Name it `OpenAI - Consent Update`.
3. Paste:

```html
<script>
if (typeof window.oaiq === "function") {
  window.oaiq(
    "consent",
    "{{DLV - nano_consent_state}}" === "granted"
  );
}
</script>
```

### 12.2 Trigger and consent settings

Attach only:

```text
CE - Nano Consent Updated
```

Again choose **No additional consent required**. This tag must be allowed to communicate both a grant and a withdrawal to the OpenAI SDK. It calls only `consent`, never `measure`.

Save the tag.

## 13. Create Tag 3: the dynamic OpenAI standard-event tag

### 13.1 Create the Custom HTML tag

1. Create another **Custom HTML** tag.
2. Name it `OpenAI - Standard Event Measurement`.
3. Paste the complete code below.

```html
<script>
(function () {
  if (typeof window.oaiq !== "function") return;

  var eventName = "{{Event}}";
  var eventId = "{{DLV - event_id}}";
  var currency = "{{DLV - currency}}" || "GBP";
  var id = "{{DLV - id}}";
  var name = "{{DLV - name}}";
  var contentType = "{{DLV - content_type}}";
  var pageTitle = "{{DLV - page_title}}";
  var pagePath = "{{DLV - page_path}}";
  var rawAmount = "{{DLV - amount}}";
  var rawQuantity = "{{DLV - quantity}}";
  var rawItems = {{DLV - items}};

  if (!Array.isArray(rawItems)) rawItems = [];

  function isUsable(value) {
    return value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "undefined";
  }

  function toMinorUnits(value) {
    if (!isUsable(value)) return null;
    var number = Number(value);
    if (!isFinite(number)) return null;
    return Math.round(number * 100);
  }

  function toInteger(value) {
    if (!isUsable(value)) return null;
    var number = Number(value);
    if (!isFinite(number)) return null;
    return Math.round(number);
  }

  function makeContent(itemId, itemName, itemType, quantity, amount, itemCurrency) {
    var content = {};

    if (isUsable(itemId)) content.id = String(itemId);
    if (isUsable(itemName)) content.name = String(itemName);
    if (isUsable(itemType)) content.content_type = String(itemType);

    var integerQuantity = toInteger(quantity);
    if (integerQuantity !== null) content.quantity = integerQuantity;

    var minorAmount = toMinorUnits(amount);
    if (minorAmount !== null) {
      content.amount = minorAmount;
      content.currency = itemCurrency || currency;
    }

    return content;
  }

  function commerceContents() {
    return rawItems.map(function (item) {
      return makeContent(
        item.id,
        item.name,
        "product",
        item.quantity,
        item.item_price,
        currency
      );
    });
  }

  var eventData;

  switch (eventName) {
    case "page_viewed":
      eventData = {
        type: "contents",
        contents: [
          makeContent(pagePath, pageTitle, "page", null, null, null)
        ]
      };
      break;

    case "contents_viewed":
      eventData = {
        type: "contents",
        amount: toMinorUnits(rawAmount),
        currency: currency,
        contents: [
          makeContent(
            id,
            name,
            contentType || "product",
            rawQuantity,
            rawAmount,
            currency
          )
        ]
      };
      break;

    case "items_added":
    case "checkout_started":
    case "order_created":
      eventData = {
        type: "contents",
        amount: toMinorUnits(rawAmount),
        currency: currency,
        contents: commerceContents()
      };
      break;

    case "registration_completed":
      eventData = {
        type: "customer_action"
      };
      break;

    default:
      return;
  }

  var options = {};
  if (isUsable(eventId)) options.event_id = eventId;

  if (
    window.NANO_MOTION_CONFIG &&
    window.NANO_MOTION_CONFIG.demoMode &&
    window.console
  ) {
    console.info("[Nano Motion -> OpenAI]", {
      event_name: eventName,
      event_data: eventData,
      options: options
    });
  }

  window.oaiq("measure", eventName, eventData, options);
})();
</script>
```

Important: the line below must remain unquoted because `DLV - items` is an array, not a text string:

```js
var rawItems = {{DLV - items}};
```

GTM may display a warning about document writing for Custom HTML. This tag does not use `document.write`; leave any document-write support option disabled.

The `console.info` block is a demo-only trace. It makes the exact object handed to `oaiq("measure", ...)` visible in DevTools, including the conversion from pounds to pence. It does not create another network event. Because it is protected by `demoMode`, it stops logging if `demoMode` is later set to `false` in `config.js`.

### 13.2 Attach the standard-event trigger

Under **Triggering**, attach only:

```text
CE - OpenAI Standard Events
```

### 13.3 Add GTM consent checks

Open the tag's **Consent Settings** and select the option equivalent to **Require additional consent for tag to fire**. Add:

```text
ad_storage
ad_user_data
ad_personalization
```

Do not add `analytics_storage` solely for this OpenAI advertising measurement tag. Nano Motion grants and denies all four demo types together, so adding it would not change this demo, but the three types above more precisely describe advertising storage, advertising user data, and advertising personalization.

These GTM checks are a second control around the `measure` call. They are not a replacement for the OpenAI SDK's native consent command.

Save the tag.

### 13.4 Final GTM object inventory

Before Preview, you should have:

| Type | Name | Trigger/Value |
|---|---|---|
| Constant variable | `CONST - OpenAI Pixel ID` | `NzhurgK4LCJv2zrCDdDyND` |
| Data Layer Variables | 11 `DLV - ...` variables | Exact names from Section 9 |
| Trigger | `CE - Nano Consent Bootstrapped` | `nano_consent_bootstrapped` |
| Trigger | `CE - Nano Consent Updated` | `nano_consent_updated` |
| Trigger | `CE - OpenAI Standard Events` | Six-event regex |
| Tag | `OpenAI - SDK Init and Initial Consent` | Consent bootstrap trigger; no added consent check |
| Tag | `OpenAI - Consent Update` | Consent update trigger; no added consent check |
| Tag | `OpenAI - Standard Event Measurement` | Standard-event trigger; three added consent checks |

There is no separate OpenAI tag for each standard event and no OpenAI `measure` tag on `All Pages`.

## 14. Verify the mapping before testing the journey

### 14.1 Confirm data types and supported fields

OpenAI requires:

- `type: "contents"` for `page_viewed`, `contents_viewed`, `items_added`, `checkout_started`, and `order_created`;
- `type: "customer_action"` for `registration_completed`;
- integer `quantity` values;
- integer monetary amounts in the currency's minor unit;
- `currency` whenever an event-level `amount` is present;
- only JavaScript Pixel-supported fields inside each `contents[]` item.

The tag code enforces these rules by converting strings/numbers, multiplying Nano Motion's fixed GBP values by 100, and building a new allowlisted `contents[]` array.

Do not pass Nano Motion's raw `items` array directly to OpenAI. It contains display-unit prices and demo variant fields that are not the correct JavaScript Pixel schema.

### 14.2 Understand `id` at event and content level

Nano Motion exposes top-level `id`, `name`, `content_type`, `quantity`, `amount`, and `currency` for easy inspection. OpenAI expects item details within `contents[]`, so the GTM tag moves those product fields there.

For multi-item events:

- top-level OpenAI `amount` and `currency` describe the whole action;
- each `contents[]` entry contains its own product ID, name, type, quantity, unit amount, and currency.

For `order_created`, the raw Nano Motion event's top-level `id` is the order ID. The individual product IDs remain in `contents[]`. OpenAI's documented `contents` data shape has no separate order-ID field, so the unique site `event_id` is passed in the fourth options argument.

### 14.3 Understand `event_id`

The site creates one `event_id` per event and the tag sends it as:

```js
{ event_id: "EVT-..." }
```

OpenAI documents `event_id` for identifying the same event sent from browser and server. Nano Motion has no Conversions API backend, but keeping the ID demonstrates a clean future deduplication path.

Do not generate a second event ID inside GTM. The browser and a future server integration must share the same ID for deduplication to work.

### 14.4 Values the OpenAI SDK handles automatically

Do not manually add fields that the browser SDK derives or manages itself. The official documentation says the SDK:

- captures `oppref` from the landing-page URL;
- stores `oppref` in a first-party `__oppref` cookie so it can be reused on later pages;
- adds the current page origin as `source_url`;
- timestamps each event; and
- batches closely grouped `measure` calls.

Therefore, do not map Nano Motion's local `event_timestamp`, `event_source`, or page location into undocumented standard-event fields. The consent decision for loading/storing these automatic browser details is also why Section 18 documents a strict no-vendor-request-before-consent alternative.

## 15. Advanced matching and demo privacy

The OpenAI Pixel can accept hashed user data during `init`, and its Automatic Advanced Matching feature can detect supported information in forms when enabled for the Pixel. For this interview demo, keep the implementation deliberately minimal:

1. Do not add a `user` object to `oaiq("init", ...)`.
2. Do not create GTM variables from the sign-up or checkout fields.
3. Do not pass raw email, raw external IDs, phone numbers, or addresses.
4. If Automatic Advanced Matching is enabled in Ads Manager for this Pixel, disable it for the demo unless showing that feature is explicitly part of the interview.
5. Use obviously fictional form values while presenting.

This makes the event demonstration easier to explain: registration produces only `{ type: "customer_action" }`, while commerce events contain product and monetary data rather than customer data.

For a real deployment, enhanced matching would require a separate privacy, consent, security, and data-governance decision. The official documentation requires supported hashes and explicitly says not to send raw email addresses or raw external IDs.

## 16. Content Security Policy, if you add one later

The current static demo does not need a new CSP merely to complete this guide. If a host or production version enforces one, merge the official OpenAI sources into the existing policy:

| Directive | Required source | Purpose |
|---|---|---|
| `script-src` | `https://bzrcdn.openai.com` | Load the Pixel SDK |
| `connect-src` | `https://bzr.openai.com` | Send events |
| `connect-src` | `https://bzrcdn.openai.com` | Fetch per-pixel configuration |
| `img-src` | `https://bzr.openai.com` | Image-request fallback |

Do not add `'unsafe-inline'` solely for the Measurement Pixel. A real nonce/hash-based CSP must also account for GTM Custom HTML and its deployment design.

## 17. Test everything with GTM Preview and browser DevTools

Do not publish the GTM container until this entire section passes.

### 17.1 Prepare the browser

1. Open Chrome or Edge.
2. Open DevTools with `F12` or `Ctrl+Shift+I`.
3. In **Console**, make sure Info messages are visible.
4. In **Network**, enable **Preserve log**.
5. Add useful Network filters one at a time:

```text
oaiq
bzrcdn.openai.com
bzr.openai.com
```

6. Keep the Nano Motion **Event console** available in the page.

The three views prove different things:

| View | What it proves |
|---|---|
| Nano Motion event console | The site attempted, blocked, or dispatched its raw event contract |
| GTM Preview / Tag Assistant | The correct GTM event, variables, tag, and consent state were processed |
| DevTools Console/Network | The mapped OpenAI call and SDK/network behaviour |

### 17.2 Connect GTM Preview

1. In GTM, select **Preview**.
2. Enter `http://localhost:8000/`.
3. Select **Connect**.
4. Wait for the site and Tag Assistant to connect.
5. Return to the site tab.
6. Select **Reset demo** and confirm.

If the reset navigation breaks the Preview connection, reconnect once after resetting and then continue.

### 17.3 Prove the denied state

With Nano Consent open and denied:

1. The site event console should show a blocked local `page_viewed` attempt.
2. In Tag Assistant, select `nano_consent_bootstrapped`.
3. Confirm `OpenAI - SDK Init and Initial Consent` fired once.
4. Confirm `DLV - nano_consent_state` equals `denied`.
5. Confirm the three Google advertising consent types are denied.
6. Confirm `OpenAI - Standard Event Measurement` did not fire.
7. Confirm there is no `[Nano Motion -> OpenAI]` console entry for `page_viewed`.
8. Confirm there is no OpenAI measurement-event request.

You may see the SDK or its per-pixel configuration load from `bzrcdn.openai.com`. That is expected in the recommended native-consent architecture. It is not a measurement-event ping. The accurate interview statement is: **the OpenAI SDK is initialized with consent denied, but the measurement tag and measurement event do not fire**.

### 17.4 Accept measurement and prove the first page view

1. Select **Accept measurement**.
2. In Tag Assistant, select `nano_consent_updated`.
3. Confirm `OpenAI - Consent Update` fired and the new state is `granted`.
4. Select the immediately following `page_viewed` event.
5. Confirm `OpenAI - Standard Event Measurement` fired.
6. In DevTools Console, expand `[Nano Motion -> OpenAI]`.
7. Confirm the event name is `page_viewed` and data type is `contents`.
8. Confirm the content has a page ID/path, page name, and `content_type: "page"`.
9. In Network/SDK debug output, confirm the event is sent without a JavaScript error.

The ordering matters: consent update first, then page view. OpenAI does not replay the page view that was blocked earlier; Nano Motion deliberately emits a fresh page view after acceptance.

### 17.5 Test registration

1. Open **Create account**.
2. Enter a fictional email and a password of at least six characters.
3. Submit.
4. Select `registration_completed` in Tag Assistant.
5. Confirm the measurement tag fired once.
6. Expand the demo console trace and confirm:

```js
{
  event_name: "registration_completed",
  event_data: { type: "customer_action" },
  options: { event_id: "EVT-..." }
}
```

7. Confirm no email or password appears in GTM Variables, the trace, or the OpenAI event data.

### 17.6 Test product content

1. Open a category, such as **Running**.
2. Open **Aero Knit Runner**.
3. Select `contents_viewed` in Tag Assistant.
4. Confirm the tag fired once.
5. Confirm the mapped content includes the product ID, name, `content_type: "product"`, and an integer amount in pence.

For a GBP 148 product, the OpenAI amount should be `14800`, not `148` and not `148.00`.

### 17.7 Test adding items

1. On Aero Knit Runner, set quantity to `2`.
2. Select **Add to basket**.
3. Select `items_added` in Tag Assistant.
4. Confirm the tag fired once.
5. First show the raw site payload in Nano Motion's event console: `quantity: 2`, `amount: 296`, `currency: "GBP"`.
6. Then show the mapped `[Nano Motion -> OpenAI]` console object.
7. Confirm the mapped event-level amount is `29600`.
8. Confirm the first `contents[]` entry includes:

```js
{
  id: "NM-RUN-001",
  name: "Aero Knit Runner",
  content_type: "product",
  quantity: 2,
  amount: 14800,
  currency: "GBP"
}
```

9. Confirm `event_id` is populated in the options object.
10. Confirm size and colour are absent from the OpenAI object.

This raw-versus-mapped comparison is a strong interview moment: the site uses human-readable pounds; GTM normalizes the payload to OpenAI's documented integer minor units.

### 17.8 Test checkout

1. Add a second product so the basket contains multiple lines.
2. Open the basket and review its payload preview.
3. Select **Proceed to checkout**.
4. Select `checkout_started` in Tag Assistant.
5. Confirm the measurement tag fired once.
6. Confirm the mapped OpenAI event has `type: "contents"`.
7. Confirm event-level amount/currency describe the basket total.
8. Confirm `contents[]` has one entry per basket line, with integer quantities and unit amounts in pence.

In the standard rehearsal, two Aero Knit Runners plus the second example product produce a raw total of `392` and an OpenAI total of `39200`.

### 17.9 Test order completion

1. Leave the fictional checkout values in place.
2. Keep the demo acknowledgement checked.
3. Select **Place demo order**.
4. On `order-complete.html`, select `order_created` in Tag Assistant.
5. Confirm the measurement tag fired once.
6. Confirm `type: "contents"`, the expected total in pence, `currency: "GBP"`, and the full `contents[]` array.
7. Confirm the options object contains a unique `event_id`.
8. Refresh the confirmation page.
9. Confirm `order_created` does not fire again for the same order.

That final refresh check demonstrates basic duplicate protection in the demo application. It is not a replacement for server-generated IDs and browser/server deduplication in production.

### 17.10 Test consent withdrawal

1. Open **Cookie settings**.
2. Select **Only essential**.
3. Confirm `nano_consent_updated` fires and `OpenAI - Consent Update` communicates `false`.
4. Navigate to another product.
5. Confirm the site's new measurement attempt is blocked.
6. Confirm the OpenAI standard-event tag and mapped console trace do not appear.
7. Re-open **Cookie settings**, accept measurement, and confirm future events resume.

This proves that the integration handles both granting and withdrawing consent, not only the happy path.

### 17.11 Test a reload with saved consent

1. With measurement granted, refresh the page.
2. Select `nano_consent_bootstrapped` in Tag Assistant.
3. Confirm the state is `granted` and SDK initialization runs once.
4. Confirm the page's `page_viewed` event fires after bootstrap.
5. Reset the demo, refresh with the fresh denied state, and confirm measurement is blocked again.

### 17.12 Inspect errors and network results

Before publishing, confirm:

- no red JavaScript error is caused by any OpenAI tag;
- the SDK loaded from `https://bzrcdn.openai.com/sdk/oaiq.min.js`;
- denied-state measurement calls are absent;
- granted events result in the expected SDK activity/request;
- the Pixel ID is `NzhurgK4LCJv2zrCDdDyND`;
- no raw password, email, address, or payment-like value appears in a measurement payload.

Network payload representations can change inside an SDK. Use the documented object passed to `oaiq("measure", ...)`, SDK debug output, response status, and Ads Manager diagnostics together rather than depending on one internal request-field layout.

### 17.13 Publish the GTM container

Only after all checks pass:

1. Select **Submit** in GTM.
2. Enter a version name such as `Nano Motion OpenAI pixel with consent v1`.
3. Add a description mentioning the Pixel ID, six standard events, native OpenAI consent, GTM consent checks, and GBP minor-unit conversion.
4. Select **Publish**.
5. Open the published container version and record its version number for your interview notes.

## 18. Optional strict architecture: no OpenAI-domain request before consent

The recommended setup above uses the OpenAI SDK's documented consent feature: initialize it with consent denied, then allow future measurements after a grant. This can load the SDK and per-pixel configuration before consent while suppressing measurement-event pings.

If an organization's policy requires **no request to an OpenAI domain at all before consent**, use a stricter design:

1. Fire the SDK initialization tag only when `nano_consent_state` equals `granted`.
2. Do not initialize the SDK on the denied bootstrap event.
3. On the grant event, load the SDK, call `oaiq("consent", true)` before `init`, and then let Nano Motion's immediately following fresh `page_viewed` event invoke measurement.
4. Keep the withdrawal tag so an already loaded SDK receives `oaiq("consent", false)`.
5. Keep all three GTM consent requirements on the measurement tag.

One way to implement this is to add a condition to the initialization trigger:

```text
Event equals nano_consent_bootstrapped
AND DLV - nano_consent_state equals granted
```

and add a second grant-only initialization trigger:

```text
Event equals nano_consent_updated
AND DLV - nano_consent_state equals granted
```

Make initialization idempotent with the existing `if (w.oaiq) return` loader guard. Test both saved-grant reloads and an in-page first grant carefully.

For this demo, the native-consent architecture in Sections 11-17 is preferable because it directly demonstrates OpenAI's documented consent API and keeps the SDK ready for the fresh post-consent page event. During the interview, use precise language: **measurement is blocked** rather than claiming that no vendor resource is loaded.

## 19. Recommended interview demonstration

Allow roughly seven to ten minutes and rehearse the clicks in advance.

### Scene 1: establish the control

1. Prepare GTM Preview, the browser Network panel, DevTools Console, and Nano Motion's event console.
2. Select **Reset demo** and confirm.
3. Say: "This clears only Nano Motion's fictional local demo state, including its consent decision."
4. Show Nano Consent as denied.
5. Show the locally blocked `page_viewed` attempt.
6. In Tag Assistant, show SDK initialization with native consent denied.
7. Show that the standard-event measurement tag and OpenAI measurement call did not fire.

Suggested explanation:

> There are three controls: the site does not dispatch the event, GTM requires advertising consent, and the OpenAI SDK is initialized with native consent set to false.

### Scene 2: grant and verify page measurement

1. Select **Accept measurement**.
2. Show `nano_consent_updated` followed by a fresh `page_viewed`.
3. Show the consent update tag and measurement tag in Tag Assistant.
4. Expand the `[Nano Motion -> OpenAI]` console object.

Suggested explanation:

> The previously blocked event is not replayed. Nano Motion emits a fresh page view after the grant, and that future event is eligible for measurement.

### Scene 3: registration and content intent

1. Open **Create account**.
2. Enter a fictional email and six-character-or-longer password.
3. Submit and show `registration_completed` with `type: "customer_action"`.
4. Point out that no email or password is in the measurement payload.
5. Open a category and a product.
6. Show `contents_viewed` with product identifiers and `type: "contents"`.

### Scene 4: basket parameters and normalization

1. On Aero Knit Runner, choose quantity `2`.
2. Add it to the basket.
3. Expand the raw `items_added` site payload: amount `296` GBP.
4. Expand the mapped OpenAI object: amount `29600`, quantity `2`, and product unit amount `14800`.
5. Point to `id`, `name`, `content_type`, `quantity`, `amount`, and `currency`.
6. Point out the unique `event_id` in the options object.
7. Add a second product to create a multi-line basket.

### Scene 5: checkout and order

1. Open the basket and its payload preview.
2. Select **Proceed to checkout**.
3. Show `checkout_started` with the full normalized `contents[]` array.
4. Complete the fictional checkout.
5. On the confirmation page, show `order_created`, its total, contents, currency, and event ID.
6. Refresh once to show that the same order does not emit again.

### Scene 6: reset

1. Select **Reset & run again**.
2. Confirm the prompt.
3. Finish on the reopened consent modal with measurement denied and an empty basket.

If time is tight, keep Scenes 1, 2, 4, 5, and 6. Those demonstrate consent, event mapping, monetary normalization, conversion completion, and repeatability.

## 20. Publish the site to GitHub Pages

GitHub Pages hosts static HTML, CSS, and JavaScript from a repository. See [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Nano Motion is a fictional learning/demo site. Keep its demo disclosures visible. GitHub's [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) do not permit using Pages as free hosting for a real online business.

### 20.1 Create a GitHub repository

1. Sign in to GitHub.
2. Use the **+** menu and choose **New repository**.
3. Name it `nano-motion`.
4. Add a description such as `Fictional activewear consent and measurement demo`.
5. Choose **Public** unless your plan supports Pages for the visibility you need.
6. Do not initialize it with a README if this local folder already has one.
7. Select **Create repository**.

### 20.2 Push the existing files

Install Git for Windows if `git --version` is not recognized. In PowerShell, from the Nano Motion folder, run each command separately. Replace `YOUR-USERNAME` first.

```powershell
git init
git add .
git commit -m "Build Nano Motion measurement demo"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nano-motion.git
git push -u origin main
```

GitHub may open a sign-in window. Complete authentication there. Never put a GitHub password or personal access token into `config.js` or another website file.

If the folder already has a remote, inspect it before adding another:

```powershell
git remote -v
```

GitHub Desktop is also suitable: add the existing repository from the local folder, publish it, then continue below.

### 20.3 Enable GitHub Pages

Follow GitHub's [publishing source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site):

1. Open the repository on GitHub.
2. Select **Settings**.
3. Under **Code and automation**, select **Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Choose `main` and `/(root)`.
6. Select **Save**.
7. Wait for the deployment to finish.
8. Return to **Settings** -> **Pages** and select **Visit site**.

The expected project URL resembles:

```text
https://YOUR-USERNAME.github.io/nano-motion/
```

The repository includes `.nojekyll`, so GitHub serves it as plain static files without Jekyll processing.

### 20.4 Retest the hosted origin

Localhost and GitHub Pages are different browser origins, with separate local storage and consent decisions. Repeat the important checks on the hosted URL:

1. Connect GTM Preview to the full GitHub Pages URL.
2. Reset the demo on that origin.
3. Test denied bootstrap, grant, `page_viewed`, `items_added`, checkout, and order.
4. Confirm the SDK is not blocked by the host or browser.
5. Check for mixed-content, CSP, JavaScript, and 404 errors.
6. Confirm product and navigation URLs retain the `/nano-motion/` project path correctly.
7. Rehearse using the same browser profile and hosted URL you will use in the interview.

## 21. Reset and browser storage behaviour

The reset control removes only Nano Motion's named demo keys:

```text
nanoMotion.consent
nanoMotion.cart
nanoMotion.user
nanoMotion.eventLog
nanoMotion.checkout
nanoMotion.order
```

It then navigates to `index.html`, which recreates the fresh denied default, opens Nano Consent, and starts with an empty basket.

The reset does not:

- clear unrelated browser data;
- sign you out of Google, GTM, GitHub, or OpenAI;
- remove data for other origins;
- delete the GTM container or published version;
- necessarily clear vendor-owned browser storage that is outside Nano Motion's named keys.

`localhost:8000`, `127.0.0.1:8000`, and the GitHub Pages URL are distinct origins. Always use one consistent URL during a rehearsal.

Choosing **Only essential** saves a denied choice so the modal does not block every page. Use **Cookie settings** to change it or **Reset demo** to restore the brand-new-visitor state.

## 22. Troubleshooting

### Nano Consent does not appear

- Select **Reset demo** and confirm.
- Make sure you are on the same origin where you previously made the choice.
- Refresh once after clearing browser site data.
- Check DevTools Console for an earlier JavaScript error.

### The event console says GTM placeholder

- Replace the complete placeholder in `config.js`.
- Confirm the ID begins with `GTM-`.
- Check quote marks and commas in `config.js`.
- Save the file and hard-refresh with `Ctrl+Shift+R`.
- In Network, check for `gtm.js?id=GTM-...`.

### GTM Preview does not connect

- Use `http://localhost:8000/`, not a `file://` URL.
- Confirm the configured container is the same container open in GTM.
- Temporarily disable an aggressive tracking blocker for this isolated demo profile.
- Allow pop-ups if Tag Assistant cannot open the site.
- Reconnect Preview after a demo reset if the navigation detached the session.

### `nano_consent_bootstrapped` is missing

- Inspect `window.dataLayer` in DevTools Console.
- Confirm `assets/js/bootstrap.js` loaded successfully in Network.
- Check that `config.js` loads before `bootstrap.js` on the page.
- Hard-refresh so the latest static files are used.

### SDK init fires but the standard measurement tag does not

- This is correct while consent is denied.
- After a grant, select the exact standard event in Tag Assistant, not the bootstrap event.
- Confirm `ad_storage`, `ad_user_data`, and `ad_personalization` are granted for that event.
- Confirm the six-event regex trigger is attached to the measurement tag.
- Confirm **Use regex matching** is enabled and the expression has no spaces or smart quotes.

### The standard event appears but GTM says the tag is blocked by consent

- Select the event and inspect its **Consent** state in Tag Assistant.
- Confirm `nano_consent_updated` occurred before the standard event.
- Check that the Nano Consent choice is `granted` in the event's Variables tab.
- Do not remove the consent checks to hide the problem; fix the ordering or state.

### The measurement tag fires but `oaiq` is undefined

- Confirm the bootstrap event occurred first.
- Confirm `OpenAI - SDK Init and Initial Consent` fired on it.
- Check for a syntax error in that tag.
- Confirm the loader URL is exactly `https://bzrcdn.openai.com/sdk/oaiq.min.js`.
- Check whether a browser extension or CSP blocked the SDK.

The loader creates the `oaiq` queue synchronously, so the measurement tag does not need to wait for the SDK download to finish; calls are queued until the SDK is ready.

### GTM reports a syntax error near `rawItems`

- Confirm the line is exactly `var rawItems = {{DLV - items}};` with no quotation marks around the GTM variable.
- Confirm you created `DLV - items` as a Version 2 Data Layer Variable named `items`.
- Copy the entire tag again if smart quotes were introduced by a rich-text editor.

### A value is undefined

- Check the **Data Layer Variable Name**, not only its friendly GTM title.
- Use Data Layer Version 2.
- Inspect the selected event in Tag Assistant; GTM Variables are event-specific.
- Compare spelling and capitalization against Section 9.
- Inspect the raw event JSON in Nano Motion's console.

Some fields are intentionally absent from some events. For example, `registration_completed` has no commerce values and `page_viewed` has no amount.

### An OpenAI amount is `296` instead of `29600`

- Use the dynamic mapping tag from Section 13 rather than passing `{{DLV - amount}}` directly.
- Confirm `toMinorUnits` multiplies by 100.
- Remember that the Nano Motion event console shows raw display units; inspect `[Nano Motion -> OpenAI]` for the mapped object.
- This conversion is correct for the demo's fixed GBP currency. Do not assume every ISO currency has two minor-unit digits in a multi-currency production store.

### An OpenAI amount is a string

- Confirm the mapped object came from `toMinorUnits`, not a directly quoted GTM variable.
- Quoted GTM variables begin as strings in Custom HTML; the helper converts them with `Number(...)` and returns an integer.
- Confirm the value in the raw data layer is numeric text or a number, not a formatted string such as `GBP 296.00`.

### The OpenAI payload includes size or colour

- Do not pass the raw Nano Motion `items` array as `contents`.
- Use `commerceContents()` from Section 13, which creates an allowlisted object.
- `variant_dict` is Conversions API-only in the current OpenAI Supported Events reference.

### `order_created` does not repeat after refresh

That is intentional. The demo marks the order as measured after a successful consented dispatch to reduce accidental duplicate conversion events. Reset and place a new fictional order to generate another event.

### `order_created` never appears

- Confirm consent is still granted at checkout completion.
- Confirm the acknowledgement checkbox is selected.
- Check whether the checkout form displayed a validation message.
- Inspect the Nano Motion event console before GTM; if the raw event is absent, the issue is in the demo journey rather than the tag.
- Reset and complete a clean order if a previous partial order state is confusing the test.

### SDK/configuration requests appear before consent

That is expected in the recommended native-consent design. The init tag fires with `oaiq("consent", false)` before `init`, so measurement-event pings are suppressed. If policy requires no OpenAI request at all, use Section 18's strict architecture and retest it.

### No OpenAI network event is visible after consent

- Make sure you are looking at a newly generated event after the grant; blocked events are not replayed.
- Clear the Network filter, then search again for `bzr`.
- Keep **Preserve log** on before navigation.
- Check the browser Console for OpenAI debug or CSP errors.
- Verify the Pixel ID constant.
- Check Ads Manager Pixel status/diagnostics if available to your account.
- Test without an extension that blocks advertising endpoints.

### GitHub Pages returns 404

- Confirm `index.html` is at the selected publishing root.
- Confirm Pages uses `main` and `/(root)`.
- Wait several minutes and inspect the Pages deployment in GitHub Actions.
- Remember that a project URL includes the repository name.
- Preserve filename capitalization because GitHub Pages paths are case-sensitive.

### Localhost works but GitHub Pages does not

- Hard-refresh the hosted page.
- Confirm the latest commit containing `config.js` was pushed.
- Inspect Network for 404s and note the exact path requested.
- Do not change working relative asset links into leading-slash paths; `/assets/...` would point at the domain root rather than `/nano-motion/assets/...`.
- Reconnect GTM Preview to the hosted URL.

## 23. What must change for a real production retailer

This project is intentionally a focused demonstration. A production implementation would need:

- a legally reviewed, production-grade CMP and region-specific consent behaviour;
- documented controller/processor roles, vendor agreements, retention, and privacy disclosures;
- a consent design covering OpenAI advanced matching if used;
- real authentication and secure server-side sessions;
- a commerce backend, inventory, tax, fulfilment, refunds, and PCI-compliant payment provider;
- server-generated order/event IDs and server-side Conversions API deduplication;
- a monetary conversion utility that understands the minor-unit exponent for every supported currency;
- production CSP, third-party allowlists, and dependency/security review;
- environment-specific GTM containers or governance, approvals, naming, and rollback processes;
- `debug: false`, reduced demo logging, and production monitoring;
- accessibility, performance, privacy, security, and cross-browser testing;
- a decision on whether vendor resources may load before consent or must be strictly blocked.

Calling out these boundaries in the interview shows that you understand the difference between a controlled measurement demonstration and production ecommerce.

## 24. Final start-to-finish checklist

### Website and local journey

- [ ] Local server runs at `http://localhost:8000/`.
- [ ] All five categories and at least three products per category work.
- [ ] Sign-up, sign-in, basket, checkout, and order confirmation work.
- [ ] Reset works from every page.
- [ ] Fresh state opens Nano Consent as denied.
- [ ] The raw event console shows all six requested events at the correct actions.

### GTM configuration

- [ ] A real `GTM-...` ID is saved in `config.js`.
- [ ] `CONST - OpenAI Pixel ID` is `NzhurgK4LCJv2zrCDdDyND`.
- [ ] All 11 Data Layer Variables are present and use Version 2.
- [ ] The three Custom Event triggers exactly match Section 10.
- [ ] The SDK init tag sets OpenAI consent before initialization.
- [ ] The consent-update tag handles grants and withdrawals.
- [ ] The measurement tag uses the six-event regex trigger.
- [ ] The measurement tag requires `ad_storage`, `ad_user_data`, and `ad_personalization`.
- [ ] Init/update consent tags have no additional consent requirement.

### OpenAI payloads

- [ ] Pixel ID is correct.
- [ ] `page_viewed` and `contents_viewed` use `type: "contents"`.
- [ ] `registration_completed` uses `type: "customer_action"`.
- [ ] Commerce events use `type: "contents"` and a `contents[]` array.
- [ ] GBP values are integers in pence (`29600`, not `296`).
- [ ] Quantities are integers.
- [ ] `currency` is included with monetary values.
- [ ] Content objects use only supported JavaScript Pixel fields.
- [ ] The site's `event_id` is sent in the fourth options object.
- [ ] No raw customer or checkout-form data is mapped.
- [ ] Automatic Advanced Matching is disabled for this minimal demo if it was enabled.

### Consent and testing

- [ ] Denied state initializes OpenAI native consent to `false`.
- [ ] Denied state produces no standard measurement tag call or measurement-event ping.
- [ ] Grant updates OpenAI native consent to `true` before a fresh page event.
- [ ] Consent withdrawal blocks future events.
- [ ] Saved granted and saved denied reloads both work.
- [ ] `items_added`, `checkout_started`, and `order_created` show correct mapped parameters.
- [ ] Refreshing order confirmation does not duplicate the same order event.
- [ ] No unexpected JavaScript, CSP, or network errors remain.
- [ ] GTM Preview passes before the container is published.

### Hosting and presentation

- [ ] GitHub Pages deploys from `main` and `/(root)`.
- [ ] The hosted journey is retested as a separate origin.
- [ ] GTM Preview connects to the final hosted URL.
- [ ] Demo disclosures remain visible.
- [ ] Browser zoom, tabs, DevTools panels, and test credentials are prepared.
- [ ] A complete reset-and-replay rehearsal fits the interview time.
- [ ] A stable GTM container version is published and its version number recorded.

## 25. Authoritative references

Use these as the source of truth if an interface or vendor capability changes:

- [OpenAI Ads Measurement Pixel](https://developers.openai.com/ads/measurement-pixel)
- [OpenAI Ads Supported Events](https://developers.openai.com/ads/supported-events)
- [Google: Install a web container](https://support.google.com/tagmanager/answer/14847097?hl=en-GB)
- [Google: Custom event trigger](https://support.google.com/tagmanager/answer/7679219?hl=en)
- [Google: Set up Consent Mode on websites](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: Consent Mode concepts](https://developers.google.com/tag-platform/security/concepts/consent-mode?hl=en)
- [GitHub: What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub: Configure a Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Vendor documentation and GTM interfaces can evolve. Before a real deployment, recheck the current official documentation, validate with the relevant account's diagnostics, and obtain appropriate privacy/legal approval.
