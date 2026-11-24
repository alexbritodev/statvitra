# 🤝 Contributing to StatVitra

Use Node.js 24 or later and run these checks from your checkout.

```sh
npm test
npm run demo
npm run demo -- --locale pt-BR
```

Open `examples/demo/index.html` in your browser and check the affected cards in light and dark mode at desktop and mobile widths. When editing translations, check the SVG labels, image alt text, and text report. Keep the `{count}` and `{total}` placeholders in the `scanned` message.

For embed changes, check both layouts with two or more cards. When editing an animation, verify that enabling reduced motion immediately shows the static card.

For a bug report, include your Node.js version, OS, locale, and the command or workflow that failed. You can attach a generated card or screenshot that uses public or sample data. Remove credentials from logs before posting them.

Keep pull requests focused. For changes to the renderer or GitHub API integration, describe what you checked and include a preview if the change affects the cards. Commit refreshed sample cards only when their output changes.

Use the [security policy](SECURITY.md) to report a vulnerability privately.
