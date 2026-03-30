import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyAction, getAllowedActions } from "../shared/workflow"

describe("workflow", () => {
  it("draft allows save/submit/delete for creator business", () => {
    const ctx = { role: "business" as const, isCreator: true, isAssignee: false }
    assert.deepEqual(getAllowedActions("draft", ctx), ["save", "submit", "delete"])
    assert.equal(applyAction("draft", "save", ctx), "draft")
    assert.equal(applyAction("draft", "submit", ctx), "approving")
    assert.equal(applyAction("draft", "delete", ctx), null)
  })

  it("approving allows withdraw for creator business", () => {
    const ctx = { role: "business" as const, isCreator: true, isAssignee: false }
    assert.deepEqual(getAllowedActions("approving", ctx), ["withdraw"])
    assert.equal(applyAction("approving", "withdraw", ctx), "draft")
  })

  it("approving allows approve/reject for assignee approver", () => {
    const ctx = { role: "approver" as const, isCreator: false, isAssignee: true, approvalIsFinal: false }
    assert.deepEqual(getAllowedActions("approving", ctx), ["approve", "reject"])
    assert.equal(applyAction("approving", "approve", ctx), "approving")
    assert.equal(applyAction("approving", "reject", ctx), "rejected")
  })

  it("approve can reach done when final", () => {
    const ctx = { role: "approver" as const, isCreator: false, isAssignee: true, approvalIsFinal: true }
    assert.equal(applyAction("approving", "approve", ctx), "done")
  })

  it("rejected allows handle for creator business", () => {
    const ctx = { role: "business" as const, isCreator: true, isAssignee: false }
    assert.deepEqual(getAllowedActions("rejected", ctx), ["handle"])
    assert.equal(applyAction("rejected", "handle", ctx), "draft")
  })

  it("throws ActionNotAllowed when ctx mismatch", () => {
    const ctx = { role: "manager" as const, isCreator: false, isAssignee: false }
    assert.throws(() => applyAction("draft", "submit", ctx), /ActionNotAllowed/)
  })
})

