"use client"

/**
 * /styleguide harness for the interactive auth components — every state the
 * brief's A1 asks to see, in both themes (tokens do the theming). DEV-ONLY
 * consumer: the styleguide route 404s in production.
 */
import { useState } from "react"
import { SOCIAL_PROVIDERS } from "@/lib/auth/social-providers"
import { AuthDivider } from "@/components/auth/AuthDivider"
import { FormError } from "@/components/auth/FormError"
import { FormField, AUTH_INPUT_CLASS } from "@/components/auth/FormField"
import { PasswordField } from "@/components/auth/PasswordField"
import { RoleSwitchLink } from "@/components/auth/RoleSwitchLink"
import { SocialButton } from "@/components/auth/SocialButton"
import { TermsCheckbox } from "@/components/auth/TermsCheckbox"

export function StyleguideAuthDemo() {
    const [password, setPassword] = useState("")
    const [terms, setTerms] = useState(false)
    return (
        <div className="grid max-w-[880px] gap-g-8 lg:grid-cols-2">
            <section className="flex flex-col gap-g-5 rounded-g-lg border border-border-subtle bg-surface-raised p-g-5">
                <h3 className="font-semibold">Form atoms</h3>
                <FormField id="sg-email" label="Email" hint="Εδώ στέλνω τις υπενθυμίσεις.">
                    <input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} className={AUTH_INPUT_CLASS} placeholder="you@example.com" />
                </FormField>
                <FormField id="sg-email-err" label="Email (error state)" error="Χρειάζομαι ένα email για να σας στέλνω τις υπενθυμίσεις.">
                    <input type="email" className={AUTH_INPUT_CLASS} defaultValue="not-an-email" />
                </FormField>
                <PasswordField
                    id="sg-password"
                    locale="el"
                    label="Κωδικός πρόσβασης"
                    value={password}
                    inputProps={{ value: password, onChange: (e) => setPassword(e.target.value) }}
                />
                <TermsCheckbox
                    locale="el"
                    error={terms ? null : "Για να συνεχίσετε, αποδεχθείτε τους όρους."}
                    inputProps={{ checked: terms, onChange: (e) => setTerms(e.target.checked) }}
                />
                <FormError id="sg-form-error">Ο διακομιστής επέστρεψε σφάλμα — έτσι φαίνεται εδώ.</FormError>
            </section>
            <section className="flex flex-col gap-g-5 rounded-g-lg border border-border-subtle bg-surface-raised p-g-5">
                <h3 className="font-semibold">Social row (all providers, forced visible)</h3>
                <div className="flex flex-col gap-g-3">
                    {SOCIAL_PROVIDERS.map((p) => (
                        <SocialButton key={p.id} provider={p} label={`Συνέχεια με ${p.name}`} onClick={() => {}} />
                    ))}
                    <SocialButton provider={SOCIAL_PROVIDERS[0]} label="Συνέχεια με Google (pending)" pending onClick={() => {}} />
                </div>
                <AuthDivider label="ή" />
                <RoleSwitchLink locale="el" target="agent" />
                <RoleSwitchLink locale="el" target="policyholder" />
                <p className="text-g-caption text-fg-secondary">
                    Στις σελίδες, το SocialAuthRow αποδίδει ΜΟΝΟ τους παρόχους με status «live» από το
                    lib/auth/social-providers — εδώ φαίνονται όλοι για έλεγχο εμφάνισης.
                </p>
            </section>
        </div>
    )
}
