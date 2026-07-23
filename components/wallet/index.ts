// The MyPoliciesScreen/MyProfileScreen pair lived here as a separate MOBILE
// component tree behind a JS breakpoint fork. That fork is gone — PolicyWallet
// is one responsive tree (cards below lg, table above) — so they were deleted.
export { PolicyCard } from './PolicyCard'
export { PolicyWallet } from './PolicyWallet'
// Types
export type { Policy, PolicyWalletProps } from './types'
