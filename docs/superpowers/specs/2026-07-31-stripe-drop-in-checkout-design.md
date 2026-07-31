# Stripe Drop-in Checkout Design

## Summary

Build a secure, single-file Arabic subscription checkout entry point for Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù's monthly technical support package for Ø§ÙØ¯ÙÙÙÙØªÙ. The static page will link to a Stripe Payment Link for a recurring USD 99 monthly subscription. Stripe-hosted Checkout will collect the customer's required individual name and email, handle payment and recurring billing, generate subscription invoices, and show Stripe's hosted confirmation page.

## Goals

- Deliver one portable `index.html` file with its CSS embedded.
- Present all customer-facing static-page content in Arabic with a right-to-left layout.
- Clearly identify Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù as the seller and Ø§ÙØ¯ÙÙÙÙØªÙ as the supported customer/package.
- Present a fixed USD 99 monthly subscription with no trial.
- Keep secret and restricted Stripe API keys out of all browser-delivered code.
- Use Stripe-hosted Checkout and dynamic payment methods.
- Match the visual language of the existing Ø§ÙØ¯ÙÙÙÙØªÙ page.
- Work on static hosting without a server, package manager, or build step.

## Non-goals

- Embedded Checkout or a custom payment form.
- A server, serverless endpoint, database, or webhook processor.
- Automatic tax, billing-address collection, tax-ID collection, coupons, or trials.
- A customer billing portal.
- A custom Stripe checkout domain.
- Automated fulfillment after checkout.

## Architecture

The runtime consists of one static `index.html`. It contains semantic Arabic HTML, embedded CSS, and a normal HTTPS link to a Stripe Payment Link. The document uses `lang="ar"` and `dir="rtl"`. It does not load Stripe.js because a Payment Link redirect does not require it. It does not contain either the publishable key or a secret/restricted key.

The Stripe account contains:

1. A Product named `باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ` so the product line is also understandable in hosted Checkout and invoices.
2. A recurring Price of USD 99 every month.
3. A Payment Link using that Price, with quantity fixed to one.
4. Required individual-name collection and normal Checkout email collection.
5. Stripe's hosted post-payment confirmation.
6. Dynamic payment methods, with no `payment_method_types` restriction.

Stripe account branding should use the Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù public business name and, where configured, the Ø§ÙØ¯ÙÙÙÙØªÙ-aligned accent color.

## Page Design

The page is a compact, responsive Arabic checkout card that can stand alone or be dropped into a static page. It contains:

- A small `Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù` seller label.
- The package title `باقة الدعم الفني الشهرية لـ Ø§ÙØ¯ÙÙÙÙØªÙ`.
- The price `$99` with the cadence `شهرياً`.
- A short Arabic statement that the subscription covers ongoing technical support.
- A concise Arabic list of checkout assurances: secure Stripe checkout, monthly billing, and invoice/receipt delivery.
- One primary `اشترك بأمان` link.
- A small Arabic `دفع آمن عبر Stripe` trust note.

The visual palette is derived from the current Ø§ÙØ¯ÙÙÙÙØªÙ page:

| Role | Color |
| --- | --- |
| Primary blue / focus | `#066EB7` |
| Primary green / action | `#0FBA1E` |
| Page background | `#F6F7FA` |
| Main text | `#1A1A1A` |
| Borders | `#E3E5E8` |
| Card background | `#FFFFFF` |

The page uses a restrained blue-to-green accent, rounded corners, generous whitespace, and clear focus states. The action uses green with contrast-checked white text. Arabic text uses an Arabic-friendly system font stack with `Cairo` as the preferred face when already available on the host page. The price retains left-to-right isolation so `$99` renders correctly inside the RTL document. Motion is limited to subtle hover/focus feedback and respects `prefers-reduced-motion`.

## Data Flow

1. The customer opens the static page.
2. The customer selects `Subscribe securely`.
3. The browser navigates to the Stripe-hosted Payment Link.
4. Stripe Checkout displays Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù's configured public branding, the Arabic package name, USD 99 monthly price, and eligible dynamic payment methods. Stripe chooses its supported interface locale from the customer's browser for Payment Links.
5. Checkout requires the customer's individual name and email and collects payment details on Stripe's domain.
6. Stripe creates the Customer and Subscription, pays the first subscription invoice, and emails the normal Stripe receipt/invoice according to account email settings.
7. Stripe shows its hosted confirmation page.
8. Future renewal attempts, invoices, retries, and subscription state are handled by Stripe Billing.

## Security and Key Handling

- No secret or restricted key is stored in the repository or static page.
- The exposed test secret supplied during project intake must be rolled before continued use.
- If API-based setup is used, the operator supplies a newly created restricted test key through a local environment variable or secret prompt. The key receives only the Product, Price, and Payment Link permissions required for setup.
- Live setup uses a separate restricted live key and Stripe account access policies where available.
- The page never logs keys, Checkout data, or payment information.
- No webhook is needed because this page performs no fulfillment or application-state update.

## Configuration Behavior

The HTML has one clearly marked Payment Link URL value. Until a valid `https://buy.stripe.com/` URL is inserted, the action is rendered unavailable and the page explains that checkout is not configured. This prevents an accidental navigation to a placeholder or unsafe URL.

The final configured artifact contains only the Payment Link URL, which is designed to be public. The URL can be changed without rebuilding any backend.

## Error Handling

- If checkout is not configured, the call to action is disabled and no placeholder navigation occurs.
- If Stripe Checkout is temporarily unavailable, Stripe owns and displays the hosted error/retry experience.
- If payment fails or requires another method, Stripe Checkout keeps the customer in the hosted flow and provides recovery guidance.
- If the customer closes Checkout, no local state is lost because the static page stores no checkout state.

## Accessibility and Responsive Behavior

- Use semantic headings, paragraphs, list markup, and an anchor for navigation.
- Set the document language to Arabic and the base writing direction to right-to-left.
- Isolate Latin brand names and currency text with appropriate bidirectional markup.
- Maintain visible keyboard focus with the Ø§ÙØ¯ÙÙÙÙØªÙ blue.
- Meet WCAG AA text contrast for all essential text and controls.
- Keep the primary action at least 44 pixels high.
- Support narrow mobile screens without horizontal scrolling.
- Avoid relying on color alone to convey availability or status.
- Honor reduced-motion preferences.

## Verification

- Validate the HTML structure and confirm there are no external runtime dependencies.
- Scan the workspace to confirm that no `sk_` or `rk_` value is present.
- Verify desktop and mobile layouts visually.
- Verify keyboard focus order and the disabled/unconfigured state.
- Verify that the configured action points only to an HTTPS `buy.stripe.com` URL.
- Confirm that all static-page customer-facing copy is Arabic, RTL layout is correct, and Latin brand/price text remains readable.
- Open the test Payment Link and confirm Ø§ÙÙØ¨Ø±ÙØ¬ Ø§ÙØ¹Ø±Ø¨Ù branding, Arabic package name, USD 99 monthly cadence, required name, and email collection.
- Complete a test subscription using Stripe's test card `4242 4242 4242 4242`, any future expiry date, and any CVC.
- Confirm that Stripe creates a test Customer, Subscription, Payment, and paid Invoice and then shows its hosted confirmation page.

## Deployment

Upload `index.html` to the target static website or paste its markup into the desired static page. No Node.js runtime, environment variables, publishable key, or backend deployment is required. Before going live, create an equivalent live Product, Price, and Payment Link; configure Stripe branding and customer emails; replace only the test Payment Link URL; and run a real low-value end-to-end validation if operational policy permits.

## References

- [Stripe Payment Links](https://docs.stripe.com/payment-links)
- [Create a Payment Link](https://docs.stripe.com/payment-links/create)
- [Collect customer names](https://docs.stripe.com/payments/checkout/name-collection)
- [Stripe Billing pricing](https://stripe.com/billing/pricing)
- [Stripe API key best practices](https://docs.stripe.com/keys-best-practices)
