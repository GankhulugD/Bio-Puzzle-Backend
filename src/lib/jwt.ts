import jwt from 'jsonwebtoken'

const getSecret = () => {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      'JWT_SECRET must be set in .env (at least 16 characters for production use longer random string)',
    )
  }
  return s
}

export function signJwtUserId(userId: string): string {
  const opts: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  }
  return jwt.sign({ sub: userId }, getSecret(), opts)
}

export function verifyJwtUserId(token: string): string {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload
  const sub = payload.sub
  if (!sub || typeof sub !== 'string') throw new Error('Invalid token payload')
  return sub
}
