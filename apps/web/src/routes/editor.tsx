import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/editor')({ component: Editor })

function Editor() {
  return (
    <main>
      <h1>Editor</h1>
      <p>Coming soon.</p>
    </main>
  )
}
