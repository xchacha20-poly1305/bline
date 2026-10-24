import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage } from 'claude-code'

import type { ContextFill, Effort } from '../types'

const effortAtom = atom({ plugin: 'bline', key: 'effort' } as const, null)
const contextAtom = atom({ plugin: 'bline', key: 'context' } as const, null)

const BAR_CELLS = 14

type ModelFamily = { part: string; color: string; emoji: string }

// Checked in order, so a name that contains two families takes the first.
const MODEL_FAMILIES: readonly ModelFamily[] = [
  { part: 'mythos', color: '#FF4040', emoji: '🐉' },
  { part: 'fable', color: '#FFD700', emoji: '📖' },
  { part: 'opus', color: '#9DC1FF', emoji: '🐱' },
  { part: 'sonnet', color: '#FF79C6', emoji: '🎵' },
  { part: 'haiku', color: '#9AE65C', emoji: '🥺' },
]

const EFFORT_COLORS: Readonly<Record<string, string>> = {
  xhigh: '#FF4040',
  high: '#FF9A3C',
  medium: '#FFD84D',
  low: '#5FD75F',
}
const EFFORT_OTHER_COLOR = '#A8D4FF'
const RAINBOW_EFFORTS = new Set(['ultra', 'ultracode', 'max'])
const RAINBOW = ['#FF4040', '#FF9A3C', '#FFD84D', '#5FD75F', '#5FAFFF', '#8C7CFF', '#E070FF']

// From this much of the window used, the context counts as nearly full.
const NEARLY_FULL_PERCENT = 80
const NEARLY_FULL_MARK = '🈵'

// The fill's color by how much of the window is used, the first bound it is under.
const FILL_COLORS: ReadonlyArray<readonly [number, string]> = [
  [50, '#5FD75F'],
  [NEARLY_FULL_PERCENT, '#FFD84D'],
  [Infinity, '#FF4040'],
]

function fillColor(percent: number): string | undefined {
  return FILL_COLORS.find(([bound]) => percent < bound)?.[1]
}

const MODEL_PREFIX = 'claude-'
const FAST_MARK = '⚡'

function displayModel(model: string): string {
  return model.startsWith(MODEL_PREFIX) ? model.slice(MODEL_PREFIX.length) : model
}

function modelFamily(model: string): ModelFamily | undefined {
  const name = model.toLowerCase()

  return MODEL_FAMILIES.find(({ part }) => name.includes(part))
}

function formatTokens(tokens: number): string {
  const units: ReadonlyArray<readonly [number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ]

  for (const [size, suffix] of units) {
    if (tokens >= size) {
      const value = tokens / size
      const digits = Number.isInteger(value) || value >= 100 ? 0 : 1

      return `${Number(value.toFixed(digits))}${suffix}`
    }
  }

  return String(tokens)
}

// Keeps the figures alone: the state holds plain data the contract declares.
function toFill({ tokens, window, percent }: SessionContextUsage): ContextFill {
  return { tokens, window, percent }
}

function usedPercent(context: ContextFill): number {
  if (context.percent !== undefined) {
    return context.percent
  }

  if (context.tokens === undefined || context.window === 0) {
    return 0
  }

  return Math.round((context.tokens / context.window) * 100)
}

async function readSettingsEffort($: EngineInterface): Promise<Effort | null> {
  const value = await $.settings.read({ key: 'effortLevel' })

  return typeof value === 'string' || typeof value === 'number' ? value : null
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const effort = await readSettingsEffort($)
    const { context } = await $.session.usage()
    await update($, effortAtom, current => current ?? effort)
    await update($, contextAtom, () => toFill(context))

    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, contextAtom, () => toFill(e.context))

    return next(e)
  })

  // The effort a main-loop request is actually sent with is the truest reading.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const effort = e.effort ?? null
      await update($, effortAtom, () => effort)
    }

    return yield* next(e)
  })

  on('command.run', { command: 'effort' }, async ($, e, next) => {
    const result = await next(e)
    const typed = e.args.trim()
    const effort = typed === '' ? await readSettingsEffort($) : typed
    await update($, effortAtom, current => effort ?? current)

    return result
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const engineLine = await next(e)
    const model = displayModel(await $.session.model())
    const family = modelFamily(model)
    // `/fast` saves its toggle to this setting.
    const isFast = (await $.settings.read({ key: 'fastMode' })) === true
    const effort = await read($, effortAtom)
    const context = await read($, contextAtom)
    const { Box, Text } = $.ui.resolve(e)

    const effortLabel = effort === null ? null : String(effort)
    const effortKey = effortLabel?.toLowerCase() ?? ''
    const effortText =
      effortLabel === null ? null : RAINBOW_EFFORTS.has(effortKey) ? (
        [...effortLabel].map((char, index) => (
          <Text color={RAINBOW[index % RAINBOW.length]}>{char}</Text>
        ))
      ) : (
        <Text color={EFFORT_COLORS[effortKey] ?? EFFORT_OTHER_COLOR}>{effortLabel}</Text>
      )

    const percent = context === null ? null : usedPercent(context)
    const filled = percent === null ? 0 : Math.round((Math.min(percent, 100) / 100) * BAR_CELLS)

    // The engine's line refuses an ancestor that sizes it, so the layout lives
    // in its siblings: the row stretches by default and a spacer takes the rest.
    return (
      <Box flexDirection="row">
        <Box flexShrink={0} marginRight={2}>
          <Text>
            {family === undefined ? null : `${family.emoji} `}
            <Text color={family?.color}>{model}</Text>
            {isFast ? FAST_MARK : null}
            {effortText === null ? null : <Text> ({effortText})</Text>}
          </Text>
        </Box>
        {engineLine}
        <Box flexGrow={1} />
        {context === null || percent === null ? null : (
          <Box flexShrink={0} marginLeft={2}>
            <Text>
              {percent >= NEARLY_FULL_PERCENT ? `${NEARLY_FULL_MARK} ` : null}
              <Text color={fillColor(percent)}>{'█'.repeat(filled)}</Text>
              <Text dimColor>{'░'.repeat(BAR_CELLS - filled)}</Text>
              {' ('}
              <Text color={fillColor(percent)}>{`${percent}%`}</Text>
              {' '}
              <Text dimColor>{`of ${formatTokens(context.window)}`}</Text>
              {')'}
            </Text>
          </Box>
        )}
      </Box>
    )
  })
}
