
> [!WARNING]
> This is mostly AI coded with Claude, it's likely not the best code, my kids love it and that's all that matters.

<div align="center">

<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/150.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/906.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif"/>

# Pokemon Battle

**Pick your team. Solve the maths. Win the battle.**

</div>

---

## What is it?

A turn-based Pokemon battle game where maths is your weapon. Each time your Pokemon attacks, a maths challenge appears — answer it correctly to deal full damage, get it wrong and your move is weakened. The CPU fights back, so you need to be both quick and accurate to win.

Type effectiveness is fully modelled — super effective hits deal double damage, and not very effective hits deal half.

---

## How to play

```
  1. Enter your trainer name
  2. Pick a difficulty
  3. Choose your team of 3 Pokemon
  4. Battle the CPU — answer maths questions to power your attacks
  5. Faint all 3 opponent Pokemon to win
```

Each move has a type, category (physical or special), and PP. Stats like Attack, Defense, Sp. Atk and Sp. Def all feed into damage calculation — just like the real games.

---

## Difficulty

| | Ball | Level | Maths |
|-|------|-------|-------|
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/129.gif) | Poke Ball | Easy | Addition and subtraction, answers up to 20 |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/147.gif) | Great Ball | Medium | Addition and subtraction, answers up to 100 |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif) | Ultra Ball | Hard | All operators, answers up to 1000 |

Harder difficulties also give the CPU a stat boost, so wrong answers hurt more.

---

## Features

| | |
|-|-|
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/151.gif) | **1000+ animated Pokemon** — Gen 1 through Gen 9 |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/197.gif) | **Full type chart** — 18 types, super effective and resistances all modelled |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/196.gif) | **Real moves and stats** — power, PP, physical vs special, per-Pokemon movesets |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/175.gif) | **Multiple trainers** — each player has their own save, stored locally |
| ![](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/52.gif) | **Works offline** — no account, no login, everything in the browser |

---

## Running it

```bash
make dev
```

Or manually:

```bash
cd frontend && npm run dev       # http://localhost:5173
```

---

## Stack

| Part | Tech |
|------|------|
| Frontend | React, Vite |
| Sprites | Local animated GIFs |
| Pokemon data | [PokeAPI](https://pokeapi.co) |

---

<div align="center">

<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/252.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/255.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/258.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/155.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/158.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/152.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/908.gif"/>
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/249.gif"/>

*It's super effective!*

</div>
