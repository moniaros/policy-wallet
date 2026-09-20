import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, unlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { privateKeyProbe, serviceAccountProbe, pemProbe, sentinel } from '../../tests/fixtures/private-material.probe.mjs'
import { privateMaterialReasons } from '../audit-private-material.mjs'

const script = resolve('scripts/audit-private-material.mjs')
function withRepo(fn) {
    const cwd = mkdtempSync(join(tmpdir(), 'pw-private-material-'))
    const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' })
    try { git('init', '-q'); fn({ cwd, git }) } finally { rmSync(cwd, { recursive: true, force: true }) }
}
function scan(cwd, args = []) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' })
    assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel), 'guard must never echo content')
    return result
}

test('synthetic envelopes, service accounts and any PEM are rejected without an allowlist', () => {
    for (const label of ['PRIVATE KEY', 'RSA PRIVATE KEY', 'EC PRIVATE KEY', 'OPENSSH PRIVATE KEY', 'ENCRYPTED PRIVATE KEY']) {
        assert.ok(privateMaterialReasons('arbitrary.txt', Buffer.from(privateKeyProbe(label))).length)
    }
    assert.ok(privateMaterialReasons('renamed.data', Buffer.from(serviceAccountProbe())).length)
    assert.ok(privateMaterialReasons('public-cert.txt', Buffer.from(pemProbe())).length)
    assert.ok(privateMaterialReasons('empty.PEM', Buffer.alloc(0)).length)
    assert.ok(privateMaterialReasons('utf16.txt', Buffer.from(privateKeyProbe(), 'utf16le')).length)
    assert.deepEqual(privateMaterialReasons('normal.md', Buffer.from('FCM_PRIVATE_KEY is an environment variable.')), [])
})

test('index cannot be hidden by editing or deleting the working copy; staged deletion fixes the build but not history', () => withRepo(({ cwd, git }) => {
    writeFileSync(join(cwd, 'hidden.txt'), privateKeyProbe())
    git('add', 'hidden.txt')
    assert.equal(scan(cwd).status, 1)
    writeFileSync(join(cwd, 'hidden.txt'), 'clean worktree')
    assert.equal(scan(cwd).status, 1)
    unlinkSync(join(cwd, 'hidden.txt'))
    assert.equal(scan(cwd).status, 1)
    git('-c', 'user.name=Guard Test', '-c', 'user.email=guard@example.invalid', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic probe')
    git('rm', '--cached', 'hidden.txt')
    assert.equal(scan(cwd).status, 0)
    assert.equal(scan(cwd, ['--revision', 'HEAD']).status, 1)
}))

test('clean index does not hide newly introduced working-copy private material', () => withRepo(({ cwd, git }) => {
    writeFileSync(join(cwd, 'normal.txt'), 'clean')
    git('add', 'normal.txt')
    assert.equal(scan(cwd).status, 0)
    writeFileSync(join(cwd, 'normal.txt'), serviceAccountProbe())
    assert.equal(scan(cwd).status, 1)
}))

test('enumerates nested, ignored-but-force-added and renamed files including binary PEM; failure stays content-free', () => withRepo(({ cwd, git }) => {
    writeFileSync(join(cwd, '.gitignore'), '*.pem\n')
    writeFileSync(join(cwd, 'probe.pem'), Buffer.from([0, 1, 2]))
    git('add', '-f', 'probe.pem')
    assert.equal(scan(cwd).status, 1)
    git('rm', '-f', 'probe.pem')
    writeFileSync(join(cwd, 'service.txt'), serviceAccountProbe())
    git('add', 'service.txt')
    assert.equal(scan(cwd).status, 1)
}))

test('invalid revision fails closed', () => withRepo(({ cwd }) => assert.equal(scan(cwd, ['--revision', 'missing']).status, 2)))
