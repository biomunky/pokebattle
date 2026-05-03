import { useState, useRef } from 'react'
import pokemonNamesData from './pokemonNames.json'
import pokemonStatsData from './pokemonStats.json'
import pokemonMovesAbilitiesData from './pokemonMovesAbilities.json'
import { getTypeMultiplier, typeEffectivenessLabel } from './typeChart'
import { catchPokemon, loadRoster, releasePokemon, isStarter, STARTERS, getDexCount } from './pokedexStore'
import { addWins } from './winsStore'
import { startBattle, logAnswer, endBattle } from './api'
import pokemonEvolutionsData from './pokemonEvolutions.json'
import ballPoke  from './assets/pokemon/ball_poke.png'
import ballGreat from './assets/pokemon/ball_great.png'
import ballUltra from './assets/pokemon/ball_ultra.png'
import './PokeBattle.css'

const POKEMON_NAMES = Object.fromEntries(
  Object.entries(pokemonNamesData).map(([k, v]) => [parseInt(k, 10), v])
)
const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
}
const spriteModules = import.meta.glob('./assets/pokemon/poke_*.gif', { eager: true, import: 'default' })
const SPRITES = Object.fromEntries(
  Object.entries(spriteModules).map(([path, src]) => {
    const id = parseInt(path.match(/poke_(\d+)\.gif/)[1], 10)
    return [id, src]
  })
)
const VALID_IDS = Object.keys(pokemonStatsData).map(Number).filter(id => SPRITES[id] && pokemonStatsData[id])
const TEAM_SIZE = 3
const SPECIAL_THRESHOLD = 5

function getPokeMoveset(id) {
  const moves = pokemonMovesAbilitiesData[id]?.moves
  if (moves?.length) return moves
  return [{ name: 'Tackle', power: 40, type: 'normal', category: 'physical', pp: 35 }]
}

function getPokeAbilities(id) {
  return pokemonMovesAbilitiesData[id]?.abilities ?? []
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function calcDamage(atkStats, defStats, move, typeMult, mathMult, boosted = false) {
  const physical = move.category === 'physical'
  const atk = atkStats?.[physical ? 'attack' : 'sp_atk'] ?? 50
  const def = Math.max(defStats?.[physical ? 'defense' : 'sp_def'] ?? 50, 1)
  const powerNorm = (move.power ?? 50) / 100
  return Math.max(1, Math.round((atk / def) * 25 * powerNorm * typeMult * mathMult * (boosted ? 2 : 1)))
}

function hpColor(pct) {
  if (pct > 50) return '#4caf50'
  if (pct > 25) return '#ffcb05'
  return '#ee1515'
}

const DIFFICULTY = {
  pokeball: {
    label: 'Pokéball',
    desc: '+ and − answers up to 20',
    ball: ballPoke,
    cpuBias: -60,
    cpuWindow: 80,
    wrongMult: 0.75,
  },
  greatball: {
    label: 'Great Ball',
    desc: '+ and − answers up to 100',
    ball: ballGreat,
    cpuBias: 0,
    cpuWindow: 80,
    wrongMult: 0.5,
  },
  ultraball: {
    label: 'Ultra Ball',
    desc: '+ − × ÷ answers up to 1000',
    ball: ballUltra,
    cpuBias: 60,
    cpuWindow: 80,
    wrongMult: 0.25,
  },
}

// Walk the evolution chain `stage` steps from pokemonId (stage = wins / 10).
// Returns the evolved ID, or null if already fully evolved.
function getEvolutionForStage(pokemonId, wins) {
  const stage = Math.floor(wins / 10)
  if (stage === 0) return null
  let current = Number(pokemonId)
  for (let i = 0; i < stage; i++) {
    const evos = pokemonEvolutionsData[String(current)]
    if (!evos || evos.length === 0) return null
    current = evos[0]
  }
  return current === Number(pokemonId) ? null : current
}

function generateMathChallenge(difficulty = 'pokeball') {
  let n1, n2, answer, op

  if (difficulty === 'pokeball') {
    if (Math.random() < 0.5) {
      n1 = Math.floor(Math.random() * 10) + 1
      n2 = Math.floor(Math.random() * (20 - n1)) + 1
      answer = n1 + n2; op = '+'
    } else {
      n1 = Math.floor(Math.random() * 18) + 2
      n2 = Math.floor(Math.random() * (n1 - 1)) + 1
      answer = n1 - n2; op = '-'
    }
  } else if (difficulty === 'greatball') {
    if (Math.random() < 0.5) {
      n1 = Math.floor(Math.random() * 90) + 1
      n2 = Math.floor(Math.random() * (100 - n1)) + 1
      answer = n1 + n2; op = '+'
    } else {
      n1 = Math.floor(Math.random() * 98) + 2
      n2 = Math.floor(Math.random() * (n1 - 1)) + 1
      answer = n1 - n2; op = '-'
    }
  } else {
    const pick = Math.floor(Math.random() * 4)
    if (pick === 0) {
      n1 = Math.floor(Math.random() * 900) + 1
      n2 = Math.floor(Math.random() * (1000 - n1)) + 1
      answer = n1 + n2; op = '+'
    } else if (pick === 1) {
      n1 = Math.floor(Math.random() * 998) + 2
      n2 = Math.floor(Math.random() * (n1 - 1)) + 1
      answer = n1 - n2; op = '-'
    } else if (pick === 2) {
      n1 = Math.floor(Math.random() * 19) + 2
      n2 = Math.floor(Math.random() * Math.min(49, Math.floor(1000 / n1))) + 2
      answer = n1 * n2; op = '×'
    } else {
      answer = Math.floor(Math.random() * 49) + 2
      n2     = Math.floor(Math.random() * 19) + 2
      n1     = answer * n2
      op = '÷'
    }
  }

  return { question: `${n1} ${op} ${n2}`, answer }
}

function pickCpuMove(id) {
  const moves = getPokeMoveset(id)
  // 70% strongest move, 30% random
  return Math.random() < 0.7 ? moves[0] : moves[Math.floor(Math.random() * moves.length)]
}

function makeTeam(ids) {
  return ids.map(id => ({ id, maxHp: pokemonStatsData[id]?.hp ?? 50, hp: pokemonStatsData[id]?.hp ?? 50 }))
}

let _logId = 0
function logEntry(type, text) { return { id: _logId++, type, text } }

function HpBar({ hp, maxHp }) {
  const pct = Math.max(0, (hp / maxHp) * 100)
  return (
    <div className="hp-bar-wrap">
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: `${pct}%`, background: hpColor(pct) }} />
      </div>
      <span className="hp-text">{hp}/{maxHp}</span>
    </div>
  )
}

function TeamDots({ team, activeIdx }) {
  return (
    <div className="team-dots">
      {team.map((p, i) => (
        <span key={i} className={`team-dot ${p.hp === 0 ? 'dot-fainted' : 'dot-alive'} ${i === activeIdx ? 'dot-active' : ''}`} />
      ))}
    </div>
  )
}

function RosterTile({ id, selected, onToggle, selectionFull }) {
  const stats = pokemonStatsData[id]
  const name = POKEMON_NAMES[id] ?? `#${id}`
  const sprite = SPRITES[id]
  const primaryType = stats?.types?.[0] ?? 'normal'
  const safe = isStarter(id)
  const disabled = !selected && selectionFull

  return (
    <button
      type="button"
      className={`roster-tile ${selected ? 'roster-tile-selected' : ''} ${disabled ? 'roster-tile-disabled' : ''}`}
      style={{ '--tile-color': TYPE_COLORS[primaryType] ?? '#A8A77A' }}
      onClick={() => !disabled && onToggle(id)}
    >
      {safe && <span className="roster-safe-badge">★</span>}
      {sprite && <img src={sprite} alt={name} className="roster-sprite" />}
      <div className="roster-name">{name}</div>
      <div className="roster-type-bar" style={{ background: TYPE_COLORS[primaryType] ?? '#A8A77A' }}>
        {stats?.types?.map(t => (
          <span key={t} className="roster-type-pip">{t}</span>
        ))}
      </div>
    </button>
  )
}

export default function PokeBattle({ username, backendMode, onCatch, onShowDex }) {
  const sessionIdRef = useRef(null)
  const [difficulty, setDifficulty] = useState('pokeball')
  const [phase, setPhase] = useState('setup')
  const [roster, setRoster] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [playerTeam, setPlayerTeam] = useState([])
  const [cpuTeam, setCpuTeam] = useState([])
  const [playerIdx, setPlayerIdx] = useState(0)
  const [cpuIdx, setCpuIdx] = useState(0)
  const [chosenMove, setChosenMove] = useState(null)
  const [mathChallenge, setMathChallenge] = useState(null)
  const [mathInput, setMathInput] = useState('')
  const [gameResult, setGameResult] = useState(null)
  const [battleLog, setBattleLog] = useState([])
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [specialUsed, setSpecialUsed] = useState(0)
  const [pendingFaint, setPendingFaint] = useState(null)
  const [lostPokemon, setLostPokemon] = useState([])
  const [caughtThisBattle, setCaughtThisBattle] = useState(new Set())
  const [pendingEvolutions, setPendingEvolutions] = useState([])

  const prependLog = (entries) => setBattleLog(prev => [...entries, ...prev].slice(0, 25))

  const specialCharges = Math.floor(correctAnswers / SPECIAL_THRESHOLD)
  const specialReady = specialCharges > specialUsed
  const meterProgress = correctAnswers % SPECIAL_THRESHOLD

  const goToRosterPick = () => {
    const r = loadRoster()
    setRoster(r)
    if (r.length <= TEAM_SIZE) {
      beginBattle(r, r)
    } else {
      setSelectedIds([...STARTERS].filter(id => r.includes(id)))
      setPhase('roster-pick')
    }
  }

  const toggleRosterSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= TEAM_SIZE) return prev
      return [...prev, id]
    })
  }

  const beginBattle = (currentRoster, teamIds) => {
    const rosterSet = new Set(currentRoster)
    const available = VALID_IDS.filter(id => !rosterSet.has(id))

    // Match CPU difficulty to player's team average total stat, offset by difficulty bias
    const playerAvgTotal = teamIds.reduce((sum, id) => sum + (pokemonStatsData[id]?.total ?? 300), 0) / teamIds.length
    const { cpuBias, cpuWindow } = DIFFICULTY[difficulty]
    const target = playerAvgTotal + cpuBias
    let pool = available.filter(id => Math.abs((pokemonStatsData[id]?.total ?? 300) - target) <= cpuWindow)
    if (pool.length < TEAM_SIZE) pool = available // fallback: no restriction
    const cpuIds = shuffle(pool).slice(0, TEAM_SIZE)

    setPlayerTeam(makeTeam(teamIds))
    setCpuTeam(makeTeam(cpuIds))
    setPlayerIdx(0); setCpuIdx(0)
    setChosenMove(null); setMathChallenge(null)
    setGameResult(null); setPendingFaint(null)
    setLostPokemon([])
    setCaughtThisBattle(new Set())
    setBattleLog([logEntry('event', 'Battle started!')])
    setCorrectAnswers(0); setSpecialUsed(0)
    setPhase('pick')

    if (backendMode && username) {
      sessionIdRef.current = null
      startBattle(username, difficulty)
        .then(data => { sessionIdRef.current = data.session_id })
        .catch(() => {})
    }
  }

  const handlePickMove = (move, boosted = false) => {
    if (boosted) setSpecialUsed(s => s + 1)
    setChosenMove({ ...move, boosted })
    setMathChallenge(generateMathChallenge(difficulty))
    setMathInput('')
    setPhase('math')
  }

  const handleMathSubmit = (e) => {
    e.preventDefault()
    const parsed = parseInt(mathInput, 10)
    if (isNaN(parsed)) return
    handleMathAnswer(parsed)
  }

  const handleMathAnswer = (chosen) => {
    const mathCorrect = chosen === mathChallenge.answer
    if (mathCorrect) setCorrectAnswers(c => c + 1)

    if (backendMode && username && sessionIdRef.current) {
      logAnswer(
        sessionIdRef.current,
        username,
        difficulty,
        mathChallenge.question,
        mathChallenge.answer,
        chosen,
        mathCorrect,
      ).catch(() => {})
    }

    setMathChallenge(null)

    const playerPoke = playerTeam[playerIdx]
    const cpuPoke = cpuTeam[cpuIdx]
    const pStats = pokemonStatsData[playerPoke.id]
    const cStats = pokemonStatsData[cpuPoke.id]
    const pName = POKEMON_NAMES[playerPoke.id] ?? '???'
    const cName = POKEMON_NAMES[cpuPoke.id] ?? '???'

    const pTypes = pStats?.types ?? ['normal']
    const cTypes = cStats?.types ?? ['normal']

    // Player attacks first — type effectiveness uses the move's own type
    const pTypeMult = getTypeMultiplier(chosenMove.type, cTypes)
    const { wrongMult } = DIFFICULTY[difficulty]
    const playerDmg = calcDamage(pStats, cStats, chosenMove, pTypeMult, mathCorrect ? 1 : wrongMult, chosenMove.boosted)
    const newCpuHp = Math.max(0, cpuPoke.hp - playerDmg)

    // CPU only retaliates if it survived the player's hit
    let cpuDmg = 0
    let cpuMove = null
    let cTypeMult = 1
    if (newCpuHp > 0) {
      cpuMove = pickCpuMove(cpuPoke.id)
      cTypeMult = getTypeMultiplier(cpuMove.type, pTypes)
      cpuDmg = calcDamage(cStats, pStats, cpuMove, cTypeMult, 1)
    }
    const newPlayerHp = Math.max(0, playerPoke.hp - cpuDmg)

    setPlayerTeam(t => t.map((p, i) => i === playerIdx ? { ...p, hp: newPlayerHp } : p))
    setCpuTeam(t => t.map((p, i) => i === cpuIdx ? { ...p, hp: newCpuHp } : p))

    if (newCpuHp === 0) {
      catchPokemon(cpuPoke.id)
      setCaughtThisBattle(prev => new Set([...prev, cpuPoke.id]))
      onCatch?.()
    }

    const entries = []
    if (newCpuHp === 0) entries.push(logEntry('caught', `🎉 ${cName} fainted! Caught!`))
    if (newPlayerHp === 0) entries.push(logEntry('fainted', `💔 ${pName} fainted!`))

    if (cpuMove) {
      const cTypeLabel = typeEffectivenessLabel(cTypeMult)
      if (cTypeLabel) entries.push(logEntry('effect-cpu', `Enemy: ${cTypeLabel}`))
      entries.push(logEntry('cpu', `${cName} used ${cpuMove.name}! ${cpuDmg} dmg`))
    } else if (newCpuHp === 0) {
      entries.push(logEntry('event', `${cName} fainted before it could strike!`))
    }

    const pTypeLabel = typeEffectivenessLabel(pTypeMult)
    if (pTypeLabel) entries.push(logEntry('effect', pTypeLabel))
    entries.push(logEntry(
      chosenMove.isSpecial ? 'special' : 'player',
      `${pName} used ${chosenMove.name}!${chosenMove.isSpecial ? ' ✨' : ''} ${playerDmg} dmg`
    ))
    entries.push(logEntry('math', mathCorrect ? '✓ Correct! Full power!' : '✗ Wrong! Half power...'))
    prependLog(entries)

    setPendingFaint({ playerFainted: newPlayerHp === 0, cpuFainted: newCpuHp === 0, cpuPokeId: cpuPoke.id })
    setPhase('turn-result')
  }

  const handleContinue = () => {
    const { playerFainted, cpuFainted } = pendingFaint ?? {}

    let nextCpuIdx = cpuIdx
    let nextPlayerIdx = playerIdx

    if (cpuFainted) {
      nextCpuIdx = cpuIdx + 1
      if (nextCpuIdx >= cpuTeam.length) {
        const teamIds = playerTeam.map(p => p.id)

        // Track wins and check for evolutions
        const milestones = addWins(teamIds)
        const evolutions = milestones
          .map(({ pokemonId, wins }) => ({
            from: pokemonId,
            to: getEvolutionForStage(pokemonId, wins),
          }))
          .filter(e => e.to !== null)
        for (const { to } of evolutions) {
          catchPokemon(to)
          onCatch?.()
        }

        if (backendMode && username && sessionIdRef.current) {
          endBattle(sessionIdRef.current, 'win', teamIds).catch(() => {})
          sessionIdRef.current = null
        }

        setGameResult('win')
        setPendingEvolutions(evolutions)
        setPhase(evolutions.length > 0 ? 'evolution' : 'over')
        return
      }
      setCpuIdx(nextCpuIdx)
      prependLog([logEntry('event', `Go, ${POKEMON_NAMES[cpuTeam[nextCpuIdx].id] ?? '???'}!`)])
    }

    if (playerFainted) {
      nextPlayerIdx = playerIdx + 1
      if (nextPlayerIdx >= playerTeam.length) {
        // Player loses — release non-starters from their team, but keep anything caught this battle
        const teamIds = playerTeam.map(p => p.id)
        const lost = teamIds.filter(id => !isStarter(id) && !caughtThisBattle.has(id))
        setLostPokemon(lost)
        releasePokemon(lost)
        setGameResult('lose')
        setPhase('over')
        if (backendMode && username && sessionIdRef.current) {
          endBattle(sessionIdRef.current, 'lose', playerTeam.map(p => p.id)).catch(() => {})
          sessionIdRef.current = null
        }
        return
      }
      setPlayerIdx(nextPlayerIdx)
      prependLog([logEntry('event', `You sent out ${POKEMON_NAMES[playerTeam[nextPlayerIdx].id] ?? '???'}!`)])
    }

    setPendingFaint(null)
    setChosenMove(null)
    setPhase('pick')
  }

  const playerPoke   = playerTeam[playerIdx]
  const cpuPoke      = cpuTeam[cpuIdx]
  const pStats       = playerPoke ? pokemonStatsData[playerPoke.id] : null
  const cStats       = cpuPoke   ? pokemonStatsData[cpuPoke.id]   : null
  const playerMoves  = playerPoke ? getPokeMoveset(playerPoke.id) : []
  const playerAbilities = playerPoke ? getPokeAbilities(playerPoke.id) : []
  const cpuAbilities    = cpuPoke   ? getPokeAbilities(cpuPoke.id)   : []

  // ── Title screen ──────────────────────────────────────────────────
  if (phase === 'setup') {
    const dexCount = getDexCount()
    const returning = dexCount > 0

    return (
      <div className="title-screen">
        {/* Floating ball decorations */}
        <img src={ballPoke}  alt="" className="title-ball title-ball-1" aria-hidden="true" />
        <img src={ballGreat} alt="" className="title-ball title-ball-2" aria-hidden="true" />
        <img src={ballUltra} alt="" className="title-ball title-ball-3" aria-hidden="true" />
        <img src={ballGreat} alt="" className="title-ball title-ball-4" aria-hidden="true" />
        <img src={ballPoke}  alt="" className="title-ball title-ball-5" aria-hidden="true" />

        <div className="title-logo">
          <div className="title-logo-sub">GOTTA CATCH 'EM ALL</div>
          <h1 className="title-logo-main">POKÉMON<br/>BATTLE</h1>
          <div className="title-logo-flash" aria-hidden="true" />
        </div>

        {/* Starter hero row */}
        <div className="title-starters">
          {STARTERS.map((id, i) => {
            const stats = pokemonStatsData[id]
            const name  = POKEMON_NAMES[id] ?? `#${id}`
            const type  = stats?.types?.[0] ?? 'normal'
            return (
              <div key={id} className="title-starter" style={{ '--starter-color': TYPE_COLORS[type], animationDelay: `${i * 0.18}s` }}>
                <div className="title-starter-glow" style={{ background: TYPE_COLORS[type] }} />
                <img src={SPRITES[id]} alt={name} className="title-starter-sprite" />
                <div className="title-starter-name">{name}</div>
                <div className="title-starter-types">
                  {stats?.types?.map(t => (
                    <span key={t} className="title-starter-type" style={{ background: TYPE_COLORS[t] }}>{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {returning ? (
          <div className="title-progress">
            <span className="title-progress-dex">Pokédex: {dexCount} caught</span>
            <span className="title-progress-sub">Your starters are ready — keep building!</span>
          </div>
        ) : (
          <p className="title-tagline">Choose your starter and battle to fill your Pokédex!</p>
        )}

        <div className="title-difficulty">
          <div className="title-difficulty-label">MATHS LEVEL</div>
          <div className="title-difficulty-btns">
            {Object.entries(DIFFICULTY).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`title-diff-btn title-diff-${key} ${difficulty === key ? 'title-diff-active' : ''}`}
                onClick={() => setDifficulty(key)}
              >
                <img src={cfg.ball} alt={cfg.label} className="title-diff-ball" />
                <span className="title-diff-name">{cfg.label}</span>
                <span className="title-diff-desc">{cfg.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="title-start-btn" onClick={goToRosterPick} type="button">
          {returning ? 'CONTINUE!' : 'START JOURNEY!'}
        </button>

        <div className="title-hints">
          <span>✓ Math = power</span>
          <span>⚡ Type = bonus</span>
          <span>KO first = no counter</span>
          <span>★ Starters never lost</span>
        </div>
      </div>
    )
  }

  // ── Roster pick ───────────────────────────────────────────────────
  if (phase === 'roster-pick') {
    const selectionFull = selectedIds.length >= TEAM_SIZE
    const ready = selectedIds.length === TEAM_SIZE

    return (
      <div className="battle-screen roster-pick-screen">
        <h2 className="roster-pick-title">CHOOSE YOUR TEAM</h2>
        <p className="roster-pick-sub">
          {ready
            ? `${TEAM_SIZE}/${TEAM_SIZE} — Ready to battle!`
            : `Pick ${TEAM_SIZE - selectedIds.length} more Pokémon`}
        </p>
        <p className="roster-safe-note">★ = Starter — always safe from release</p>

        <div className="roster-grid">
          {roster.map(id => (
            <RosterTile
              key={id}
              id={id}
              selected={selectedIds.includes(id)}
              onToggle={toggleRosterSelect}
              selectionFull={selectionFull && !selectedIds.includes(id)}
            />
          ))}
        </div>

        <button
          className="battle-start-btn"
          onClick={() => beginBattle(roster, selectedIds)}
          disabled={!ready}
          type="button"
        >
          BATTLE!
        </button>
      </div>
    )
  }

  // ── Evolution screen ──────────────────────────────────────────────
  if (phase === 'evolution') {
    return (
      <div className="battle-screen evolution-screen">
        <div className="evo-header">
          <span className="evo-flash">✨</span>
          <h1 className="evo-title">YOUR POKÉMON EVOLVED!</h1>
          <span className="evo-flash">✨</span>
        </div>

        <div className="evo-cards">
          {pendingEvolutions.map(({ from, to }) => (
            <div key={`${from}-${to}`} className="evo-card">
              <div className="evo-poke evo-poke-from">
                {SPRITES[from] && <img src={SPRITES[from]} alt={POKEMON_NAMES[from] ?? `#${from}`} className="evo-sprite evo-sprite-from" />}
                <span className="evo-poke-name">{POKEMON_NAMES[from] ?? `#${from}`}</span>
              </div>
              <div className="evo-arrow">→</div>
              <div className="evo-poke evo-poke-to">
                {SPRITES[to] && <img src={SPRITES[to]} alt={POKEMON_NAMES[to] ?? `#${to}`} className="evo-sprite evo-sprite-to" />}
                <span className="evo-poke-name">{POKEMON_NAMES[to] ?? `#${to}`}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="evo-sub">Both forms added to your Pokédex!</p>

        <button className="title-start-btn" onClick={() => setPhase('over')} type="button">
          AWESOME!
        </button>
      </div>
    )
  }

  // ── Game over ─────────────────────────────────────────────────────
  if (phase === 'over') {
    const caughtCount = cpuTeam.filter(p => p.hp === 0).length
    return (
      <div className="battle-screen battle-over">
        <h1 className="battle-title">{gameResult === 'win' ? 'YOU WIN!' : 'YOU LOSE!'}</h1>

        {gameResult === 'win' && (
          <>
            <p className="battle-over-sub">You defeated all {TEAM_SIZE} enemy Pokémon!</p>
            {caughtCount > 0 && (
              <p className="battle-caught-msg">+{caughtCount} Pokémon added to your Pokédex!</p>
            )}
          </>
        )}

        {gameResult === 'lose' && (
          <>
            <p className="battle-over-sub">All your Pokémon fainted...</p>
            {lostPokemon.length > 0 ? (
              <div className="battle-lost-block">
                <p className="battle-lost-msg">Released {lostPokemon.length} non-starter Pokémon!</p>
                <div className="battle-lost-sprites">
                  {lostPokemon.map(id => (
                    <div key={id} className="battle-lost-poke">
                      {SPRITES[id] && <img src={SPRITES[id]} alt={POKEMON_NAMES[id] ?? `#${id}`} className="battle-lost-sprite" />}
                      <span className="battle-lost-name">{POKEMON_NAMES[id] ?? `#${id}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="battle-over-sub">Your starters are safe and ready to fight again!</p>
            )}
          </>
        )}

        <div className="battle-over-choices">
          <button className="battle-start-btn" onClick={() => setPhase('setup')} type="button">
            NEW BATTLE
          </button>
          <button className="battle-dex-btn" onClick={onShowDex} type="button">
            VIEW POKÉDEX
          </button>
        </div>
      </div>
    )
  }

  // ── Battle arena ──────────────────────────────────────────────────
  return (
    <div className="battle-game">
      <div className="battle-action-panel">
        {phase === 'pick' && (
          <>
            <div className="special-meter">
              <div className="meter-stars">
                {[...Array(SPECIAL_THRESHOLD)].map((_, i) => (
                  <span key={i} className={`meter-star ${i < meterProgress || specialReady ? 'star-full' : 'star-empty'}`}>★</span>
                ))}
              </div>
              {specialReady
                ? <span className="meter-label meter-ready">POWER MOVE READY!</span>
                : <span className="meter-label">{meterProgress}/{SPECIAL_THRESHOLD} to power move</span>}
            </div>

            <div className="battle-moves">
              {playerMoves.map((move, i) => (
                <button key={i} className="battle-move-btn" onClick={() => handlePickMove(move)} type="button">
                  <div className="move-row-top">
                    <span className="move-name">{move.name}</span>
                    <span className="move-cat-icon">{move.category === 'physical' ? '⚔' : '✦'}</span>
                  </div>
                  <div className="move-row-bottom">
                    <span className="move-type-chip" style={{ background: TYPE_COLORS[move.type] ?? '#888' }}>{move.type}</span>
                    <span className="move-power">PWR {move.power}</span>
                  </div>
                </button>
              ))}
            </div>

            {playerMoves[0] && (
              <button
                type="button"
                className={`battle-special-btn ${specialReady ? 'special-btn-ready' : 'special-btn-locked'}`}
                onClick={specialReady ? () => handlePickMove(playerMoves[0], true) : undefined}
                disabled={!specialReady}
              >
                <span className="special-icon">{specialReady ? '✨' : '🔒'}</span>
                <div className="special-info">
                  <span className="special-name">{playerMoves[0].name}</span>
                  <span className="move-type-chip" style={{ background: TYPE_COLORS[playerMoves[0].type] ?? '#888' }}>
                    {playerMoves[0].type}
                  </span>
                </div>
                <span className="special-hint">
                  {specialReady ? `×2 PWR ${playerMoves[0].power * 2}` : `${SPECIAL_THRESHOLD - meterProgress} more correct`}
                </span>
              </button>
            )}
          </>
        )}

        {phase === 'turn-result' && (
          <button className="battle-continue-btn" onClick={handleContinue} type="button">
            Continue →
          </button>
        )}
      </div>

      <div className="battle-arena">
        <div className="battle-col battle-player-col">
          <div className="battle-poke-name">{POKEMON_NAMES[playerPoke?.id] ?? '???'}</div>
          {pStats?.types && (
            <div className="battle-type-chips">
              {pStats.types.map(t => (
                <span key={t} className="battle-type-chip" style={{ background: TYPE_COLORS[t] ?? '#888' }}>{t}</span>
              ))}
            </div>
          )}
          {playerAbilities.length > 0 && (
            <div className="battle-abilities">
              {playerAbilities.map(a => <span key={a} className="battle-ability-chip">{a}</span>)}
            </div>
          )}
          {playerPoke && <img src={SPRITES[playerPoke.id]} alt="" className="battle-sprite player-sprite" />}
          {playerPoke && <HpBar hp={playerPoke.hp} maxHp={playerPoke.maxHp} />}
          <TeamDots team={playerTeam} activeIdx={playerIdx} />
        </div>

        <div className="battle-col battle-log-col">
          <div className="battle-log-header">Battle Log</div>
          <div className="battle-log-entries">
            {battleLog.map(e => (
              <div key={e.id} className={`log-entry log-${e.type}`}>{e.text}</div>
            ))}
          </div>
        </div>

        <div className="battle-col battle-cpu-col">
          <div className="battle-poke-name">{POKEMON_NAMES[cpuPoke?.id] ?? '???'}</div>
          {cStats?.types && (
            <div className="battle-type-chips">
              {cStats.types.map(t => (
                <span key={t} className="battle-type-chip" style={{ background: TYPE_COLORS[t] ?? '#888' }}>{t}</span>
              ))}
            </div>
          )}
          {cpuAbilities.length > 0 && (
            <div className="battle-abilities">
              {cpuAbilities.map(a => <span key={a} className="battle-ability-chip">{a}</span>)}
            </div>
          )}
          {cpuPoke && <img src={SPRITES[cpuPoke.id]} alt="" className="battle-sprite cpu-sprite" />}
          {cpuPoke && <HpBar hp={cpuPoke.hp} maxHp={cpuPoke.maxHp} />}
          <TeamDots team={cpuTeam} activeIdx={cpuIdx} />
        </div>
      </div>

      {phase === 'math' && mathChallenge && (
        <div className="swing-overlay">
          <div className={`swing-modal ${chosenMove?.boosted ? 'swing-modal-special' : ''}`}>
            <div className="swing-header">
              {chosenMove?.boosted ? '⚡ POWER UP!' : 'ATTACK!'}
            </div>
            <div className="swing-move-info">
              {chosenMove && (
                <>
                  <span className="swing-move-name">{chosenMove.name}</span>
                  <span className="swing-move-type" style={{ background: TYPE_COLORS[chosenMove.type] ?? '#888' }}>{chosenMove.type}</span>
                  <span className="swing-move-pwr">PWR {chosenMove.power}{chosenMove.boosted ? ' ×2' : ''}</span>
                </>
              )}
            </div>
            <div className="swing-intro">Answer correctly for full damage!</div>
            <div className="swing-question">{mathChallenge.question} = ?</div>
            <form className="swing-answer-form" onSubmit={handleMathSubmit}>
              <input
                className="swing-answer-input"
                type="number"
                inputMode="numeric"
                value={mathInput}
                onChange={e => setMathInput(e.target.value)}
                autoFocus
                autoComplete="off"
                placeholder="?"
              />
              <button type="submit" className="swing-answer-btn" disabled={mathInput === ''}>
                GO!
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
