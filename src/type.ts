export interface BlockConfig {
  // 区块位置
  basePath: string
  id: string
  // 区块名称
  name: string
  // 区块版本
  version: string
  // 作者
  author?: string
  // 区块描述
  description: string
  // 标签，方便检索
  tag: string[]
  // 截图
  snapshot?: string
  // 模板模型, 使用JSON schema 来描述模板中需要使用到的数据
  // 学习：https://json-schema.org/learn/getting-started-step-by-step.html
  model?: any
  // 模板文件, 可以是目录或者文件
  // 文件名中可以包含变量，表示最终生成的文件名
  // 例如的 [name].js
  files?: string | string[]
}
