export type Effort = string | number

/** The context window fill, as `$.session.usage()`'s `context` reports it. */
export type ContextFill = { tokens?: number; window: number; percent?: number }

declare module 'claude-code' {
  interface PluginState {
    'model-bar': {
      effort: Effort | null
      context: ContextFill | null
    }
  }
}
