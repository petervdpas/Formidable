---
id: "expressions"
title: "Expressies"
order: 5
---

## Wat kun je doen met Expressies?

Expressies worden in Formidable gebruikt om te bepalen hoe **zijbalk-items** (en andere dynamische velden) worden weergegeven.  
Ze maken het mogelijk om waarden te tonen, stijlen toe te passen en inhoud conditioneel te formatteren.

Een expressie wordt geschreven tussen vierkante haken:

```text
[ expressie | stijl ]
```

* **expressie** – de hoofdinhoud die moet worden weergegeven.
* **stijl** *(optioneel)* – extra opmaak of objectwaarden om toe te voegen.

---

### Voorbeelden

#### 1. Toon een eenvoudige veldwaarde

```text
[ title ]
```

Geeft de waarde van het veld `title` weer.

#### 2. Voorwaardelijke tekst met een ternary

```text
[ check ? "Goedgekeurd" : "Afgewezen" ]
```

Toont *Goedgekeurd* als `check` waar is, anders *Afgewezen*.

#### 3. Voorwaardelijk object met tekst + CSS-klassen

```text
[ check
  ? { text: "Je hebt dit goedgekeurd!", classes: ["expr-text-green", "expr-bold"] }
  : { text: "Je hebt dit afgewezen!", classes: ["expr-text-red", "expr-bold"] }
]
```

#### 4. Combineer tekst en stijl met een pipe

```text
[ status | "blue" ]
```

Geeft het veld `status` weer in blauw.

#### 5. Gebruik hulpfuncties

```text
[ today() ]
```

Toont de datum van vandaag met behulp van de ingebouwde `today()` helper.

---

### Ondersteunde functies

* **Platte tekst of veldnamen** (bijv. `title`, `author`).
* **Ternary-expressies** `cond ? waarde1 : waarde2`.
* **Objecten** `{ text: "...", classes: [...], color: "..." }`.
* **Pipe-syntax** om tekst en stijl te scheiden: `[ expr | stijl ]`.
* **Helpers** uit `expressionHelpers.js` zoals `today()`.
* **Contexttoegang**: velden zijn beschikbaar als variabelen; ook via `F` of `meta`.

---

### Foutafhandeling

* Ongeldige expressies geven `[Invalid expression]` terug in de zijbalk.
* Als een stijl een string is, wordt deze gebruikt als `color`.
* Objecten worden samengevoegd met de zijbalkuitvoer.

---

### Gerelateerde onderwerpen

* [Sjablonen](#templates)
* [Veldtypes](#field-types)