import process, { cwd } from 'node:process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from 'node:console'
import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import 'dotenv/config'
import { JSDOM } from 'jsdom'
import _ from 'lodash'

const URL = 'https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=zh-cn'
const agent = new HttpsProxyAgent('http://127.0.0.1:9981')

export const isDev = process.env.CHROME_PERMISSIONS_LIST_ENV === 'development'

export async function getHtmlContent() {
  try {
    log('[getHtmlContent] 开始获取 HTML 内容')
    const { data } = await axios.get(URL, {
      responseType: 'text',
      timeout: 30000,
      httpsAgent: isDev ? agent : undefined,
    })
    log('[getHtmlContent] 开始获取 HTML 成功')
    return data
  }
  catch (error) {
    log('[getHtmlContent] 获取 HTML 内容失败', error)
  }
}

export function parser(html: string) {
  log('[parser] 开始解析 HTML 内容')
  const { window } = new JSDOM(html)
  const dl = window.document.querySelectorAll('dl')[0]
  const groups = _.chunk(Array.from(dl.children), 3)
  const result = groups.map((group) => {
    return {
      title: group[1].textContent?.replaceAll('"', ''),
      description: group[2].textContent?.replaceAll('\n', ''),
    }
  })
  log('[parser] 开始解析 HTML 成功')
  return result
}

export function toMarkdownTable(parserResult: { title: string | undefined, description: string | undefined }[]) {
  const content = `
## Chrome 扩展程序权限列表

>下面列出了所有可用权限以及由特定权限触发的所有警告。

| Permission | Description |
| --- | --- |
${parserResult.map(item => `| ${item.title} | ${item.description} |`).join('\n')}

PS: 数据来源 [permissions-list](https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=zh-cn),同步时间${new Date().toLocaleString()}
`
  return content
}

export async function setup() {
  log('同步开始')
  const htmlContent = await getHtmlContent()
  const parserResult = parser(htmlContent)
  const content = toMarkdownTable(parserResult)
  writeFileSync(join(cwd(), 'README.md'), content)
  log('同步完毕~')
}
