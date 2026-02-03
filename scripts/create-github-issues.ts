/**
 * Script to create GitHub issues for remaining tasks from ACTION_PLAN.md
 * 
 * Usage:
 * 1. Set GITHUB_TOKEN environment variable
 * 2. Run: npx tsx scripts/create-github-issues.ts
 */

interface GitHubIssue {
    title: string;
    body: string;
    labels: string[];
    milestone?: string;
}

const REPO_OWNER = 'moniaros';
const REPO_NAME = 'policy-wallet';

const issues: GitHubIssue[] = [
    // WEEK 1: Foundation & Quick Wins
    {
        title: '📚 Update README.md with comprehensive setup instructions',
        body: `## Description
Update README.md with comprehensive setup instructions for new developers.

## Tasks
- [ ] Add prerequisites (Node 20+, PostgreSQL, Supabase account)
- [ ] Document all environment variables with descriptions
- [ ] Provide step-by-step local setup guide
- [ ] Add common troubleshooting section

## Acceptance Criteria
- New developer can set up project in < 30 minutes
- All environment variables are documented
- Common issues are addressed

## Time Estimate
2 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['documentation', 'good-first-issue', 'week-1'],
    },
    {
        title: '🧹 Clean up repository structure',
        body: `## Description
Clean up the repository by organizing test files and removing unused dependencies.

## Tasks
- [ ] Move test files to \`scripts/\` or delete if obsolete
- [ ] Remove unused dependencies from package.json
- [ ] Add \`.nvmrc\` file for Node version management
- [ ] Remove any dead code

## Acceptance Criteria
- Repository is well-organized
- No unused dependencies
- Node version is specified

## Time Estimate
1 hour

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['maintenance', 'good-first-issue', 'week-1'],
    },
    {
        title: '🏥 Add health check endpoint',
        body: `## Description
Create a health check endpoint for monitoring and deployment verification.

## Tasks
- [ ] Create \`/api/health/route.ts\`
- [ ] Test database connectivity
- [ ] Add to monitoring/uptime checks
- [ ] Return service status and version

## Acceptance Criteria
- Endpoint returns 200 when healthy
- Database connectivity is verified
- Can be used by monitoring tools

## Time Estimate
30 minutes

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['enhancement', 'monitoring', 'week-1'],
    },
    {
        title: '🔍 Set up Sentry for error monitoring',
        body: `## Description
Integrate Sentry for production error tracking and performance monitoring.

## Tasks
- [ ] Install @sentry/nextjs
- [ ] Run Sentry wizard: \`npx @sentry/wizard@latest -i nextjs\`
- [ ] Configure error tracking
- [ ] Add performance monitoring
- [ ] Set up alerts for critical errors
- [ ] Test error reporting

## Acceptance Criteria
- Errors are captured in Sentry dashboard
- Performance metrics are tracked
- Alerts are configured for critical issues

## Time Estimate
3 hours

## Impact
HIGH - Catch production issues immediately

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['enhancement', 'monitoring', 'high-priority', 'week-1'],
    },
    {
        title: '🛡️ Improve error handling across the application',
        body: `## Description
Standardize error handling with custom error classes and error boundaries.

## Tasks
- [ ] Create \`lib/error-handler.ts\` with custom error classes
- [ ] Add error boundaries to key components
- [ ] Standardize API error responses
- [ ] Add user-friendly error messages
- [ ] Implement error logging

## Acceptance Criteria
- Consistent error handling across app
- User-friendly error messages
- Errors are properly logged

## Time Estimate
4 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['enhancement', 'error-handling', 'week-1'],
    },
    {
        title: '🔒 Remove all \`any\` types and improve type safety',
        body: `## Description
Eliminate all \`any\` types and improve TypeScript type safety across the codebase.

## Tasks
- [ ] Create \`types/\` directory with proper type definitions
- [ ] Define types for navigation, questionnaires, policies
- [ ] Fix all \`as any\` assertions
- [ ] Update affected files:
  - \`app/(protected)/layout.tsx\`
  - \`app/(protected)/wallet/page.tsx\`
  - \`app/(protected)/tasks/actions.ts\`

## Acceptance Criteria
- Zero \`any\` types in codebase
- All types are properly defined
- Type checking passes without errors

## Time Estimate
3 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['typescript', 'code-quality', 'week-1'],
    },
    {
        title: '⚙️ Enable strict TypeScript mode',
        body: `## Description
Enable strict mode in TypeScript configuration for better type safety.

## Tasks
- [ ] Update \`tsconfig.json\` with strict mode settings
- [ ] Fix any new errors that appear
- [ ] Ensure all files pass strict type checking

## Acceptance Criteria
- Strict mode is enabled
- All type errors are resolved
- Build passes successfully

## Time Estimate
2 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['typescript', 'code-quality', 'week-1'],
    },
    {
        title: '🧪 Set up Jest + React Testing Library',
        body: `## Description
Set up testing infrastructure with Jest and React Testing Library.

## Tasks
- [ ] Install dependencies: \`jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom\`
- [ ] Configure Jest for Next.js
- [ ] Create \`jest.config.js\`
- [ ] Add test scripts to \`package.json\`
- [ ] Set up test utilities and helpers

## Acceptance Criteria
- Jest is configured and working
- Can run tests with \`npm test\`
- Test environment is properly set up

## Time Estimate
2 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['testing', 'infrastructure', 'week-1'],
    },
    {
        title: '✅ Write initial test suite (20% coverage)',
        body: `## Description
Write initial tests for critical business logic and components.

## Tasks
- [ ] Test \`lib/gap-detection.ts\` (business logic)
- [ ] Test \`lib/auth-helpers.ts\` (critical auth logic)
- [ ] Test \`components/wallet/PolicyCard.tsx\` (UI component)
- [ ] Achieve 20% test coverage

## Acceptance Criteria
- All critical paths are tested
- Tests are passing
- 20%+ code coverage achieved

## Time Estimate
4 hours

## Related
Part of Week 1: Foundation & Quick Wins`,
        labels: ['testing', 'week-1'],
    },

    // WEEK 2: Security & Validation
    {
        title: '📝 Create Zod validation schemas',
        body: `## Description
Create comprehensive Zod schemas for input validation.

## Tasks
- [ ] Create \`lib/validations/policy.ts\` - Policy CRUD validation
- [ ] Create \`lib/validations/user.ts\` - User profile validation
- [ ] Create \`lib/validations/questionnaire.ts\` - Questionnaire validation
- [ ] Add validation error messages

## Acceptance Criteria
- All schemas are properly typed
- Validation messages are user-friendly
- Schemas cover all required fields

## Time Estimate
4 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['validation', 'security', 'week-2'],
    },
    {
        title: '🔐 Apply validation to all API routes',
        body: `## Description
Apply Zod validation to all API endpoints.

## Tasks
- [ ] Update \`/api/v1/policies/route.ts\`
- [ ] Update \`/api/v1/me/route.ts\`
- [ ] Update \`/api/v1/questionnaires/route.ts\`
- [ ] Add validation middleware
- [ ] Return proper validation errors

## Acceptance Criteria
- All API routes validate input
- Invalid requests return 400 with clear errors
- Validation is consistent across endpoints

## Time Estimate
3 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['validation', 'api', 'week-2'],
    },
    {
        title: '📎 Enhance file upload security',
        body: `## Description
Improve file upload security with validation and virus scanning.

## Tasks
- [ ] Add file type validation (PDF, images only)
- [ ] Add file size limits (10MB max)
- [ ] Sanitize file names
- [ ] Add virus scanning (ClamAV or VirusTotal API)
- [ ] Update \`app/(protected)/wallet/actions.ts\`

## Acceptance Criteria
- Only allowed file types can be uploaded
- File size is enforced
- Malicious files are blocked
- File names are sanitized

## Time Estimate
5 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'file-upload', 'high-priority', 'week-2'],
    },
    {
        title: '🗄️ Secure file storage implementation',
        body: `## Description
Implement secure file storage with proper access controls.

## Tasks
- [ ] Store files with random UUIDs
- [ ] Prevent path traversal attacks
- [ ] Add access control checks
- [ ] Implement file deletion cleanup

## Acceptance Criteria
- Files are stored securely
- Path traversal is prevented
- Only authorized users can access files

## Time Estimate
2 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'storage', 'week-2'],
    },
    {
        title: '⏱️ Implement rate limiting for critical endpoints',
        body: `## Description
Implement rate limiting using Upstash Redis to protect expensive endpoints.

## Tasks
- [ ] Enhance \`lib/rate-limit.ts\`
- [ ] Protect \`/api/v1/policies\` (POST) - 10 requests/hour
- [ ] Protect AI analysis endpoints - 5 requests/hour
- [ ] Protect file uploads - 20 requests/hour
- [ ] Add rate limit headers
- [ ] Return proper 429 responses

## Acceptance Criteria
- Rate limiting is enforced
- Limits are configurable
- Clear error messages for rate-limited requests

## Time Estimate
3 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'rate-limiting', 'week-2'],
    },
    {
        title: '🔒 Security audit: Authentication review',
        body: `## Description
Comprehensive review of authentication and authorization.

## Tasks
- [ ] Verify all protected routes have auth checks
- [ ] Test unauthorized access attempts
- [ ] Check session expiration handling
- [ ] Review password reset flow
- [ ] Test multi-factor authentication (if applicable)

## Acceptance Criteria
- All protected routes are secured
- Unauthorized access is properly blocked
- Sessions expire correctly

## Time Estimate
3 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'authentication', 'audit', 'week-2'],
    },
    {
        title: '🛡️ Implement CSRF protection',
        body: `## Description
Add CSRF protection for all state-changing operations.

## Tasks
- [ ] Add CSRF tokens for state-changing operations
- [ ] Configure SameSite cookies
- [ ] Update forms to include CSRF tokens
- [ ] Test CSRF protection

## Acceptance Criteria
- CSRF tokens are validated
- SameSite cookies are configured
- State-changing operations are protected

## Time Estimate
2 hours

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'csrf', 'week-2'],
    },
    {
        title: '🔐 Configure security headers',
        body: `## Description
Add comprehensive security headers to Next.js configuration.

## Tasks
- [ ] Update \`next.config.ts\` with security headers
- [ ] Add Content Security Policy (CSP)
- [ ] Add X-Frame-Options
- [ ] Add X-Content-Type-Options
- [ ] Add Referrer-Policy
- [ ] Test headers in production

## Acceptance Criteria
- All security headers are configured
- Headers pass security audit tools
- CSP doesn't break functionality

## Time Estimate
1 hour

## Related
Part of Week 2: Security & Validation`,
        labels: ['security', 'headers', 'week-2'],
    },

    // WEEK 3: Performance & UX
    {
        title: '🔍 Audit and optimize database queries',
        body: `## Description
Identify and fix N+1 queries and optimize database performance.

## Tasks
- [ ] Identify N+1 queries
- [ ] Add missing indexes
- [ ] Use \`select\` instead of full includes
- [ ] Optimize complex queries
- [ ] Test query performance

## Acceptance Criteria
- No N+1 queries remain
- Query performance is improved
- Database indexes are optimized

## Time Estimate
4 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['performance', 'database', 'week-3'],
    },
    {
        title: '📊 Add database indexes',
        body: `## Description
Add missing database indexes to improve query performance.

## Tasks
- [ ] Add indexes for common queries:
  \`\`\`prisma
  @@index([ownerUserId])
  @@index([status, endDate])
  @@index([createdAt])
  \`\`\`
- [ ] Run migration
- [ ] Test query performance improvements
- [ ] Document index strategy

## Acceptance Criteria
- Indexes are added
- Query performance is measurably improved
- Migration is successful

## Time Estimate
2 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['performance', 'database', 'week-3'],
    },
    {
        title: '💾 Implement Redis caching',
        body: `## Description
Implement Redis caching for frequently accessed data.

## Tasks
- [ ] Cache insurer list (rarely changes)
- [ ] Cache gap definitions
- [ ] Cache user preferences
- [ ] Set appropriate TTLs (1 hour for most data)
- [ ] Implement cache invalidation

## Acceptance Criteria
- Caching reduces database load
- Cache invalidation works correctly
- TTLs are appropriate

## Time Estimate
4 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['performance', 'caching', 'week-3'],
    },
    {
        title: '⚡ Implement React Server Components cache',
        body: `## Description
Use Next.js caching strategies for static data.

## Tasks
- [ ] Use \`unstable_cache\` for static data
- [ ] Implement revalidation strategies
- [ ] Cache API responses
- [ ] Test cache behavior

## Acceptance Criteria
- Static data is cached
- Revalidation works correctly
- Performance is improved

## Time Estimate
2 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['performance', 'nextjs', 'week-3'],
    },
    {
        title: '⏳ Add loading states and skeleton loaders',
        body: `## Description
Improve perceived performance with loading states.

## Tasks
- [ ] Add skeleton loaders for policy list
- [ ] Add progress indicators for file uploads
- [ ] Implement optimistic updates for actions
- [ ] Add loading spinners where appropriate

## Acceptance Criteria
- Loading states are smooth
- Users get immediate feedback
- Optimistic updates work correctly

## Time Estimate
4 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['ux', 'loading-states', 'week-3'],
    },
    {
        title: '🎨 Improve empty states',
        body: `## Description
Design better empty state messages and CTAs.

## Tasks
- [ ] Design better empty state messages
- [ ] Add helpful CTAs
- [ ] Create illustrations or use icons
- [ ] Make empty states actionable

## Acceptance Criteria
- Empty states are helpful
- CTAs guide users to next action
- Visual design is appealing

## Time Estimate
3 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['ux', 'design', 'week-3'],
    },
    {
        title: '♿ Accessibility audit and improvements',
        body: `## Description
Ensure the application meets WCAG AA standards.

## Tasks
- [ ] Add ARIA labels to interactive elements
- [ ] Test keyboard navigation
- [ ] Check color contrast ratios
- [ ] Add focus indicators
- [ ] Run Lighthouse accessibility audit
- [ ] Run axe DevTools audit

## Acceptance Criteria
- WCAG AA compliant
- Keyboard navigation works
- Color contrast passes
- Lighthouse accessibility score > 90

## Time Estimate
3 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['accessibility', 'a11y', 'week-3'],
    },
    {
        title: '📱 Mobile optimization and testing',
        body: `## Description
Ensure the application works well on mobile devices.

## Tasks
- [ ] Test all pages on iOS
- [ ] Test all pages on Android
- [ ] Fix responsive issues
- [ ] Optimize table layouts for mobile
- [ ] Test touch interactions

## Acceptance Criteria
- All pages work on mobile
- Responsive design is consistent
- Touch interactions are smooth

## Time Estimate
3 hours

## Related
Part of Week 3: Performance & UX`,
        labels: ['mobile', 'responsive', 'week-3'],
    },

    // WEEK 4: Advanced Features & Polish
    {
        title: '🤖 Enhanced AI analysis: Structured data extraction',
        body: `## Description
Improve AI analysis to extract structured data from policies.

## Tasks
- [ ] Extract coverage limits as structured data
- [ ] Parse premium amounts and deductibles
- [ ] Add confidence scores
- [ ] Update \`app/(protected)/wallet/actions.ts\`
- [ ] Store structured data in database

## Acceptance Criteria
- Structured data is extracted accurately
- Confidence scores are meaningful
- Data is stored in database

## Time Estimate
6 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['ai', 'enhancement', 'week-4'],
    },
    {
        title: '🌍 Multi-language support for AI analysis',
        body: `## Description
Handle Greek and English documents in AI analysis.

## Tasks
- [ ] Handle Greek and English documents
- [ ] Translate extracted data
- [ ] Detect document language
- [ ] Test with both languages

## Acceptance Criteria
- Both Greek and English documents work
- Translations are accurate
- Language detection is reliable

## Time Estimate
3 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['ai', 'i18n', 'week-4'],
    },
    {
        title: '📈 Increase test coverage to 60%',
        body: `## Description
Expand test coverage across the application.

## Tasks
- [ ] Add tests for all server actions
- [ ] Test API routes
- [ ] Test critical UI flows
- [ ] Achieve 60% coverage

## Acceptance Criteria
- 60%+ code coverage
- All critical paths are tested
- Tests are maintainable

## Time Estimate
6 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['testing', 'week-4'],
    },
    {
        title: '🎭 Set up Playwright for E2E testing',
        body: `## Description
Set up end-to-end testing with Playwright.

## Tasks
- [ ] Install Playwright: \`npm install --save-dev @playwright/test\`
- [ ] Run \`npx playwright install\`
- [ ] Write E2E tests for:
  - Authentication flow
  - Policy upload and analysis
  - Gap detection
- [ ] Configure CI to run E2E tests

## Acceptance Criteria
- Playwright is configured
- Critical flows are tested
- E2E tests pass in CI

## Time Estimate
4 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['testing', 'e2e', 'week-4'],
    },
    {
        title: '📖 Create API documentation',
        body: `## Description
Document all API endpoints with examples.

## Tasks
- [ ] Document all API endpoints
- [ ] Add request/response examples
- [ ] Create Postman collection
- [ ] Add authentication documentation

## Acceptance Criteria
- All endpoints are documented
- Examples are clear and accurate
- Postman collection works

## Time Estimate
4 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['documentation', 'api', 'week-4'],
    },
    {
        title: '📚 Create component documentation',
        body: `## Description
Document reusable components for the team.

## Tasks
- [ ] Document reusable components
- [ ] Add usage examples
- [ ] Consider setting up Storybook
- [ ] Add prop type documentation

## Acceptance Criteria
- Components are well-documented
- Usage examples are clear
- Team can easily use components

## Time Estimate
3 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['documentation', 'components', 'week-4'],
    },
    {
        title: '📝 Create user guide and help documentation',
        body: `## Description
Create help documentation for end users.

## Tasks
- [ ] Create help documentation
- [ ] Add tooltips in UI
- [ ] Create video tutorials (optional)
- [ ] Add FAQ section

## Acceptance Criteria
- Users can find help easily
- Documentation is clear
- Common questions are answered

## Time Estimate
3 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['documentation', 'user-guide', 'week-4'],
    },
    {
        title: '🔄 Set up GitHub Actions CI/CD pipeline',
        body: `## Description
Create automated CI/CD pipeline with GitHub Actions.

## Tasks
- [ ] Create \`.github/workflows/ci.yml\`
- [ ] Run tests on PR
- [ ] Run linting and type-checking
- [ ] Build verification
- [ ] Add status badges to README

## Acceptance Criteria
- CI runs on every PR
- All checks must pass before merge
- Build is verified

## Time Estimate
2 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['ci-cd', 'automation', 'week-4'],
    },
    {
        title: '🪝 Set up pre-commit hooks with Husky',
        body: `## Description
Add pre-commit hooks to enforce code quality.

## Tasks
- [ ] Install Husky and lint-staged
- [ ] Run \`npx husky install\`
- [ ] Configure pre-commit hooks:
  - Run lint and type-check before commit
  - Run tests before push
- [ ] Document in README

## Acceptance Criteria
- Hooks run automatically
- Bad code can't be committed
- Team is aware of hooks

## Time Estimate
1 hour

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['ci-cd', 'code-quality', 'week-4'],
    },
    {
        title: '🔍 Final code review and refactoring',
        body: `## Description
Comprehensive code review and cleanup before production.

## Tasks
- [ ] Review all changes
- [ ] Refactor complex code
- [ ] Remove dead code
- [ ] Update comments and documentation
- [ ] Ensure consistent code style

## Acceptance Criteria
- Code is clean and maintainable
- No dead code remains
- Documentation is up to date

## Time Estimate
4 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['code-quality', 'refactoring', 'week-4'],
    },
    {
        title: '⚡ Performance testing and optimization',
        body: `## Description
Run performance tests and optimize the application.

## Tasks
- [ ] Run Lighthouse audits
- [ ] Optimize bundle size
- [ ] Test with slow network
- [ ] Optimize images
- [ ] Achieve Lighthouse score > 90

## Acceptance Criteria
- Lighthouse score > 90
- Bundle size is optimized
- Works well on slow connections

## Time Estimate
2 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['performance', 'optimization', 'week-4'],
    },
    {
        title: '🚀 Deployment preparation and checklist',
        body: `## Description
Prepare for production deployment.

## Tasks
- [ ] Update deployment checklist
- [ ] Test staging environment
- [ ] Prepare rollback plan
- [ ] Configure production environment variables
- [ ] Set up monitoring and alerts
- [ ] Create deployment documentation

## Acceptance Criteria
- Deployment checklist is complete
- Rollback plan is tested
- Production environment is ready

## Time Estimate
2 hours

## Related
Part of Week 4: Advanced Features & Polish`,
        labels: ['deployment', 'production', 'week-4'],
    },
];

async function createIssues() {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        console.error('❌ GITHUB_TOKEN environment variable is required');
        console.log('\nTo create a GitHub token:');
        console.log('1. Go to https://github.com/settings/tokens');
        console.log('2. Click "Generate new token (classic)"');
        console.log('3. Select scopes: repo (all)');
        console.log('4. Generate token and copy it');
        console.log('5. Set environment variable: $env:GITHUB_TOKEN="your_token_here"');
        process.exit(1);
    }

    console.log(`🚀 Creating ${issues.length} GitHub issues...\n`);

    let created = 0;
    let failed = 0;

    for (const issue of issues) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(issue),
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Created: ${issue.title}`);
                console.log(`   URL: ${data.html_url}\n`);
                created++;
            } else {
                const error = await response.text();
                console.error(`❌ Failed to create: ${issue.title}`);
                console.error(`   Error: ${error}\n`);
                failed++;
            }

            // Rate limiting: wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`❌ Error creating: ${issue.title}`);
            console.error(`   ${error}\n`);
            failed++;
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${issues.length}`);
}

createIssues();
