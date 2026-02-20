const SYNTHETIC_EMAIL_DOMAIN = "phone.policywallet.app"

export function normalizeGreekMobile(input: string): string | null {
    const digits = input.replace(/\D/g, "")

    let local = digits
    if (local.startsWith("00")) {
        local = local.slice(2)
    }

    if (local.startsWith("30")) {
        local = local.slice(2)
    } else if (local.startsWith("0") && local.length === 10) {
        local = local.slice(1)
    }

    // Greek mobile: 69XXXXXXXX (10 digits with leading 69 in national format)
    if (!/^69\d{8}$/.test(local)) {
        return null
    }

    return `+30${local}`
}

export function formatGreekMobile(input: string): string {
    const normalized = normalizeGreekMobile(input)
    if (!normalized) return input
    const digits = normalized.replace("+30", "")
    return `+30 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export function isLikelyEmail(input: string): boolean {
    return input.includes("@")
}

export function buildSyntheticEmailFromPhone(normalizedPhone: string): string {
    const phoneDigits = normalizedPhone.replace(/\D/g, "")
    return `phone_${phoneDigits}@${SYNTHETIC_EMAIL_DOMAIN}`
}

export function isSyntheticPhoneEmail(email: string): boolean {
    return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)
}

export function resolveAuthEmailIdentifier(input: string): { email: string; normalizedPhone: string | null; isSynthetic: boolean } {
    const trimmed = input.trim().toLowerCase()
    if (isLikelyEmail(trimmed)) {
        return { email: trimmed, normalizedPhone: null, isSynthetic: false }
    }

    const normalizedPhone = normalizeGreekMobile(trimmed)
    if (!normalizedPhone) {
        return { email: trimmed, normalizedPhone: null, isSynthetic: false }
    }

    return {
        email: buildSyntheticEmailFromPhone(normalizedPhone),
        normalizedPhone,
        isSynthetic: true,
    }
}
