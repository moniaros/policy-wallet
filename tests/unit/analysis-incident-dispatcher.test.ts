import { afterEach, describe, expect, it, vi } from "vitest"

import { dispatchAnalysisIncidentAlert } from "@/lib/services/analysis/incident-dispatcher"

const ORIGINAL_ENV = { ...process.env }

describe("analysis incident dispatcher adapters", () => {
    afterEach(() => {
        process.env = { ...ORIGINAL_ENV }
        vi.restoreAllMocks()
    })

    it("dispatches alerts to Slack and PagerDuty adapters when configured", async () => {
        process.env.AI_INCIDENT_SLACK_WEBHOOK_URL =
            "https://hooks.slack.test/services/T000/B000/XXX"
        process.env.AI_INCIDENT_PAGERDUTY_ROUTING_KEY = "pd-routing-key"
        process.env.AI_INCIDENT_PAGERDUTY_EVENT_URL = "https://events.pagerduty.test/v2/enqueue"

        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })

        await dispatchAnalysisIncidentAlert(
            {
                event: "AI_ANALYSIS_FAILURE_RATE_HIGH",
                ratio: 0.4,
                matchedRuns: 8,
                totalRuns: 20,
                windowMinutes: 15,
                thresholdRatio: 0.15,
                thresholdCount: null,
            },
            {
                fetchImpl: fetchMock as unknown as typeof fetch,
            }
        )

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[0]?.[0]).toBe(process.env.AI_INCIDENT_SLACK_WEBHOOK_URL)
        expect(fetchMock.mock.calls[1]?.[0]).toBe(process.env.AI_INCIDENT_PAGERDUTY_EVENT_URL)

        const slackBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
        expect(slackBody.text).toContain("AI_ANALYSIS_FAILURE_RATE_HIGH")

        const pagerDutyBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)
        expect(pagerDutyBody.routing_key).toBe("pd-routing-key")
        expect(pagerDutyBody.payload?.severity).toBe("error")
    })

    it("no-ops when incident adapters are not configured", async () => {
        delete process.env.AI_INCIDENT_SLACK_WEBHOOK_URL
        delete process.env.AI_INCIDENT_PAGERDUTY_ROUTING_KEY

        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })

        await dispatchAnalysisIncidentAlert(
            {
                event: "AI_FAILOVER_USAGE_HIGH",
                ratio: 0.3,
                matchedRuns: 6,
                totalRuns: 20,
                windowMinutes: 30,
                thresholdRatio: 0.25,
                thresholdCount: null,
            },
            {
                fetchImpl: fetchMock as unknown as typeof fetch,
            }
        )

        expect(fetchMock).not.toHaveBeenCalled()
    })
})
