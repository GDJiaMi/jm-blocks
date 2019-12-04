import fs from 'fs'

const fp = fs.promises

export async function isExists(p: string) {
  try {
    await fp.access(p,fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(dir: string) {
  if (await isExists(dir)) {
    return
  }

  fp.mkdir(dir, {recursive: true})
}
