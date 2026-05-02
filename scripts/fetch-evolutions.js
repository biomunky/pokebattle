#!/usr/bin/env node
// Fetches all 541 evolution chains from PokeAPI and writes
// frontend/src/pokemonEvolutions.json — a map of pokémon ID → [nextStageIds].
// Only IDs present in pokemonStats.json are included.

import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATS_PATH = join(ROOT, 'frontend/src/pokemonStats.json')
const OUT = join(ROOT, 'frontend/src/pokemonEvolutions.json')
const CONCURRENCY = 10
const RETRY_DELAY_MS = 800

const knownIds = new Set(Object.keys(JSON.parse(readFileSync(STATS_PATH))).map(Number))

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
    return fetchWithRetry(url, attempt + 1)
  }
}

function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/)
  return m ? parseInt(m[1], 10) : null
}

// Walk the chain tree, recording parent→[children] edges
function walkChain(node, evolutions) {
  const parentId = idFromUrl(node.species.url)
  if (parentId === null) return

  const childIds = node.evolves_to
    .map(child => idFromUrl(child.species.url))
    .filter(id => id !== null && knownIds.has(id))

  if (childIds.length > 0 && knownIds.has(parentId)) {
    evolutions[parentId] = childIds
  }

  for (const child of node.evolves_to) walkChain(child, evolutions)
}

async function fetchChain(id) {
  const data = await fetchWithRetry(`https://pokeapi.co/api/v2/evolution-chain/${id}`)
  const evolutions = {}
  walkChain(data.chain, evolutions)
  return evolutions
}

// Get total count then fetch all chain IDs
const index = await fetchWithRetry('https://pokeapi.co/api/v2/evolution-chain/?limit=1')
const total = index.count
console.log(`Fetching ${total} evolution chains...`)

const ids = Array.from({ length: total }, (_, i) => i + 1)
const evolutions = {}
const queue = [...ids]
let done = 0

async function worker() {
  while (queue.length > 0) {
    const id = queue.shift()
    try {
      const result = await fetchChain(id)
      Object.assign(evolutions, result)
      done++
      if (done % 100 === 0) process.stdout.write(`  ${done}/${total}\n`)
    } catch (err) {
      // Some chain IDs are gaps (deleted entries) — skip silently
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

const evoCount = Object.keys(evolutions).length
console.log(`Done. ${evoCount} Pokémon have evolutions. Writing ${OUT}`)
writeFileSync(OUT, JSON.stringify(evolutions, null, 2))
console.log('Complete.')
