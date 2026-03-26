# Product Hunt — Maker's First Comment

Hey everyone! 👋

I'm Niklas, and FoodAI started as a personal frustration project. I was throwing away food every week — not because I bought too much, but because I simply forgot what was in my fridge and pantry. Sound familiar?

So I built something that solves this in the laziest way possible: point your phone at a product, let AI figure out what it is, and track everything automatically. No manual entry, no spreadsheets, no "I'll remember this time" (spoiler: I never did).

**What makes FoodAI different from grocery apps:**
- It tracks each physical package separately. An open butter with 3 days left and a sealed one with 2 months — they're different things, and the app knows that
- Recipes are generated from what you *actually* have, not from a fantasy pantry
- It runs on your own hardware. Your kitchen data stays in your kitchen

**Some honest context:**
- I built this for myself first. It's opinionated and probably missing things you'd want
- The barcode scanner uses html5-qrcode after I spent way too long fighting with Quagga2 and learned that camera APIs in browsers are... special
- Dark mode was added because I check my pantry at midnight more often than I'd like to admit

**Tech decisions:**
- SQLite because I didn't want to maintain a database server for a kitchen app
- Multi-AI provider because I kept switching between Gemini and Claude and got tired of hardcoding keys
- Docker because "it works on my Pi" is the new "it works on my machine"

I'd genuinely love to hear what you think. What would you add? What's missing? What's broken?

And if you're a developer who speaks a language that isn't German, English, or Spanish — translation PRs are very welcome. The i18n is set up, you just need to copy a JSON file.

Thanks for checking it out! 🍎
