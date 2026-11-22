// Builds the colour ramps in DESIGN.md from target contrast ratios (Adobe Leonardo),
// so every step is chosen for readability against the page background first.
// Run: node scripts/palette.mjs
import { BackgroundColor, Color, Theme } from '@adobe/leonardo-contrast-colors'

const ratios = { 100: 1.08, 200: 1.25, 300: 1.6, 400: 3, 500: 4.5, 600: 7, 700: 10, 800: 14 }

const paper = new BackgroundColor({ name: 'paper', colorKeys: ['#F4F7F6'], ratios })
const ramps = [
  new Color({ name: 'spruce', colorKeys: ['#0E4F54', '#8FC7C2'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'marigold', colorKeys: ['#F5B82E', '#7A4B00'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'moss', colorKeys: ['#2F7D4F', '#A9D9B5'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'brick', colorKeys: ['#B8432F', '#F0B7A8'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'slate', colorKeys: ['#3D4F52', '#C9D3D2'], ratios, colorSpace: 'OKLCH' }),
]

const theme = new Theme({ colors: ramps, backgroundColor: paper, lightness: 96, output: 'HEX' })

for (const group of theme.contrastColors) {
  if (!group.values) {
    console.log(`--paper: ${group.background};`)
    continue
  }
  group.values.forEach((step, i) => {
    console.log(`--${group.name}-${Object.keys(ratios)[i]}: ${step.value}; /* ${step.contrast}:1 */`)
  })
}
