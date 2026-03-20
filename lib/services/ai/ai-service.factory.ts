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
     * Determines which AI service type to use
     * 
     * Priority:
     * 1. Environment variable AI_SERVICE_TYPE
     * 2. Gemini if API key is available
     * 3. Mock as fallback
     * 
     * @returns Service type to use
     */
    private static determineServiceType(): AIServiceType {
        // Check environment variable
        const envType = process.env.AI_SERVICE_TYPE?.toLowerCase()
        if (envType === 'gemini' || envType === 'openai' || envType === 'anthropic' || envType === 'mock') {
            return envType as AIServiceType
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

        // Fallback to mock
        logger('warn', 'No AI service configured, using mock', {
            reason: 'GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY not found'
        })
        return 'mock'
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
