# المبرمج العربي — Stripe Drop-in Checkout

Arabic single-file checkout entry point for ايديوليتك's USD 99/month technical-support subscription. The deployed artifact is only `index.html`; payment details are collected by Stripe-hosted Checkout.

## Preview and test

Run `npm run preview`, then open `http://localhost:4173`. Run all automated checks with `npm test`.

For a Stripe test checkout, use card `4242 4242 4242 4242`, any future expiry date, any CVC, and a real-format test email. After completion, verify in Stripe test mode that the Customer, Subscription, successful Payment, and paid Invoice exist and that Checkout displayed its hosted confirmation.

## Stripe branding and emails

In Stripe Dashboard branding settings, set the public business name to `المبرمج العربي` if desired, upload the approved logo if available, and set the brand accent to `#0FBA1E`. In customer email settings, enable successful-payment receipts and the relevant subscription and invoice notifications.

## Go live

Create an equivalent live Product, USD 99 monthly Price, and Payment Link. Collect the required individual name, keep Stripe's hosted confirmation, and do not restrict dynamic payment methods. Replace only the `STRIPE_PAYMENT_LINK` value in `index.html`, retest the flow, and deploy only `index.html` to the static site.

## Security

The test secret supplied during intake was exposed and must be rolled. Prefer a restricted API key with only Product, Price, and Payment Link permissions. Supply it only through `STRIPE_RESTRICTED_KEY`; never commit `.env` files or any Stripe API key.

Stripe's standard payment-processing and Billing usage fees apply. The standard `buy.stripe.com` hosted domain does not require Stripe's optional $10/month custom-domain feature.
