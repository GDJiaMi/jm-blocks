import fs from 'fs'
import ejs, { TemplateFunction } from 'ejs'
import glob from 'glob'
import uniq from 'lodash/uniq'
import template from 'lodash/template'
import path from 'path'

import { ensureDir } from './utils/fs'
import { BlockConfig } from './type'
import { TemplateExecutor } from 'lodash'

const fp = fs.promises
const FILE_NAME_REGEXP = /{([a-zA-Z_0-9]+)}/g

/**
 * 模板渲染
 */
export interface Config {
  // 区块模板所在位置
  basePath: string
  // 区块配置
  define: BlockConfig
}

enum FileType {
  Dir,
  File,
}

export type Files =
  | {
      type: FileType.Dir
      // 原始文件名
      name: string
      nameTemplate: TemplateExecutor
      // 转换后文件名
      outputName: string
      // 原始文件路径，相对
      originPath: string
    }
  | {
      type: FileType.File
      // 原始文件名
      name: string
      nameTemplate: TemplateExecutor
      template: TemplateFunction
      // 原始内容
      originContent: string
      // 渲染后内容
      content: string
      // 转换后文件名
      outputName: string
      // 原始文件路径，相对
      originPath: string
    }

export default class Renderer {
  private cache?: Files[]
  public constructor(public basePath: string, public define: BlockConfig) {}

  /**
   * 文件渲染
   * @param model
   * @param force
   */
  public async render(model: any, force?: boolean) {
    if (this.cache && !force) {
      // 重新渲染缓存
      return await this.renderCache(model)
    }

    let {
      basePath,
      define: { files },
    } = this

    // 默认是 template 目录
    let _files = files && (Array.isArray(files) ? files : [files])

    if (_files == null || !_files.length) {
      _files = ['./**/*']
      this.basePath = basePath = path.join(basePath, './template')
    }

    // glob 转换
    const trueFiles = await this.find(basePath, _files as string[])
    // 文件处理和模板渲染
    const rendered = await this.walk(basePath, trueFiles, model)

    this.cache = rendered

    return rendered
  }

  /**
   * 获取渲染结果，必须在render 之后调用
   */
  public getFiles() {
    if (this.cache == null) {
      throw new Error('call render first')
    }
    return this.cache
  }

  /**
   * 输出模板到目标位置
   * @param target 目标位置
   * @param files
   */
  public output(target: string) {
    if (this.cache == null) {
      throw new Error('call render first')
    }
    return Promise.all(
      this.cache
        .sort((a, b) => a.outputName.length - b.outputName.length)
        .map(async i => {
          const fullPath = path.join(target, i.outputName)
          if (i.type === FileType.Dir) {
            await ensureDir(fullPath)
          } else {
            const dir = path.dirname(fullPath)
            await ensureDir(dir)
            return fp.writeFile(fullPath, i.content)
          }
        }),
    )
  }

  /**
   * 解析glob 路径
   * @param basePath
   * @param files
   */
  private async find(basePath: string, files: string[]) {
    const all = await Promise.all<string[]>(
      files.map(f => {
        return new Promise((res, rej) => {
          glob(
            f,
            {
              cwd: basePath,
            },
            (err, o) => {
              if (err != null) {
                rej(err)
                return
              }
              // 过滤掉 basePath 之外的路径
              res(o.filter(i => !i.startsWith('..')))
            },
          )
        })
      }),
    )

    return uniq(all.flat())
  }

  private renderCache(model: any) {
    return (this.cache = this.cache!.map(i => {
      const copy = { ...i }
      copy.outputName = i.nameTemplate(model)
      if (copy.type === FileType.File) {
        copy.content = copy.template(model)
      }

      return copy
    }))
  }

  private getNameTemplate(name: string) {
    // 名称处理
    return template(name, {
      interpolate: FILE_NAME_REGEXP,
    })
  }

  private walk(basePath: string, files: string[], model: any): Promise<Files[]> {
    return Promise.all(
      files.map(async f => {
        const fullPath = path.join(basePath, f)
        const stat = await fp.stat(fullPath)
        const name = path.basename(f)
        const nameTemplate = this.getNameTemplate(f)
        const outputName = nameTemplate(model)

        // 目录处理
        if (stat.isDirectory()) {
          const info: Files = {
            type: FileType.Dir,
            name,
            originPath: f,
            nameTemplate,
            outputName,
          }

          return info
        } else {
          const content = (await fp.readFile(fullPath)).toString()
          const template = ejs.compile(content)
          const rendered = template(model)
          return {
            type: FileType.File,
            name,
            template,
            nameTemplate,
            originContent: content,
            content: rendered,
            outputName,
            originPath: f,
          } as Files
        }
      }),
    )
  }
}
