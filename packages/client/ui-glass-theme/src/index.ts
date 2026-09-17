/**
 * Glass theme, node half: answer every index render with the default
 * stylesheet. The browser half ships through `exports["./client"]`, discovered
 * from this package's `dsh.client` declaration.
 *
 * The stylesheet is inlined rather than read from `src/` so the compiled
 * `lib/index.js` carries it without a build-time asset copy.
 * @module @deepseek-ai/dsh-client-ui-glass-theme
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

/**
 * Default appearance, applied before any per-browser override. The browser
 * half writes a later stylesheet when the user changes a setting.
 */
const DEFAULT_STYLESHEET = `
/* 壁纸 */
html, body {
  background-image: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 40%, #7c3aed 72%, #db2777 100%) !important;
  background-size: cover !important;
  background-position: center center !important;
  background-attachment: fixed !important;
  background-repeat: no-repeat !important;
}

/* 面板底色：半透明，壁纸才透得出来。!important 用来盖过主题运行时写在
   body 上的行内变量。 */
body {
  --dsw-alias-bg-base: rgba(255, 255, 255, 0.55) !important;
  --dsw-alias-bg-layer-1: rgba(255, 255, 255, 0.66) !important;
  --dsw-alias-bg-layer-2: rgba(255, 255, 255, 0.78) !important;
  --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.86) !important;
  --dsw-specific-sidebar-fill: rgba(255, 255, 255, 0.42) !important;
}
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgba(16, 16, 22, 0.58) !important;
  --dsw-alias-bg-layer-1: rgba(30, 30, 40, 0.70) !important;
  --dsw-alias-bg-layer-2: rgba(40, 40, 52, 0.80) !important;
  --dsw-alias-bg-overlay: rgba(44, 44, 58, 0.88) !important;
  --dsw-specific-sidebar-fill: rgba(14, 14, 20, 0.44) !important;
}

/* 毛玻璃 */
[data-side="sidebar"],
[data-side="rightbar"],
[data-composer-seat],
[data-dockkit-surface],
[data-dockkit-float],
[data-trigger-menu] {
  backdrop-filter: blur(26px) saturate(170%);
  -webkit-backdrop-filter: blur(26px) saturate(170%);
}
`

/**
 * Push the default stylesheet into every index injection table.
 * @param ctx - host context owning the subscription.
 */
export function apply(ctx: Context): void {
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'style', text: DEFAULT_STYLESHEET })
  })
}
