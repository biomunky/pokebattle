import { useState } from 'react'
import './App.css'
import PokeBattle from './PokeBattle'
import Pokedex from './Pokedex'
import { getDexCount, initDex, resetStore } from './pokedexStore'
import { initWins, resetWinsStore } from './winsStore'
import { checkBackend, login } from './api'

function LoginScreen({ onLogin }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const backendMode = await checkBackend()
      if (backendMode) await login(trimmed)
      await Promise.all([
        initDex(trimmed, backendMode),
        initWins(trimmed, backendMode),
      ])
      onLogin(trimmed, backendMode)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-sub">GOTTA CATCH 'EM ALL</div>
          <h1 className="login-logo-main">POKÉMON<br />BATTLE</h1>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label" htmlFor="trainer-name">
            Enter your Trainer name
          </label>
          <input
            id="trainer-name"
            className="login-input"
            type="text"
            maxLength={20}
            placeholder="Ash, Misty, Brock…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            disabled={loading}
          />
          <button
            className="login-btn"
            type="submit"
            disabled={!name.trim() || loading}
          >
            {loading ? 'Loading…' : 'START JOURNEY!'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [username, setUsername] = useState(null)
  const [backendMode, setBackendMode] = useState(false)
  const [showDex, setShowDex] = useState(false)
  const [dexVersion, setDexVersion] = useState(0)

  const handleLogin = (name, isBacked) => {
    setUsername(name)
    setBackendMode(isBacked)
  }

  const handleChangeTrainer = () => {
    resetStore()
    resetWinsStore()
    setUsername(null)
    setBackendMode(false)
    setShowDex(false)
    setDexVersion(0)
  }

  const dexCount = getDexCount()
  const bumpDex = () => setDexVersion(v => v + 1)

  if (!username) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <div className="app-nav">
        <span className="nav-trainer">🎮 {username}</span>
        <button className="nav-change-btn" onClick={handleChangeTrainer} type="button">
          Change Trainer
        </button>
        <button className="nav-dex-btn" onClick={() => setShowDex(true)} type="button">
          Pokédex {dexCount > 0 && <span className="nav-dex-count">{dexCount}</span>}
        </button>
      </div>

      {showDex && <Pokedex key={dexVersion} onClose={() => setShowDex(false)} />}

      {!showDex && (
        <PokeBattle
          username={username}
          backendMode={backendMode}
          onCatch={bumpDex}
          onShowDex={() => setShowDex(true)}
        />
      )}
    </div>
  )
}

export default App
