import { createFileRoute } from '@tanstack/react-router'
import { DEFAULT_PROGRESS_DOC } from '#/lib/progress/default'
import { computeProgress, type Item, type Phase } from '#/lib/progress/types'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const doc = DEFAULT_PROGRESS_DOC
  const summary = computeProgress(doc)
  const pct = Math.round(summary.ratio * 1000) / 10

  return (
    <div className="mx-auto max-w-3xl p-8 font-sans">
      <h1 className="text-3xl font-bold">OpenCut rewrite</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {summary.itemsDone} of {summary.itemsTotal} items done
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded bg-neutral-200">
        <div
          className="h-full bg-neutral-900"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-neutral-400">{pct}% complete</p>

      <div className="mt-8 space-y-8">
        {doc.phases.map((phase) => (
          <PhaseSection key={phase.id} phase={phase} />
        ))}
      </div>
    </div>
  )
}

function PhaseSection({ phase }: { phase: Phase }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{phase.title}</h2>
      {phase.description && (
        <p className="text-sm text-neutral-500">{phase.description}</p>
      )}
      <ul className="mt-3 space-y-1">
        {phase.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

function ItemRow({ item }: { item: Item }) {
  const symbol = item.status === 'done' ? '✓' : item.status === 'in_progress' ? '◐' : '○'
  const isDone = item.status === 'done'
  const isInProgress = item.status === 'in_progress'

  return (
    <li className={`flex items-baseline gap-3 text-sm ${isDone || isInProgress ? 'text-neutral-900' : 'text-neutral-400'}`}>
      <span aria-hidden className="w-4 text-center">{symbol}</span>
      <span>
        <span className="font-medium">{item.title}</span>
        {item.description && (
          <span className="ml-2 text-neutral-500">{item.description}</span>
        )}
      </span>
    </li>
  )
}
