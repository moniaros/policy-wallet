/**
 * AI Service Factory
 * 
 * Creates and manages AI service instances.
 * Provides a singleton pattern for AI service access.
 */

import { logger } from '@/lib/logger'
import type { IAIService } from './ai-service.interface'
import { AnthropicAIService } from './anthropic-ai.service'
import { GeminiAIService } from './gemini-ai.service'
import { MockAIService } from './mock-ai.service'
import { OpenAIAIService } from './openai-ai.service'

export type AIServiceType = 'gemini' | 'openai' | 'anthropic' | 'mock'

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
    private static instances: Partial<Record<AIServiceType, IAIService>> = {}
    private static defaultServiceType: AIServiceType | null = null

    /**
     * Gets the current AI service instance
     * 
     * Creates a new instance if one doesn't exist.
     * Uses Gemini by default if API key is available, otherwise uses Mock.
     * 
     * @param forceType - Force a specific service type
     * @returns AI service instance
     */
    static getService(forceType?: AIServiceType): IAIService {
        const serviceType = forceType || this.defaultServiceType || this.determineServiceType()

        if (!forceType && !this.defaultServiceType) {
            this.defaultServiceType = serviceType
        }

        if (!this.instances[serviceType]) {
            const service = this.createService(serviceType)
            this.instances[serviceType] = service
            logger('info', 'AI service initialized', {
                serviceType,
                serviceName: service.getServiceName()
            })
        }

        return this.instances[serviceType] as IAIService
    }

    /**
     * Creates a new AI service instance
     * 
     * @param type - Type of service to create
     * @returns AI service instance
     */
    private static createService(type: AIServiceType): IAIService {
        switch (type) {
            case 'gemini':
                return new GeminiAIService()
            case 'openai':
                return new OpenAIAIService()
            case 'anthropic':
                return new AnthropicAIService()
            case 'mock':
                return new MockAIService()
            default:
                logger('warn', 'Unknown AI service type, using mock', { type })
                return new MockAIService()
        }
    }

    /**
     * Whether the mock provider may be used at all.
     *
     * The mock returns `insurerName: "Mock Insurance Co."` and «Εικονική
     * εξήγηση» for ANY document, styled identically to a real analysis. Reaching
     * it by accident is the worst failure this system has — the user is shown
     * fabricated facts about their own insurance and has no way to tell.
     * So it requires a deliberate signal, never the absence of one.
     */
    static isMockAllowed(): boolean {
        return (
            process.env.AI_ALLOW_MOCK === '1' ||
            process.env.AI_SERVICE_TYPE?.toLowerCase() === 'mock' ||
            process.env.NODE_ENV === 'test'
        )
    }

    /**
     * Determines which AI service type to use
     *
     * Priority:
     * 1. Environment variable AI_SERVICE_TYPE (mock still requires opt-in)
     * 2. The first provider whose API key is present
     * 3. Mock — ONLY when explicitly allowed; otherwise this throws
     *
     * @returns Service type to use
     * @throws when no provider is configured and mock is not opted into
     */
    private static determineServiceType(): AIServiceType {
        // Check environment variable
        const envType = process.env.AI_SERVICE_TYPE?.toLowerCase()
        if (envType === 'gemini' || envType === 'openai' || envType === 'anthropic') {
            return envType as AIServiceType
        }
        if (envType === 'mock') {
            // Explicit request — honoured, but still announced so it can never
            // be mistaken for real output in a log trail.
            logger('warn', 'AI mock provider selected explicitly', {
                reason: 'AI_SERVICE_TYPE=mock',
            })
            return 'mock'
        }

        // Check if Gemini is available
        if (process.env.GEMINI_API_KEY) {
            return 'gemini'
        }
        if (process.env.ANTHROPIC_API_KEY) {
            return 'anthropic'
        }
        if (process.env.OPENAI_API_KEY) {
            return 'openai'
        }

        // No provider key. Previously this fell through to the mock silently:
        // the app then rendered "Mock Insurance Co." with «Εικονική εξήγηση» over
        // whatever the user had actually uploaded, with no banner anywhere.
        if (!this.isMockAllowed()) {
            throw new Error(
                'No AI provider configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY or ' +
                'OPENAI_API_KEY. To run deliberately against fabricated demo data, ' +
                'set AI_ALLOW_MOCK=1 — never do this in production.'
            )
        }

        logger('warn', 'No AI service configured, using mock (explicitly allowed)', {
            reason: 'GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY not found',
            allowedBy: process.env.AI_ALLOW_MOCK === '1' ? 'AI_ALLOW_MOCK' : 'NODE_ENV=test',
        })
        return 'mock'
    }

    /**
     * The service type that WOULD be used, without instantiating anything.
     *
     * Callers persisting a provider name (e.g. `PolicyAnalysisRun.provider`)
     * must use this rather than assuming a default — a run row that claims
     * "gemini" while the mock produced the data is a lie in the audit trail
     * and defeats every downstream "is this real?" check.
     */
    static resolveServiceType(): AIServiceType {
        return this.defaultServiceType ?? this.determineServiceType()
    }

    /**
     * Resets the factory (useful for testing)
     */
    static reset(): void {
        this.instances = {}
        this.defaultServiceType = null
    }

    /**
     * Gets the current service type
     */
    static getCurrentServiceType(): AIServiceType | null {
        return this.defaultServiceType
    }

    /**
     * Checks if an AI service is available
     */
    static isServiceAvailable(): boolean {
        const service = this.getService()
        return service.isAvailable()
    }
}

/**
 * Convenience function to get AI service
 * 
 * @param forceType - Force a specific service type
 * @returns AI service instance
 * 
 * @example
 * ```typescript
 * const aiService = getAIService()
 * const result = await aiService.extractPolicyData(document)
 * ```
 */
export function getAIService(forceType?: AIServiceType): IAIService {
    return AIServiceFactory.getService(forceType)
}

/**
 * The provider that will actually serve requests, for persistence and display.
 *
 * @returns the resolved provider type, or `null` when none is configured —
 * callers recording a run should surface that rather than guessing a default.
 */
export function getActiveAIProvider(): AIServiceType | null {
    try {
        return AIServiceFactory.resolveServiceType()
    } catch {
        return null
    }
}
