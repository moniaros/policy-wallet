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
});
