/**
 * Questionnaire Types
 * 
 * Type definitions for questionnaire instances and responses
 */

export type QuestionType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date'

export type QuestionnaireAnswer = {
    questionId: string
    questionText: string
    value: string | number | boolean | string[]
    type: QuestionType
}

export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>

export type QuestionnaireStatus = 'pending' | 'completed' | 'expired'

export type QuestionnaireTemplate = {
    id: string
    name: string
    description: string | null
    questions: QuestionnaireQuestion[]
}

export type QuestionnaireQuestion = {
    id: string
    text: string
    type: QuestionType
    required: boolean
    options?: string[]
    validation?: {
        min?: number
        max?: number
        pattern?: string
    }
}

export type QuestionnaireInstance = {
    id: string
    templateId: string
    sentToUserId: string
    sentByUserId: string
    status: QuestionnaireStatus
    sentAt: Date
    completedAt: Date | null
    template: QuestionnaireTemplate
    sender: {
        name: string | null
        image: string | null
    }
}
