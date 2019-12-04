import fs from 'fs'
import ejs from 'ejs'
import get from 'lodash/get'
import path from 'path'

import { ensureDir } from './utils/fs'

const fp = fs.promises
const FILE_NAME_REGEXP = /{(.*)}.*/

/**
 * 模板渲染
 */
export interface Config {
  // 模板所在位置
  basePath: string
  // 输出位置
  target: string
  name: string
  model: any
  files: string | string[]
}

enum FileType {
  Dir,
  File
}

type Files = {
  type: FileType.Dir
  name: string
  outputName: string
  children: Files[]
} | {
  type: FileType.File
  name: string
  content: string
  outputName: string
}

function renderFile(p: string, model: any) {
  return new Promise((res, rej) => {
    ejs.renderFile(p, model, (err, str) => {
      if (err != null) { rej(err) }else {
        res(str)
      }
    })
  })
}


function fileTransform(target: string, basePath: string, files: string[], model: any): Promise<Files[]> {
  return Promise.all(files.map(async f => {
    const fullPath = path.join(basePath, f)
    const stat = await fp.stat(fullPath)
    const name = path.basename(f)
    let outputName = name

    // 名称处理
    const matched = name.match(FILE_NAME_REGEXP)

    if (matched) {
      const [,getter] = matched
      const value = get(model, getter)
      if (value == null) {
        throw new Error(`${getter} 求值失败，请检查`)
      }
      outputName = name.replace(`{${getter}}`, value)
    }

    outputName = path.join(target, outputName)

    // 目录处理
    if (stat.isDirectory()) {
      const info:Files = {
        type: FileType.Dir,
        name, 
        outputName,
        children: []
      }

      const content = await fp.readdir(fullPath)

      info.children = await fileTransform(outputName, fullPath, content, model)

      return info
    } else {
      const content = await renderFile(fullPath, model) 
      return {
        type: FileType.File,
        name,
        content,
        outputName,
      } as Files
    }
  }))
}

function output(files: Files[]): Promise<any> {
  return Promise.all(files.map(async i => {
    if (i.type=== FileType.Dir){
      await ensureDir(i.outputName)
      return output(i.children)
    } else {
      return fp.writeFile(i.outputName, i.content)
    }
  }))
}

export default async function render(config: Config) {
  const {basePath, model, target} = config
  let files = Array.isArray(config.files) ? config.files : [config.files]
  if (files.length === 0) {
    files.push('./template')
  }

  await ensureDir(basePath)

  const rendered = await fileTransform(target, basePath, files, model)
  return output(rendered)
}
