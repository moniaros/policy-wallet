/**
 * Navigation Types
 * 
 * Type definitions for the application navigation structure
 * These types match the AppShell component expectations
 */

export type NavigationItem = {
    label: string
    href: string
    icon?: any
    badge?: number  // Only number to match AppShell
    variant?: 'default' | 'pro' | 'plus'
    isLocked?: boolean
}

export type NavigationSection = {
    title?: string  // Optional to match AppShell's NavigationGroup
    items: NavigationItem[]
}

export type UserRole = 'policyholder' | 'agent' | 'admin'

export type RoleInfo = {
    role: UserRole
    label: string
}
