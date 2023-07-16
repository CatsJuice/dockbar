function rows(lines: string[]) {
  return lines.join('\n')
}

function tab(code: string, n = 1) {
  return '  '.repeat(n) + code
}
function tabLines(lines: string[], n = 1) {
  return lines.map(line => tab(line, n))
}

function html({ head, body }: { head: string; body: string }) {
  return rows([
    '<!DOCTYPE html>',
    '<html lang=\'en\'>',
    '<head>',
    head,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
  ])
}
function tag(tagName: string, code: string | string[], attrs: Record<string, any> = {}) {
  const attrsArr = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`)
  const lines = (Array.isArray(code) ? code : [code]).filter(Boolean)

  if (attrsArr.length > 3) {
    if (lines.length) {
      return [
        `<${tagName}`,
        ...tabLines(attrsArr),
        '>',
        ...tabLines(lines),
        `</${tagName}>`,
      ]
    }
    else {
      return [
        `<${tagName}`,
        ...tabLines(attrsArr),
        `></${tagName}>`,
      ]
    }
  }
  const attrRaw = attrsArr.length ? ` ${attrsArr.join(' ')}` : ''
  return lines.length
    ? [
    `<${tagName}${attrRaw}>`,
    ...tabLines(lines),
    `</${tagName}>`]
    : [`<${tagName}${attrRaw}></${tagName}>`]
}
const scriptTag = (code: string | string[], attrs: Record<string, any> = {}) => tag('script', code, attrs)
const styleTag = (code: string | string[], attrs: Record<string, any> = {}) => tag('style', code, attrs)
const divTag = (code: string | string[], attrs: Record<string, any> = {}) => tag('div', code, attrs)

export function useCode() {
  const count = 4

  const code = computed(() => {
    const cdn = scriptTag('', { src: 'https://unpkg.com/dockbar@latest/dockbar.iife.js' })

    const dock = tag('dock-wrapper', [
      ...Array(count).fill(0).flatMap((_, i) => tag('dock-item', divTag(`Item ${i}`, { class: 'item' }))),
    ], {
      'size': config.size,
      'padding': config.padding,
      'gap': config.gap,
      'max-scale': config.maxScale,
      'max-range': config.maxRange,
      'disabled': config.disabled,
      'direction': config.direction,
      'position': config.position,
    })

    const body = [
      ...cdn,
      ...dock,
    ]
    const head = styleTag('')

    return html({
      body: rows(body),
      head: rows(head),
    })
  })

  return code
}
