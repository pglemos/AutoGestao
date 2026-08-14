/**
 * Deprecated compatibility export. The live application mounts exactly one
 * Sonner provider in `App.tsx`; keeping this component inert prevents legacy
 * imports from reintroducing a second toast viewport.
 */
export function Toaster() {
  return null;
}
