# PolicyWallet Platform

A modern insurance management SaaS platform for agents and policyholders, built with Next.js 16, Prisma, and Supabase.

## 🌟 Features

- **Multi-Role Support**: Policyholder, Agent, and Admin roles
- **AI-Powered Analysis**: Automatic policy document analysis using Google Gemini
- **Gap Detection**: Identify coverage gaps and opportunities
- **ACORD Compliance**: Industry-standard insurance data modeling
- **Digital Wallet**: Apple Wallet and Google Wallet integration
- **Multi-Language**: Support for Greek and English
- **Dark Mode**: Full dark mode support

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **AI**: Google Gemini 1.5 Flash
- **Styling**: Tailwind CSS 4
- **Payments**: Stripe
- **Email**: Brevo (formerly Sendinblue)
- **Rate Limiting**: Upstash Redis

## 📋 Prerequisites

- **Node.js**: 20.11.0 or higher (see `.nvmrc`)
- **PostgreSQL**: 14+ (or use Supabase)
- **Supabase Account**: For authentication and database
- **Google Gemini API Key**: For AI features (optional)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd policy-wallet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/dbname"

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# NextAuth (Required)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# AI Features (Optional but recommended)
GEMINI_API_KEY="your-gemini-api-key"

# Email (Optional)
BREVO_API_KEY="your-brevo-api-key"
SENDER_EMAIL="noreply@yourdomain.com"

# Payments (Optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### 4. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed initial data (insurers, gap definitions, etc.)
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
policy-wallet/
├── app/                    # Next.js App Router
│   ├── (protected)/       # Protected routes (requires auth)
│   │   ├── wallet/        # Policy wallet
│   │   ├── dashboard/     # Agent dashboard
│   │   ├── customers/     # Customer management
│   │   └── ...
│   ├── (public)/          # Public pages
│   ├── api/               # API routes
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── wallet/           # Wallet-specific components
│   ├── agent/            # Agent-specific components
│   └── ui/               # Shared UI components
├── lib/                   # Utilities and helpers
│   ├── auth-helpers.ts   # Authentication utilities
│   ├── gap-detection.ts  # Gap analysis logic
│   └── ...
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── public/               # Static assets
```

## 🧪 Testing

```bash
# Run tests (once set up)
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## 🏗️ Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

See `docs/operations/DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 📚 Documentation

```
docs/
├── planning/           # Roadmaps, specs, plans
│   ├── V2_SPEC_ROADMAP_STATUS.md    # v2 delivery tracker
│   ├── AI_ANALYSIS_PLAN.md          # AI feature roadmap
│   ├── AI_PROJECT_BRIEF.md          # Agent orientation doc
│   ├── PLAN_ai_analysis_improvements.md
│   ├── PLAN_b4_launch.md            # Greece GA launch plan
│   ├── PAGE_INVENTORY.md            # Route map
│   ├── LANDING_CONVERSION_SEO_CONTENT_BRIEF.md
│   ├── UI_UX_ENHANCEMENT_PLAN.md
│   ├── pending.md                   # Agent experience tracker
│   └── RealityReport.md             # Gap analysis & 90-day plan
├── architecture/       # Technical system docs
│   ├── AI_PIPELINE.md               # Gemini processing pipeline
│   ├── AI_ANALYSIS_SYSTEM.md        # 3-tier AI system docs
│   ├── mobileApp.md                 # Mobile API spec
│   └── COLLABORATION.md             # Sharing feature docs
├── design/             # UI/UX specifications
│   ├── PRODUCT_SPEC_V2.md           # v2 product specification
│   ├── POLICYHOLDER_ONBOARDING_DESIGN.md
│   ├── NOTIFICATIONS_ACCOUNT_REDESIGN.md
│   └── REDESIGN_IMPLEMENTATION_SUMMARY.md
├── operations/         # Runbooks, deployment, monitoring
│   ├── DEPLOYMENT_GUIDE.md
│   ├── SENTRY_SETUP.md
│   ├── BREVO_SMTP_SETUP.md
│   ├── RUNBOOK_*.md                 # Incident runbooks
│   └── SRE_DRILL_EVIDENCE_*.md
├── compliance/         # Legal, GDPR, billing compliance
├── governance/         # Release governance & evidence
├── uat/                # UAT sign-off & evidence
├── launch/             # Go/no-go & evidence index
│   ├── GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md
│   └── EVIDENCE_INDEX_GR-GA-2026.03.md
├── testing/            # Test plans
│   └── USER_JOURNEY_TEST_PLAN.md
└── reference/          # Glossary & guidelines
    └── BILINGUAL_GUIDELINES.md      # Greek/English voice & terminology
```

See also: `design-system/policywallet/MASTER.md` for the canonical design system.

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Run database migrations
- `npx prisma db seed` - Seed database with initial data

## 🐛 Troubleshooting

### Database Connection Issues

Ensure your `DATABASE_URL` and `DIRECT_URL` are correct. If using Supabase:
- Use the connection pooler URL for `DATABASE_URL`
- Use the direct connection URL for `DIRECT_URL`

### Authentication Issues

1. Check Supabase redirect URLs are configured:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### AI Analysis Not Working

Ensure `GEMINI_API_KEY` is set and valid. Get one from [Google AI Studio](https://makersuite.google.com/app/apikey).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 🆘 Support

For issues and questions:
- Check existing documentation
- Review troubleshooting section
- Contact the development team

## 🎯 Roadmap

See `docs/planning/V2_SPEC_ROADMAP_STATUS.md` for the current delivery tracker and `docs/planning/RealityReport.md` for the strategic 90-day roadmap.

---

**Built with ❤️ using Next.js, Prisma, and Supabase**
