'use client'

import { Popover } from '@base-ui/react/popover'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import * as React from 'react'
import { cn } from 'cn'

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

type Shade = (typeof SHADES)[number]

const tailwindPalette: { name: string; shades: Record<Shade, string> }[] = [
  {
    name: 'red',
    shades: {
      50: '#fef2f2',
      100: '#ffe2e2',
      200: '#ffc9c9',
      300: '#ffa2a2',
      400: '#ff6467',
      500: '#fb2c36',
      600: '#e7000b',
      700: '#c10007',
      800: '#9f0712',
      900: '#82181a',
      950: '#460809',
    },
  },
  {
    name: 'orange',
    shades: {
      50: '#fff7ed',
      100: '#ffedd4',
      200: '#ffd6a7',
      300: '#ffb86a',
      400: '#ff8904',
      500: '#ff6900',
      600: '#f54900',
      700: '#ca3500',
      800: '#9f2d00',
      900: '#7e2a0c',
      950: '#441306',
    },
  },
  {
    name: 'amber',
    shades: {
      50: '#fffbeb',
      100: '#fef3c6',
      200: '#fee685',
      300: '#ffd230',
      400: '#ffb900',
      500: '#fe9a00',
      600: '#e17100',
      700: '#bb4d00',
      800: '#973c00',
      900: '#7b3306',
      950: '#461901',
    },
  },
  {
    name: 'yellow',
    shades: {
      50: '#fefce8',
      100: '#fef9c2',
      200: '#fff085',
      300: '#ffdf20',
      400: '#fdc700',
      500: '#f0b100',
      600: '#d08700',
      700: '#a65f00',
      800: '#894b00',
      900: '#733e0a',
      950: '#432004',
    },
  },
  {
    name: 'lime',
    shades: {
      50: '#f7fee7',
      100: '#ecfcca',
      200: '#d8f999',
      300: '#bbf451',
      400: '#9ae600',
      500: '#7ccf00',
      600: '#5ea500',
      700: '#497d00',
      800: '#3c6300',
      900: '#35530e',
      950: '#192e03',
    },
  },
  {
    name: 'green',
    shades: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#b9f8cf',
      300: '#7bf1a8',
      400: '#05df72',
      500: '#00c950',
      600: '#00a63e',
      700: '#008236',
      800: '#016630',
      900: '#0d542b',
      950: '#032e15',
    },
  },
  {
    name: 'emerald',
    shades: {
      50: '#ecfdf5',
      100: '#d0fae5',
      200: '#a4f4cf',
      300: '#5ee9b5',
      400: '#00d492',
      500: '#00bc7d',
      600: '#009966',
      700: '#007a55',
      800: '#006045',
      900: '#004f3b',
      950: '#002c22',
    },
  },
  {
    name: 'teal',
    shades: {
      50: '#f0fdfa',
      100: '#cbfbf1',
      200: '#96f7e4',
      300: '#46ecd5',
      400: '#00d5be',
      500: '#00bba7',
      600: '#009689',
      700: '#00786f',
      800: '#005f5a',
      900: '#0b4f4a',
      950: '#022f2e',
    },
  },
  {
    name: 'cyan',
    shades: {
      50: '#ecfeff',
      100: '#cefafe',
      200: '#a2f4fd',
      300: '#53eafd',
      400: '#00d3f2',
      500: '#00b8db',
      600: '#0092b8',
      700: '#007595',
      800: '#005f78',
      900: '#104e64',
      950: '#053345',
    },
  },
  {
    name: 'sky',
    shades: {
      50: '#f0f9ff',
      100: '#dff2fe',
      200: '#b8e6fe',
      300: '#74d4ff',
      400: '#00bcff',
      500: '#00a6f4',
      600: '#0084d1',
      700: '#0069a8',
      800: '#00598a',
      900: '#024a70',
      950: '#052f4a',
    },
  },
  {
    name: 'blue',
    shades: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bedbff',
      300: '#8ec5ff',
      400: '#51a2ff',
      500: '#2b7fff',
      600: '#155dfc',
      700: '#1447e6',
      800: '#193cb8',
      900: '#1c398e',
      950: '#162456',
    },
  },
  {
    name: 'indigo',
    shades: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c6d2ff',
      300: '#a3b3ff',
      400: '#7c86ff',
      500: '#615fff',
      600: '#4f39f6',
      700: '#432dd7',
      800: '#372aac',
      900: '#312c85',
      950: '#1e1a4d',
    },
  },
  {
    name: 'violet',
    shades: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6ff',
      300: '#c4b4ff',
      400: '#a684ff',
      500: '#8e51ff',
      600: '#7f22fe',
      700: '#7008e7',
      800: '#5d0ec0',
      900: '#4d179a',
      950: '#2f0d68',
    },
  },
  {
    name: 'purple',
    shades: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d4ff',
      300: '#dab2ff',
      400: '#c27aff',
      500: '#ad46ff',
      600: '#9810fa',
      700: '#8200db',
      800: '#6e11b0',
      900: '#59168b',
      950: '#3c0366',
    },
  },
  {
    name: 'fuchsia',
    shades: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f6cfff',
      300: '#f4a8ff',
      400: '#ed6aff',
      500: '#e12afb',
      600: '#c800de',
      700: '#a800b7',
      800: '#8a0194',
      900: '#721378',
      950: '#4b004f',
    },
  },
  {
    name: 'pink',
    shades: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fccee8',
      300: '#fda5d5',
      400: '#fb64b6',
      500: '#f6339a',
      600: '#e60076',
      700: '#c6005c',
      800: '#a3004c',
      900: '#861043',
      950: '#510424',
    },
  },
  {
    name: 'rose',
    shades: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#ffccd3',
      300: '#ffa1ad',
      400: '#ff637e',
      500: '#ff2056',
      600: '#ec003f',
      700: '#c70036',
      800: '#a50036',
      900: '#8b0836',
      950: '#4d0218',
    },
  },
  {
    name: 'slate',
    shades: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cad5e2',
      400: '#90a1b9',
      500: '#62748e',
      600: '#45556c',
      700: '#314158',
      800: '#1d293d',
      900: '#0f172b',
      950: '#020618',
    },
  },
  {
    name: 'gray',
    shades: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5dc',
      400: '#99a1af',
      500: '#6a7282',
      600: '#4a5565',
      700: '#364153',
      800: '#1e2939',
      900: '#101828',
      950: '#030712',
    },
  },
  {
    name: 'zinc',
    shades: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#9f9fa9',
      500: '#71717b',
      600: '#52525c',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
  },
  {
    name: 'neutral',
    shades: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a1a1a1',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
  },
  {
    name: 'stone',
    shades: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a6a09b',
      500: '#79716b',
      600: '#57534d',
      700: '#44403b',
      800: '#292524',
      900: '#1c1917',
      950: '#0c0a09',
    },
  },
  {
    name: 'taupe',
    shades: {
      50: '#fbfaf9',
      100: '#f3f1f1',
      200: '#e8e4e3',
      300: '#d8d2d0',
      400: '#aba09c',
      500: '#7c6d67',
      600: '#5b4f4b',
      700: '#473c39',
      800: '#2b2422',
      900: '#1d1816',
      950: '#0c0a09',
    },
  },
  {
    name: 'mauve',
    shades: {
      50: '#fafafa',
      100: '#f3f1f3',
      200: '#e7e4e7',
      300: '#d7d0d7',
      400: '#a89ea9',
      500: '#79697b',
      600: '#594c5b',
      700: '#463947',
      800: '#2a212c',
      900: '#1d161e',
      950: '#0c090c',
    },
  },
  {
    name: 'mist',
    shades: {
      50: '#f9fbfb',
      100: '#f1f3f3',
      200: '#e3e7e8',
      300: '#d0d6d8',
      400: '#9ca8ab',
      500: '#67787c',
      600: '#4b585b',
      700: '#394447',
      800: '#22292b',
      900: '#161b1d',
      950: '#090b0c',
    },
  },
  {
    name: 'olive',
    shades: {
      50: '#fbfbf9',
      100: '#f4f4f0',
      200: '#e8e8e3',
      300: '#d8d8d0',
      400: '#abab9c',
      500: '#7c7c67',
      600: '#5b5b4b',
      700: '#474739',
      800: '#2b2b22',
      900: '#1d1d16',
      950: '#0c0c09',
    },
  },
]

const baseColors = [
  { name: 'white', hex: '#ffffff' },
  { name: 'black', hex: '#000000' },
] as const

const byHex = new Map<string, string>()

for (const f of tailwindPalette)
  for (const s of SHADES) byHex.set(f.shades[s].toLowerCase(), `${f.name}-${s}`)

for (const c of baseColors) byHex.set(c.hex, c.name)

function paletteName(hex: string | undefined | null) {
  return hex ? byHex.get(hex.toLowerCase()) : undefined
}

function resolvePaletteName(name: string) {
  const n = name.trim().toLowerCase()
  const base = baseColors.find((c) => c.name === n)
  if (base) return base.hex
  const m = /^([a-z]+)-(\d{2,3})$/.exec(n)
  const family = m && tailwindPalette.find((f) => f.name === m[1])
  const shade = m ? (Number(m[2]) as Shade) : null
  return family && shade && SHADES.includes(shade) ? family.shades[shade] : null
}

type GradientKind = 'linear' | 'radial' | 'conic'

type GradientStop = { color: string; alpha: number; pos: number }

type Gradient = {
  kind: GradientKind
  angle: number
  cx: number
  cy: number
  stops: GradientStop[]
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const round = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places

const hex2 = (n: number) =>
  Math.round(clamp(n, 0, 255))
    .toString(16)
    .padStart(2, '0')

function parseColor(
  input: string | undefined | null,
): { hex: string; alpha: number } | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  const h = /^#([0-9a-f]{3,8})$/.exec(s)
  if (h) {
    let v = h[1]
    if (v.length === 3 || v.length === 4)
      v = v
        .split('')
        .map((c) => c + c)
        .join('')
    if (v.length === 6) return { hex: `#${v}`, alpha: 1 }
    if (v.length === 8)
      return { hex: `#${v.slice(0, 6)}`, alpha: round(parseInt(v.slice(6), 16) / 255, 3) }
    return null
  }
  const r =
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(s)
  if (r) {
    const a =
      r[4] === undefined ? 1 : r[4].endsWith('%') ? parseFloat(r[4]) / 100 : parseFloat(r[4])
    return { hex: `#${hex2(+r[1])}${hex2(+r[2])}${hex2(+r[3])}`, alpha: clamp(a, 0, 1) }
  }
  return null
}

function withAlpha(hex: string, alpha: number) {
  const base = /^#[0-9a-f]{6}/i.exec(hex)?.[0] ?? '#000000'
  const a = clamp(alpha, 0, 1)
  return a >= 0.999 ? base : `${base}${hex2(a * 255)}`
}

const isGradient = (v: string | undefined | null): v is string =>
  !!v && /^(linear|radial|conic)-gradient\(/i.test(v.trim())

const stopsCss = (stops: GradientStop[]) =>
  [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${withAlpha(s.color, s.alpha)} ${round(s.pos)}%`)
    .join(', ')

function stringifyGradient(g: Gradient) {
  const stops = stopsCss(g.stops)
  if (g.kind === 'linear') return `linear-gradient(${round(g.angle)}deg, ${stops})`
  if (g.kind === 'radial')
    return `radial-gradient(ellipse at ${round(g.cx)}% ${round(g.cy)}%, ${stops})`
  return `conic-gradient(from ${round(g.angle)}deg at ${round(g.cx)}% ${round(g.cy)}%, ${stops})`
}

function splitTopLevel(s: string) {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function parseStops(body: string): GradientStop[] | null {
  const parts = splitTopLevel(body)
  const stops: GradientStop[] = []
  for (const part of parts) {
    const m = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s+(-?[\d.]+)%$/i.exec(part)
    const c = m && parseColor(m[1])
    if (!m || !c) return null
    stops.push({ color: c.hex, alpha: c.alpha, pos: parseFloat(m[2]) })
  }
  return stops.length >= 2 ? stops.sort((x, y) => x.pos - y.pos) : null
}

function parseGradient(css: string | undefined | null): Gradient | null {
  if (!isGradient(css)) return null
  const s = css.trim()
  let m = /^linear-gradient\(\s*(-?[\d.]+)deg\s*,\s*([\s\S]*)\)$/i.exec(s)
  if (m) {
    const stops = parseStops(m[2])
    return stops ? { kind: 'linear', angle: parseFloat(m[1]), cx: 50, cy: 50, stops } : null
  }
  m =
    /^radial-gradient\(\s*(?:ellipse|circle)?\s*at\s+([\d.]+)%\s+([\d.]+)%\s*,\s*([\s\S]*)\)$/i.exec(
      s,
    )
  if (m) {
    const stops = parseStops(m[3])
    return stops
      ? { kind: 'radial', angle: 0, cx: parseFloat(m[1]), cy: parseFloat(m[2]), stops }
      : null
  }
  m =
    /^conic-gradient\(\s*from\s+(-?[\d.]+)deg\s+at\s+([\d.]+)%\s+([\d.]+)%\s*,\s*([\s\S]*)\)$/i.exec(
      s,
    )
  if (m) {
    const stops = parseStops(m[4])
    return stops
      ? {
          kind: 'conic',
          angle: parseFloat(m[1]),
          cx: parseFloat(m[2]),
          cy: parseFloat(m[3]),
          stops,
        }
      : null
  }
  return null
}

function defaultGradient(kind: GradientKind, from?: string): Gradient {
  const c = parseColor(from) ?? { hex: '#18181b', alpha: 1 }
  return {
    kind,
    angle: kind === 'conic' ? 0 : 135,
    cx: 50,
    cy: 50,
    stops: [
      { color: c.hex, alpha: c.alpha, pos: 0 },
      { color: c.hex === '#ffffff' ? '#3b82f6' : '#ffffff', alpha: 1, pos: 100 },
    ],
  }
}

function colorAt(stops: GradientStop[], pos: number): { color: string; alpha: number } {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos)
  if (pos <= sorted[0].pos) return { color: sorted[0].color, alpha: sorted[0].alpha }
  const last = sorted[sorted.length - 1]
  if (pos >= last.pos) return { color: last.color, alpha: last.alpha }
  const i = sorted.findIndex((s) => s.pos >= pos)
  const a = sorted[i - 1]
  const b = sorted[i]
  const t = (pos - a.pos) / Math.max(0.0001, b.pos - a.pos)
  const ca = parseColor(a.color)!
  const cb = parseColor(b.color)!
  const mix = (x: number, y: number) => x + (y - x) * t
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return {
    color: `#${[0, 1, 2].map((k) => hex2(mix(ch(ca.hex, k), ch(cb.hex, k)))).join('')}`,
    alpha: round(mix(a.alpha, b.alpha), 3),
  }
}

type ColorPickerMode = 'solid' | GradientKind

interface ColorPickerProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onValueCommit?: (value: string) => void
  allowGradient?: boolean
  allowNone?: boolean
  recentColors?: string[]
  recentLabel?: string
}

interface ColorPickerPopoverProps extends ColorPickerProps {
  label?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  triggerClassName?: string
}

const MODES: { id: ColorPickerMode; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
]

const HEX6 = /^#[0-9a-f]{6}$/i

const CHECKER =
  'bg-[repeating-conic-gradient(#e4e4e7_0_25%,#fafafa_0_50%)] bg-size-[8px_8px] dark:bg-[repeating-conic-gradient(#3f3f46_0_25%,#27272a_0_50%)]'

const SPECTRUM =
  'conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)'

const SCROLLBAR =
  '[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-foreground/15 [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb:hover]:bg-foreground/30 [&::-webkit-scrollbar-track]:my-1 [&::-webkit-scrollbar-track]:bg-transparent supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:color-mix(in_oklch,var(--foreground)_20%,transparent)_transparent] supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin]'

const FIELD =
  'flex h-10 min-w-0 items-center rounded-xl bg-muted transition-[background-color,box-shadow] focus-within:ring-2 focus-within:ring-ring/40 hover:bg-muted/80'

const sameHex = (a: string | undefined, b: string) => !!a && a.toLowerCase() === b.toLowerCase()

const STOP_INSET = 20

const insetPos = (pos: number) =>
  `calc(${STOP_INSET}px + (100% - ${STOP_INSET * 2}px) * ${pos / 100})`

const insetPreview = (stops: Gradient['stops']) =>
  `linear-gradient(90deg, ${[...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${withAlpha(s.color, s.alpha)} ${insetPos(s.pos)}`)
    .join(', ')})`

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150
}

function withStop(g: Gradient, index: number, patch: Partial<Gradient['stops'][number]>) {
  const stops = g.stops.map((s, i) => (i === index ? { ...s, ...patch } : s))
  const moved = stops[index]
  const sorted = [...stops].sort((a, b) => a.pos - b.pos)
  return { gradient: { ...g, stops: sorted }, index: sorted.indexOf(moved) }
}

function startDrag(
  target: Element,
  pointerId: number,
  onMove: (e: PointerEvent) => void,
  onEnd: () => void,
) {
  const move = (e: PointerEvent) => e.pointerId === pointerId && onMove(e)
  const end = (e: Event) => {
    if (e instanceof PointerEvent && e.pointerId !== pointerId) return
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('blur', end)
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
    onEnd()
  }
  target.setPointerCapture(pointerId)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
  window.addEventListener('blur', end)
}

function useControllableColor(
  value: string | undefined,
  defaultValue: string | undefined,
  onValueChange: ((value: string) => void) | undefined,
) {
  const [internal, setInternal] = React.useState(defaultValue ?? '')
  const current = value ?? internal
  const set = (next: string) => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }
  return [current, set] as const
}

const Swatch = React.memo(function Swatch({
  name,
  hex,
  selected,
  onPick,
  className,
}: {
  name: string
  hex: string
  selected: boolean
  onPick: (hex: string) => void
  className?: string
}) {
  return (
    <button
      aria-label={name}
      aria-pressed={selected}
      className={cn(
        'relative aspect-square min-w-0 rounded-md ring-1 ring-black/10 transition-[scale,box-shadow] duration-100 outline-none ring-inset hover:z-10 hover:scale-115 hover:ring-2 hover:ring-foreground/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-foreground dark:ring-white/10',
        selected && 'z-10 scale-110 ring-2 ring-foreground dark:ring-foreground',
        className,
      )}
      data-hex={hex}
      data-name={name}
      onClick={() => onPick(hex)}
      style={{ background: hex }}
      type="button"
    >
      {selected ? (
        <svg
          aria-hidden="true"
          className="absolute inset-0 m-auto size-3"
          fill="none"
          stroke={isLight(hex) ? '#09090b' : '#ffffff'}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.5}
          viewBox="0 0 24 24"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : null}
    </button>
  )
})

const PaletteGrid = React.memo(function PaletteGrid({
  query,
  selectedHex,
  onPick,
}: {
  query: string
  selectedHex: string | undefined
  onPick: (hex: string) => void
}) {
  const q = query.trim().toLowerCase()
  const families = q ? tailwindPalette.filter((f) => f.name.includes(q)) : tailwindPalette
  if (!families.length)
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No colors match “{query}”
      </div>
    )
  return (
    <div className="grid grid-cols-[60px_repeat(11,minmax(0,1fr))] items-center gap-1">
      {families.map((f) => (
        <React.Fragment key={f.name}>
          <span className="truncate pr-1.5 text-[13px] text-muted-foreground capitalize">
            {f.name}
          </span>
          {SHADES.map((s) => (
            <Swatch
              hex={f.shades[s]}
              key={s}
              name={`${f.name}-${s}`}
              onPick={onPick}
              selected={sameHex(selectedHex, f.shades[s])}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
})

function NumberField({
  label,
  value,
  min,
  max,
  unit,
  disabled,
  className,
  title,
  onBegin,
  onChange,
}: {
  label?: string
  value: number
  min: number
  max: number
  unit?: string
  disabled?: boolean
  className?: string
  title?: string
  onBegin?: () => void
  onChange: (value: number, live: boolean) => void
}) {
  const [text, setText] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrub = React.useRef<{ startX: number; startValue: number; moved: boolean } | null>(null)

  const commitText = () => {
    if (text === null) return
    const parsed = parseFloat(text)
    setText(null)
    if (Number.isNaN(parsed)) return
    const next = clamp(parsed, min, max)
    if (next !== value) onChange(next, false)
  }

  return (
    <div
      className={cn(FIELD, disabled && 'pointer-events-none opacity-50', className)}
      title={title}
    >
      {label ? (
        <span
          className="flex h-full min-w-8 shrink-0 cursor-ew-resize touch-none items-center justify-center pr-1.5 pl-3 text-[13px] text-muted-foreground select-none"
          onPointerCancel={() => (scrub.current = null)}
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            scrub.current = { startX: e.clientX, startValue: value, moved: false }
          }}
          onPointerMove={(e) => {
            const s = scrub.current
            if (!s) return
            const dx = e.clientX - s.startX
            if (!s.moved) {
              if (Math.abs(dx) < 3) return
              s.moved = true
              onBegin?.()
            }
            onChange(clamp(Math.round(s.startValue + dx * (e.shiftKey ? 10 : 1)), min, max), true)
          }}
          onPointerUp={(e) => {
            const s = scrub.current
            scrub.current = null
            e.currentTarget.releasePointerCapture(e.pointerId)
            if (s?.moved) onChange(clamp(Math.round(value), min, max), false)
            else inputRef.current?.select()
          }}
        >
          {label}
        </span>
      ) : (
        <span className="w-3" />
      )}
      <input
        aria-label={title ?? label}
        className="h-full w-full min-w-0 bg-transparent pr-1 text-sm font-medium text-foreground tabular-nums outline-none"
        disabled={disabled}
        inputMode="decimal"
        onBlur={commitText}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setText(String(value))
          requestAnimationFrame(() => e.target.select())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setText(null)
            e.currentTarget.blur()
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const next = clamp(
              value + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1),
              min,
              max,
            )
            onChange(next, false)
            setText(String(next))
          }
        }}
        ref={inputRef}
        spellCheck={false}
        value={text ?? String(value)}
      />
      {unit ? <span className="pr-3 text-[13px] text-muted-foreground">{unit}</span> : null}
    </div>
  )
}

function HexInput({
  hex,
  disabled,
  onCommit,
}: {
  hex: string
  disabled?: boolean
  onCommit: (color: { hex: string; alpha: number | null }) => void
}) {
  const [text, setText] = React.useState<string | null>(null)
  const display = hex.replace('#', '').toUpperCase()
  const commit = () => {
    if (text === null) return
    const raw = text.trim().replace(/^#?/, '#')
    const named = resolvePaletteName(text)
    const color = parseColor(raw) ?? (named ? { hex: named, alpha: 1 } : null)
    setText(null)
    if (color) onCommit({ hex: color.hex, alpha: raw.length === 9 ? color.alpha : null })
  }
  return (
    <div className={cn(FIELD, 'flex-1 px-3', disabled && 'pointer-events-none opacity-50')}>
      <span className="text-sm text-muted-foreground">#</span>
      <input
        aria-label="Hex color"
        className="h-full w-full min-w-0 bg-transparent px-1 text-sm font-medium text-foreground uppercase tabular-nums outline-none"
        disabled={disabled}
        onBlur={commit}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setText(display)
          requestAnimationFrame(() => e.target.select())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setText(null)
            e.currentTarget.blur()
          }
        }}
        spellCheck={false}
        value={text ?? display}
      />
    </div>
  )
}

function ColorChip({ color, className }: { color: string | undefined; className?: string }) {
  return (
    <span
      className={cn(
        'block shrink-0 overflow-hidden rounded-[5px] ring-1 ring-black/10 ring-inset dark:ring-white/15',
        CHECKER,
        className,
      )}
    >
      {color ? (
        <span className="block size-full" style={{ background: color }} />
      ) : (
        <span className="block size-full bg-[linear-gradient(to_top_right,transparent_calc(50%-0.75px),#ef4444_calc(50%-0.75px),#ef4444_calc(50%+0.75px),transparent_calc(50%+0.75px))]" />
      )}
    </span>
  )
}

function GradientEditor({
  gradient,
  selected,
  onSelect,
  onCommit,
  onLive,
  onEndLive,
}: {
  gradient: Gradient
  selected: number
  onSelect: (index: number) => void
  onCommit: (gradient: Gradient, index?: number) => void
  onLive: (gradient: Gradient) => void
  onEndLive: () => void
}) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const latest = React.useRef(gradient)
  React.useLayoutEffect(() => {
    latest.current = gradient
  })
  const dragIndex = React.useRef(0)
  const stop = gradient.stops[selected]

  const posFromEvent = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    const track = r.width - STOP_INSET * 2
    return Math.round(clamp(((clientX - r.left - STOP_INSET) / track) * 100, 0, 100) * 10) / 10
  }

  const beginDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(index)
    dragIndex.current = index
    onEndLive()
    startDrag(
      e.currentTarget,
      e.pointerId,
      (ev) => {
        const next = withStop(latest.current, dragIndex.current, { pos: posFromEvent(ev.clientX) })
        dragIndex.current = next.index
        onSelect(next.index)
        onLive(next.gradient)
      },
      onEndLive,
    )
  }

  const addStop = (e: React.PointerEvent) => {
    const pos = posFromEvent(e.clientX)
    const c = colorAt(gradient.stops, pos)
    const stops = [...gradient.stops, { ...c, pos }].sort((a, b) => a.pos - b.pos)
    const index = stops.findIndex((s) => s.pos === pos && s.color === c.color)
    onCommit({ ...gradient, stops }, Math.max(0, index))
  }

  const patch = (key: 'angle' | 'cx' | 'cy', v: number, live: boolean) =>
    live ? onLive({ ...gradient, [key]: v }) : onCommit({ ...gradient, [key]: v })

  const stopPatch = (p: Partial<Gradient['stops'][number]>, live: boolean) => {
    const next = withStop(gradient, selected, p)
    if (live) {
      onSelect(next.index)
      onLive(next.gradient)
    } else onCommit(next.gradient, next.index)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          'relative h-10 rounded-xl ring-1 ring-black/10 ring-inset dark:ring-white/15',
          CHECKER,
        )}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 cursor-copy rounded-xl"
          onPointerDown={addStop}
          ref={barRef}
          style={{ background: insetPreview(gradient.stops) }}
        />
        {gradient.stops.map((s, i) => (
          <button
            aria-label={`Stop ${i + 1} at ${Math.round(s.pos)}%`}
            aria-pressed={i === selected}
            className={cn(
              'absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
              i === selected && 'ring-2 ring-foreground',
            )}
            key={i}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
              e.preventDefault()
              const step = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1)
              const next = withStop(gradient, i, { pos: clamp(s.pos + step, 0, 100) })
              onCommit(next.gradient, next.index)
            }}
            onPointerDown={(e) => beginDrag(e, i)}
            style={{ left: insetPos(s.pos), background: withAlpha(s.color, 1) }}
            type="button"
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {gradient.kind !== 'radial' ? (
          <NumberField
            label="Angle"
            max={360}
            min={-360}
            onBegin={onEndLive}
            onChange={(v, live) => patch('angle', v, live)}
            title="Angle"
            unit="°"
            value={Math.round(gradient.angle)}
          />
        ) : null}
        {gradient.kind !== 'linear' ? (
          <>
            <NumberField
              label="X"
              max={200}
              min={-100}
              onBegin={onEndLive}
              onChange={(v, live) => patch('cx', v, live)}
              title="Center X"
              unit="%"
              value={Math.round(gradient.cx)}
            />
            <NumberField
              label="Y"
              max={200}
              min={-100}
              onBegin={onEndLive}
              onChange={(v, live) => patch('cy', v, live)}
              title="Center Y"
              unit="%"
              value={Math.round(gradient.cy)}
            />
          </>
        ) : null}
      </div>

      {stop ? (
        <div className="flex items-center gap-2">
          <ColorChip className="size-10 rounded-xl" color={withAlpha(stop.color, stop.alpha)} />
          <HexInput
            hex={stop.color}
            onCommit={(c) =>
              stopPatch(
                c.alpha === null ? { color: c.hex } : { color: c.hex, alpha: c.alpha },
                false,
              )
            }
          />
          <NumberField
            className="w-[72px] flex-none"
            max={100}
            min={0}
            onBegin={onEndLive}
            onChange={(v, live) => stopPatch({ alpha: v / 100 }, live)}
            title="Stop opacity"
            unit="%"
            value={Math.round(stop.alpha * 100)}
          />
          <NumberField
            className="w-[72px] flex-none"
            max={100}
            min={0}
            onBegin={onEndLive}
            onChange={(v, live) => stopPatch({ pos: v }, live)}
            title="Stop position"
            unit="%"
            value={Math.round(stop.pos)}
          />
          <button
            aria-label="Remove stop"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"
            disabled={gradient.stops.length <= 2}
            onClick={() =>
              onCommit(
                { ...gradient, stops: gradient.stops.filter((_, i) => i !== selected) },
                Math.max(0, selected - 1),
              )
            }
            type="button"
          >
            <TrashBinMinimalisticIcon className="size-[18px]" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ColorPicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  allowGradient = false,
  allowNone = false,
  recentColors,
  recentLabel = 'Recent',
  className,
  ...props
}: ColorPickerProps) {
  const [value, setValue] = useControllableColor(valueProp, defaultValue, onValueChange)
  const [query, setQuery] = React.useState('')
  const [hover, setHover] = React.useState<{ name: string; hex: string } | null>(null)
  const [sel, setSel] = React.useState(0)
  const pendingCommit = React.useRef<string | null>(null)

  const gradient = React.useMemo(
    () => (allowGradient ? parseGradient(value) : null),
    [allowGradient, value],
  )
  const mode: ColorPickerMode = gradient ? gradient.kind : 'solid'
  const selected = gradient ? Math.min(sel, gradient.stops.length - 1) : 0
  const solid = !gradient && value && value !== 'transparent' ? parseColor(value) : null
  const activeHex = gradient ? gradient.stops[selected]?.color : solid?.hex
  const activeAlpha = gradient ? (gradient.stops[selected]?.alpha ?? 1) : (solid?.alpha ?? 1)
  const recent = React.useMemo(
    () =>
      (recentColors ?? [])
        .map((c) => parseColor(c)?.hex)
        .filter((hex, i, all): hex is string => !!hex && all.indexOf(hex) === i),
    [recentColors],
  )

  const pick = (css: string) => {
    pendingCommit.current = null
    setValue(css)
    onValueCommit?.(css)
  }
  const live = (css: string) => {
    pendingCommit.current = css
    setValue(css)
  }
  const endLive = () => {
    if (pendingCommit.current !== null) onValueCommit?.(pendingCommit.current)
    pendingCommit.current = null
  }
  const commitGradient = (g: Gradient, index?: number) => {
    if (index !== undefined) setSel(index)
    pick(stringifyGradient(g))
  }

  const pickColor = (hex: string) => {
    if (gradient) {
      const next = withStop(gradient, selected, { color: hex })
      commitGradient(next.gradient, next.index)
    } else pick(withAlpha(hex, solid?.alpha ?? 1))
  }

  const setMode = (next: ColorPickerMode) => {
    if (next === mode) return
    if (next === 'solid') {
      const first = gradient?.stops[0]
      pick(first ? withAlpha(first.color, first.alpha) : '#ffffff')
      return
    }
    const base = gradient
      ? { ...gradient, kind: next, angle: next === 'conic' ? 0 : gradient.angle || 135 }
      : defaultGradient(next, solid?.hex)
    setSel(0)
    pick(stringifyGradient(base))
  }

  const track = (e: React.PointerEvent | React.FocusEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-hex]')
    if (t?.dataset.hex) setHover({ name: t.dataset.name ?? '', hex: t.dataset.hex })
  }

  const readout =
    hover ??
    (activeHex
      ? { name: paletteName(activeHex) ?? 'Custom', hex: withAlpha(activeHex, activeAlpha) }
      : null)

  return (
    <div
      className={cn(
        'flex w-96 flex-col gap-3 rounded-[24px] bg-card p-4 font-sans text-sm font-[450] tracking-[-0.05px] text-muted-foreground shadow-card',
        allowGradient && 'h-[min(560px,var(--available-height,100vh))]',
        className,
      )}
      data-slot="color-picker"
      onFocus={track}
      onPointerLeave={() => setHover(null)}
      onPointerOver={track}
      {...props}
    >
      {allowGradient ? (
        <div className="relative flex h-11 items-center rounded-xl bg-muted p-1" role="tablist">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc((100%-8px)/4)] rounded-[9px] bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none dark:bg-card"
            style={{ transform: `translateX(${MODES.findIndex((m) => m.id === mode) * 100}%)` }}
          />
          {MODES.map((m) => (
            <button
              aria-selected={mode === m.id}
              className={cn(
                'relative h-9 flex-1 rounded-[9px] text-sm text-muted-foreground transition-[color,background-color] duration-200 outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                mode === m.id && 'text-foreground hover:bg-transparent',
              )}
              key={m.id}
              onClick={() => setMode(m.id)}
              role="tab"
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      {gradient ? (
        <GradientEditor
          gradient={gradient}
          onCommit={commitGradient}
          onEndLive={endLive}
          onLive={(g) => live(stringifyGradient(g))}
          onSelect={setSel}
          selected={selected}
        />
      ) : (
        <div className="flex items-center gap-2">
          <ColorChip
            className="size-10 rounded-xl"
            color={solid ? withAlpha(solid.hex, solid.alpha) : undefined}
          />
          <HexInput
            hex={solid?.hex ?? ''}
            onCommit={(c) => pick(withAlpha(c.hex, c.alpha ?? solid?.alpha ?? 1))}
          />
          <NumberField
            className="w-20 flex-none"
            disabled={!solid}
            max={100}
            min={0}
            onBegin={endLive}
            onChange={(v, isLive) => {
              const css = withAlpha(solid?.hex ?? '#000000', v / 100)
              if (isLive) live(css)
              else pick(css)
            }}
            title="Opacity"
            unit="%"
            value={Math.round(activeAlpha * 100)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        {allowNone && !gradient ? (
          <button
            aria-label="No color"
            aria-pressed={!solid}
            className={cn(
              'relative size-7 shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-black/15 outline-none ring-inset hover:ring-2 hover:ring-foreground/60 focus-visible:ring-2 focus-visible:ring-foreground dark:ring-white/20',
              !solid && 'ring-2 ring-foreground dark:ring-foreground',
            )}
            onClick={() => pick('')}
            type="button"
          >
            <span className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.75px),#ef4444_calc(50%-0.75px),#ef4444_calc(50%+0.75px),transparent_calc(50%+0.75px))]" />
          </button>
        ) : null}
        {baseColors.map((c) => (
          <Swatch
            className="size-7 shrink-0 rounded-lg"
            hex={c.hex}
            key={c.name}
            name={c.name}
            onPick={pickColor}
            selected={sameHex(activeHex, c.hex)}
          />
        ))}
        <label className={cn(FIELD, 'ml-1 flex-1 gap-2 px-3')}>
          <MinimalisticMagnifierIcon className="size-4 shrink-0" />
          <input
            aria-label="Filter colors"
            className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter: blue, rose…"
            spellCheck={false}
            value={query}
          />
        </label>
        <label
          className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-foreground hover:ring-2 hover:ring-foreground/60 dark:ring-white/20"
          style={{ background: SPECTRUM }}
          title="Custom color"
        >
          <input
            aria-label="Custom color"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onBlur={endLive}
            onChange={(e) => {
              const hex = e.target.value
              if (gradient)
                live(stringifyGradient(withStop(gradient, selected, { color: hex }).gradient))
              else live(withAlpha(hex, activeAlpha))
            }}
            onPointerDown={endLive}
            type="color"
            value={activeHex && HEX6.test(activeHex) ? activeHex : '#000000'}
          />
        </label>
      </div>

      <div className={cn('flex flex-col gap-2', allowGradient && 'min-h-0 flex-1')}>
        <div className="grid grid-cols-[60px_repeat(11,minmax(0,1fr))] gap-x-1">
          <span />
          {SHADES.map((s) => (
            <span className="text-center text-[10px] text-muted-foreground/70 tabular-nums" key={s}>
              {s}
            </span>
          ))}
        </div>
        <div
          className={cn(
            '-mx-1 -mr-3 overflow-y-auto py-1 pr-1.5 pl-1',
            SCROLLBAR,
            allowGradient ? 'min-h-0 flex-1' : 'max-h-[min(300px,44vh)]',
          )}
        >
          <PaletteGrid onPick={pickColor} query={query} selectedHex={activeHex} />
        </div>
      </div>

      {recent.length ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">{recentLabel}</span>
          <div className="flex flex-wrap gap-2">
            {recent.map((hex) => (
              <Swatch
                className="size-7 rounded-lg"
                hex={hex}
                key={hex}
                name={paletteName(hex) ?? hex}
                onPick={pickColor}
                selected={sameHex(activeHex, hex)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="flex h-10 items-center gap-2.5 border-t border-border pt-3"
        aria-live="polite"
      >
        {readout ? (
          <>
            <ColorChip className="size-5 rounded-md" color={readout.hex} />
            <span className="truncate text-sm font-medium text-foreground capitalize">
              {readout.name}
            </span>
            <span className="ml-auto text-sm text-muted-foreground uppercase tabular-nums">
              {readout.hex}
            </span>
          </>
        ) : (
          <span className="text-sm">Pick a color</span>
        )}
      </div>
    </div>
  )
}

function ColorPickerPopover({
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  align = 'start',
  side = 'bottom',
  triggerClassName,
  className,
  ...props
}: ColorPickerPopoverProps) {
  const [value, setValue] = useControllableColor(valueProp, defaultValue, onValueChange)
  const gradient = parseGradient(value)
  const solid = gradient ? null : parseColor(value)
  const text = gradient
    ? `${gradient.kind[0].toUpperCase()}${gradient.kind.slice(1)}`
    : solid
      ? (paletteName(solid.hex) ?? withAlpha(solid.hex, solid.alpha).toUpperCase())
      : 'None'

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            className={cn(
              'inline-flex h-11 items-center gap-2.5 rounded-full bg-muted py-1 pr-4 pl-1.5 font-sans text-sm font-[450] tracking-[-0.05px] text-muted-foreground transition-[background-color,scale] duration-150 outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] data-popup-open:bg-muted/80',
              triggerClassName,
            )}
            type="button"
          >
            <ColorChip className="size-8 rounded-full" color={value || undefined} />
            {label ? <span className="font-medium text-foreground">{label}</span> : null}
            <span className="w-[11ch] truncate text-left tabular-nums">{text}</span>
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner
          align={align}
          className="isolate z-50"
          collisionPadding={32}
          side={side}
          sideOffset={8}
        >
          <Popover.Popup
            className="origin-(--transform-origin) rounded-[24px] transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1 data-[side=top]:data-starting-style:translate-y-1 motion-reduce:transition-opacity"
            initialFocus={(type) => type === 'keyboard'}
          >
            <ColorPicker className={className} onValueChange={setValue} value={value} {...props} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { ColorPicker, ColorPickerPopover }
export type { ColorPickerMode, ColorPickerProps, ColorPickerPopoverProps }
export default ColorPicker
