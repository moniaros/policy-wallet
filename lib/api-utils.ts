import { NextResponse } from "next/server"

export type ApiResponse<T> = {
    data: T | null;
    meta: {
        request_id: string;
        language: string;
    };
    error: {
        code: string;
        message: string;
        details?: any;
        status: number;
    } | null;
}

export function createApiResponse<T>(
    data: T,
    language: string = "el"
): NextResponse {
    const body: ApiResponse<T> = {
        data,
        meta: {
            request_id: crypto.randomUUID(),
            language
        },
        error: null
    }
    return NextResponse.json(body)
}

export function createApiError(
    code: string,
    message: string,
    status: number = 400,
    details?: any,
    language: string = "el"
): NextResponse {
    const body: ApiResponse<null> = {
        data: null,
        meta: {
            request_id: crypto.randomUUID(),
            language
        },
        error: {
            code,
            message,
            details,
            status
        }
    }
    return NextResponse.json(body, { status })
}
