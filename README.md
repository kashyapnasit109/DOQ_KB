# DocQ — Construction Site Intelligence System

> AI-powered platform for parsing handwritten daily construction reports and enabling intelligent querying of site data.

**Built for:** Kashyap Builders & Developers  
**Domain:** Government Construction Infrastructure

---

## 🏗️ What It Does

1. **Upload handwritten daily reports** (PDF or photos) from construction sites
2. **GPT-4o Vision AI** reads and parses handwritten text into structured data
3. **Stores everything** in organized database tables (equipment, materials, labour, payments)
4. **Smart chatbot** answers questions like "How many cement bags were used at SOU on April 8?"
5. **Multi-site management** with code-based site naming to prevent inconsistencies

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Express.js + Node.js |
| **Database** | SQLite (via Drizzle ORM + better-sqlite3) |
| **AI Engine** | OpenAI GPT-4o Vision API |
| **UI Components** | shadcn/ui + Radix UI |
| **PDF Processing** | @napi-rs/canvas + pdfjs-dist |

## 📊 Database Schema

```
sites ─────────────► daily_reports ─────► equipment_usage
  │                    │                  material_usage
  │                    │                  labour_records
  │                    │                  payment_records
  │                    │
  └── documents ◄──────┘
  
users (persistent profiles with role-based access)
```

**9 tables:** users, documents, conversations, settings, sites, daily_reports, equipment_usage, material_usage, labour_records, payment_records

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key with GPT-4o access

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/docqa.git
cd docqa

# Install dependencies
npm install

# Configure API key (choose one method):

# Method 1: Environment variable (recommended for production)
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY

# Method 2: Via admin panel in the UI
# Register as admin → Settings → Enter API key

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5000**

### First-Time Setup

1. Open `http://localhost:5000`
2. **Register** — Enter your username, name, and role
3. **If Admin:** Go to Settings → Enter your PIN → Set the OpenAI API key  
4. **If Engineer:** Just start uploading reports — the API key is managed centrally

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Configure API key, manage PIN, upload reports, view data, use chatbot |
| **Engineer** | Upload reports, view all site data, use chatbot |
| **Supervisor** | Upload reports, view all site data, use chatbot |

- Profiles are stored **server-side** — register once, login by username anytime
- **Everyone** can see all sites' data (designed for remote monitoring)
- **Only admins** can access the API key configuration panel

## 📋 Features

### Upload & Parse
- Drag-and-drop PDF or photo upload
- Select construction site from dropdown (auto-suggest with site codes)
- GPT-4o Vision reads handwritten text and extracts structured data
- Parsed data displayed in organized sections (equipment, materials, labour, payments)

### Site Management
- Create sites with unique codes (SOU, METRO-AHD, etc.)
- Search/autocomplete prevents naming inconsistencies
- All team members select from the same site list

### Smart Chatbot
- Ask natural language questions about any site's data
- Cross-site and cross-date queries supported
- Precise numerical answers with ₹ formatting
- Examples:
  - "How many cement bags were used at SOU on April 8?"
  - "What was the total payment for Rokdi workers this week?"
  - "Compare equipment hours across all sites"

### Centralized Configuration
- API key managed by admin — engineers never see it
- Set via `.env` file (production) or admin panel (development)
- PIN-protected admin settings

## 📁 Project Structure

```
docqa/
├── client/               # React frontend
│   └── src/
│       ├── components/   # UI components (site-selector, app-layout)
│       ├── hooks/        # Custom hooks (use-profile)
│       ├── pages/        # Page components (chat, documents, settings, login)
│       └── lib/          # Utilities
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database layer (Drizzle ORM)
│   └── pdf-processor.ts  # GPT-4o Vision API pipeline
├── shared/
│   └── schema.ts         # Database schema (9 tables)
├── .env.example          # Environment template
└── package.json
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login by username
- `GET /api/auth/users` — List all users
- `POST /api/auth/update-pin` — Update admin PIN

### Sites
- `GET /api/sites` — List all sites
- `GET /api/sites/search?q=` — Search sites
- `POST /api/sites` — Create site
- `GET /api/sites/:id` — Get site with summary

### Documents
- `POST /api/documents` — Upload report (multipart: file + siteId + reportDate + uploadedBy)
- `GET /api/documents` — List all documents
- `GET /api/documents/:id` — Get document with parsed reports
- `DELETE /api/documents/:id` — Delete document (cascades)

### Chatbot
- `POST /api/ask` — Ask a question about site data

### Admin
- `GET /api/system/status` — Check if API key is configured
- `POST /api/admin/verify` — Verify admin PIN
- `GET/POST /api/admin/settings` — Manage API key (PIN required)

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key with GPT-4o access |
| `ADMIN_PIN` | No | Override default admin PIN (default: 1234) |

## 📝 License

Private — Kashyap Builders & Developers
