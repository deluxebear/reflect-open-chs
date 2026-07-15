import { describe, expect, it } from 'vitest'
import { resolveAppLocale } from './locales'

describe('resolveAppLocale', () => {
  it('honors an explicit English pin', () => {
    expect(resolveAppLocale('en')).toBe('en')
  })

  it('honors an explicit Simplified Chinese pin', () => {
    expect(resolveAppLocale('zh-CN')).toBe('zh-CN')
  })

  it('maps Chinese OS languages to zh-CN under system', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => ['zh-Hans-CN', 'en-US'],
    })
    expect(resolveAppLocale('system')).toBe('zh-CN')
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => original,
    })
  })

  it('falls back to English for non-Chinese OS languages under system', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => ['en-US', 'fr-FR'],
    })
    expect(resolveAppLocale('system')).toBe('en')
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => original,
    })
  })
})
