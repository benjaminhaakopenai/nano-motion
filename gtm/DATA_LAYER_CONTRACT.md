# Nano Motion data-layer contract

This document is the interface between the storefront and Google Tag Manager. Every measurement event is pushed only when the visitor has granted the demo's measurement category.

## Event envelope

Every eligible event has these shared fields:

```json
{
  "event": "items_added",
  "event_name": "items_added",
  "event_id": "EVT-[generated]",
  "event_timestamp": "2026-08-11T12:00:00.000Z",
  "event_source": "nano_motion_website"
}
```

`event` is the field GTM uses to match a Custom Event trigger. `event_name` is a duplicate provided for tags that need the name as a variable. `event_id` can be used for deduplication if the vendor integration supports it.

## Events

| Event | When it happens | Commerce fields |
|---|---|---|
| `page_viewed` | Every page load after consent, and immediately after consent is first granted | Page metadata only |
| `registration_completed` | The demo account-creation form succeeds | No personal data; includes `registration_method` and `account_type` |
| `contents_viewed` | A product page is displayed | Includes product identity and value |
| `items_added` | An item is added from a product page or its basket quantity is increased | Yes |
| `checkout_started` | “Proceed to checkout” is selected | Yes, plus an `items` array |
| `order_created` | The completed-order page is displayed for a new demo order | Yes, plus an `items` array |

## Required commerce fields

The following six fields are at the root of `items_added`, `checkout_started`, and `order_created`:

| Field | Type | Example | Meaning |
|---|---:|---|---|
| `id` | string | `NM-RUN-001` | Product ID for add-to-basket; generated checkout/order ID for funnel events |
| `name` | string | `Aero Knit Runner` | Product, checkout, or order name |
| `content_type` | string | `product` | Constant in this catalogue |
| `quantity` | number | `2` | Units added or total units in the checkout/order |
| `amount` | number | `296` | Line amount for add-to-basket; order total for checkout/order |
| `currency` | string | `GBP` | ISO 4217 currency code |

## Complete examples

### `items_added`

```json
{
  "event": "items_added",
  "event_name": "items_added",
  "event_id": "EVT-[generated]",
  "event_timestamp": "2026-08-11T12:00:00.000Z",
  "event_source": "nano_motion_website",
  "id": "NM-RUN-001",
  "name": "Aero Knit Runner",
  "content_type": "product",
  "quantity": 2,
  "amount": 296,
  "currency": "GBP",
  "items": [
    {
      "id": "NM-RUN-001",
      "name": "Aero Knit Runner",
      "quantity": 2,
      "item_price": 148,
      "size": "UK 4",
      "color": "Oat / Ember"
    }
  ]
}
```

### `checkout_started`

```json
{
  "event": "checkout_started",
  "event_name": "checkout_started",
  "event_id": "EVT-[generated]",
  "event_timestamp": "2026-08-11T12:05:00.000Z",
  "event_source": "nano_motion_website",
  "id": "NM-CHK-[generated]",
  "name": "Nano Motion checkout",
  "content_type": "product",
  "quantity": 3,
  "amount": 392,
  "currency": "GBP",
  "items": [
    { "id": "NM-RUN-001", "name": "Aero Knit Runner", "quantity": 2, "item_price": 148 },
    { "id": "NM-TRN-002", "name": "Sculpt 7/8 Tight", "quantity": 1, "item_price": 96 }
  ]
}
```

### `order_created`

The same commerce structure is used, with a generated `NM-ORDER-…` ID and the name `Nano Motion order`.

## Consent behaviour

1. `assets/js/bootstrap.js` creates `window.dataLayer` and sets `ad_storage`, `analytics_storage`, `ad_user_data`, and `ad_personalization` to `denied` before GTM loads for a new visitor.
2. `assets/js/app.js` records an attempted `page_viewed` locally as `blocked`; it does not push that event to `dataLayer`.
3. When measurement is accepted, all four consent values are updated to `granted` on the current page.
4. The current page's `page_viewed` event is pushed immediately. On a product or order-complete page, the relevant content/order event follows.
5. A saved choice is applied before GTM on subsequent pages.

This is deliberate double protection: the application does not dispatch a denied event, and the GTM tag should also require the appropriate consent checks.

## Personal-data rule

Do not map the demo email, password, contact name, address, postcode, or payment display values into any tag. The current contract does not include them.

