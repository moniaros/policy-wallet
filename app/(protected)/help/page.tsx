import { getGuideSummaries } from '@/lib/guides/content'
import { HelpClient } from './HelpClient'

/**
 * Server shell: resolves the compact guide index here so the ~60KB `guides`
 * module (bodies, FAQs, sources) never ships to the client — only the slug,
 * bilingual title + summary and reading time cross into the browser. Same
 * discipline the glossary hints follow.
 */
export default function HelpPage() {
    return <HelpClient guideSummaries={getGuideSummaries()} />
}
