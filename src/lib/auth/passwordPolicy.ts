export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula, uma minúscula e um número.'

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz'
const DIGIT_CHARS = '23456789'
const SYMBOL_CHARS = '!@#$%&*'
const PASSWORD_CHARS = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${DIGIT_CHARS}${SYMBOL_CHARS}`

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

function randomIndex(max: number) {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint32Array(1)
    cryptoApi.getRandomValues(bytes)
    return bytes[0] % max
  }
  return Math.floor(Math.random() * max)
}

function pick(chars: string) {
  return chars[randomIndex(chars.length)]
}

export function generateStrongTemporaryPassword(length = 18) {
  const size = Math.max(length, 6)
  const chars = [
    pick(UPPERCASE_CHARS),
    pick(LOWERCASE_CHARS),
    pick(DIGIT_CHARS),
    pick(SYMBOL_CHARS),
  ]

  while (chars.length < size) {
    chars.push(pick(PASSWORD_CHARS))
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    const current = chars[index]
    chars[index] = chars[swapIndex]
    chars[swapIndex] = current
  }

  return chars.join('')
}

export const isValidPassword = isStrongPassword
export const generateTemporaryPassword = generateStrongTemporaryPassword
