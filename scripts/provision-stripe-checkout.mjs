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
    throw new Error(
      `Stripe request failed (${response.status}): ${redact(payload?.error?.message ?? "Unknown error", apiKey)}`,
    );
  }
  return payload;
}

export async function provisionStripeCheckout(apiKey, fetchImpl = globalThis.fetch) {
  if (!/^(rk|sk)_test_/.test(apiKey ?? "")) {
    throw new Error("Provide a test-mode restricted or secret key.");
  }

  const product = await stripePost(
    "products",
    {
      name: "باقة الدعم الفني الشهرية لـ Edulink",
      description: "دعم فني شهري مستمر لفريق Edulink مقدم من Egypt Dev",
      "metadata[service]": "edulink_monthly_technical_support",
    },
    apiKey,
    "egypt-dev-edulink-support-product-v1",
    fetchImpl,
  );

  const price = await stripePost(
    "prices",
    {
      currency: "usd",
      unit_amount: "9900",
      "recurring[interval]": "month",
      product: product.id,
      "metadata[service]": "edulink_monthly_technical_support",
    },
    apiKey,
    "egypt-dev-edulink-support-price-v1",
    fetchImpl,
  );

  const paymentLink = await stripePost(
    "payment_links",
    {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      "name_collection[individual][enabled]": "true",
      "name_collection[individual][optional]": "false",
      "after_completion[type]": "hosted_confirmation",
      submit_type: "subscribe",
      "metadata[service]": "edulink_monthly_technical_support",
    },
    apiKey,
    "egypt-dev-edulink-support-payment-link-v1",
    fetchImpl,
  );

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
