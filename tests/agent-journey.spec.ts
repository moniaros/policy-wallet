import { test, expect } from '@playwright/test';

/**
 * Agent portal smoke journey — runs under the `agent-chromium` project only
 * (agent auth state from global-setup provisioning). Assertions are
 * bilingual: the provisioned agent's UI defaults to Greek.
 */

test.describe('Agent Journey', () => {
    test('agent dashboard renders with the KPI strip', async ({ page }) => {
        await page.goto('/dashboard/agent');

        await expect(page).toHaveURL(/dashboard\/agent/);
        // Header CTA + book-of-business KPI strip
        await expect(page.getByText(/Νέος Πελάτης|New Client/i).first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(/Σύνολο πελατών|Total clients/i).first()).toBeVisible();
    });

    test('client directory renders with the CRM table', async ({ page }) => {
        await page.goto('/customers');

        await expect(page).toHaveURL(/\/customers/);
        await expect(
            page.getByRole('heading', { name: /client directory|πελατολόγιο|πελάτες|πελατών|clients/i }).first()
        ).toBeVisible({ timeout: 20000 });
    });

    test('opportunities page is reachable', async ({ page }) => {
        await page.goto('/opportunities');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(
            page.getByText(/ευκαιρί|opportunit/i).first()
        ).toBeVisible({ timeout: 20000 });
    });

    test('renewals pipeline is reachable', async ({ page }) => {
        await page.goto('/renewals');

        await expect(page).not.toHaveURL(/auth\/signin/);
        await expect(page.getByText(/ανανεώσ|renewal/i).first()).toBeVisible({ timeout: 20000 });
    });
    test('questionnaire manager lists the professional system templates', async ({ page }) => {
        await page.goto('/questionnaires');

        await expect(page).toHaveURL(/questionnaires/);
        const templates = [
            'Motor Insurance Intake',
            'Home Insurance Assessment',
            'Health Insurance Needs Analysis',
            'Life Insurance Review',
            'Pet Insurance Questionnaire',
            'Travel Insurance Intake',
            'Annual Insurance Needs Review',
        ];
        for (const name of templates) {
            await expect(page.getByText(name).first()).toBeVisible({ timeout: 20000 });
        }
        // Retired English-only seed placeholders must not surface.
        await expect(page.getByText('Motor Risk Assessment')).toHaveCount(0);
        await expect(page.getByText('Health & Lifestyle Assessment')).toHaveCount(0);
    });
});

/**
 * MEDIC evidence ladder — the blueprint's own E2E verification list:
 * confirm a gap (probable → confirmed) on the agent customer-policy view, see
 * the opportunity carry the Pain + transparent score, and log a discovery note.
 * Fixtures mirror scripts/seed-agent-demo.mjs row shapes (relationship +
 * manage grant + gap on the provisioned E2E-MOT-001 policy).
 */
test.describe('MEDIC evidence ladder', () => {
    test.describe.configure({ mode: 'serial' });

    let agentId: string;
    let phId: string;
    let policyId: string;
    let gapId: string;
    let oppId: string;

    async function prismaClient() {
        const { PrismaClient } = await import('@prisma/client');
        return new PrismaClient();
    }

    test.beforeAll(async () => {
        const db = await prismaClient();
        try {
            const [agent, ph] = await Promise.all([
                db.user.findFirstOrThrow({ where: { email: 'e2e-agent@policywallet.test' }, select: { id: true } }),
                db.user.findFirstOrThrow({ where: { email: 'e2e-ph@policywallet.test' }, select: { id: true } }),
            ]);
            agentId = agent.id;
            phId = ph.id;

            const policy = await db.policy.findFirstOrThrow({
                where: { ownerUserId: phId, policyNumber: 'E2E-MOT-001' },
                select: { id: true },
            });
            policyId = policy.id;

            let rel = await db.customerRelationship.findFirst({
                where: { agentUserId: agentId, policyholderUserId: phId },
                select: { id: true },
            });
            if (rel) {
                await db.customerRelationship.update({
                    where: { id: rel.id },
                    data: { status: 'active', activationStatus: 'active' },
                });
            } else {
                rel = await db.customerRelationship.create({
                    data: { agentUserId: agentId, policyholderUserId: phId, status: 'active', activationStatus: 'active' },
                    select: { id: true },
                });
            }

            // confirmGap gates on canWrite: a manage-level policy-scoped grant.
            const scope = `policy:${policyId}`;
            const grant = await db.accessGrant.findFirst({
                where: { granterUserId: phId, granteeUserId: agentId, scope, status: 'active' },
                select: { id: true, permissions: true },
            });
            if (!grant) {
                await db.accessGrant.create({
                    data: { granterUserId: phId, granteeUserId: agentId, scope, permissions: 'manage', status: 'active' },
                });
            } else if (grant.permissions !== 'manage') {
                await db.accessGrant.update({ where: { id: grant.id }, data: { permissions: 'manage' } });
            }

            const def = await db.gapDefinition.findFirstOrThrow({ select: { id: true } });
            const gap = await db.gapInstance.create({
                data: {
                    policyId,
                    gapDefinitionId: def.id,
                    severity: 'high',
                    status: 'open',
                    validationState: 'probable',
                    aiExplanation: 'E2E MEDIC ladder fixture gap',
                    aiExplanationEl: 'Δοκιμαστικό κενό για τη σκάλα τεκμηρίωσης',
                },
                select: { id: true },
            });
            gapId = gap.id;

            const opp = await db.opportunity.create({
                data: {
                    relationshipId: rel.id,
                    policyId,
                    gapInstanceId: gapId,
                    ownerAgentUserId: agentId,
                    status: 'open',
                    notes: 'E2E MEDIC fixture opportunity',
                    medic: {
                        pain: {
                            category: 'coverage_gap',
                            gapInstanceIds: [gapId],
                            summary: 'Δοκιμαστικό κενό',
                            severity: 'high',
                            validationState: 'probable',
                        },
                    },
                    medicScore: 17,
                    medicUpdatedAt: new Date(),
                },
                select: { id: true },
            });
            oppId = opp.id;
        } finally {
            await db.$disconnect();
        }
    });

    test.afterAll(async () => {
        const db = await prismaClient();
        try {
            const thread = await db.collaborationThread.findFirst({
                where: { linkedOpportunityId: oppId },
                select: { id: true },
            });
            if (thread) {
                await db.collaborationMessage.deleteMany({ where: { threadId: thread.id } });
                await db.collaborationThread.delete({ where: { id: thread.id } });
            }
            if (oppId) await db.opportunity.deleteMany({ where: { id: oppId } });
            if (gapId) await db.gapInstance.deleteMany({ where: { id: gapId } });
        } finally {
            await db.$disconnect();
        }
    });

    test('advisor confirms an AI-probable gap (probable → confirmed)', async ({ page }) => {
        test.setTimeout(90_000); // remote-pooler page loads
        await page.goto(`/customers/${phId}/policy/${policyId}`);

        // The AI-probable chip renders on the fixture gap…
        await expect(page.getByText(/^Πιθανό$|^Probable$/).first()).toBeVisible({ timeout: 30000 });
        // …and the advisor's forward-only confirm action flips it.
        await page.getByRole('button', { name: /Επιβεβαίωση κενού|Confirm gap/i }).first().click();
        await expect(page.getByText(/^Επιβεβαιωμένο$|^Confirmed$/).first()).toBeVisible({ timeout: 15000 });

        // The observable contract: the ladder advanced in the DB — and the
        // linked opportunity's medic mirror + score advanced WITH it.
        const db = await prismaClient();
        try {
            await expect
                .poll(async () => {
                    const g = await db.gapInstance.findUnique({ where: { id: gapId }, select: { validationState: true } });
                    return g?.validationState;
                }, { timeout: 15000 })
                .toBe('confirmed');
            await expect
                .poll(async () => {
                    const o = await db.opportunity.findUnique({ where: { id: oppId }, select: { medic: true } });
                    return (o?.medic as any)?.pain?.validationState;
                }, { timeout: 15000 })
                .toBe('confirmed');
        } finally {
            await db.$disconnect();
        }
    });

    test('opportunity modal shows the scorecard and logs a discovery note', async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto('/opportunities');

        // Open the fixture opportunity's update modal (row actions reveal on hover;
        // Playwright hovers implicitly on click).
        await page.getByRole('button', { name: /Ενημέρωση|Update/i }).first().click();

        // Scorecard behind progressive disclosure — open it and see the transparent
        // ratings (the pain dimension carries the seeded evidence).
        await page.getByText(/Προβολή αξιολόγησης|Show qualification/i).click();
        await expect(page.getByText(/Ανάγκη|^Need$/).first()).toBeVisible();
        await expect(page.getByText(/Ελλιπής εικόνα|Incomplete picture/i).first()).toBeVisible();

        // Log a discovery note (the §I capture path) and verify it persisted as a
        // private note message on the lazily-created linked thread.
        await page.locator('#opp-log-note').fill('E2E: ο σύζυγος αποφασίζει για τα οικονομικά');
        await page.getByRole('button', { name: /Αποθήκευση σημείωσης|Save note/i }).click();
        await expect(page.getByText(/Η σημείωση αποθηκεύτηκε|Note saved/i).first()).toBeVisible({ timeout: 15000 });

        const db = await prismaClient();
        try {
            await expect
                .poll(async () => {
                    const thread = await db.collaborationThread.findFirst({
                        where: { linkedOpportunityId: oppId },
                        select: { id: true },
                    });
                    if (!thread) return 0;
                    return db.collaborationMessage.count({ where: { threadId: thread.id, messageType: 'note' } });
                }, { timeout: 15000 })
                .toBeGreaterThan(0);
        } finally {
            await db.$disconnect();
        }
    });

    test('§F inline fields make the opportunity qualified («Πλήρης εικόνα»)', async ({ page }) => {
        test.setTimeout(90_000);
        // Depends on test 1 (serial): pain is now confirmed. With the € figure
        // and an identified economic buyer added here, the transparent gate
        // (pain≥confirmed + €metric + EB + score≥50) must flip to qualified —
        // this state was UNREACHABLE before the patch path existed.
        await page.goto('/opportunities');
        await page.getByRole('button', { name: /Ενημέρωση|Update/i }).first().click();
        await page.getByText(/Προβολή αξιολόγησης|Show qualification/i).click();
        await expect(page.getByText(/Ελλιπής εικόνα|Incomplete picture/i).first()).toBeVisible();

        // Metrics: € value-at-risk inline field.
        await page.locator('#medic-var').fill('25000');
        await page.locator('#medic-var-save').click();
        await expect(page.getByText('€25000').first()).toBeVisible({ timeout: 15000 });

        // Economic buyer: named by the advisor = identified.
        await page.locator('#medic-eb-name').fill('Μαρία Ε2Ε');
        await page.locator('#medic-eb-save').click();

        // The badge flips in place (medicView refresh, no reload).
        await expect(page.getByText(/Πλήρης εικόνα|Full picture/i).first()).toBeVisible({ timeout: 15000 });

        // Staleness guard: closing and reopening must NOT resurrect pre-patch
        // data — the modal re-seeds from the list row, so the row must have
        // been updated too (onMedicChange). Regression: saved € and EB looked
        // lost on reopen.
        await page.getByRole('dialog').getByRole('button', { name: /Κλείσιμο|Close/i }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.getByRole('button', { name: /Ενημέρωση|Update/i }).first().click();
        await page.getByText(/Προβολή αξιολόγησης|Show qualification/i).click();
        await expect(page.getByText(/Πλήρης εικόνα|Full picture/i).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('€25000').first()).toBeVisible();

        // Observable contract in the DB: score crossed the gate + EB persisted.
        const db = await prismaClient();
        try {
            await expect
                .poll(async () => {
                    const o = await db.opportunity.findUnique({
                        where: { id: oppId },
                        select: { medicScore: true, medic: true },
                    });
                    const eb = (o?.medic as any)?.stakeholders?.find((s: any) => s.stance === 'economic_buyer');
                    return o?.medicScore != null && o.medicScore >= 50 && eb?.identified === true;
                }, { timeout: 15000 })
                .toBe(true);
        } finally {
            await db.$disconnect();
        }
    });

    test('opening the modal + edit strip logs nothing to the console', async ({ page }) => {
        test.setTimeout(90_000);
        // Lives here rather than in agent-console-clean.spec.ts because that
        // spec has no opportunity fixture and would silently SKIP — a check
        // that stops measuring must not look like a pass.
        const problems: string[] = [];
        const ignorable = [/_vercel\//i, /va\.vercel-scripts/i, /Invalid Sentry Dsn/i, /Download the React DevTools/i];
        const real = (t: string) => !ignorable.some((re) => re.test(t));
        page.on('console', (msg) => {
            if ((msg.type() === 'error' || msg.type() === 'warning') && real(msg.text())) {
                problems.push(`[${msg.type()}] ${msg.text()}`);
            }
        });
        page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));

        await page.goto('/opportunities');
        await page.getByRole('button', { name: /Ενημέρωση|Update/i }).first().click();
        await page.getByText(/Προβολή αξιολόγησης|Show qualification/i).click();
        await expect(page.locator('#medic-var')).toBeVisible();
        // Typing into the controlled inputs is where a React warning surfaces.
        await page.locator('#medic-var').fill('4321');
        await page.locator('#medic-eb-name').count();
        await page.waitForTimeout(500);

        expect(problems, `console problems:\n${problems.join('\n')}`).toEqual([]);
    });

    test('scorecard edit strip fits a 320px phone', async ({ page }) => {
        test.setTimeout(90_000);
        // The audit's viewport spec covers agent LIST pages at >=375px; the
        // modal's §F edit strip had never rendered at phone widths. 320 is the
        // narrowest supported width and the one Greek compounds break first.
        await page.setViewportSize({ width: 320, height: 700 });
        await page.goto('/opportunities');
        await page.getByRole('button', { name: /Ενημέρωση|Update/i }).first().click();
        await page.getByText(/Προβολή αξιολόγησης|Show qualification/i).click();
        await expect(page.locator('#medic-var')).toBeVisible();

        // No sideways scroll with the modal + scorecard open.
        const overflow = await page.evaluate(() => ({
            scrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
        }));
        expect(overflow.scrollW, 'horizontal overflow with edit strip open').toBeLessThanOrEqual(overflow.clientW + 1);

        // The controls sit inside the viewport and meet the 24px tap floor.
        const input = await page.locator('#medic-var').boundingBox();
        const save = await page.locator('#medic-var-save').boundingBox();
        expect(input && save).toBeTruthy();
        expect(input!.x + input!.width).toBeLessThanOrEqual(320);
        expect(save!.x + save!.width).toBeLessThanOrEqual(320);
        expect(save!.height).toBeGreaterThanOrEqual(24);
    });
});
