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

#### 6. Velden opvragen via F["key"] met helpers en conditionele klassen

```text
[ F["datum_wijziging"]
  | { text: notEmpty(F["datum_wijziging"])
        ? F["auteur"] + " / " + F["datum_wijziging"]
        : F["auteur"],
      classes: (F["status"] == "concept"
        ? ["expr-text-orange"]
        : F["status"] == "actief"
        ? ["expr-text-green", "expr-bold"]
        : ["expr-text-red", "expr-bold"])
    }
]
```

Gebruikt `F["key"]` om veldwaarden op te vragen, `notEmpty()` om te controleren op lege waarden, en geneste ternaries voor conditionele CSS-klassen.

---

### Ondersteunde functies

* **Platte tekst of veldnamen** (bijv. `title`, `author`).
* **F["key"] syntax** om velden op naam op te vragen (vereist voor keys met speciale tekens).
* **Ternary-expressies** `cond ? waarde1 : waarde2`.
* **Stringvergelijking** `F["status"] == "actief"`.
* **Stringconcatenatie** `F["naam"] + " / " + F["datum"]`.
* **Objecten** `{ text: "...", classes: [...], color: "..." }`.
* **Pipe-syntax** om tekst en stijl te scheiden: `[ expr | stijl ]`.
* **Contexttoegang**: velden gemarkeerd als `expression_item` zijn beschikbaar als variabelen en via `F` of `meta`.

---

### Beschikbare hulpfuncties

Alle helpers kunnen direct bij naam worden gebruikt (bijv. `notEmpty(...)`) of via `h.notEmpty(...)`.

| Helper | Beschrijving | Voorbeeld |
|--------|-------------|---------|
| `notEmpty(val)` | Geeft true als waarde niet null of leeg is | `notEmpty(F["naam"])` |
| `today()` | Geeft de datum van vandaag (JJJJ-MM-DD) | `today()` |
| `isOverdue(datum)` | True als datum voor vandaag ligt | `isOverdue(F["deadline"])` |
| `isFuture(datum)` | True als datum na vandaag ligt | `isFuture(F["start"])` |
| `isToday(datum)` | True als datum vandaag is | `isToday(F["event"])` |
| `isDueSoon(datum, dagen)` | True als datum binnen N dagen valt | `isDueSoon(F["due"], 7)` |
| `isOverdueInDays(datum, dagen)` | True als datum binnen N dagen voor vandaag valt | `isOverdueInDays(F["review"], 3)` |
| `isExpiredAfter(datum, dagen)` | True als datum + dagen voor vandaag ligt | `isExpiredAfter(F["start"], 30)` |
| `isUpcomingBefore(datum, dagen)` | True als vandaag voor datum - dagen ligt | `isUpcomingBefore(F["event"], 5)` |
| `daysBetween(datum1, datum2)` | Aantal dagen tussen twee datums | `daysBetween(F["start"], F["eind"])` |
| `ageInDays(datum)` | Dagen sinds de opgegeven datum | `ageInDays(F["aangemaakt"])` |
| `defaultText(val, terugval)` | Geeft terugval als waarde leeg is | `defaultText(F["notitie"], "N.v.t.")` |
| `isSimilar(a, b, drempel)` | True als stringovereenkomst >= drempel | `isSimilar(F["naam"], "test", 0.8)` |
| `typeOf(val)` | Geeft het type van een waarde | `typeOf(F["bedrag"])` |

---

### Beschikbare CSS-klassen

| Klasse | Effect |
|--------|--------|
| `expr-text-green` | Groene tekst |
| `expr-text-red` | Rode tekst |
| `expr-text-orange` | Oranje tekst |
| `expr-text-yellow` | Gele tekst |
| `expr-text-purple` | Paarse tekst |
| `expr-bold` | Vetgedrukte tekst |
| `expr-ticker` | Ticker/scrollende animatie |
| `expr-blinking` | Knipperende animatie |

---

### Foutafhandeling

* Ongeldige expressies geven `[Invalid expression]` terug in de zijbalk.
* Als een stijl een string is, wordt deze gebruikt als `color`.
* Objecten worden samengevoegd met de zijbalkuitvoer.

---

### Gerelateerde onderwerpen

* [Sjablonen](#templates)
* [Veldtypes](#field-types)