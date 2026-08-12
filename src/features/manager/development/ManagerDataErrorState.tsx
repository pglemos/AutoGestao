export function ManagerDataErrorState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-status-error/20 bg-status-error-surface p-6 text-status-error-text" role="alert">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm">Tente novamente em alguns instantes ou contate o suporte.</p>
    </div>
  )
}
