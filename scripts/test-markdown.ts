import { renderMarkdown } from '../src/lib/markdown/render'
import { renderCommentMarkdown } from '../src/lib/markdown/render-comment'

type TestResult = { name: string; passed: boolean; error?: string }

async function runTests(): Promise<void> {
  const results: TestResult[] = []

  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
      results.push({ name, passed: true })
      console.log(`  PASS  ${name}`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.log(`  FAIL  ${name}`)
      console.log(`        ${error}`)
    }
  }

  console.log('Running markdown pipeline tests...\n')

  await test('Test 1: renderMarkdown produces h1 and pre for code block', async () => {
    const html = await renderMarkdown('# Hello\n\n```typescript\nconst x: number = 42;\n```')
    if (!html.includes('<h1')) throw new Error(`Expected <h1 in output. Got: ${html.slice(0, 200)}`)
    if (!html.includes('<pre')) throw new Error(`Expected <pre in output. Got: ${html.slice(0, 200)}`)
  })

  await test('Test 2: renderCommentMarkdown strips <script> tags', async () => {
    const html = await renderCommentMarkdown('<script>alert(1)</script>')
    if (html.includes('<script')) throw new Error(`Expected no <script in output. Got: ${html}`)
  })

  await test('Test 3: renderCommentMarkdown strips onerror attributes', async () => {
    const html = await renderCommentMarkdown('<img onerror=alert(1) src=x>')
    if (html.includes('onerror')) throw new Error(`Expected no onerror in output. Got: ${html}`)
  })

  await test('Test 4: renderCommentMarkdown strips javascript: URLs', async () => {
    const html = await renderCommentMarkdown('[click](javascript:alert(1))')
    if (html.includes('javascript:')) throw new Error(`Expected no javascript: in output. Got: ${html}`)
  })

  await test('Test 5: renderCommentMarkdown renders bold and inline code', async () => {
    const html = await renderCommentMarkdown('**bold** and `code`')
    if (!html.includes('<strong>')) throw new Error(`Expected <strong> in output. Got: ${html}`)
    if (!html.includes('<code')) throw new Error(`Expected <code in output. Got: ${html}`)
  })

  console.log(`\nResults: ${results.filter((r) => r.passed).length}/${results.length} passed`)

  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    console.log(`\nFailed tests:`)
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error}`)
    }
    process.exit(1)
  }
}

runTests()
