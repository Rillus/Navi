import { deleteDB, openDB, type IDBPDatabase } from 'idb'
import type { CoursePack } from '../domain/coursePack'
import type { Route } from '../domain/route'
import type { YachtProfile } from '../domain/yacht'
import type { ParsedSeamark } from '../domain/lights'

const DB_NAME = 'navi'
const DB_VERSION = 1

type NaviSchema = {
  yacht: {
    key: 'profile'
    value: YachtProfile
  }
  routes: {
    key: string
    value: Route
  }
  packs: {
    key: string
    value: CoursePack
  }
  marks: {
    key: string
    value: ParsedSeamark
  }
}

let connection: Promise<IDBPDatabase<NaviSchema>> | null = null

function openNaviDb() {
  if (!connection) {
    connection = openDB<NaviSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('yacht')) db.createObjectStore('yacht')
        if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('marks')) db.createObjectStore('marks', { keyPath: 'id' })
      },
    })
  }
  return connection
}

export const naviDb = {
  backend: 'indexeddb' as const,

  async saveYacht(yacht: YachtProfile) {
    const db = await openNaviDb()
    await db.put('yacht', yacht, 'profile')
  },

  async getYacht(): Promise<YachtProfile | undefined> {
    const db = await openNaviDb()
    return db.get('yacht', 'profile')
  },

  async saveRoute(route: Route) {
    const db = await openNaviDb()
    await db.put('routes', route)
  },

  async getRoute(id: string): Promise<Route | undefined> {
    const db = await openNaviDb()
    return db.get('routes', id)
  },

  async listRoutes(): Promise<Route[]> {
    const db = await openNaviDb()
    return db.getAll('routes')
  },

  async saveCoursePack(pack: CoursePack) {
    const db = await openNaviDb()
    await db.put('packs', pack)
  },

  async listCoursePacks(): Promise<CoursePack[]> {
    const db = await openNaviDb()
    return db.getAll('packs')
  },

  async deleteCoursePack(id: string) {
    const db = await openNaviDb()
    await db.delete('packs', id)
  },

  async saveMarks(marks: ParsedSeamark[]) {
    const db = await openNaviDb()
    const tx = db.transaction('marks', 'readwrite')
    for (const mark of marks) {
      await tx.store.put(mark)
    }
    await tx.done
  },

  async listMarks(): Promise<ParsedSeamark[]> {
    const db = await openNaviDb()
    return db.getAll('marks')
  },

  async clearAll() {
    if (connection) {
      const db = await connection
      db.close()
      connection = null
    }
    await deleteDB(DB_NAME)
  },
}
