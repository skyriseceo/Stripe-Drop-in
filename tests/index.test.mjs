import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function runCheckoutScript(paymentLink) {
  const attributes = new Map([["aria-disabled", "true"]]);
  const classes = new Set(["checkout-button", "is-disabled"]);
  const checkoutLink = {
    href: undefined,
    classList: { remove: (name) => classes.delete(name) },
    removeAttribute: (name) => attributes.delete(name),
  };
  const checkoutNote = { textContent: "رابط الدفع غير مهيأ بعد." };
  const configuredScript = script.replace(
    /const STRIPE_PAYMENT_LINK = "[^"]*";/,
    `const STRIPE_PAYMENT_LINK = ${JSON.stringify(paymentLink)};`,
  );

  vm.runInNewContext(configuredScript, {
    URL,
    document: {
      querySelector: (selector) =>
        selector === "#checkout-link" ? checkoutLink : checkoutNote,
    },
  });

  return { attributes, checkoutLink, checkoutNote, classes };
}

test("renders the approved Arabic RTL subscription content", () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /Egypt Dev/);
  assert.match(html, /باقة الدعم الفني الشهرية لـ <bdi>Edulink<\/bdi>/);
  assert.match(html, /<bdi>\$99<\/bdi>/);
  assert.match(html, /شهرياً/);
  assert.match(html, /اشترك بأمان/);
  assert.match(html, /دفع آمن عبر <bdi>Stripe<\/bdi>/);
});

test("uses the approved Edulink palette and accessibility contracts", () => {
  for (const color of ["#066EB7", "#0FBA1E", "#F6F7FA", "#1A1A1A", "#E3E5E8", "#FFFFFF"]) {
    assert.ok(html.includes(color), `missing ${color}`);
  }
  assert.match(html, /:focus-visible/);
  assert.match(html, /min-height:\s*44px/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /aria-describedby="checkout-note"/);
});

test("contains no Stripe API key", () => {
  assert.doesNotMatch(html, /\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+/);
});

test("embeds its favicon so static hosting makes no missing asset request", () => {
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/);
});

test("enables checkout only for an HTTPS Stripe Payment Link", () => {
  const state = runCheckoutScript("https://buy.stripe.com/test_example");

  assert.equal(state.checkoutLink.href, "https://buy.stripe.com/test_example");
  assert.equal(state.classes.has("is-disabled"), false);
  assert.equal(state.attributes.has("aria-disabled"), false);
  assert.equal(state.checkoutNote.textContent, "سيتم تجديد الاشتراك شهرياً حتى يتم إلغاؤه.");
});

test("keeps checkout disabled for an untrusted URL", () => {
  const state = runCheckoutScript("https://example.com/not-stripe");

  assert.equal(state.checkoutLink.href, undefined);
  assert.equal(state.classes.has("is-disabled"), true);
  assert.equal(state.attributes.get("aria-disabled"), "true");
  assert.equal(state.checkoutNote.textContent, "رابط الدفع غير مهيأ بعد.");
});
