/**
 * Haptic Feedback Utility
 * Provides tactile feedback for user interactions
 * Works on devices that support the Vibration API
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

const hapticPatterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
    selection: 5
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
    return 'vibrate' in navigator
}

/**
 * Trigger haptic feedback
 * @param pattern - Predefined pattern or custom vibration duration(s)
 */
export function triggerHaptic(pattern: HapticPattern | number | number[]): void {
    if (!isHapticSupported()) {
        console.debug('Haptic feedback not supported on this device')
        return
    }

    try {
        const vibrationPattern = typeof pattern === 'string'
            ? hapticPatterns[pattern]
            : pattern

        navigator.vibrate(vibrationPattern)
    } catch (error) {
        console.error('Haptic feedback error:', error)
    }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
    if (isHapticSupported()) {
        navigator.vibrate(0)
    }
}

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
    const vibrate = (pattern: HapticPattern | number | number[]) => {
        triggerHaptic(pattern)
    }

    const cancel = () => {
        cancelHaptic()
    }

    return {
        vibrate,
        cancel,
        isSupported: isHapticSupported()
    }
}

/**
 * Haptic feedback for common UI interactions
 */
export const hapticFeedback = {
    /**
     * Light tap - for button presses
     */
    tap: () => triggerHaptic('light'),

    /**
     * Medium impact - for toggles and switches
     */
    impact: () => triggerHaptic('medium'),

    /**
     * Heavy impact - for important actions
     */
    heavy: () => triggerHaptic('heavy'),

    /**
     * Success feedback - for completed actions
     */
    success: () => triggerHaptic('success'),

    /**
     * Warning feedback - for caution
     */
    warning: () => triggerHaptic('warning'),

    /**
     * Error feedback - for errors
     */
    error: () => triggerHaptic('error'),

    /**
     * Selection feedback - for list item selection
     */
    selection: () => triggerHaptic('selection'),

    /**
     * Swipe feedback - for swipe gestures
     */
    swipe: () => triggerHaptic(15),

    /**
     * Long press feedback - for long press actions
     */
    longPress: () => triggerHaptic([20, 50, 20]),

    /**
     * Notification feedback - for notifications
     */
    notification: () => triggerHaptic([10, 50, 10, 50, 10])
}

/**
 * HOC to add haptic feedback to click events
 */
export function withHaptic<T extends HTMLElement>(
    element: T,
    pattern: HapticPattern = 'light'
): T {
    element.addEventListener('click', () => triggerHaptic(pattern))
    return element
}

/**
 * Utility to add haptic feedback to React onClick handlers
 */
export function withHapticClick(
    onClick: () => void,
    pattern: HapticPattern = 'light'
): () => void {
    return () => {
        triggerHaptic(pattern)
        onClick()
    }
}
