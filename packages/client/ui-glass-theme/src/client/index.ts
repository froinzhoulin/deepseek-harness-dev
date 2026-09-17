/**
 * Glass theme, browser half: applies the saved settings as a later stylesheet
 * and contributes the two settings surfaces that edit them.
 *
 * State lives in `localStorage`, so a change reaches every surface through the
 * subscription below rather than through a host round trip. A value set equal
 * to the defaults removes the override stylesheet entirely, which hands the
 * appearance back to the node half's default sheet.
 * @module @deepseek-ai/dsh-client-ui-glass-theme/client
 */

import { createElement, useEffect, useState, type CSSProperties, type ChangeEvent, type ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings slot declarations this plugin registers into.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** Hard dependency: the settings surfaces register through the slot registry. */
export const inject = ['slots']

interface SolidPreset {
  readonly name: string
  readonly value: string
}

interface ThemePreset {
  readonly id: string
  readonly name: string
  readonly patch: Partial<GlassState>
}

interface GlassState {
  wallpaper: string
  wallKind: 'color' | 'image'
  wall: boolean
  glass: boolean
  blur: number
  saturate: number
  alpha: number
  scrim: number
  fit: 'cover' | 'contain' | 'tile'
  reduceMotion: boolean
}

const SOLIDS: readonly SolidPreset[] = [
  { name: '墨黑', value: '#0b0b0c' },
  { name: '深灰', value: '#1c1c20' },
  { name: '夜蓝', value: '#0d1526' },
  { name: '松绿', value: '#0d1f18' },
  { name: '酒红', value: '#2a1017' },
  { name: '暗紫', value: '#191033' },
  { name: '米白', value: '#f6f4ef' },
  { name: '雾蓝', value: '#e3ecf6' },
  { name: '淡紫', value: '#efeaff' },
  { name: '浅粉', value: '#fdeef2' },
]

const GRADIENTS: readonly SolidPreset[] = [
  { name: '紫夜', value: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 40%, #7c3aed 72%, #db2777 100%)' },
  { name: '深海', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { name: '极光', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #7b2ff7 100%)' },
  { name: '晨曦', value: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%)' },
  { name: '日落', value: 'linear-gradient(135deg, #ff512f 0%, #dd2476 60%, #7b1fa2 100%)' },
  { name: '森林', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: '石墨', value: 'linear-gradient(135deg, #0b0b0c 0%, #23252b 55%, #3a3f4a 100%)' },
  { name: '蜜桃', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: '薄荷', value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { name: '晨雾', value: 'linear-gradient(135deg, #dfe9f3 0%, #ffffff 100%)' },
]

/** One named parameter set; a theme the user can switch to in one click. */
const THEMES: readonly ThemePreset[] = [
  {
    id: 'glass-violet',
    name: '玻璃紫',
    patch: {
      wallKind: 'image', wallpaper: GRADIENTS[0]?.value ?? '', wall: true,
      glass: true, blur: 26, saturate: 170, alpha: 0.55, scrim: 0, fit: 'cover',
    },
  },
  {
    id: 'glass-ocean',
    name: '玻璃深海',
    patch: {
      wallKind: 'image', wallpaper: GRADIENTS[1]?.value ?? '', wall: true,
      glass: true, blur: 30, saturate: 190, alpha: 0.5, scrim: 0, fit: 'cover',
    },
  },
  {
    id: 'glass-aurora',
    name: '玻璃极光',
    patch: {
      wallKind: 'image', wallpaper: GRADIENTS[2]?.value ?? '', wall: true,
      glass: true, blur: 34, saturate: 200, alpha: 0.45, scrim: 0.1, fit: 'cover',
    },
  },
  {
    id: 'glass-forest',
    name: '玻璃森林',
    patch: {
      wallKind: 'image', wallpaper: GRADIENTS[5]?.value ?? '', wall: true,
      glass: true, blur: 24, saturate: 150, alpha: 0.6, scrim: 0.05, fit: 'cover',
    },
  },
  {
    id: 'pure-black',
    name: '纯黑',
    patch: {
      wallKind: 'color', wallpaper: '#0b0b0c', wall: true,
      glass: false, blur: 0, saturate: 100, alpha: 0.92, scrim: 0, fit: 'cover',
    },
  },
  {
    id: 'paper',
    name: '纸质米白',
    patch: {
      wallKind: 'color', wallpaper: '#f6f4ef', wall: true,
      glass: false, blur: 0, saturate: 100, alpha: 0.9, scrim: 0, fit: 'cover',
    },
  },
]

const FITS: readonly { readonly id: GlassState['fit']; readonly name: string }[] = [
  { id: 'cover', name: '铺满' },
  { id: 'contain', name: '完整' },
  { id: 'tile', name: '平铺' },
]

const DEFAULTS: GlassState = {
  wallpaper: GRADIENTS[0]?.value ?? '',
  wallKind: 'image',
  wall: true,
  glass: true,
  blur: 26,
  saturate: 170,
  alpha: 0.55,
  scrim: 0,
  fit: 'cover',
  reduceMotion: false,
}

const STORAGE_KEY = 'dsh.glass-theme'
const OVERRIDE_STYLE_ID = 'dsh-glass-live'

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function inferKind(wallpaper: string): GlassState['wallKind'] {
  return /^(#|rgb|hsl)/.test(wallpaper) ? 'color' : 'image'
}

/** Read the stored settings, filling every absent field from the defaults. */
function readState(): GlassState {
  const out: GlassState = { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const saved: unknown = JSON.parse(raw)
      if (saved !== null && typeof saved === 'object') {
        for (const key of Object.keys(DEFAULTS) as (keyof GlassState)[]) {
          const value = (saved as Record<string, unknown>)[key]
          if (value !== undefined) Object.assign(out, { [key]: value })
        }
      }
    }
  } catch {
    // Storage disabled or unreadable: the defaults are the answer.
  }
  if (out.wallKind !== 'color' && out.wallKind !== 'image') out.wallKind = inferKind(out.wallpaper)
  if (out.fit !== 'cover' && out.fit !== 'contain' && out.fit !== 'tile') out.fit = 'cover'
  return out
}

/** Persist the settings; `false` means the quota refused them. */
function writeState(state: GlassState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/**
 * Build the override stylesheet for one parameter set. A single alpha value
 * derives the whole panel opacity ladder.
 * @param state - the parameters to render.
 * @returns the stylesheet text.
 */
function stylesheet(state: GlassState): string {
  const alpha = clamp(Number(state.alpha) || 0, 0.15, 0.97)
  const level = (delta: number): number => round(clamp(alpha + delta, 0.1, 0.97), 3)
  const sidebar = round(clamp(alpha - 0.13, 0.1, 0.97), 3)
  const out: string[] = []

  if (state.wall) {
    if (state.wallKind === 'color') {
      out.push(`html,body{background-image:none !important;background-color:${state.wallpaper} !important;}`)
    } else {
      const scrim = round(clamp(Number(state.scrim) || 0, 0, 0.6), 2)
      const layer = scrim > 0
        ? `linear-gradient(rgba(0,0,0,${scrim}),rgba(0,0,0,${scrim})), `
        : ''
      const size = state.fit === 'contain' ? 'contain' : state.fit === 'tile' ? 'auto' : 'cover'
      const repeat = state.fit === 'tile' ? 'repeat' : 'no-repeat'
      out.push(
        `html,body{background-image:${layer}${state.wallpaper} !important;`
        + 'background-color:transparent !important;'
        + `background-size:${size} !important;background-position:center center !important;`
        + `background-attachment:fixed !important;background-repeat:${repeat} !important;}`,
      )
    }
  }

  // Transitions only: disabling keyframes would freeze the loading spinner.
  if (state.reduceMotion) {
    out.push('*,*::before,*::after{transition-duration:0.001ms !important;transition-delay:0ms !important;}')
  }

  out.push(
    'body{'
    + `--dsw-alias-bg-base:rgba(255,255,255,${level(0)}) !important;`
    + `--dsw-alias-bg-layer-1:rgba(255,255,255,${level(0.11)}) !important;`
    + `--dsw-alias-bg-layer-2:rgba(255,255,255,${level(0.23)}) !important;`
    + `--dsw-alias-bg-overlay:rgba(255,255,255,${level(0.31)}) !important;`
    + `--dsw-specific-sidebar-fill:rgba(255,255,255,${sidebar}) !important;}`,
  )
  out.push(
    'body[data-ds-dark-theme]{'
    + `--dsw-alias-bg-base:rgba(16,16,22,${level(0)}) !important;`
    + `--dsw-alias-bg-layer-1:rgba(30,30,40,${level(0.11)}) !important;`
    + `--dsw-alias-bg-layer-2:rgba(40,40,52,${level(0.23)}) !important;`
    + `--dsw-alias-bg-overlay:rgba(44,44,58,${level(0.31)}) !important;`
    + `--dsw-specific-sidebar-fill:rgba(14,14,20,${sidebar}) !important;}`,
  )

  const blur = state.glass ? `${clamp(Number(state.blur) || 0, 0, 60)}px` : '0px'
  const saturate = state.glass ? `${clamp(Number(state.saturate) || 100, 100, 300)}%` : '100%'
  const selector = '[data-side="sidebar"],[data-side="rightbar"],[data-composer-seat],'
    + '[data-dockkit-surface],[data-dockkit-float],[data-trigger-menu]'
  out.push(
    `${selector}{backdrop-filter:blur(${blur}) saturate(${saturate});`
    + `-webkit-backdrop-filter:blur(${blur}) saturate(${saturate});}`,
  )
  return out.join('\n')
}

/** Write the override sheet, or remove it once every value is back to default. */
function applyStylesheet(state: GlassState): void {
  let custom = false
  for (const key of Object.keys(DEFAULTS) as (keyof GlassState)[]) {
    if (state[key] !== DEFAULTS[key]) custom = true
  }
  const tag = document.getElementById(OVERRIDE_STYLE_ID)
  if (!custom) {
    tag?.remove()
    return
  }
  const target = tag ?? document.createElement('style')
  if (tag === null) {
    target.id = OVERRIDE_STYLE_ID
    document.head.appendChild(target)
  }
  target.textContent = stylesheet(state)
}

// ── 共享状态 ────────────────────────────────────────────────────

let current = readState()
let listeners: (() => void)[] = []

/** The theme a parameter set matches, or `custom` when it matches none. */
function activeTheme(state: GlassState): string {
  for (const theme of THEMES) {
    let matched = true
    for (const key of Object.keys(theme.patch) as (keyof GlassState)[]) {
      if (state[key] !== theme.patch[key]) matched = false
    }
    if (matched) return theme.id
  }
  return 'custom'
}

/**
 * Write parameters through the single entry point: memory, storage, stylesheet,
 * then every mounted surface. Returns false when storage refused the write.
 */
function commit(patch: Partial<GlassState>): boolean {
  const next = { ...current, ...patch }
  const stored = writeState(next)
  current = next
  applyStylesheet(next)
  for (const notify of listeners) notify()
  return stored
}

function resetAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the in-memory reset below still applies.
  }
  current = { ...DEFAULTS }
  applyStylesheet(current)
  for (const notify of listeners) notify()
}

/** Subscribe to the shared state and return the current value. */
function useGlassState(): GlassState {
  const [, bump] = useState(0)
  useEffect(() => {
    const notify = (): void => { bump(n => n + 1) }
    listeners.push(notify)
    return () => {
      listeners = listeners.filter(entry => entry !== notify)
    }
  }, [])
  return current
}

// ── 上传壁纸 ────────────────────────────────────────────────────

/** Open a file picker and hand back a data URL scaled to a storable size. */
function pickImage(onDone: (value: string) => void, onError: (message: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file === undefined) return
    const reader = new FileReader()
    reader.onerror = () => { onError('读取文件失败') }
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => { onError('这不是浏览器能显示的图片格式') }
      image.onload = () => {
        try {
          // Cap the long edge and re-encode, or the quota refuses the write.
          const scale = Math.min(1, 2560 / image.width)
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(image.width * scale))
          canvas.height = Math.max(1, Math.round(image.height * scale))
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
          onDone(`url("${canvas.toDataURL('image/jpeg', 0.85)}")`)
        } catch {
          onError('处理图片失败')
        }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
  input.click()
}

// ── 样式 ────────────────────────────────────────────────────────

const S: Record<string, CSSProperties> = {
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 14, color: 'var(--dsw-alias-label-primary)' },
  pageTitle: { fontSize: 16, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', marginBottom: 4 },
  pageHint: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 18 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 8 },
  switchWrap: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  checkbox: { cursor: 'pointer', margin: 0 },
  switchText: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  rowTop: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  label: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', width: 72, flexShrink: 0 },
  labelTop: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', width: 72, flexShrink: 0, paddingTop: 4 },
  range: { flex: 1, minWidth: 0 },
  value: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', width: 46, textAlign: 'right' },
  swatches: { display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 },
  custTag: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginLeft: 6 },
  notice: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary, #e55)', marginTop: 6 },
  divider: { height: '0.5px', background: 'var(--dsw-alias-border-l1, rgba(127,127,127,.2))', margin: '18px 0' },
}

function pillStyle(active: boolean): CSSProperties {
  return {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3))',
    background: active ? 'var(--dsw-alias-brand-primary, #111)' : 'transparent',
    color: active ? 'var(--dsw-alias-label-primary-foreground, #fff)' : 'var(--dsw-alias-label-secondary)',
  }
}

function swatchStyle(preset: SolidPreset, kind: GlassState['wallKind'], active: boolean): CSSProperties {
  const style: CSSProperties = {
    width: 30,
    height: 20,
    borderRadius: 5,
    cursor: 'pointer',
    padding: 0,
    border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3))',
    outline: active ? '2px solid var(--dsw-alias-brand-primary, #111)' : 'none',
    outlineOffset: 1,
  }
  if (kind === 'color') style.backgroundColor = preset.value
  else style.backgroundImage = preset.value
  return style
}

// ── 行构件 ──────────────────────────────────────────────────────

function switchRow(state: GlassState, label: string, key: 'glass' | 'wall' | 'reduceMotion'): ReactElement {
  return createElement('div', { key: `switch-${key}`, style: S.row },
    createElement('span', { style: S.label }, label),
    createElement('label', { style: S.switchWrap },
      createElement('input', {
        type: 'checkbox',
        checked: state[key],
        style: S.checkbox,
        onChange: (event: ChangeEvent<HTMLInputElement>) => { commit({ [key]: event.target.checked }) },
      }),
      createElement('span', { style: S.switchText }, state[key] ? '已开启' : '已关闭'),
    ),
  )
}

function sliderRow(
  state: GlassState,
  label: string,
  key: 'blur' | 'saturate' | 'alpha' | 'scrim',
  min: number,
  max: number,
  format: (value: GlassState) => string,
  disableWhenGlassOff: boolean,
): ReactElement {
  const shown = key === 'alpha' || key === 'scrim' ? Math.round(state[key] * 100) : state[key]
  return createElement('div', { key: `slider-${key}`, style: S.row },
    createElement('span', { style: S.label }, label),
    createElement('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: '1',
      value: String(shown),
      style: S.range,
      disabled: disableWhenGlassOff && !state.glass,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const raw = Number(event.target.value)
        commit({ [key]: key === 'alpha' || key === 'scrim' ? raw / 100 : raw })
      },
    }),
    createElement('span', { style: S.value }, format(state)),
  )
}

function presetRow(
  state: GlassState,
  label: string,
  presets: readonly SolidPreset[],
  kind: GlassState['wallKind'],
): ReactElement {
  const buttons = presets.map(preset => createElement('button', {
    key: preset.name,
    type: 'button',
    title: preset.name,
    'aria-label': preset.name,
    style: swatchStyle(preset, kind, state.wallpaper === preset.value && state.wallKind === kind),
    onClick: () => { commit({ wallpaper: preset.value, wallKind: kind, wall: true }) },
  }))
  return createElement('div', { key: `presets-${label}`, style: S.row },
    createElement('span', { style: S.label }, label),
    createElement('div', { style: S.swatches }, buttons),
  )
}

function themeRow(state: GlassState): ReactElement {
  const active = activeTheme(state)
  const buttons = THEMES.map(theme => createElement('button', {
    key: theme.id,
    type: 'button',
    style: pillStyle(active === theme.id),
    onClick: () => { commit(theme.patch) },
  }, theme.name))
  return createElement('div', { style: S.rowTop },
    createElement('span', { style: S.labelTop }, '套装'),
    createElement('div', { style: S.swatches },
      buttons,
      active === 'custom' ? createElement('span', { style: S.custTag }, '（当前为自定义）') : null,
    ),
  )
}

function fitRow(state: GlassState): ReactElement {
  const buttons = FITS.map(fit => createElement('button', {
    key: fit.id,
    type: 'button',
    style: pillStyle(state.fit === fit.id),
    onClick: () => { commit({ fit: fit.id }) },
  }, fit.name))
  return createElement('div', { style: S.row },
    createElement('span', { style: S.label }, '填充'),
    createElement('div', { style: S.swatches }, buttons),
  )
}

// ── 界面一：设置 → 通用 ─────────────────────────────────────────

function GlassRow(): ReactElement {
  const state = useGlassState()
  return createElement('div', { style: { padding: '10px 0' } },
    createElement('div', { style: S.head },
      createElement('span', { style: S.title }, '毛玻璃主题'),
      createElement('label', { style: S.switchWrap },
        createElement('input', {
          type: 'checkbox',
          checked: state.glass,
          style: S.checkbox,
          onChange: (event: ChangeEvent<HTMLInputElement>) => { commit({ glass: event.target.checked }) },
        }),
        createElement('span', { style: S.switchText }, state.glass ? '已开启' : '已关闭'),
      ),
    ),
    sliderRow(state, '模糊强度', 'blur', 0, 60, s => `${s.blur}px`, true),
    sliderRow(state, '面板透明度', 'alpha', 15, 97, s => `${Math.round(s.alpha * 100)}%`, false),
  )
}

// ── 界面二：设置 → 毛玻璃主题 ───────────────────────────────────

function GlassPage(): ReactElement {
  const state = useGlassState()
  const [notice, setNotice] = useState('')
  const customImage = state.wallKind === 'image' && state.wallpaper.startsWith('url(')

  const uploadRow = createElement('div', { style: S.row },
    createElement('span', { style: S.label }, '上传'),
    createElement('button', {
      type: 'button',
      style: pillStyle(false),
      onClick: () => {
        setNotice('')
        pickImage(
          (value) => {
            if (!commit({ wallpaper: value, wallKind: 'image', wall: true })) {
              setNotice('图片太大，浏览器存不下：本次已生效，但刷新后会丢失。换张小一点的图。')
            }
          },
          (message) => { setNotice(message) },
        )
      },
    }, '选择图片…'),
    customImage
      ? createElement('button', {
        type: 'button',
        style: pillStyle(false),
        onClick: () => {
          setNotice('')
          commit({ wallpaper: DEFAULTS.wallpaper, wallKind: DEFAULTS.wallKind, wall: true })
        },
      }, '移除')
      : null,
    customImage
      ? createElement('span', {
        style: {
          width: 46,
          height: 28,
          borderRadius: 5,
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3))',
          backgroundImage: state.wallpaper,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        },
      })
      : null,
  )

  return createElement('div', null,
    createElement('div', { style: S.pageTitle }, '毛玻璃主题'),
    createElement('div', { style: S.pageHint }, '毛玻璃、半透明面板和壁纸。改动即时生效，保存在本机这个浏览器里。'),

    createElement('div', { style: S.section },
      createElement('div', { style: S.sectionTitle }, '套装'),
      themeRow(state),
    ),
    createElement('div', { style: S.section },
      createElement('div', { style: S.sectionTitle }, '效果'),
      switchRow(state, '毛玻璃', 'glass'),
      sliderRow(state, '模糊强度', 'blur', 0, 60, s => `${s.blur}px`, true),
      sliderRow(state, '饱和度', 'saturate', 100, 300, s => `${s.saturate}%`, true),
      sliderRow(state, '面板透明度', 'alpha', 15, 97, s => `${Math.round(s.alpha * 100)}%`, false),
    ),
    createElement('div', { style: S.section },
      createElement('div', { style: S.sectionTitle }, '壁纸'),
      switchRow(state, '显示壁纸', 'wall'),
      presetRow(state, '纯色', SOLIDS, 'color'),
      presetRow(state, '渐变', GRADIENTS, 'image'),
      fitRow(state),
      uploadRow,
      notice === '' ? null : createElement('div', { style: S.notice }, notice),
    ),
    createElement('div', { style: S.section },
      createElement('div', { style: S.sectionTitle }, '视觉细节'),
      sliderRow(state, '壁纸遮罩', 'scrim', 0, 60, s => `${Math.round(s.scrim * 100)}%`, false),
      switchRow(state, '关闭过渡动效', 'reduceMotion'),
    ),
    createElement('div', { style: S.divider }),
    createElement('button', { type: 'button', style: pillStyle(false), onClick: resetAll }, '恢复默认'),
  )
}

// ── 插件 ────────────────────────────────────────────────────────

/**
 * Apply the saved parameters and register both settings surfaces.
 * @param ctx - client context providing the slot registry.
 */
export function apply(ctx: Context): void {
  applyStylesheet(current)

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'glass-theme',
    order: 13,
  }, GlassRow))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'glass-theme',
    order: 12,
    label: '毛玻璃主题',
  }, GlassPage))
}
