#!/usr/bin/env node
// No allowlist: inspect every indexed blob and tracked working-tree file.
// Historical commits are inspected explicitly; history cleanup is a separate decision.
import { execFileSync } from 'node:child_process'
import { readFileSync, lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// The envelope patterns are assembled from a split dash run so this file's own
// source never contains an envelope: as literals, the guard flagged itself the
// moment it was tracked (found 2026-09-20, on the staged index).
const D = '-----'
const PRIVATE_KEY_ENVELOPE = new RegExp(`${D}BEGIN [A-Z0-9 ]*PRIVATE KEY${D}`, 'i')
const PGP_PRIVATE_KEY = new RegExp(`${D}BEGIN PGP PRIVATE KEY BLOCK${D}`)
const PEM_ENVELOPE = new RegExp(`${D}BEGIN [A-Z0-9 ]+${D}`)

export function privateMaterialReasons(file, bytes) {
    const text = bytes.toString('utf8').replace(/\0/g, '')
    const reasons = []
    if (/\.pem$/i.test(file)) reasons.push('PEM file')
    if (PRIVATE_KEY_ENVELOPE.test(text)) reasons.push('private-key envelope')
    if (PGP_PRIVATE_KEY.test(text)) reasons.push('PGP private key')
    if (/PuTTY-User-Key-File-[23]:/.test(text)) reasons.push('PuTTY private key')
    if (PEM_ENVELOPE.test(text)) reasons.push('PEM envelope')
    // Also catches JSON embedded in documentation or files without a .json suffix.
    if (/"type"\s*:\s*"service_account"/.test(text)) reasons.push('service-account JSON')
    return [...new Set(reasons)]
}

function git(args, options = {}) {
    return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, ...options })
}

function inspectBlobs(entries, inspect, source) {
    // Batch git object reads; spawning git once per file makes a build guard too slow.
    for (let start = 0; start < entries.length; start += 32) {
        const batch = entries.slice(start, start + 32)
        const output = git(['cat-file', '--batch'], { input: batch.map(entry => entry.oid).join('\n') + '\n' })
        let offset = 0
        for (const entry of batch) {
            const end = output.indexOf(10, offset)
            const header = output.subarray(offset, end).toString().split(' ')
            const size = Number(header[2])
            if (end < 0 || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0) throw new Error('Invalid blob response')
            offset = end + 1
            if (offset + size >= output.length) throw new Error('Incomplete blob response')
            inspect(entry.file, output.subarray(offset, offset + size), source)
            offset += size + 1
        }
    }
}

export function auditPrivateMaterial(revision) {
    const findings = []
    let scanned = 0
    const inspect = (file, bytes, source) => {
        scanned++
        for (const reason of privateMaterialReasons(file, bytes)) findings.push({ file, source, reason })
    }
    if (revision) {
        const commit = git(['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]).toString().trim()
        const entries = git(['ls-tree', '-rz', '--full-tree', commit]).toString().split('\0').filter(Boolean)
        const blobs = []
        for (const entry of entries) {
            const split = entry.indexOf('\t')
            const [mode, type, oid] = entry.slice(0, split).split(' ')
            const file = entry.slice(split + 1)
            if (type !== 'blob') continue
            blobs.push({ file, oid })
        }
        inspectBlobs(blobs, inspect, commit.slice(0, 8))
    } else {
        const root = git(['rev-parse', '--show-toplevel']).toString().trim()
        const entries = git(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean)
        const paths = new Set()
        const blobs = []
        for (const entry of entries) {
            const split = entry.indexOf('\t')
            const [mode, oid, stage] = entry.slice(0, split).split(' ')
            const file = entry.slice(split + 1)
            if (stage !== '0') throw new Error('Unmerged index; resolve it before building')
            if (mode === '160000') throw new Error('Submodule content requires its own private-material audit')
            blobs.push({ file, oid })
            paths.add(file)
        }
        inspectBlobs(blobs, inspect, 'index')
        for (const file of paths) {
            const absolute = resolve(root, file)
            let stat
            try { stat = lstatSync(absolute) } catch (error) {
                if (error.code === 'ENOENT') continue // index was still inspected
                throw error
            }
            // Never follow symlinks outside the repository. Their indexed link text was inspected.
            if (stat.isFile()) inspect(file, readFileSync(absolute), 'worktree')
        }
    }
    return { scanned, findings }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        const args = process.argv.slice(2)
        if (args.length && !(args.length === 2 && args[0] === '--revision')) throw new Error('Usage: audit-private-material.mjs [--revision COMMIT]')
        const { scanned, findings } = auditPrivateMaterial(args[1])
        if (findings.length) {
            console.error('Private-material audit FAILED; content is deliberately suppressed:')
            for (const { file, source, reason } of findings) console.error(`- ${JSON.stringify(file)} [${source}]: ${reason}`)
            process.exitCode = 1
        } else {
            console.log(`Private-material audit passed (${scanned} blob/file observations).`)
        }
    } catch {
        // Do not print arbitrary git stderr, error objects or content.
        console.error('Private-material audit could not complete; failing closed. Check repository/index and arguments.')
        process.exitCode = 2
    }
}
