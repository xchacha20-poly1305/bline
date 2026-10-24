# model-bar

A Claude Code mod that puts the model, its reasoning effort and the context window fill on the hint line under the prompt:

```
🐱 opus-5-5⚡ (medium)    ? for shortcuts    ███████████░░░ (80% of 1M)
```

- **Model**, left: the name `/model` shows, a leading `claude-` dropped, colored and marked by family: mythos 🐉 red, fable 📖 gold, opus 🐱 blue, sonnet 🎵 pink, haiku 🥺 green; any other model in the default color with no mark. `⚡` follows it while fast mode (the `fastMode` setting) is on.
- **Effort**, in brackets: ultra, ultracode and max in rainbow colors, xhigh red, high orange, medium yellow, low green, any other value blue.
- **Context window**, right: a 14-cell bar and the share used, green under 50%, yellow under 80%, red from 80%, where `🈵` shows before the bar.

The engine's own hint line (`? for shortcuts`, `esc to interrupt`, its pills) stays between the two.

## Install

From [agent-plugins](https://github.com/xchacha20-poly1305/agent-plugins):

```shell
claude plugin marketplace add https://github.com/xchacha20-poly1305/agent-plugins.git
claude plugin install model-bar@anrong-plugins
```

## License

MIT
