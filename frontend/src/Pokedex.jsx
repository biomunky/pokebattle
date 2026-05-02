import { useMemo, useState } from 'react'
import pokemonNamesData from './pokemonNames.json'
import pokemonStatsData from './pokemonStats.json'
import { loadDex } from './pokedexStore'
import './Pokedex.css'

const POKEMON_NAMES = Object.fromEntries(
  Object.entries(pokemonNamesData).map(([k, v]) => [parseInt(k, 10), v])
)
const spriteModules = import.meta.glob('./assets/pokemon/poke_*.gif', { eager: true, import: 'default' })
const SPRITES = Object.fromEntries(
  Object.entries(spriteModules).map(([path, src]) => {
    const id = parseInt(path.match(/poke_(\d+)\.gif/)[1], 10)
    return [id, src]
  })
)
const VALID_IDS = Object.keys(pokemonStatsData).map(Number)
  .filter(id => SPRITES[id] && pokemonStatsData[id])
  .sort((a, b) => a - b)

const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
}

const STAT_DEFS = [
  { key: 'hp',      label: 'HP',      color: '#FF5959' },
  { key: 'attack',  label: 'ATK',     color: '#F5AC78' },
  { key: 'defense', label: 'DEF',     color: '#FAE078' },
  { key: 'sp_atk',  label: 'Sp.ATK', color: '#9DB7F5' },
  { key: 'sp_def',  label: 'Sp.DEF', color: '#A7DB8D' },
  { key: 'speed',   label: 'SPD',     color: '#FA92B2' },
]
const STAT_MAX = 255

function DetailPanel({ id, onClose }) {
  const stats  = pokemonStatsData[id]
  const name   = POKEMON_NAMES[id] ?? `#${id}`
  const sprite = SPRITES[id]
  const primaryType = stats?.types?.[0] ?? 'normal'

  return (
    <div className="dex-detail-backdrop" onClick={onClose}>
      <div
        className="dex-detail"
        style={{ '--detail-color': TYPE_COLORS[primaryType] ?? '#A8A77A' }}
        onClick={e => e.stopPropagation()}
      >
        <button className="dex-detail-close" onClick={onClose} type="button">✕</button>

        <div className="dex-detail-header">
          <span className="dex-detail-num">#{String(id).padStart(3, '0')}</span>
          <h2 className="dex-detail-name">{name}</h2>
          <div className="dex-detail-types">
            {stats?.types?.map(t => (
              <span key={t} className="dex-detail-type" style={{ background: TYPE_COLORS[t] ?? '#888' }}>{t}</span>
            ))}
          </div>
        </div>

        <div className="dex-detail-body">
          <div className="dex-detail-sprite-wrap">
            {sprite && <img src={sprite} alt={name} className="dex-detail-sprite" />}
            <div className="dex-detail-measures">
              <div className="dex-measure">
                <span className="dex-measure-label">Height</span>
                <span className="dex-measure-val">{((stats?.height ?? 0) / 10).toFixed(1)} m</span>
              </div>
              <div className="dex-measure">
                <span className="dex-measure-label">Weight</span>
                <span className="dex-measure-val">{((stats?.weight ?? 0) / 10).toFixed(1)} kg</span>
              </div>
              <div className="dex-measure">
                <span className="dex-measure-label">Total</span>
                <span className="dex-measure-val dex-measure-total">{stats?.total ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="dex-detail-stats">
            {STAT_DEFS.map(({ key, label, color }) => {
              const val = stats?.[key] ?? 0
              const pct = Math.round((val / STAT_MAX) * 100)
              return (
                <div key={key} className="dex-stat-row">
                  <span className="dex-stat-label">{label}</span>
                  <span className="dex-stat-val">{val}</span>
                  <div className="dex-stat-track">
                    <div
                      className="dex-stat-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pokedex({ onClose }) {
  const dex = useMemo(() => loadDex(), [])
  const [selected, setSelected] = useState(null)
  const caughtCount = dex.size
  const pct = Math.round((caughtCount / VALID_IDS.length) * 100)

  return (
    <div className="dex-overlay" onClick={onClose}>
      <div className="dex-panel" onClick={e => e.stopPropagation()}>
        <div className="dex-header">
          <div>
            <h2 className="dex-title">POKÉDEX</h2>
            <div className="dex-progress-bar">
              <div className="dex-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="dex-count">{caughtCount} / {VALID_IDS.length} caught ({pct}%)</div>
          </div>
          <button className="dex-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        <div className="dex-grid">
          {VALID_IDS.map(id => {
            const caught = dex.has(id)
            return (
              <div
                key={id}
                className={`dex-cell ${caught ? 'dex-cell-caught dex-cell-clickable' : 'dex-cell-unseen'}`}
                onClick={caught ? () => setSelected(id) : undefined}
                role={caught ? 'button' : undefined}
                tabIndex={caught ? 0 : undefined}
                onKeyDown={caught ? (e) => e.key === 'Enter' && setSelected(id) : undefined}
              >
                <div className="dex-cell-img">
                  <img
                    src={SPRITES[id]}
                    alt={caught ? POKEMON_NAMES[id] : '???'}
                    className={`dex-img ${caught ? '' : 'dex-img-unseen'}`}
                  />
                </div>
                <div className="dex-cell-num">#{String(id).padStart(3, '0')}</div>
                <div className="dex-cell-name">{caught ? (POKEMON_NAMES[id] ?? '???') : '???'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {selected !== null && (
        <DetailPanel id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
