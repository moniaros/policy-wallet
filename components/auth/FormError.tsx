/**
 * The one error slot per field / per form (brief §2.4): inline, `aria-live`
 * polite, always present in the DOM so assistive tech has a region to announce
 * into when the message lands. Server errors surface here too — never a toast.
 */
export function FormError({ id, children }: { id: string; children?: string | null }) {
    return (
        <p id={id} aria-live="polite" className={children ? "mt-g-2 text-sm font-medium text-state-gap" : "sr-only"}>
            {children || ""}
        </p>
    )
}
