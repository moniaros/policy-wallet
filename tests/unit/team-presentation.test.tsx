import React from "react"
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const actions = vi.hoisted(() => ({ remove: vi.fn(), role: vi.fn(), create: vi.fn(), invite: vi.fn() }))
vi.mock("@/app/(protected)/team/actions", () => ({ removeMemberAction: actions.remove, updateRoleAction: actions.role, createAgencyAction: actions.create, inviteMemberAction: actions.invite, transferCustomerAction: vi.fn() }))
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "en", t: { common: { actions: "Actions" }, agentPages: { opportunities: { status: {} } } } }) }))
import { TeamClient } from "@/app/(protected)/team/TeamClient"
import type { TeamOverview } from "@/lib/services/team.service"
const team = (viewerRole: "owner" | "manager" | "member"): TeamOverview => ({
 tenantId: "t", tenantName: "Sample agency", viewerRole, revenueScope: viewerRole === "member" ? "own" : "team",
 members: [
  { id: "m1", userId: "u1", name: "Colleague", email: "test@example.test", role: "member", status: "active", joinedAt: null, customerCount: 1, pipelineValue: 0, wonValue: 0, revenueVisible: viewerRole !== "member" },
  { id: "m2", userId: "u2", name: "Manager", email: "manager@example.test", role: "manager", status: "active", joinedAt: null, customerCount: 0, pipelineValue: 0, wonValue: 0, revenueVisible: viewerRole !== "member" },
 ], stats: { totalMembers: 2, activeMembers: 2, totalCustomers: 1, totalPipeline: 0, totalWon: 0 }
})
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); actions.remove.mockResolvedValue({ error: "Forbidden" }) })
describe("agency outcomes and scope", () => {
 it("keeps a rejected action available and reports its failure", async () => {
  render(<TeamClient team={team("owner")} pipeline={[]} />)
  fireEvent.click(screen.getByRole("button", { name: "Actions: Colleague" }))
  fireEvent.click(screen.getByRole("button", { name: "Remove" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again")
  expect(screen.getByRole("button", { name: "Remove" })).toBeVisible()
  actions.remove.mockResolvedValue({ success: true })
  fireEvent.click(screen.getByRole("button", { name: "Remove" }))
  await waitFor(() => expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument())
 })
 it("labels hidden financial facts and own-scope totals without offering forbidden controls", () => {
  render(<TeamClient team={team("member")} pipeline={[]} />)
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sample agency")
  expect(screen.getAllByText("Not visible with your access")).toHaveLength(2)
  expect(screen.getByText("Your pipeline value")).toBeVisible()
  expect(screen.queryByText("Pipeline Value")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Invite Member" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Actions:/ })).not.toBeInTheDocument()
 })
 it("lets managers remove members, but not change roles or manage other managers", () => {
  render(<TeamClient team={team("manager")} pipeline={[]} />)
  expect(screen.queryByRole("button", { name: "Actions: Manager" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Actions: Colleague" }))
  expect(screen.getByRole("button", { name: "Remove" })).toBeVisible()
  expect(screen.queryByRole("button", { name: "Change Role" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Invite Member" }))
  expect(within(screen.getByRole("combobox", { name: "Role" })).queryByRole("option", { name: "Manager" })).not.toBeInTheDocument()
 })
 it("explains the team-seat prerequisite before asking for agency data", () => {
  render(<TeamClient team={null} pipeline={[]} canCreateAgency={false} />)
  expect(screen.getByRole("link", { name: "View team plans" })).toHaveAttribute("href", "/agent/pricing")
  expect(screen.queryByLabelText(/Agency Name/)).not.toBeInTheDocument()
 })
 it("preserves entered data and localises a changed entitlement rejection", async () => {
  actions.create.mockResolvedValue({ error: "UPGRADE_REQUIRED" })
  render(<TeamClient team={null} pipeline={[]} canCreateAgency />)
  fireEvent.change(screen.getByLabelText(/Agency Name/), { target: { value: "My agency" } })
  fireEvent.click(screen.getByRole("button", { name: "Create Agency" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("available team seat")
  expect(screen.getByLabelText(/Agency Name/)).toHaveValue("My agency")
  expect(screen.queryByText("UPGRADE_REQUIRED")).not.toBeInTheDocument()
 })
})
