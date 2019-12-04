/**
 * 模板源同步
 */
import path from 'path'
import os from 'os'
import git from 'simple-git/promise'
import fs from 'fs'
import { EventEmitter } from 'events'
import { ensureDir, isExists } from './utils/fs'
import { BlockConfig } from './type'

const fp = fs.promises
const DEFAULT_WORKSPACE = path.join(os.homedir(), '.jm-blocks')
let uid = 0

export default class GitSync extends EventEmitter {
  private static instance: GitSync
  public static shared() {
    if (this.instance) {
      return this.instance
    }
    return (this.instance = new GitSync())
  }
  public workspace: string = DEFAULT_WORKSPACE
  public currentSource!: string
  public currentSourceDir!: string
  public currentSourceName!: string
  public currentRepo!: git.SimpleGit
  public syning: boolean = false
  public syncError?: Error
  private currentBlocks?: BlockConfig[]

  public changeSource(source: string, workspace?: string) {
    if (workspace != null) {
      this.workspace = workspace
    }
    this.currentSource = source
    const basename = path.basename(source, '.git')
    this.currentSourceName = basename
    this.currentSourceDir = path.join(this.workspace, basename)
    this.initialOrSyncRepo()
  }

  public pull() {
    this.initialOrSyncRepo()
  }

  public async search(key: string, tags: string[]) {
    if (this.currentBlocks == null) {
      await this.fetchBlocks()
    }

    return this.currentBlocks?.filter(i => {
      i.name.indexOf(key) !== -1 && (tags?.length ? tags.some(t => i.tag.indexOf(t) !== -1) : true)
    })
  }

  /**
   * 获取区块列表
   */
  public async fetchBlocks() {
    if (this.syncError || this.syning) {
      return
    }

    const pkgfile = await fp.readFile(path.join(this.currentSource, 'package.json'))
    const pkg = JSON.parse(pkgfile.toString())
    const blocksDir = path.join(this.currentSourceDir, 'blocks')
    if (pkg['jm-blocks'] == null || !isExists(blocksDir)) {
      throw new Error(`无法识别 blocks 源: ${this.currentSourceDir}, 请按照规范添加区块`)
    }
    const blocks = await fp.readdir(blocksDir)
    const rtn = await Promise.all(
      blocks.map(async i => {
        const configPath = path.join(blocksDir, i, '.block.js')
        // TODO: 配置验证
        const config = require(configPath)
        config.id = uid++
        return config
      }),
    )
    this.currentBlocks = rtn
  }

  private async initialOrSyncRepo() {
    await ensureDir(this.workspace)
    try {
      this.syning = true
      this.syncError = undefined
      if (await isExists(this.currentSourceDir)) {
        // pull
        this.currentRepo = git(this.currentSourceDir)
        this.currentRepo.pull()
      } else {
        this.currentRepo = git(this.workspace)
        await this.currentRepo.clone(this.currentSource, this.currentSourceName)
      }
      process.nextTick(() => {
        this.emit('sync-success')
      })
    } catch (err) {
      this.syncError = err
      this.emit('sync-error', err)
    } finally {
      this.syning = false
    }
  }
}
