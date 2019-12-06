/**
 * 模板源同步
 */
import path from 'path'
import fs from 'fs'
import json5 from 'json5'
import { isExists } from './utils/fs'
import { BlockConfig } from './type'

const fp = fs.promises

export default class Blocks {
  public target: string
  private currentBlocks?: BlockConfig[]

  // 区块源所在位置
  public constructor(target: string) {
    if (!fs.existsSync(target)) {
      throw new Error('[jm-block] 非法参数，源目录为空')
    }
    this.target = target
  }

  public async search(key: string, tags: string[]) {
    if (this.currentBlocks == null) {
      await this.fetchBlocks()
    }

    return this.currentBlocks?.filter(i => {
      return (
        (key ? i.name.indexOf(key) !== -1 : true) && (tags?.length ? tags.some(t => i.tag.indexOf(t) !== -1) : true)
      )
    })
  }

  /**
   * 获取区块列表
   */
  public async fetchBlocks() {
    // 检查是否是区块
    const pkgfile = await fp.readFile(path.join(this.target, 'package.json'))
    const pkg = JSON.parse(pkgfile.toString())
    const blocksDir = path.join(this.target, 'blocks')

    if (pkg['jm-blocks'] == null || !isExists(blocksDir)) {
      throw new Error(`无法识别 blocks 源: ${this.target}, 请按照规范添加区块`)
    }

    const blocks = await fp.readdir(blocksDir)

    const rtn = await Promise.all(
      blocks.map(async i => {
        const basePath = path.join(blocksDir, i)
        const configPath = path.join(blocksDir, i, 'block.json')

        // TODO: 配置验证
        const cf = await fp.readFile(configPath)
        const config = json5.parse(cf.toString())

        config.id = i
        config.basePath = basePath

        return config
      }),
    )
    this.currentBlocks = rtn
  }
}
