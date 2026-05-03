const API = '/api'

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

async function get(path) {
  const r = await fetch(`${API}${path}`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export async function checkBackend() {
  try {
    await get('/health')
    return true
  } catch {
    return false
  }
}

export async function login(username) {
  return post('/login', { username })
}

export async function getPokedex(username) {
  return get(`/pokedex/${encodeURIComponent(username)}`)
}

export async function catchPokemonAPI(username, pokemonIds) {
  return post('/pokedex/catch', { username, pokemon_ids: pokemonIds })
}

export async function releasePokemonAPI(username, pokemon_ids) {
  return post('/pokedex/release', { username, pokemon_ids })
}

export async function startBattle(username, difficulty) {
  return post('/battle/start', { username, difficulty })
}

export async function logAnswer(sessionId, username, difficulty, question, correctAnswer, userAnswer, isCorrect) {
  return post('/battle/answer', {
    session_id: sessionId,
    username,
    difficulty,
    question,
    correct_answer: correctAnswer,
    user_answer: userAnswer,
    is_correct: isCorrect,
  })
}

export async function endBattle(sessionId, result, teamIds = []) {
  return post('/battle/end', { session_id: sessionId, result, team_ids: teamIds })
}

export async function getPokemonWins(username) {
  return get(`/wins/${encodeURIComponent(username)}`)
}

export async function getStats(username) {
  return get(`/stats/${encodeURIComponent(username)}`)
}
