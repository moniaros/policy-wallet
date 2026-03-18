#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const IGNORE_MARKER = 'i18n-hardcoded-ignore'

const bilingualTernaryRegex = /\b(?:language\s*===\s*['"]el['"]|isGreek)\s*\?/
const toastLiteralRegex = /\btoast\.(?:error|success|info|warning|loading|message)\(\s*["'`][^"'`]+["'`]/
const fallbackLiteralRegex = /\|\|\s*["'`][^"'`]+["'`]/
const fallbackLiteralValueRegex = /\|\|\s*["'`]([^"'`]+)["'`]/
const ternaryStringPairRegex = /\?\s*(['"`])([^'"`]+)\1\s*:\s*(['"`])([^'"`]+)\3/
const alphaRegex = /[A-Za-z\u0370-\u03FF]/
const allowedLocaleLiterals = new Set(['el', 'en', 'el-GR', 'en-US', 'en-GB'])

function isAllowedFallbackLiteral(line) {
  return (
    /\|\|\s*['"](el-GR|en-US|en-GB|EUR|USD)['"]/.test(line) ||
    /\|\|\s*['"]-['"]/.test(line) ||
    /\|\|\s*['"]_['"]/.test(line) ||
    /\|\|\s*['"]\u2014['"]/.test(line) ||
    /\|\|\s*['"]—['"]/.test(line)
  )
}

function isUiVisibleFallbackLine(line) {
  return /(\blabel\b|placeholder|aria-label|title=|label=|description|subtitle|heading|toast\.)/i.test(line)
}

function hasLiteralLetters(line) {
  const match = line.match(fallbackLiteralValueRegex)
  if (!match) return false
  return alphaRegex.test(match[1])
}

function isAllowedTernaryLiteralPair(left, right) {
  return allowedLocaleLiterals.has(left) && allowedLocaleLiterals.has(right)
}

function getChangedFilesFromGit() {
  try {
    const out = execSync('git diff --name-only --diff-filter=ACMRTUXB HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function normalizeTargets(args) {
  if (args.length > 0) {
    return args
  }

  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES
      .split(/[\n,]/)
      .map((f) => f.trim())
      .filter(Boolean)
  }

  return getChangedFilesFromGit()
}

function scanContent(content, filePath) {
  const findings = []
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.includes(IGNORE_MARKER)) continue

    if (bilingualTernaryRegex.test(line)) {
      const pair = line.match(ternaryStringPairRegex)
      if (!pair) continue
      const left = pair[2]
      const right = pair[4]
      if (isAllowedTernaryLiteralPair(left, right)) continue
      findings.push({
        filePath,
        line: i + 1,
        rule: 'bilingual-ternary',
        snippet: line.trim(),
      })
    }

    if (toastLiteralRegex.test(line)) {
      findings.push({
        filePath,
        line: i + 1,
        rule: 'literal-toast',
        snippet: line.trim(),
      })
    }

    if (
      fallbackLiteralRegex.test(line) &&
      hasLiteralLetters(line) &&
      isUiVisibleFallbackLine(line) &&
      !isAllowedFallbackLiteral(line)
    ) {
      findings.push({
        filePath,
        line: i + 1,
        rule: 'literal-fallback',
        snippet: line.trim(),
      })
    }
  }

  return findings
}

function scanFiles(files) {
  const findings = []
  const tsxFiles = files.filter((f) => f.endsWith('.tsx'))

  for (const filePath of tsxFiles) {
    const absPath = path.resolve(process.cwd(), filePath)
    if (!fs.existsSync(absPath)) continue

    const content = fs.readFileSync(absPath, 'utf8')
    findings.push(...scanContent(content, filePath))
  }

  return findings
}

function main() {
  const targets = normalizeTargets(process.argv.slice(2))
  const findings = scanFiles(targets)

  if (findings.length === 0) {
    console.log('i18n hardcoded-text check passed.')
    return
  }

  console.error(`Found ${findings.length} i18n hardcoded-text issue(s):`)
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} [${finding.rule}] ${finding.snippet}`)
  }

  process.exit(1)
}

if (require.main === module) {
  main()
}

module.exports = {
  scanContent,
  scanFiles,
  _private: {
    normalizeTargets,
    isAllowedFallbackLiteral,
    isUiVisibleFallbackLine,
    hasLiteralLetters,
    isAllowedTernaryLiteralPair,
    regexes: {
      bilingualTernaryRegex,
      toastLiteralRegex,
      fallbackLiteralRegex,
      ternaryStringPairRegex,
    },
  },
}
