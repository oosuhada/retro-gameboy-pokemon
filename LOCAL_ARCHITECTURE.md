# Local Red/Blue reconstruction architecture

This checkout started from the upstream `chase-mew/pokemon-js` repository and keeps its upstream history intact. The local commits add a Red/Blue rules layer rather than trying to disguise that provenance.

The new battle implementation is intentionally separated from the original React application utilities:

- `src/domain/red-blue/catalog.ts`: Generation I species and move data.
- `src/domain/red-blue/battle-rules.ts`: status, stat-stage, damage, charging, confusion, Toxic, Disable and end-turn rules.
- `src/domain/red-blue/resolve-turn.ts`: one selected move resolved into a `TurnResolution`.
- React components only present state and dispatch the result.

This boundary makes the Red/Blue rules independently testable and replaceable without coupling them to the UI.
