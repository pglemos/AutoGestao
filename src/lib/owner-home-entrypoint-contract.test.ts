import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const homeRoute = app.match(/<Route path="home"[\s\S]*?<\/Suspense>} \/>/)?.[0]

describe('owner home entrypoint contract', () => {
  test('routes dono /home through the data-backed store dashboard', () => {
    expect(homeRoute).toBeDefined()
    expect(homeRoute).toContain('dono={<DashboardLoja />}')
    expect(homeRoute).not.toContain('OwnerHome')
    expect(app).not.toContain("const OwnerHome = lazy(() => import('@/pages/owner/OwnerHome'))")
  })
})
