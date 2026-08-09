// Compatibility entrypoint retained for the historical task-matrix filename.
// The current implementation derives task IDs from the governing prompt and
// defaults every unproven task to NOT_PROVEN.
await import('./generate-complete-evidence-ledger.mjs')
