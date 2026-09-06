import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type VercelConfig = {
  framework?: string
  outputDirectory?: string
  rewrites?: Array<{ source: string; destination: string }>
}

describe('Vercel SPA hosting', () => {
  const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8')) as VercelConfig

  it('tells Vercel this is a Vite app whose output is dist', () => {
    expect(config.framework).toBe('vite')
    expect(config.outputDirectory).toBe('dist')
  })

  it('uses the documented SPA rewrite, not a negative lookahead Vercel cannot parse', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
    expect(JSON.stringify(config)).not.toContain('?!')
  })
})
