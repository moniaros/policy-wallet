import { permanentRedirect } from "next/navigation"

// The English partners page used to live here, on a Greek-tree URL served
// as Greek (lang el). It moved to its /en home; the Greek copy is
// /solutions/synergates. Kept because the URL was handed out directly (A-04).
export default function PartnersRedirect() {
    permanentRedirect("/en/solutions/partners")
}
