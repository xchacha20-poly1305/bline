import { expect, test } from 'claude-code/testing'

const HINT = {
  plugin: 'bline',
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
  const commands: string[] = []
  on('command.run', (_, e) => {
    commands.push(e.command)

    return {}
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>? for shortcuts</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...HINT, surface })

    expect((await ui.find({ type: 'Button', text: /Opus 5\.5/ }))?.text).toBe('🐱 Opus 5.5⚡')
    expect((await ui.find({ type: 'Button', text: /medium/ }))?.text).toBe(' (medium)')
    await ui.press({ key: 'model' })
    await ui.press({ key: 'effort' })
    expect((await ui.find({ type: 'Text', text: /^medium$/ }))?.text).toBe('medium')
    expect((await ui.find({ type: 'Text', text: /shortcuts/ }))?.text).toBe('? for shortcuts')
    expect((await ui.find({ type: 'Button', text: /of 1M/ }))?.text).toBe('🈵 ███████████░░░ (80% of 1M)')
    await ui.press({ key: 'context' })
    await ui.unmount()
  }

  expect(commands).toEqual(['model', 'effort', 'usage', 'model', 'effort', 'usage'])
})

test("the model's own effort setting wins over the top-level one", async ($, on) => {
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({
    value: { effortLevel: 'medium', modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } },
  }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 0, window: 1_000_000, percent: 0 }, rateLimits: [] },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>? for shortcuts</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })

  expect((await ui.find({ type: 'Button', text: /high/ }))?.text).toBe(' (high)')
  await ui.unmount()
})
