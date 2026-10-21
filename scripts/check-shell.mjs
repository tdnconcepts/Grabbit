#!/usr/bin/env node
// Validate the maintained binary-fetch scripts, not the retired app installer.
import {execFileSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scripts = ['scripts/build/fetch-embedded.sh', 'scripts/test-binaries/_lib.sh']

for (const script of scripts) {
	const target = resolve(ROOT, script)
	if (!existsSync(target)) throw new Error(`Missing shell script: ${script}`)
	execFileSync('bash', ['-n', target], {stdio: 'pipe'})
}

const fetcher = readFileSync(resolve(ROOT, scripts[0]), 'utf8')
const library = readFileSync(resolve(ROOT, scripts[1]), 'utf8')
if (!fetcher.includes('verify_sha ') || !library.includes('sha256sum') || !library.includes('sha256 mismatch:')) throw new Error('Embedded binary checksum verification is missing')

console.log('[shell] OK - binary-fetch scripts pass Bash syntax and retain checksum verification.')
