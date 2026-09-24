"use client"

import { useState, useTransition } from "react"
import { StickyNote } from "lucide-react"
import { savePolicyNote } from "@/app/(protected)/wallet/note-actions"

/** Spec v2 §10.3: the viewer's private note. Saved on demand, never auto. */
export function PolicyNoteCard({ policyId, initialBody, copy }: {
    policyId: string
    initialBody: string
    copy: { title: string; hint: string; placeholder: string; save: string; saved: string; error: string }
}) {
    const [body, setBody] = useState(initialBody)
    const [savedBody, setSavedBody] = useState(initialBody)
    const [state, setState] = useState<"idle" | "saved" | "error">("idle")
    const [pending, start] = useTransition()
    const dirty = body.trim() !== savedBody.trim()

    return (
        <div className="pw-subcard p-4" data-fact="policy.viewerNote">
            <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">{copy.hint}</p>
            <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setState("idle") }}
                placeholder={copy.placeholder}
                maxLength={2000}
                rows={3}
                aria-label={copy.title}
                className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
                <p role="status" className="text-caption text-muted-foreground">
                    {state === "saved" ? copy.saved : state === "error" ? copy.error : ""}
                </p>
                <button
                    type="button"
                    disabled={!dirty || pending}
                    onClick={() => start(async () => {
                        const result = await savePolicyNote(policyId, body)
                        if ("ok" in result) { setSavedBody(body); setState("saved") } else setState("error")
                    })}
                    className="pw-soft-button disabled:opacity-50"
                >
                    {copy.save}
                </button>
            </div>
        </div>
    )
}
