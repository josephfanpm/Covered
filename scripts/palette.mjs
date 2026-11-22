// Builds the colour ramps in DESIGN.md from target contrast ratios (Adobe Leonardo),
// so every step is chosen for readability against the page background first.
// Run: node scripts/palette.mjs
import { BackgroundColor, Color, Theme } from '@adobe/leonardo-contrast-colors'

const ratios = { 100: 1.08, 200: 1.25, 300: 1.6, 400: 3, 500: 4.5, 600: 7, 700: 10, 800: 14 }

const paper = new BackgroundColor({ name: 'paper', colorKeys: ['#F3F7FA'], ratios })
const ramps = [
  new Color({ name: 'brand', colorKeys: ['#33A4D6', '#12466B'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'urgent', colorKeys: ['#FC8C3A', '#7A3A00'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'good', colorKeys: ['#3DC21E', '#14520A'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'bad', colorKeys: ['#CA1F1F', '#F2B3B3'], ratios, colorSpace: 'OKLCH' }),
  new Color({ name: 'slate', colorKeys: ['#4A5568', '#CBD2DC'], ratios, colorSpace: 'OKLCH' }),
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
