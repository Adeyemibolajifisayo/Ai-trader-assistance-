SYNTHETIC INDICES TRADER ASSISTANT — ANDROID PWA STARTER

MARKETS
- Boom 500 and Boom 1000
- Crash 500 and Crash 1000
- Volatility 75 Index (standard V75)

FEATURES
- Deriv public WebSocket market data: discover active symbols, subscribe to live ticks and retrieve historical candles.
- 15-minute, 1-hour and 4-hour EMA20/EMA50, RSI(14) and ATR(14) analysis.
- Spike activity monitor flags unusually large candles relative to the recent median range. It describes past candles only and cannot forecast the next spike.
- TradingView charts using Deriv symbol identifiers.
- Risk planner and local trade journal.
- Browser notifications while the app is open and scanning.
- No Deriv login, credentials or trade execution.

IMPORTANT
1. This is an installable web-app starter, not a hosted production service. Deploy to HTTPS before installing on Android.
2. The app discovers exact Deriv symbol codes using active_symbols; availability can differ by account/platform.
3. Deriv says synthetic indices are generated markets, external news does not affect their price evolution, and technical indicators may not be well-suited to most synthetic indices. Historical patterns are not reliable predictions of the next spike. The spike monitor is descriptive, not predictive.
4. TradingView chart availability may depend on its symbol coverage and account access. Deriv's own platform remains the reference for executable quotes and contract specifications.
5. Browser notifications work while the app is open/active. Push notifications when Chrome is closed require a secure backend and push service.
6. Analysis is transparent indicator logic, not a connected generative AI model. Secure AI commentary requires a backend; never place private API keys in browser JavaScript.
7. Position sizing is simplified price-distance arithmetic only. It does not calculate Deriv stake, contract size, tick value, spread, margin or payout. Confirm contract specifications before trading.
8. No trades are placed by this app. You make every trading decision.

DEPLOY TO GITHUB PAGES
1. Upload all files in this folder to the root of your GitHub repository.
2. Settings > Pages > Deploy from a branch > main > /(root) > Save.
3. Open the published HTTPS URL in Chrome on Android.
4. Chrome menu (⋮) > Install app / Add to Home screen.
5. Open the app and enable alerts. Keep it open for live scanning.

FILES: index.html, app.js, style.css, manifest.webmanifest, sw.js, icon.svg, README.txt
