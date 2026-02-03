/**
 * AI Service Factory
 * 
 * Creates and manages AI service instances.
 * Provides a singleton pattern for AI service access.
 */

import { logger } from '@/lib/logger'
import type { IAIService } from './ai-service.interface'
import { GeminiAIService } from './gemini-ai.service'
import { MockAIService } from './mock-ai.service'

export type AIServiceType = 'gemini' | 'mock'

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
    private static instance: IAIService | null = null
    private static serviceType: AIServiceType | null = null

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
        // If forcing a type or no instance exists, create new
        if (forceType && forceType !== this.serviceType) {
            this.instance = this.createService(forceType)
            this.serviceType = forceType
            return this.instance
        }

        // Return existing instance if available
        if (this.instance) {
            return this.instance
        }

        // Determine which service to use
        const serviceType = this.determineServiceType()
        this.instance = this.createService(serviceType)
        this.serviceType = serviceType

        logger('info', 'AI service initialized', {
            serviceType,
            serviceName: this.instance.getServiceName()
        })

        return this.instance
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
        if (envType === 'gemini' || envType === 'mock') {
            return envType as AIServiceType
        }

        // Check if Gemini is available
        if (process.env.GEMINI_API_KEY) {
            return 'gemini'
        }

        // Fallback to mock
        logger('warn', 'No AI service configured, using mock', {
            reason: 'GEMINI_API_KEY not found'
        })
        return 'mock'
    }

    /**
     * Resets the factory (useful for testing)
     */
    static reset(): void {
        this.instance = null
        this.serviceType = null
    }

    /**
     * Gets the current service type
     */
    static getCurrentServiceType(): AIServiceType | null {
        return this.serviceType
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
