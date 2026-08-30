import type { appEl } from './el'

/** English mirror of the `app` namespace — identical shape, enforced by the type (a missing key fails tsc). */
export const appEn: typeof appEl = {
    nav: {
        protection: 'Protection',
        see: 'Worth a look',
        policies: 'Folder',
        money: 'Money',
        me: 'You',
        updates: 'Updates',
        adviser: 'Adviser',
        add: 'Add a policy',
        primary: 'Primary navigation',
        skip: 'Skip to content',
        back: 'Back',
        brand: 'PolicyWallet — home',
        updatesBadge: '{count, plural, =0 {Updates} one {Updates — # new} other {Updates — # new}}',
        moreThanNine: '9+',
    },
    shell: {
        yourAccount: 'Your account',
        plan: 'Plan: {plan}',
    },
    state: {
        covered: 'Covered',
        gap: 'Gap',
        review: 'Needs review',
    },
    tier: {
        now: { title: 'Look at this now', definition: 'Expires within 14 days, or a gap in something essential you told me you have.' },
        month: { title: 'This month', definition: 'Expires within 45 days, or the price moved above the index, or a limit that should be stated is not.' },
        later: { title: 'When you have time', definition: 'Anything worth a look, with no date attached.' },
    },
    money: {
        title: 'Your money',
        interim: 'You pay {amount} a year for the policies in force today.',
        interimNote: 'This page is still being built — the other figures appear once I have checked them.',
    },
}
