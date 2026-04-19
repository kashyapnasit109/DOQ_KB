# DocQ — Document Intelligence

Upload handwritten PDF documents and ask questions about their content using AI. Documents persist so you can query historical uploads at any time.

## Features

- **PDF Upload** — Drag-and-drop or click to upload handwritten/typed PDF documents (up to 50 MB)
- **Text Extraction** — Automatic text extraction from uploaded PDFs using `pdfjs-dist`
- **AI-Powered Q&A** — Ask natural language questions across all your documents, powered by OpenAI (`gpt-4o-mini`)
- **Document Library** — Browse, search, and manage all uploaded documents with page-level detail
- **Conversation History** — Chat history is preserved so you can revisit past questions and answers
- **Dark Mode** — Full light/dark theme support
- **Settings** — Configure your OpenAI API key directly in the app

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React, Tailwind CSS, shadcn/ui, Wouter          |
| Backend    | Express, Node.js                                |
| Database   | SQLite (better-sqlite3) + Drizzle ORM           |
| PDF        | pdfjs-dist (legacy build)                       |
| AI         | OpenAI API (gpt-4o-mini)                        |
| Build      | Vite (client) + esbuild (server)                |
| Font       | Satoshi (Fontshare CDN)                         |

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The dev server starts Express (backend) and Vite (frontend) on the same port.

### Production

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

### Database

The app uses SQLite with Drizzle ORM. To initialize or update the database schema:

```bash
npx drizzle-kit push
```

### Configuration

1. Open the app and navigate to **Settings**
2. Enter your OpenAI API key
3. The key is stored securely in the local SQLite database

## Project Structure

```
docqa/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── pages/        # Route pages (Chat, Documents, Settings)
│   │   ├── lib/          # Utilities, query client, theme
│   │   └── hooks/        # Custom React hooks
│   └── index.html
├── server/               # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry
├── shared/
│   └── schema.ts         # Drizzle ORM schema + Zod validation
└── uploads/              # Uploaded PDF files
```

## API Endpoints

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/api/documents`          | List all documents             |
| GET    | `/api/documents/:id`      | Get document with pages        |
| POST   | `/api/documents/upload`   | Upload a PDF document          |
| DELETE | `/api/documents/:id`      | Delete a document              |
| GET    | `/api/conversations`      | List conversations             |
| POST   | `/api/conversations`      | Create a conversation          |
| POST   | `/api/ask`                | Ask a question (AI-powered)    |
| GET    | `/api/settings`           | Get app settings               |
| PUT    | `/api/settings`           | Update settings (API key)      |

## License

MIT
