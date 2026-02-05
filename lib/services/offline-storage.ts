import { openDB, DBSchema, IDBPDatabase } from 'idb'

const DB_NAME = 'policywallet-offline'
const DB_VERSION = 1
const STORE_POLICIES = 'policies'
const STORE_META = 'metadata'

interface PolicyWalletDB extends DBSchema {
    policies: {
        key: string
        value: any
    }
    metadata: {
        key: string
        value: { lastSync: number }
    }
}

let dbPromise: Promise<IDBPDatabase<PolicyWalletDB>> | null = null

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<PolicyWalletDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_POLICIES)) {
                    db.createObjectStore(STORE_POLICIES, { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains(STORE_META)) {
                    db.createObjectStore(STORE_META)
                }
            },
        })
    }
    return dbPromise
}

export const offlineStorage = {
    async savePolicies(policies: any[]) {
        const db = await getDB()
        const tx = db.transaction(STORE_POLICIES, 'readwrite')
        const store = tx.objectStore(STORE_POLICIES)

        await Promise.all([
            ...policies.map(policy => store.put(policy)),
            db.put(STORE_META, { lastSync: Date.now() }, 'sync_status')
        ])

        await tx.done
    },

    async getStoredPolicies() {
        const db = await getDB()
        return db.getAll(STORE_POLICIES)
    },

    async getLastSyncTime() {
        const db = await getDB()
        const meta = await db.get(STORE_META, 'sync_status')
        return meta?.lastSync || null
    },

    async clearPolicies() {
        const db = await getDB()
        await db.clear(STORE_POLICIES)
    }
}
