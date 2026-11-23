# SweepClean

> **Zero-Ad 1-Click Privacy Cleaner with Protected Login Domains**

A fast, privacy-first Chrome Manifest V3 extension built by **ARIS PARTY LLC** to outperform **Click&Clean** (`ghgabhipcejejjmhhchfonmamedcbeod`, 1M+ users, 4.4★).

- **Product Page:** https://arisparty.org/extensions/sweepclean
- **Privacy Policy:** https://arisparty.org/extensions/sweepclean/privacy
- **Support & Setup:** https://arisparty.org/extensions/sweepclean/support (`support@arisparty.org`)

## Competitive Advantages
- Replaces Click&Clean (1M users, abandoned since June 2024) with a fresh 2026 MV3 engine
- 100% ad-free — eliminates Click&Clean's notorious popup spam and interstitial nags
- Protected Domains cookie preservation keeps important logins intact during sweeps
- Does not request invasive <all_urls> scripting permissions or phone home to 16 domains

## Free vs SweepClean Pro
### Free
- Zero-ad, zero-telemetry 1-click Chrome privacy & cache cleaner
- Granular data selectors: Cache, Cookies, History, Downloads, LocalStorage, Form Data
- Time-range picker (15m, 1h, 24h, 7d, 4w, All time)
- Up to 5 Protected Domains — stay signed into Gmail/work while clearing all other cookies
- Live cookie count & instant clean confirmation

### Pro (Monetized via Stripe)
- Unlimited Protected Login Domains
- Custom Cleaning Profiles (Quick Dev Cache, Deep Privacy, Work Reset)
- Scheduled automatic interval cleaning & clean-on-startup
- Cleaning audit log & JSON settings export/import

| Plan | Price | Stripe Product / Price ID | Live Checkout Link |
|---|---|---|---|
| Monthly | $2.99/mo | `price_1UeE3BFtqvN4GZH3LQ2t6RFK` | [Checkout](https://buy.stripe.com/bJe3cv1x52hz1PN46ug3603) |
| Yearly | $19.99/yr | `price_1UeE40FtqvN4GZH3yqEj6jgm` | [Checkout](https://buy.stripe.com/28EfZhgrZ8FX2TReL8g360d) |
| Lifetime | $29.99 one-time | `price_1UeE5JFtqvN4GZH3kMGSLEcn` | [Checkout](https://buy.stripe.com/bJe28r5Nle0h1PN5ayg360n) |

- **Stripe Product ID:** `prod_VfZAA1Ivm61Ze6`

## Local Installation (Chrome)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this repository root

## Verification & Chrome Web Store Packaging
```bash
node tests/verify.mjs .
```
Outputs a store-ready archive with 56 `_locales` at `dist/sweepclean-extension-v1.0.0.zip`.
