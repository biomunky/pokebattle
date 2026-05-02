const SE = 2, NE = 0.5, IM = 0

const CHART = {
  normal:   { rock: NE, ghost: IM, steel: NE },
  fire:     { fire: NE, water: NE, grass: SE, ice: SE, bug: SE, rock: NE, dragon: NE, steel: SE },
  water:    { fire: SE, water: NE, grass: NE, ground: SE, rock: SE, dragon: NE },
  grass:    { fire: NE, water: SE, grass: NE, poison: NE, ground: SE, flying: NE, bug: NE, rock: SE, dragon: NE, steel: NE },
  electric: { water: SE, electric: NE, grass: NE, ground: IM, flying: SE, dragon: NE },
  ice:      { fire: NE, water: NE, grass: SE, ice: NE, ground: SE, flying: SE, dragon: SE, steel: NE },
  fighting: { normal: SE, ice: SE, poison: NE, flying: NE, psychic: NE, bug: NE, rock: SE, ghost: IM, dark: SE, steel: SE, fairy: NE },
  poison:   { grass: SE, poison: NE, ground: NE, rock: NE, ghost: NE, steel: IM, fairy: SE },
  ground:   { fire: SE, electric: SE, grass: NE, poison: SE, flying: IM, bug: NE, rock: SE, steel: SE },
  flying:   { electric: NE, grass: SE, fighting: SE, bug: SE, rock: NE, steel: NE },
  psychic:  { fighting: SE, poison: SE, psychic: NE, dark: IM, steel: NE },
  bug:      { fire: NE, grass: SE, fighting: NE, flying: NE, psychic: SE, ghost: NE, dark: SE, steel: NE, fairy: NE },
  rock:     { fire: SE, ice: SE, fighting: NE, ground: NE, flying: SE, bug: SE, steel: NE },
  ghost:    { normal: IM, psychic: SE, ghost: SE, dark: NE },
  dragon:   { dragon: SE, steel: NE, fairy: IM },
  dark:     { fighting: NE, psychic: SE, ghost: SE, dark: NE, fairy: NE },
  steel:    { fire: NE, water: NE, electric: NE, ice: SE, rock: SE, steel: NE, fairy: SE },
  fairy:    { fire: NE, fighting: SE, poison: NE, dragon: SE, dark: SE, steel: NE },
}

export function getTypeMultiplier(attackerType, defenderTypes) {
  const row = CHART[attackerType] ?? {}
  let mult = 1
  for (const dt of defenderTypes) mult *= (row[dt] ?? 1)
  return mult
}

export function typeEffectivenessLabel(mult) {
  if (mult === 0)    return "It had no effect..."
  if (mult >= 4)     return "It's super effective!! ×4"
  if (mult >= 2)     return "It's super effective! ×2"
  if (mult <= 0.25)  return "Not very effective... ×0.25"
  if (mult <= 0.5)   return "Not very effective... ×0.5"
  return null
}
