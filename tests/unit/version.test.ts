import { describe, expect, it } from 'vitest'
import { compareVersions, isNewerVersion, isVersion } from '../../src/shared/version'

describe('compareVersions', () => {
  it('orders by major, minor and patch numerically', () => {
    expect(compareVersions('0.4.0', '0.3.0')).toBe(1)
    expect(compareVersions('0.3.0', '0.4.0')).toBe(-1)
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1)
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('ranks a pre-release below its release and compares pre-release parts', () => {
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1)
    expect(compareVersions('1.0.0-beta', '1.0.0-beta.1')).toBe(-1)
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1)
  })

  it('accepts a leading v and ignores build metadata', () => {
    expect(compareVersions('v0.4.0', '0.4.0')).toBe(0)
    expect(compareVersions('0.4.0+7', '0.4.0')).toBe(0)
  })

  it('treats unparseable input as equal rather than throwing', () => {
    expect(compareVersions('latest', '0.4.0')).toBe(0)
    expect(isNewerVersion('x', '0.4.0')).toBe(false)
  })
})

describe('isVersion', () => {
  it('accepts semantic versions only', () => {
    expect(isVersion('0.4.0')).toBe(true)
    expect(isVersion('1.0.0-rc.1')).toBe(true)
    expect(isVersion('0.4')).toBe(false)
    expect(isVersion('')).toBe(false)
    expect(isVersion(4)).toBe(false)
    expect(isVersion(null)).toBe(false)
  })
})
