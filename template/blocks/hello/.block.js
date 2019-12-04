/**
 * 区块配置
 */
module.exports = {
  name: '区块名称',
  version: '0.1.0',
  description: '区块描述',
  // 标签，方便检索
  tag: [
    '组件',
    'PC'
  ],
  // 截图
  snapshot: './snapshot.png',
  // 模板模型, 使用JSON schema 来描述模板中需要使用到的数据
  // 学习：https://json-schema.org/learn/getting-started-step-by-step.html
  model: {},
  // 模板文件, 可以是目录或者文件
  // 文件名中可以包含变量，表示最终生成的文件名
  // 例如的 [name].js
  files: [
    "./{componentName}"
  ],
}
