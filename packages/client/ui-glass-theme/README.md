# @deepseek-ai/dsh-client-ui-glass-theme

Frosted panels, translucent surfaces, and a wallpaper picker for the Web GUI, with its own settings surface. This is the built-in home of the glass theme: mounting it in a composition is enough, with no out-of-tree install and no machine-specific path.

## Summary

The node half answers every index render with the default stylesheet (translucent alias tokens, a gradient wallpaper, and `backdrop-filter` on the frame's stable `data-*` anchors). The browser half registers two surfaces — a compact row in Settings → General and a full page in Settings → Glass Theme — that edit the same parameter set and re-apply it immediately. The default sheet is inlined in `src/index.ts`, so the compiled node half carries it with no build-time asset copy.

Parameters live in the browser's `localStorage` under `dsh.glass-theme`; they are per-browser, not per-session, and never reach the session log. Returning every parameter to its default removes the override stylesheet entirely, which hands the appearance back to the default sheet.

## Configuration

None. The plugin takes no cordis config; every value the user can change is edited from its own settings surface.

## Extension points

- `webserver/index-inject` (node half) — contributes the default `<style>` row. Another plugin may push a later row to win by source order.
- `settings.general.item` (browser half, `id: glass-theme`, order 13) — the compact row.
- `settings.section` (browser half, `id: glass-theme`, order 12) — the full page.

The `--dsw-alias-*` tokens this theme overrides belong to `dsh-client-ui-theme`; see [Web styling](../../../../docs/web-styling.md) for the token ownership rules.

## Model Experience

None: the plugin registers nothing model-facing and writes no session event.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- Copy is not routed through the locale dictionaries, so it stays in source Chinese instead of following the active locale.
- Parameter overrides are applied with `!important` because the theme runtime writes its alias tokens as inline variables on `body`; a stylesheet declaration without `!important` loses to them.
- Wallpapers reach the page as data URLs. An image whose re-encoded size exceeds the browser's storage quota applies for the session but does not survive a reload, which the page reports in place.
