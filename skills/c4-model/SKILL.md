---
name: c4-model
description: Generate a canonical-C4 LikeC4 model from confirmed architectural elements and relationships. Produces Context and Container views, optionally Deployment. Refuses Component views, custom element kinds, and other LikeC4 features that deviate from Simon Brown C4 conventions. Use after /adr-discovery or when grounding an ADR in a diagram.
---

You produce a **canonical-C4** LikeC4 model. LikeC4's DSL is flexible by design — custom element kinds, free-form specifications, dynamic views, arbitrary styles. That flexibility makes it easy to drift from the Simon Brown C4 Model style (Person / Software System / Container / Component with fixed semantics). Structurizr enforces this by being opinionated; LikeC4 does not. This skill enforces it by construction.

## Scope — deliberately narrower than general-purpose LikeC4

- **Yes:** Context views, Container views, optional Deployment views.
- **No:** Component views, dynamic views, custom element kinds, custom styles, nested systems, multiple system-in-focus.

If the architect wants the full LikeC4 palette, they should use LikeC4 directly — not this skill.

## Terms used in this skill

When this skill says:

- **Actor** — a person, role, or operator who uses the system (the C4 *Person*). Drawn at the top of Context views.
- **External system** — software outside the boundary that the system-in-focus interacts with. Third-party APIs, vendor platforms, other teams' services.
- **System** — the bounded software product being modelled. Exactly ONE per file.
- **Container** — a runnable or deployable unit *inside* the system: service, web app, database, queue, scheduled job. NOT a code class. NOT a Docker container specifically — the C4 term predates Docker.
- **Relationship** — a directed interaction between two elements. MUST carry a one-line description explaining *what flows*; the *how* (HTTPS, gRPC, Kafka, etc.) goes in the `technology` attribute.

State definitions inline the first time you use a term with the architect.

## Hard rules

```
- This skill produces Context and Container views. Optionally Deployment.
- This skill REFUSES to produce Component views. If the architect asks for one,
  say: "Component views belong at a deeper level than ADRs work at. ADRs reason
  about containers, not internal structure. If you need a Component view, use
  LikeC4 directly outside this skill."
- Every relationship MUST have a one-line description. No description → refuse
  to add it; ask the architect for one.
- Element names in the DSL MUST match what the architect confirmed in discovery.
  Do not invent or rename.
- Do not generate styling, themes, or layout hints unless the architect asks.
  Semantic correctness first; aesthetics second.
```

## Canonical-C4 locked specification (use verbatim, do not extend)

```likec4
specification {
  element actor {
    notation "Person"
    style { shape person }
  }
  element externalSystem {
    notation "External System"
    style { shape rectangle; color gray }
  }
  element system {
    notation "System"
    style { shape rectangle }
  }
  element container {
    notation "Container"
    style { shape rectangle }
  }

  relationship uses       { line solid }
  relationship reads      { line solid }
  relationship writes     { line solid }
  relationship publishes  { color amber; line dotted; head diamond }
  relationship consumes   { color amber; line dotted; tail vee }

  // Tag for elements/relationships with unresolved open questions.
  // Renders red + dashed via the style rule in views (see views block).
  tag open-question {
    color red
  }

  deploymentNode environment { notation "Environment" }
  deploymentNode node        { notation "Node" }
}
```

**Open-question tagging convention:** when an element or relationship has an unresolved open question recorded in `docs/architecture/open-questions.md`, tag it with `#open-question` and prefix the `description` with `OPEN Q<N>:` (where `<N>` matches the question number in `open-questions.md`). When the question is resolved, remove the tag and replace the description with the confirmed text. Example:

```likec4
payment = container "Payment" {
  #open-question
  description "OPEN Q3: responsibility unclear — see open-questions.md"
}

order -[uses]-> payment "OPEN Q4: kind unclear (sync REST or async event?)" {
  #open-question
}
```

**Do not add custom element kinds.** If the architect asks for `element gateway`, `element lambda`, `element queue`, etc., say:

> "C4 represents runnable/deployable units as `container`. Distinguishing 'gateway' from 'service' is a technology detail — put it in `technology "AWS API Gateway"` on the container instead. This keeps the diagram canonically C4."

**Do not add custom relationship kinds** beyond `uses / reads / writes / publishes / consumes`. If the architect argues for one, say:

> "C4 relationships describe WHAT flows. Use the kind for *what flows* (read/write/async/sync), and the description + `technology` for *how*."

## Canonical-C4 refusals (scripted)

Refuse these even when the architect asks:

- **A `component` kind or any Component view** — redirect to LikeC4 outside this skill.
- **Custom element kinds** beyond `actor / externalSystem / system / container` — suggest `container` with a `technology` attribute.
- **Dynamic views** — out of C4 canonical scope for ADR work.
- **Multiple `system` elements in one file** — there is exactly ONE system-in-focus per model. Other systems are `externalSystem`.
- **Nesting `system` inside `system`, or `container` inside `container`** — hierarchy is strictly `(actor | externalSystem) → system → container`. Full stop.
- **Global `styles` blocks with custom palettes** — a minimal default is allowed only if the architect explicitly asks, and only with standard C4 conventions (Person=blue-grey, System=blue, External=grey, Container=darker blue).

If the architect pushes back:

> "These refusals keep your diagrams recognizable as canonical C4. If you want the full LikeC4 palette, use LikeC4 directly — this skill is scoped to ADR-grounding diagrams."

---

## Phases

### 1. Intake

Accept one of two inputs:

- **(a)** A `CONFIRMED` context brief from `/adr-discovery` (preferred) — read `docs/architecture/discovery-brief.md` directly. Elements (under `## Components`, `## External actors / systems`), relationships (under `## Relationships`), and human-written descriptions are all there. Use the brief as-is — do not re-ask what's already confirmed.
- **(b)** A fresh back-and-forth walkthrough if no brief exists. Same zero-hallucination rule as `/adr-discovery`:
  1. Ask for the system-in-focus name.
  2. Walk external actors one at a time, confirm each.
  3. Walk external systems one at a time, confirm each.
  4. Walk containers one at a time, confirm each (name + one-sentence responsibility + technology).
  5. Walk relationships one at a time, confirm each (source, target, kind, description).

Do NOT proceed to generation until every element and every relationship has a human-confirmed description.

### 2. Locate or scaffold

Glob `**/*.c4`, `likec4.config.*`, `model/**/*.c4`.

- **Existing model found** → read it. Identify where new elements fit. If the existing model uses non-canonical kinds (e.g., `element gateway`), flag the drift and ask whether to migrate to canonical kinds or leave as-is. If leave-as-is, the skill stops — it won't mix canonical and non-canonical.
- **No model** → scaffold:
  - `likec4/model.c4` — the canonical-C4 specification (use the locked block above, verbatim).
  - `likec4/<system-name>.c4` — the model block with the system-in-focus and its containers.
  - `likec4/views.c4` — the views block (Context + Container; Deployment only if confirmed).
  - Minimal `likec4.config.js`:
    ```js
    /** @type {import('likec4').LikeC4Config} */
    export default { name: '<system-name>' }
    ```

### 3. Generate DSL

Produce LikeC4 DSL using the locked canonical-C4 specification. Output three blocks:

**`specification`** — the locked block above, verbatim. Do not extend.

**`model`** — structure:

```likec4
model {
  // External actors at the top level
  customer = actor "Customer" {
    description "End user placing orders"
  }

  // External systems at the top level
  paymentGateway = externalSystem "Payment Gateway" {
    description "Third-party card processor"
  }

  // The single system-in-focus, with containers nested inside
  shop = system "Online Shop" {
    description "E-commerce platform"

    ui = container "Web UI" {
      description "Customer-facing storefront"
      technology "React SPA"
    }
    api = container "API" {
      description "Orchestrates orders, inventory, payments"
      technology "Node.js REST"
    }
    db = container "Database" {
      description "Orders, products, customers"
      technology "PostgreSQL"
    }

    // Intra-system relationships
    ui -[uses]-> api "fetches product + order data"
    api -[reads]-> db "queries orders and inventory"
    api -[writes]-> db "persists new orders"
  }

  // Cross-boundary relationships
  customer -[uses]-> shop.ui "browses products and places orders"
  shop.api -[uses]-> paymentGateway "authorizes charges" {
    technology "HTTPS"
  }
}
```

**`views`** — exactly one Context view, one Container view, optionally one Deployment view. Both views must include the `#open-question` style rule so tagged elements/relationships render red + dashed:

```likec4
views {
  view index {
    title "System Context"
    include *
    style element.tag = #open-question {
      color red
      border dashed
    }
  }

  view containers of shop {
    title "Containers"
    include *
    autoLayout LeftRight
    style element.tag = #open-question {
      color red
      border dashed
    }
  }
}
```

If deployment is in scope, add a `deployment` block and a `deployment view`:

```likec4
deployment {
  environment prod "Production" {
    node web "Web tier" {
      instanceOf shop.ui
      instanceOf shop.api
    }
    node data "Data tier" {
      instanceOf shop.db
    }
    web -[uses]-> data "internal network"
  }
}

// ...inside views block:
  deployment view prod-deploy {
    title "Production Deployment"
    include prod.**
  }
```

### 4. Canonical-C4 lint (run BEFORE `likec4 validate`)

Scan your own generated DSL and verify each check:

```
CANONICAL-C4 LINT
[ ] exactly one `element system` (or `system <Name>`) containing the containers
[ ] zero `element component` declarations
[ ] zero custom `element <kind>` declarations beyond actor/externalSystem/system/container
[ ] zero `dynamic view` blocks
[ ] zero top-level `styles` blocks (unless architect explicitly authorized)
[ ] every `->` or `-[kind]->` has a description string
[ ] every container lives inside the system-in-focus (not at the top level)
[ ] zero custom relationship kinds beyond uses/reads/writes/publishes/consumes
[ ] specification declares `tag open-question { color red }`
[ ] every view includes `style element.tag = #open-question { color red; border dashed }`
[ ] external systems use `color gray` (not `secondary` or other)
```

Print the result explicitly: `canonical-C4 lint: PASS` or `canonical-C4 lint: FAIL (N violations)` with each violation listed.

If any check fails, fix it (ask the architect for ambiguous cases) BEFORE calling `likec4 validate`. Lint errors are C4-style issues; validate errors are syntax. Both must pass.

### 5. Show diff, not apply

Present the DSL additions/edits as a diff. Wait for architect approval per hunk. Only then write to disk.

### 6. Validate syntax

Run:

```bash
npx likec4 validate
```

If validation fails, show the error. Fix it (ask the architect if the fix is ambiguous). Re-validate. Do NOT declare success on an invalid model.

### 7. Render guidance

After validation passes, print exactly:

> Render with: `npx likec4 start` (live preview) or `npx likec4 serve` (static serve). Open the printed URL. Take a screenshot of the Context and Container views and link them from the ADR's Context section if helpful.

### 8. Drift check back to ADRs

Glob `docs/adr/`, `docs/decisions/`, `docs/architecture/decisions/`, `adr/`.

If any confirmed component names don't appear in existing ADRs (or vice versa), flag it:

> "The LikeC4 model names components `[X, Y, Z]`. These don't appear in any existing ADR. Either run `/adr-critique` on the affected ADRs to reconcile naming, or the ADRs may have drifted from the actual architecture."

---

## Implementation note

LikeC4 DSL syntax drifts across versions. When fixing non-trivial syntax errors, consult the `likec4-dsl` skill if available in the session, or fetch `/likec4/likec4` docs via `ctx7`. Do not hand-write DSL from memory for complex constructs (view predicates, relationship style extensions, deployment patterns).

Pinned reference: `/likec4/likec4` on context7 (High reputation). As of authoring, this skill targets LikeC4 v1.47+.

---

*If you're using the ADR VS Code extension, the Distill and Insights commands run complementary analyses from inside the editor.*
