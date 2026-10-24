import { expect, test } from 'claude-code/testing'

const HINT = {
  plugin: 'model-bar',
  component: 'PromptHint',
  requestId: 'hint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

test('the line shows the model, its effort and the context fill', async ($, on) => {
  on('session.model', () => ({ value: 'Opus 5.5' }))
  on('settings.read', () => ({ value: { effortLevel: 'medium', fastMode: true } }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 800_000, window: 1_000_000, percent: 80 }, rateLimits: [] },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>? for shortcuts</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...HINT, surface })

    expect((await ui.find({ type: 'Text', text: /Opus 5\.5/ }))?.text).toBe('🐱 Opus 5.5⚡ (medium)')
    expect((await ui.find({ type: 'Text', text: /^medium$/ }))?.text).toBe('medium')
    expect((await ui.find({ type: 'Text', text: /shortcuts/ }))?.text).toBe('? for shortcuts')
    expect((await ui.find({ type: 'Text', text: /of 1M/ }))?.text).toBe('🈵 ███████████░░░ (80% of 1M)')
    await ui.unmount()
  }
})
