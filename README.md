# OpenCut (prev AppCut)

A free, open-source video editor for web, desktop, and mobile.

## Why?

- **Privacy**: Your videos stay on your device
- **Free features**: Every basic feature of CapCut is paywalled now
- **Simple**: People want editors that are easy to use - CapCut proved that

## Features

- Timeline-based editing
- Multi-track support
- Real-time preview
- No watermarks or subscriptions

## Project Structure

- `apps/web/` – Main Next.js web application
- `src/components/` – UI and editor components
- `src/hooks/` – Custom React hooks
- `src/lib/` – Utility and API logic
- `src/stores/` – State management (Zustand, etc.)
- `src/types/` – TypeScript types

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd OpenCut
   ```
2. **Install dependencies:**
   ```bash
   cd apps/web
   npm install
   # or, with Bun
   bun install
   ```
3. **Run the development server:**
   ```bash
   npm run dev
   # or, with Bun
   bun run dev
   ```
4. **Open in browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Contributing

We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for detailed setup instructions and development guidelines.

Quick start for contributors:

- Fork the repo and clone locally
- Follow the setup instructions in CONTRIBUTING.md
- Create a feature branch and submit a PR

## License

MIT [Details](LICENSE)
