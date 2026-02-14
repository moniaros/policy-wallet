import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: 'app/api',
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'PolicyWallet API',
                description: 'API documentation for PolicyWallet Platform',
                version: '1.0.0',
            },
            servers: [
                {
                    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    description: 'Current Environment',
                },
            ],
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key',
                    },
                },
            },
            security: [
                {
                    BearerAuth: [],
                },
            ],
        },
    })
    return spec
}
