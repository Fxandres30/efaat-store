# js/orchestrators/

Coordinan operaciones que tocan varios services a la vez —
`checkoutOrchestrator.js`, `orderOrchestrator.js`,
`inventoryOrchestrator.js`, `adminOrchestrator.js`. No contienen
lógica de acceso a datos (eso es de services/repositories). Se crean
en las Fases F, G y H del mapa de migración.
