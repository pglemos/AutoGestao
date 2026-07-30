export function isInternalTokenAuthorized(
  received: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!received || !expected || received.length !== expected.length) return false

  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}
