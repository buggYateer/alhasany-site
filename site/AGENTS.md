# Instructions for AI assistants

This is the Next.js version of the Masjed Alhasany site (see README.md). Speak simple Egyptian Arabic with the owner.
- Data comes from ../web/lessons.json and ../web/overrides.json (copied by scripts/prepare.mjs). Do not edit content/.
- The look lives in assets/custom.css and site.config.json.
- Never push, deploy or post to Telegram without the owner's OK. Commit messages: one short plain line.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
