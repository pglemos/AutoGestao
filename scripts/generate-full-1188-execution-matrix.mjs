// Compatibility entrypoint retained for the historical execution-matrix filename.
// The current matrix is derived from the governing prompt and marks unproven
// browser executions as NOT_PROVEN instead of fabricating a scenario count.
await import('./generate-complete-evidence-ledger.mjs')
