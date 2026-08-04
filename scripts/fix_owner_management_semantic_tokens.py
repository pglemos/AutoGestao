from pathlib import Path

replacements = {
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx": {
        "text-status-error hover:bg-status-error-surface": "text-[hsl(var(--mx-color-danger))] hover:bg-[hsl(var(--mx-color-danger-subtle))]",
        "'text-status-success'": "'text-[hsl(var(--mx-color-success))]'",
        "'text-status-error'": "'text-[hsl(var(--mx-color-danger))]'",
    },
    "src/features/admin/components/StoreEditModal.tsx": {
        "text-status-error": "text-[hsl(var(--mx-color-danger))]",
        "border-status-warning/20 bg-status-warning-surface p-mx-md text-status-warning": "border-[hsl(var(--mx-color-warning))]/30 bg-[hsl(var(--mx-color-warning-subtle))] p-mx-md text-[hsl(var(--mx-color-text-primary))]",
    },
}

for filename, mapping in replacements.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    for old, new in mapping.items():
        if old not in text:
            raise RuntimeError(f"Missing token in {filename}: {old}")
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")

print("Semantic token fixes applied.")
