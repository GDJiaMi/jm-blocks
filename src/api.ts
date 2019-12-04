import GitSync from './sync'
import render from './render'

/**
 * 数据源同步相关
 */

/**
 * 切换源
 * @param source git 源
 */
export function changeSource(source: string) {
  return GitSync.shared().changeSource(source)
}

export enum SyncStatus {
  Initial,
  Syncing,
  Error,
  Synced,
}

/**
 * 获取同步状态
 */
export function getSyncStatus(): SyncStatus {
  const git = GitSync.shared()
  return git.currentRepo == null
    ? SyncStatus.Initial
    : git.syning
    ? SyncStatus.Syncing
    : git.syncError
    ? SyncStatus.Error
    : SyncStatus.Synced
}

export function onSyncError(cb: (err: Error) => void) {
  GitSync.shared().on('sync-error', cb)
  return () => {
    GitSync.shared().removeListener('sync-error', cb)
  }
}

export function onSyncSuccess(cb: () => void) {
  GitSync.shared().on('sync-success', cb)
  return () => {
    GitSync.shared().removeListener('sync-success', cb)
  }
}

/**
 * 拉取最新
 */
export function pull() {
  const status = getSyncStatus()
  if (status !== SyncStatus.Synced) {
    return
  }

  GitSync.shared().pull()
}

export async function search(key: string, tag: string[]) {
  if (getSyncStatus() !== SyncStatus.Synced) {
    return []
  }

  return (await GitSync.shared().search(key, tag)) || []
}

/**
 * 渲染相关
 */
export { render }
