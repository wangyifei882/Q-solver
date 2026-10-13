import * as pdfjs from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const MAX_SCANNED_PAGES = 8
const MAX_TEXT_LENGTH = 50000
const MAX_IMAGE_DIMENSION = 1600

function decodeBase64(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function renderPageImage(page) {
  const original = page.getViewport({ scale: 1 })
  const scale = Math.min(2, MAX_IMAGE_DIMENSION / Math.max(original.width, original.height))
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建 PDF 渲染画布')

  await page.render({ canvasContext: context, canvas, viewport, background: 'rgb(255,255,255)' }).promise
  const image = canvas.toDataURL('image/jpeg', 0.82)
  canvas.width = 0
  canvas.height = 0
  return image
}

export async function extractResumeInput(base64) {
  if (!base64) throw new Error('请先选择简历文件')

  const loadingTask = pdfjs.getDocument({ data: decodeBase64(base64) })
  try {
    const pdf = await loadingTask.promise
    const pages = []
    const images = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      let text = ''
      try {
        const content = await page.getTextContent()
        text = content.items
          .filter(item => typeof item.str === 'string')
          .map(item => item.str + (item.hasEOL ? '\n' : ' '))
          .join('')
          .trim()
      } catch (error) {
        console.warn(`第 ${pageNumber} 页文字提取失败，将按图片解析`, error)
      }

      if (text.length >= 20) {
        pages.push(`第 ${pageNumber} 页：\n${text}`)
      } else {
        if (images.length >= MAX_SCANNED_PAGES) {
          throw new Error(`扫描页超过 ${MAX_SCANNED_PAGES} 页，请使用较短的简历 PDF`)
        }
        images.push(await renderPageImage(page))
      }
      page.cleanup()
    }

    const text = pages.join('\n\n')
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error('简历文字过长，请使用较短的 PDF')
    }
    if (!text && images.length === 0) {
      throw new Error('PDF 中没有可解析的内容')
    }
    return { text, images }
  } finally {
    await loadingTask.destroy()
  }
}
