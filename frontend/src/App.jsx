import { useState } from 'react'
import './App.css'
import PokeBattle from './PokeBattle'
import Pokedex from './Pokedex'
import { getDexCount } from './pokedexStore'

function App() {
  const [showDex, setShowDex] = useState(false)
  const [dexVersion, setDexVersion] = useState(0)

  const dexCount = getDexCount()
  const bumpDex = () => setDexVersion(v => v + 1)

  return (
    <div className="app">
      <div className="app-nav">
        <button className="nav-dex-btn" onClick={() => setShowDex(true)} type="button">
          Pokédex {dexCount > 0 && <span className="nav-dex-count">{dexCount}</span>}
        </button>
      </div>

      {showDex && <Pokedex key={dexVersion} onClose={() => setShowDex(false)} />}

      {!showDex && <PokeBattle onCatch={bumpDex} onShowDex={() => setShowDex(true)} />}
    </div>
  )
}

export default App
