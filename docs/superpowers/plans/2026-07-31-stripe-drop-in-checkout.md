# Stripe Drop-in Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure Arabic RTL single-file checkout page for Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù that opens a Stripe-hosted USD 99/month subscription Checkout for Ø§ÙØ¯ÙÙÙÙØªÙ.

**Architecture:** The deployed artifact is one dependency-free `index.html` containing semantic Arabic markup, CSS, and a public Stripe Payment Link URL. A small Node.js provisioning utility exists only for development: it creates the test Product, recurring Price, and Payment Link without storing an API key. Node's built-in test runner verifies both the Stripe request shape and the static page's security/accessibility contracts.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Node.js 22 built-in `fetch` and `node:test`, Stripe REST API `2026-07-29.dahlia`

## Global Constraints

- The only deployed file is `index.html`; no backend, database, package install, or build step is required.
- All customer-facing static-page copy is Arabic and the document uses `lang="ar"` and `dir="rtl"`.
- Seller name remains `Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù`; customer/product brand remains `Ø§ÙØ¯ÙÙÙÙØªÙ`.
- Product name is `باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ`.
- Price is exactly USD 99 (`unit_amount=9900`) every month, quantity one, with no trial.
- Checkout collects required individual name plus its normal required email field.
- Checkout uses Stripe's hosted confirmation page.
- Do not set `payment_method_types`; allow Stripe dynamic payment methods.
- Do not enable automatic tax, tax-ID collection, billing-address collection, coupons, a custom domain, or a customer portal.
- Do not store or print a secret/restricted API key. Prefer a minimally scoped restricted key supplied as `STRIPE_RESTRICTED_KEY`.
- Use Stripe API version `2026-07-29.dahlia`.
- Use Ø§ÙØ¯ÙÙÙÙØªÙ colors: blue `#066EB7`, green `#0FBA1E`, background `#F6F7FA`, text `#1A1A1A`, border `#E3E5E8`, card `#FFFFFF`.
- Maintain WCAG AA contrast, a visible keyboard focus state, a minimum 44px primary action, responsive layout without horizontal scrolling, and reduced-motion support.

## File Structure

- `index.html` — the complete deployable Arabic checkout card, embedded styling, validated Payment Link configuration, and no secrets.
- `scripts/provision-stripe-checkout.mjs` — development-only Stripe REST client that creates the test Product, recurring Price, and Payment Link from an environment-supplied key.
- `tests/provision-stripe-checkout.test.mjs` — unit tests the Stripe endpoints, API version, parameters, dynamic-payment-method omission, and secret redaction.
- `tests/index.test.mjs` — static contract tests for Arabic/RTL semantics, required copy, palette, accessibility state, URL validation, and absence of API keys.
- `package.json` — dependency-free test and local-preview commands.
- `README.md` — secure setup, Payment Link insertion, Dashboard branding, test-payment, deployment, and key-rotation instructions.

---

### Task 1: Stripe Test Resource Provisioning

**Files:**
- Create: `package.json`
- Create: `scripts/provision-stripe-checkout.mjs`
- Create: `tests/provision-stripe-checkout.test.mjs`

**Interfaces:**
- Consumes: `STRIPE_RESTRICTED_KEY` environment variable; optional `STRIPE_SECRET_KEY` fallback for test-only migration.
- Produces: `provisionStripeCheckout(apiKey, fetchImpl): Promise<{ productId: string, priceId: string, paymentLinkId: string, url: string }>` and one stdout line containing only the public `https://buy.stripe.com/...` URL when invoked as a CLI.

- [ ] **Step 1: Add the dependency-free test command and failing provisioning tests**

Create `package.json`:

```json
{
  "name": "egypt-dev-stripe-drop-in",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "preview": "python3 -m http.server 4173"
  }
}
```

Create `tests/provision-stripe-checkout.test.mjs` with a mock `fetchImpl` that records each request and returns these ordered objects:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { provisionStripeCheckout } from "../scripts/provision-stripe-checkout.mjs";

test("creates the Arabic monthly product, price, and hosted-confirmation link", async () => {
  const responses = [
    { id: "prod_test" },
    { id: "price_test" },
    { id: "plink_test", url: "https://buy.stripe.com/test_example" },
  ];
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, params: new URLSearchParams(options.body) });
    return { ok: true, json: async () => responses.shift() };
  };

  const result = await provisionStripeCheckout("rk_test_example", fetchImpl);

  assert.deepEqual(result, {
    productId: "prod_test",
    priceId: "price_test",
    paymentLinkId: "plink_test",
    url: "https://buy.stripe.com/test_example",
  });
  assert.deepEqual(requests.map(({ url }) => url), [
    "https://api.stripe.com/v1/products",
    "https://api.stripe.com/v1/prices",
    "https://api.stripe.com/v1/payment_links",
  ]);
  assert.equal(requests[0].params.get("name"), "باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ");
  assert.equal(requests[1].params.get("currency"), "usd");
  assert.equal(requests[1].params.get("unit_amount"), "9900");
  assert.equal(requests[1].params.get("recurring[interval]"), "month");
  assert.equal(requests[1].params.get("product"), "prod_test");
  assert.equal(requests[2].params.get("line_items[0][price]"), "price_test");
  assert.equal(requests[2].params.get("line_items[0][quantity]"), "1");
  assert.equal(requests[2].params.get("name_collection[individual][enabled]"), "true");
  assert.equal(requests[2].params.get("name_collection[individual][optional]"), "false");
  assert.equal(requests[2].params.get("after_completion[type]"), "hosted_confirmation");
  assert.equal(requests[2].params.get("submit_type"), "subscribe");
  assert.equal(requests[2].params.has("payment_method_types[0]"), false);
  assert.equal(requests[2].params.has("automatic_tax[enabled]"), false);
  assert.ok(requests.every(({ options }) => options.headers["Stripe-Version"] === "2026-07-29.dahlia"));
});

test("redacts Stripe API errors and rejects non-test keys", async () => {
  await assert.rejects(
    () => provisionStripeCheckout("rk_live_example", async () => assert.fail("fetch must not run")),
    /test-mode restricted or secret key/
  );

  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: "Invalid request for rk_test_example" } }),
  });
  await assert.rejects(
    () => provisionStripeCheckout("rk_test_example", fetchImpl),
    (error) => !error.message.includes("rk_test_example") && error.message.includes("Stripe request failed")
  );
});
```

- [ ] **Step 2: Run the provisioning tests and verify they fail**

Run: `npm test -- tests/provision-stripe-checkout.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/provision-stripe-checkout.mjs`.

- [ ] **Step 3: Implement the minimal Stripe provisioning module**

Create `scripts/provision-stripe-checkout.mjs` with:

```js
import { pathToFileURL } from "node:url";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2026-07-29.dahlia";

function redact(value, apiKey) {
  return String(value).split(apiKey).join("[REDACTED]");
}

async function stripePost(path, params, apiKey, idempotencyKey, fetchImpl) {
  const response = await fetchImpl(`${STRIPE_API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: new URLSearchParams(params).toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe request failed (${response.status}): ${redact(payload?.error?.message ?? "Unknown error", apiKey)}`);
  }
  return payload;
}

export async function provisionStripeCheckout(apiKey, fetchImpl = globalThis.fetch) {
  if (!/^(rk|sk)_test_/.test(apiKey ?? "")) {
    throw new Error("Provide a test-mode restricted or secret key.");
  }

  const product = await stripePost("products", {
    name: "باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ",
    description: "دعم فني شهري مستمر لفريق Ø§ÙØ¯ÙÙÙÙØªÙ مقدم من Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù",
    "metadata[service]": "edulink_monthly_technical_support",
  }, apiKey, "egypt-dev-edulink-support-product-v1", fetchImpl);

  const price = await stripePost("prices", {
    currency: "usd",
    unit_amount: "9900",
    "recurring[interval]": "month",
    product: product.id,
    "metadata[service]": "edulink_monthly_technical_support",
  }, apiKey, "egypt-dev-edulink-support-price-v1", fetchImpl);

  const paymentLink = await stripePost("payment_links", {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    "name_collection[individual][enabled]": "true",
    "name_collection[individual][optional]": "false",
    "after_completion[type]": "hosted_confirmation",
    submit_type: "subscribe",
    "metadata[service]": "edulink_monthly_technical_support",
  }, apiKey, "egypt-dev-edulink-support-payment-link-v1", fetchImpl);

  return {
    productId: product.id,
    priceId: price.id,
    paymentLinkId: paymentLink.id,
    url: paymentLink.url,
  };
}

async function main() {
  const apiKey = process.env.STRIPE_RESTRICTED_KEY ?? process.env.STRIPE_SECRET_KEY;
  const result = await provisionStripeCheckout(apiKey);
  console.log(result.url);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
```

The module must never print the key. Do not add `payment_method_types` or `automatic_tax`.

- [ ] **Step 4: Run the provisioning tests and verify they pass**

Run: `npm test -- tests/provision-stripe-checkout.test.mjs`

Expected: 2 tests PASS and 0 FAIL.

- [ ] **Step 5: Commit the provisioning utility**

```bash
git add package.json scripts/provision-stripe-checkout.mjs tests/provision-stripe-checkout.test.mjs
git commit -m "feat: add secure Stripe checkout provisioning"
```

---

### Task 2: Arabic Single-file Checkout Page

**Files:**
- Create: `index.html`
- Create: `tests/index.test.mjs`

**Interfaces:**
- Consumes: A public `https://buy.stripe.com/...` URL returned by `provisionStripeCheckout`.
- Produces: A standalone Arabic RTL `index.html` whose `STRIPE_PAYMENT_LINK` constant is the only environment-specific browser configuration.

- [ ] **Step 1: Write the failing page contract tests**

Create `tests/index.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("is an Arabic RTL subscription page with the approved copy", () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù/);
  assert.match(html, /باقة الدعم الفني الشهرية لـ <bdi>Ø§ÙØ¯ÙÙÙÙØªÙ<\/bdi>/);
  assert.match(html, /<bdi>\$99<\/bdi>/);
  assert.match(html, /شهرياً/);
  assert.match(html, /اشترك بأمان/);
  assert.match(html, /دفع آمن عبر <bdi>Stripe<\/bdi>/);
});

test("uses the approved Ø§ÙØ¯ÙÙÙÙØªÙ palette and accessibility contracts", () => {
  for (const color of ["#066EB7", "#0FBA1E", "#F6F7FA", "#1A1A1A", "#E3E5E8", "#FFFFFF"]) {
    assert.ok(html.includes(color), `missing ${color}`);
  }
  assert.match(html, /:focus-visible/);
  assert.match(html, /min-height:\s*44px/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /aria-describedby="checkout-note"/);
});

test("contains no API key and safely validates the public Payment Link", () => {
  assert.doesNotMatch(html, /\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+/);
  assert.match(html, /const STRIPE_PAYMENT_LINK = ".*";/);
  assert.match(html, /url\.protocol === "https:"/);
  assert.match(html, /url\.hostname === "buy\.stripe\.com"/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /removeAttribute\("href"\)/);
});
```

- [ ] **Step 2: Run the page tests and verify they fail**

Run: `npm test -- tests/index.test.mjs`

Expected: FAIL with `ENOENT` for `index.html`.

- [ ] **Step 3: Implement the complete single-file page**

Create `index.html` with this exact structure and behavior:

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ من Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù">
  <title>الدعم الفني الشهري | Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù</title>
  <style>
    :root {
      --blue: #066EB7;
      --green: #0FBA1E;
      --background: #F6F7FA;
      --text: #1A1A1A;
      --border: #E3E5E8;
      --card: #FFFFFF;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { color-scheme: light; }
    body {
      min-height: 100vh;
      min-height: 100svh;
      margin: 0;
      padding: clamp(1rem, 4vw, 2.5rem);
      display: grid;
      place-items: center;
      overflow-x: hidden;
      background:
        radial-gradient(circle at 85% 10%, rgba(6, 110, 183, 0.09), transparent 34rem),
        radial-gradient(circle at 10% 90%, rgba(15, 186, 30, 0.08), transparent 30rem),
        var(--background);
      color: var(--text);
      font-family: Cairo, Tahoma, Arial, sans-serif;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    main { width: min(100%, 35rem); }
    .checkout-card {
      position: relative;
      overflow: hidden;
      padding: clamp(1.5rem, 5vw, 3rem);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      box-shadow: 0 1.5rem 4rem rgba(26, 26, 26, 0.1);
    }
    .checkout-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 0.35rem;
      background: linear-gradient(90deg, var(--blue), var(--green));
    }
    .seller {
      width: fit-content;
      margin: 0 0 0.75rem;
      padding: 0.25rem 0.7rem;
      color: var(--blue);
      background: rgba(6, 110, 183, 0.08);
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.65rem, 6vw, 2.35rem);
      line-height: 1.35;
      letter-spacing: -0.025em;
    }
    .summary {
      margin: 0.85rem 0 0;
      color: #5C626B;
      font-size: 1rem;
    }
    .price {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      margin: 1.75rem 0;
      padding-block: 1.25rem;
      border-block: 1px solid var(--border);
    }
    .price strong {
      color: var(--blue);
      font-size: clamp(2.6rem, 10vw, 4rem);
      line-height: 1;
      letter-spacing: -0.05em;
    }
    .price span { color: #5C626B; font-weight: 700; }
    .assurances {
      margin: 0 0 1.75rem;
      padding: 0;
      display: grid;
      gap: 0.75rem;
      list-style: none;
      font-size: 0.95rem;
    }
    .assurances li { display: flex; align-items: flex-start; gap: 0.65rem; }
    .assurances li::before {
      content: "✓";
      flex: 0 0 auto;
      color: var(--green);
      font-weight: 800;
    }
    .checkout-button {
      min-height: 44px;
      width: 100%;
      padding: 0.9rem 1.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--card);
      background: var(--green);
      border-radius: 0.8rem;
      box-shadow: 0 0.65rem 1.5rem rgba(15, 186, 30, 0.22);
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    }
    .checkout-button[href]:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.85rem 1.8rem rgba(15, 186, 30, 0.28);
    }
    .checkout-button:focus-visible {
      outline: 3px solid var(--blue);
      outline-offset: 3px;
    }
    .checkout-button.is-disabled {
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.52;
    }
    .checkout-note {
      min-height: 1.7em;
      margin: 0.75rem 0 0;
      color: #5C626B;
      font-size: 0.82rem;
      text-align: center;
    }
    .stripe-note {
      margin: 1.25rem 0 0;
      color: #5C626B;
      font-size: 0.78rem;
      text-align: center;
    }
    bdi { unicode-bidi: isolate; }
    @media (min-width: 640px) {
      .checkout-card { padding: 3rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <main>
    <article class="checkout-card" aria-labelledby="checkout-title">
      <header>
        <p class="seller">مقدمة من <bdi>Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù</bdi></p>
        <h1 id="checkout-title">باقة الدعم الفني الشهرية لـ <bdi>Ø§ÙØ¯ÙÙÙÙØªÙ</bdi></h1>
        <p class="summary">دعم فني مستمر يساعد فريق Ø§ÙØ¯ÙÙÙÙØªÙ على معالجة المشكلات والحفاظ على استقرار العمل.</p>
      </header>
      <div class="price" aria-label="99 دولاراً أمريكياً شهرياً">
        <strong><bdi>$99</bdi></strong><span>شهرياً</span>
      </div>
      <ul class="assurances" aria-label="مزايا الاشتراك">
        <li>اشتراك شهري متجدد</li>
        <li>فاتورة وإيصال عبر البريد الإلكتروني</li>
        <li>دفع آمن عبر <bdi>Stripe</bdi></li>
      </ul>
      <a id="checkout-link" class="checkout-button is-disabled" aria-disabled="true" aria-describedby="checkout-note">
        اشترك بأمان
      </a>
      <p id="checkout-note" class="checkout-note" role="status">رابط الدفع غير مهيأ بعد.</p>
      <p class="stripe-note">سيتم تحويلك إلى صفحة دفع آمنة مستضافة من <bdi>Stripe</bdi>.</p>
    </article>
  </main>
  <script>
    const STRIPE_PAYMENT_LINK = "";
    const checkoutLink = document.querySelector("#checkout-link");
    const checkoutNote = document.querySelector("#checkout-note");

    function isValidStripePaymentLink(value) {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "buy.stripe.com" && url.pathname.length > 1;
      } catch {
        return false;
      }
    }

    if (isValidStripePaymentLink(STRIPE_PAYMENT_LINK)) {
      checkoutLink.href = STRIPE_PAYMENT_LINK;
      checkoutLink.classList.remove("is-disabled");
      checkoutLink.removeAttribute("aria-disabled");
      checkoutNote.textContent = "سيتم تجديد الاشتراك شهرياً حتى يتم إلغاؤه.";
    } else {
      checkoutLink.removeAttribute("href");
    }
  </script>
</body>
</html>
```

Keep all styles and behavior inside this file. Do not load Stripe.js or any remote font/script.

- [ ] **Step 4: Run the page tests and verify they pass**

Run: `npm test -- tests/index.test.mjs`

Expected: 3 tests PASS and 0 FAIL.

- [ ] **Step 5: Run the complete unit test suite**

Run: `npm test`

Expected: 5 tests PASS and 0 FAIL.

- [ ] **Step 6: Commit the Arabic page**

```bash
git add index.html tests/index.test.mjs
git commit -m "feat: add Arabic Stripe subscription page"
```

---

### Task 3: Provision, Configure, Document, and Verify

**Files:**
- Modify: `index.html` (`STRIPE_PAYMENT_LINK` only)
- Create: `README.md`

**Interfaces:**
- Consumes: `scripts/provision-stripe-checkout.mjs` and a test-mode restricted key with write access to Products, Prices, and Payment Links.
- Produces: A configured test-mode `index.html`, Stripe test Product/Price/Payment Link, and operator instructions for replacing the test URL with a live URL.

- [ ] **Step 1: Provision the Stripe test resources without writing the key to disk**

Run in an interactive shell so the key is not placed in the command itself or committed:

```bash
read -s "STRIPE_RESTRICTED_KEY?Stripe test restricted key: "
export STRIPE_RESTRICTED_KEY
node scripts/provision-stripe-checkout.mjs
unset STRIPE_RESTRICTED_KEY
```

Expected: one `https://buy.stripe.com/test_...` URL and no API key in stdout/stderr. Use a newly created test restricted key if possible. If the previously shared test secret has not been rolled, roll it before this step.

- [ ] **Step 2: Configure the public Payment Link URL**

Use `apply_patch` to replace only:

```js
const STRIPE_PAYMENT_LINK = "";
```

with the exact quoted public URL returned by Step 1. The resulting hostname must be exactly `buy.stripe.com` and the protocol must be HTTPS.

Do not add a publishable, secret, or restricted key to `index.html`.

- [ ] **Step 3: Add exact operator documentation**

Create `README.md` with:

```markdown
# Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù — Stripe Drop-in Checkout

Arabic single-file checkout entry point for Ø§ÙØ¯ÙÙÙÙØªÙ's USD 99/month technical-support subscription. The deployed artifact is only `index.html`; payment details are collected by Stripe-hosted Checkout.

## Preview and test

Run `npm run preview`, then open `http://localhost:4173`. Run all automated checks with `npm test`.

For a Stripe test checkout, use card `4242 4242 4242 4242`, any future expiry date, any CVC, and a real-format test email. After completion, verify in Stripe test mode that the Customer, Subscription, successful Payment, and paid Invoice exist and that Checkout displayed its hosted confirmation.

## Stripe branding and emails

In Stripe Dashboard branding settings, set the public business name to `Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù`, upload the approved logo if available, and set the brand accent to `#0FBA1E`. In customer email settings, enable successful-payment receipts and the relevant subscription and invoice notifications.

## Go live

Create an equivalent live Product, USD 99 monthly Price, and Payment Link. Collect the required individual name, keep Stripe's hosted confirmation, and do not restrict dynamic payment methods. Replace only the `STRIPE_PAYMENT_LINK` value in `index.html`, retest the flow, and deploy only `index.html` to the static site.

## Security

The test secret supplied during intake was exposed and must be rolled. Prefer a restricted API key with only Product, Price, and Payment Link permissions. Supply it only through `STRIPE_RESTRICTED_KEY`; never commit `.env` files or any Stripe API key.

Stripe's standard payment-processing and Billing usage fees apply. The standard `buy.stripe.com` hosted domain does not require Stripe's optional $10/month custom-domain feature.
```

- [ ] **Step 4: Run automated security and contract verification**

Run:

```bash
npm test
rg -n '\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+' . --glob '!docs/superpowers/**' --glob '!.git/**'
git diff --check
```

Expected: 5 tests PASS; `rg` returns no matches; `git diff --check` returns no output.

- [ ] **Step 5: Verify the local page at desktop and mobile widths**

Run `npm run preview`, then use the Browser skill to inspect `http://localhost:4173` at approximately 1440×900 and 390×844. Confirm:

- Arabic copy and RTL order render correctly.
- The card has no horizontal overflow.
- `$99`, `Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù`, `Ø§ÙØ¯ÙÙÙÙØªÙ`, and `Stripe` have correct bidirectional order.
- The green action is at least 44px tall and focus is visible by keyboard.
- The action URL is the exact HTTPS `buy.stripe.com` test URL.
- No console error is present.

- [ ] **Step 6: Complete an end-to-end Stripe test subscription**

Open the action, confirm Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù branding, the Arabic product name, USD 99 monthly cadence, required individual name, and email. Complete Checkout with Stripe test card `4242 4242 4242 4242`. Confirm the Stripe-hosted completion page and the Customer, Subscription, Payment, and paid Invoice in test mode.

- [ ] **Step 7: Commit the configured handoff**

```bash
git add index.html README.md
git commit -m "docs: configure and document Stripe checkout"
```

Record the Product, Price, and Payment Link IDs in the final handoff message only; do not store secrets.
