# ContentAI — AI Content Generator SaaS

A full-featured AI content generation platform built with React + Vite + Tailwind CSS, powered by the Anthropic Claude API.

## Features

- **8 AI Content Tools**: Blog Post, Social Caption, Email Copy, Ad Copy, SEO Meta Tags, Product Description, YouTube Script, Landing Page
- **Streaming Output**: Real-time word-by-word generation
- **History**: Auto-saves all generations, searchable & filterable
- **Settings**: API key management, model selection, tone/language defaults
- **Dark UI**: Industrial ink/ember design with Syne + DM Sans typography

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Anthropic API key
Open Settings in the app and paste your API key from https://console.anthropic.com

Or set it as an env variable (optional):
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run development server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── tools.js       # Tool definitions & system prompts
│   ├── api.js         # Claude streaming API integration
│   └── history.js     # localStorage persistence helpers
├── components/
│   ├── Sidebar.jsx    # Collapsible navigation
│   ├── TopBar.jsx     # Header bar
│   └── ToolCard.jsx   # Reusable tool card component
└── pages/
    ├── Dashboard.jsx  # Overview with stats & quick access
    ├── Generator.jsx  # Main AI generation interface
    ├── History.jsx    # Generation history viewer
    └── Settings.jsx   # Configuration panel
```

## Tech Stack

- **React 18** + **Vite** — Fast development & build
- **Tailwind CSS v3** — Utility-first styling
- **React Router v6** — Client-side routing
- **Lucide React** — Icon library
- **Anthropic Claude API** — claude-sonnet-4-20250514 (streaming)

## Adding New Tools

Edit `src/lib/tools.js` and add a new entry to the `TOOLS` array:

```js
{
  id: "my-tool",
  name: "My Tool",
  icon: "🎨",
  color: "#hex",
  category: "Category",
  description: "Short description",
  fields: [
    { key: "topic", label: "Topic", type: "text", placeholder: "..." },
    { key: "tone", label: "Tone", type: "select", options: ["A", "B"] },
  ],
  systemPrompt: (fields) => `Your system prompt using ${fields.topic}`,
}
```
