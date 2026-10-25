import { readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"

/** The /product/{category} routes, enumerated from the filesystem — never a typed list. */
const PRODUCT_DIR = join(process.cwd(), "app", "(public)", "product")
export const PRODUCT_CATEGORY_SLUGS: string[] = readdirSync(PRODUCT_DIR).filter(
    (name) => statSync(join(PRODUCT_DIR, name)).isDirectory() && existsSync(join(PRODUCT_DIR, name, "page.tsx"))
)
