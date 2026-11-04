# AdVibe Prospect Intelligence

AI-powered business discovery, evidence-grounded prospect research, Dream 100 CRM, personalised email outreach, idempotent Gmail draft generation, and relationship follow-up management platform for **AdVibe Studios**.

## Key Features

- **Automated Multi-Market Business Discovery**: Configured for 50 newly qualified businesses/day across the United States (15), United Kingdom (12), Nigeria (10), Ghana (7), and Kenya (6) across 26 commercial categories.
- **Evidence-Grounded AI Research & 8-Criterion Lead Qualification**: Versioned research reports with source URLs, confidence ratings, and strict non-hallucination rules (unestablished private metrics explicitly marked `"Not publicly established"`).
- **Dream 100 CRM & 18-Stage Sales Pipeline**: Unified 8-tab Business Profile Drawer, multi-contact management, domain normalization, and duplicate merge tools.
- **Campaign Studio & Idempotent Gmail Draft Integration (`advibestudios.global@gmail.com`)**: Individual human approval workflow, Google OAuth 2.0 (`gmail.compose` & `gmail.readonly`), and strict separation of Gmail drafts from confirmed sent emails.
- **Follow-up Manager & Reply Auto-Pause Guard**: 14 structured follow-up outcomes with automated next-step recommendations and instant sequence pausing when a prospect replies.

## Quick Start & GitHub Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and provide your keys:

```bash
cp .env.example .env
```

- `GEMINI_API_KEY`: Google Gemini API key for live business discovery, research synthesis, and personalised email generation.
- `PORT`: Server port (defaults to `3000`).

### 3. Run in Development

```bash
npm run dev
```

### 4. Production Build & Start

```bash
npm run build
npm start
```

### 5. Run Unit & Security Rules Tests

```bash
npx tsx --test firestore.rules.test.ts src/utils/intelligenceRules.test.ts
```
