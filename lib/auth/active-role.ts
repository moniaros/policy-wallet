/**
 * Cookie holding the role whose navigation the shell renders for a multi-role
 * user. Navigation state only — never an authorization signal; every page and
 * API guards itself server-side regardless of this value.
 *
 * It lives here rather than beside the server action because a `"use server"`
 * module may only export async functions.
 */
export const ACTIVE_ROLE_COOKIE = "pw_active_role"
