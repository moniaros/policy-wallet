import { test, expect } from "@playwright/test";

test.describe("Wallet Batch Upload", () => {
    test("uploads multiple files and sends a batch-create request", async ({ page }, testInfo) => {
        const projectName = testInfo.project.name;
        test.skip(/Mobile|agent/i.test(projectName), "Desktop policyholder flow only");

        let extractedCounter = 0;
        let receivedBatchPayload: any = null;

        await page.route("**/api/policies/extract", async (route) => {
            extractedCounter += 1;
            const responsePayloads = [
                {
                    success: true,
                    data: {
                        insurerName: "Acme Insurance",
                        policyNumber: "ACM-1001",
                        lineOfBusiness: "motor",
                        startDate: "2026-01-01",
                        endDate: "2027-01-01",
                        premiumAmount: 650,
                        coverageSummary: "Motor coverage",
                    },
                },
                {
                    success: true,
                    data: {
                        insurerName: "Beta Assurance",
                        policyNumber: "BTA-2002",
                        lineOfBusiness: "home",
                        startDate: "2026-02-01",
                        endDate: "2027-02-01",
                        premiumAmount: 420,
                        coverageSummary: "Home coverage",
                    },
                },
            ];
            const body = responsePayloads[Math.min(extractedCounter - 1, responsePayloads.length - 1)];
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(body),
            });
        });

        await page.route("**/api/policies/batch-create", async (route) => {
            receivedBatchPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    count: 2,
                    failedCount: 0,
                    policyIds: ["p1", "p2"],
                }),
            });
        });

        await page.goto("/wallet");
        await page.waitForLoadState("networkidle");

        await page.locator("#tour-fab").click();
        await page.getByTestId("wallet-menu-batch-upload").click();
        await expect(page.getByTestId("batch-upload-modal")).toBeVisible();

        await page.getByTestId("batch-upload-file-input").setInputFiles([
            {
                name: "policy-a.pdf",
                mimeType: "application/pdf",
                buffer: Buffer.from("%PDF-1.4 fake file A"),
            },
            {
                name: "policy-b.pdf",
                mimeType: "application/pdf",
                buffer: Buffer.from("%PDF-1.4 fake file B"),
            },
        ]);

        await expect(page.getByText("Acme Insurance")).toBeVisible();
        await expect(page.getByText("Beta Assurance")).toBeVisible();

        const saveButton = page.getByTestId("batch-upload-save-all");
        await expect(saveButton).toBeVisible();
        await saveButton.click();

        await expect.poll(() => receivedBatchPayload).not.toBeNull();
        expect(receivedBatchPayload.policies).toHaveLength(2);
        expect(receivedBatchPayload.policies[0].policyNumber).toBe("ACM-1001");
        expect(receivedBatchPayload.policies[1].policyNumber).toBe("BTA-2002");

        await expect(page.getByTestId("batch-upload-modal")).toBeHidden();
    });

    /**
     * The production failure, in a browser.
     *
     * Ten documents were uploaded, six became policies, and the four the extract
     * endpoint had rejected with a 429 — before any PDF was opened — were all
     * reported as «Η αποθήκευση ασφαλιστηρίων απέτυχε». Three separate defects
     * produced that single sentence; this asserts none of them are back.
     */
    test("explains each failure specifically and keeps the successes", async ({ page }, testInfo) => {
        test.skip(/Mobile|agent/i.test(testInfo.project.name), "Desktop policyholder flow only");

        let batchPayload: any = null;
        let extractCall = 0;

        await page.route("**/api/policies/extract", async (route) => {
            extractCall += 1;
            // The second file uploaded is the booklet. Multipart bodies are not
            // reliably readable through the route handler, so order is the hook.
            if (extractCall === 2) {
                await route.fulfill({
                    status: 422,
                    contentType: "application/json",
                    body: JSON.stringify({
                        success: false,
                        code: "NOT_AN_INSURANCE_POLICY",
                        stage: "recognition",
                        retryable: false,
                        autoRetry: false,
                        severity: "warning",
                        context: { documentKind: "terms_and_conditions", correlationId: "e2e-corr-1" },
                    }),
                });
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    notices: [],
                    data: {
                        insurerName: "Acme Insurance",
                        policyNumber: "ACM-1001",
                        lineOfBusiness: "motor",
                        startDate: "2026-01-01",
                        endDate: "2027-01-01",
                        premiumAmount: 650,
                        coverageSummary: "Motor coverage",
                    },
                }),
            });
        });

        await page.route("**/api/policies/batch-create", async (route) => {
            batchPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, count: 1, failedCount: 0, policyIds: ["p1"] }),
            });
        });

        await page.goto("/wallet");
        await page.waitForLoadState("networkidle");
        await page.locator("#tour-fab").click();
        await page.getByTestId("wallet-menu-batch-upload").click();
        await expect(page.getByTestId("batch-upload-modal")).toBeVisible();

        await page.getByTestId("batch-upload-file-input").setInputFiles([
            { name: "policy-a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 A") },
            { name: "booklet.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 B") },
        ]);

        // The failed row says what it actually was...
        const failedRow = page.locator('[data-testid="batch-upload-row"][data-status="failed"]');
        await expect(failedRow).toHaveCount(1);
        await expect(failedRow).toHaveAttribute("data-code", "NOT_AN_INSURANCE_POLICY");
        await expect(failedRow).toContainText("Το έγγραφο δεν είναι ασφαλιστήριο");
        // ...and never claims a save that never happened.
        await expect(failedRow).not.toContainText("Η αποθήκευση ασφαλιστηρίων απέτυχε");

        // The remedy is one click away, not preloaded.
        await failedRow.getByTestId("batch-upload-why").click();
        await expect(failedRow).toContainText("e2e-corr-1");

        // The good document is unaffected and saveable on its own.
        await expect(page.getByText("Acme Insurance")).toBeVisible();
        await page.getByTestId("batch-upload-save-all").click();

        await expect.poll(() => batchPayload).not.toBeNull();
        expect(batchPayload.policies).toHaveLength(1);
        expect(batchPayload.policies[0].policyNumber).toBe("ACM-1001");

        // The modal stays open over work the user still has to deal with.
        await expect(page.getByTestId("batch-upload-modal")).toBeVisible();
        await expect(failedRow).toHaveCount(1);
    });
});
