export interface BrandThemeTokens {
    bg: {
        canvas: string
        soft: string
    }
    text: {
        primary: string
        muted: string
        inverse: string
    }
    surface: {
        card: string
        elevated: string
    }
    border: {
        subtle: string
        strong: string
    }
    accent: {
        primary: string
        cta: string
        trust: string
    }
}

export const brandTheme: Record<"light" | "dark", BrandThemeTokens> = {
    light: {
        bg: {
            canvas: "#f4f8fb",
            soft: "#ecf4f3",
        },
        text: {
            primary: "#111b3f",
            muted: "#496182",
            inverse: "#ffffff",
        },
        surface: {
            card: "#ffffff",
            elevated: "#f8fbff",
        },
        border: {
            subtle: "#d8e4ef",
            strong: "#afc3d7",
        },
        accent: {
            primary: "#12b886",
            cta: "#f97316",
            trust: "#0f766e",
        },
    },
    dark: {
        bg: {
            canvas: "#020617",
            soft: "#0b132a",
        },
        text: {
            primary: "#eaf2ff",
            muted: "#9cb2cc",
            inverse: "#ffffff",
        },
        surface: {
            card: "#0f172a",
            elevated: "#111d34",
        },
        border: {
            subtle: "#1f2f48",
            strong: "#35506e",
        },
        accent: {
            primary: "#34d399",
            cta: "#fb923c",
            trust: "#2dd4bf",
        },
    },
}

export const brandRadius = {
    sm: "0.625rem",
    md: "0.875rem",
    lg: "1rem",
    xl: "1.25rem",
}
