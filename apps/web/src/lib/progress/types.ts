export type ItemStatus = 'todo' | 'in_progress' | 'done'

export type Item = {
  id: string
  title: string
  description?: string
  status: ItemStatus
  weight: number
}

export type Phase = {
  id: string
  title: string
  description?: string
  items: Item[]
}

export type ProgressDoc = {
  version: number
  updatedAt: string
  phases: Phase[]
}

export type ProgressSummary = {
  ratio: number
  doneWeight: number
  totalWeight: number
  itemsDone: number
  itemsInProgress: number
  itemsTotal: number
}

const IN_PROGRESS_FACTOR = 0.5

export function computeProgress(doc: ProgressDoc): ProgressSummary {
  let doneWeight = 0
  let totalWeight = 0
  let itemsDone = 0
  let itemsInProgress = 0
  let itemsTotal = 0

  for (const phase of doc.phases) {
    for (const item of phase.items) {
      itemsTotal += 1
      totalWeight += item.weight
      if (item.status === 'done') {
        itemsDone += 1
        doneWeight += item.weight
      } else if (item.status === 'in_progress') {
        itemsInProgress += 1
        doneWeight += item.weight * IN_PROGRESS_FACTOR
      }
    }
  }

  const ratio = totalWeight === 0 ? 0 : doneWeight / totalWeight
  return { ratio, doneWeight, totalWeight, itemsDone, itemsInProgress, itemsTotal }
}

