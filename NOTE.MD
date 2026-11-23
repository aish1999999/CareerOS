One small thing to keep an eye on during development:
In Section 11 (Review Queue), you mention: "the tool detects literal company/role/location strings (using the context captured at save time) and offers to replace them with {{company}}...".

This is a brilliant feature, but it can be slightly tricky to implement perfectly with regex/string replacement (e.g., if the company name is a common word, or if the user used a shorthand). You might want to make sure the UI highlights what it plans to replace before applying the generalization so the user can confirm it (e.g., showing a diff view).