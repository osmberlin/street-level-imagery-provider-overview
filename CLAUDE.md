# Agent preferences

## General preferences

- If asked to do too much work at once, stop and state that clearly.
- Prefix every model run (subagents, workflows) with the model name/id, e.g. `[fable-5]`, `[opus-4.8]`, so which model produced which output is visible in the UI.

## Picking models (workflows and subagents)

Defaults, not limits. Override when output quality is not enough — judge output, not price; escalating costs less than shipping mediocre work.

| model        | cost (delegate ↑) | intelligence | taste |
| ------------ | ----------------- | ------------ | ----- |
| **opus-4.8** | 4                 | 7            | 8     |
| **fable-5**  | 2                 | 9            | 9     |

- **Intelligence:** hardest problem the model can handle unsupervised.
- **Taste:** UI/UX, code quality, API design, copy.
- **Cost:** tiebreaker when axes conflict; for shipped work, intelligence > taste > cost.

### How to apply

- **User-facing** (UI, copy, API shape): Fable or Opus; taste ≥ 7.
- **Reviews** of plans or implementations: Fable or Opus.
- **Fable effort:** prefer Low–High; avoid X-High / Max / Ultra-style over-reasoning unless the user insists.
