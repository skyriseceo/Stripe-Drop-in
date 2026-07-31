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
  assert.equal(requests[0].params.get("name"), "باقة الدعم الفني الشهرية لـ Edulink");
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
