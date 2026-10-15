import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import type { ExportBackground, PdfExportDetails, PdfLayout } from '../types/export'
import type { TopologyEdge, TopologyNode } from '../types/topology'
import { CABLE_PRESETS } from '../constants/cables'
import { DEVICE_PRESETS } from '../constants/devices'
import { safeFilename } from './project'

interface RenderedDiagram { dataUrl: string; width: number; height: number }

async function loadImageDataUrl(path: string): Promise<string> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('Unable to load the ITZone logo.')
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to load the ITZone logo.'))
    reader.readAsDataURL(blob)
  })
}

async function renderCompleteDiagram(nodes: TopologyNode[], background: ExportBackground): Promise<RenderedDiagram> {
  if (!nodes.length) throw new Error('Add at least one device or text box before exporting.')
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  const canvas = document.querySelector<HTMLElement>('.canvas-shell')
  if (!viewport) throw new Error('Topology canvas is unavailable.')
  const bounds = getNodesBounds(nodes)
  const padding = 100
  const rawWidth = Math.max(800, bounds.width + padding * 2)
  const rawHeight = Math.max(500, bounds.height + padding * 2)
  const maxDimension = 4200
  const scale = Math.min(1, maxDimension / Math.max(rawWidth, rawHeight))
  const width = Math.round(rawWidth * scale)
  const height = Math.round(rawHeight * scale)
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.05, 2, 0.12)
  const canvasColor = canvas ? window.getComputedStyle(canvas).backgroundColor : '#1b2228'
  const backgroundColor = background === 'white' ? '#ffffff' : canvasColor
  const darkCanvas = document.documentElement.dataset.theme === 'dark' && background !== 'white'
  const exportStyle = {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    '--edge-label-text': darkCanvas ? '#f8fafc' : '#172b38',
    '--edge-label-bg': darkCanvas ? '#17212e' : '#ffffff',
    '--edge-label-border': darkCanvas ? '#475569' : '#9fb1bd',
  } as Partial<CSSStyleDeclaration>
  const dataUrl = await toPng(viewport, {
    backgroundColor,
    width,
    height,
    pixelRatio: 2,
    cacheBust: true,
    style: exportStyle,
    filter: (node) => !(node instanceof HTMLElement) || !node.classList.contains('react-flow__attribution'),
  })
  return { dataUrl, width, height }
}

export async function exportTopologyPng(projectName: string, nodes: TopologyNode[], background: ExportBackground = 'canvas'): Promise<void> {
  const image = await renderCompleteDiagram(nodes, background)
  const anchor = document.createElement('a')
  anchor.href = image.dataUrl
  anchor.download = `${safeFilename(projectName)}-topology.png`
  anchor.click()
}

function addFittedDiagram(pdf: jsPDF, rendered: RenderedDiagram, x: number, y: number, width: number, height: number, background: ExportBackground) {
  const ratio = Math.min(width / rendered.width, height / rendered.height)
  const imageWidth = rendered.width * ratio
  const imageHeight = rendered.height * ratio
  const imageX = x + (width - imageWidth) / 2
  const imageY = y + (height - imageHeight) / 2
  if (background === 'white') {
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(202, 212, 219)
    pdf.roundedRect(imageX - 1.5, imageY - 1.5, imageWidth + 3, imageHeight + 3, 1.5, 1.5, 'FD')
  } else {
    pdf.setFillColor(27, 34, 40)
    pdf.roundedRect(imageX - 1.5, imageY - 1.5, imageWidth + 3, imageHeight + 3, 1.5, 1.5, 'F')
  }
  pdf.addImage(rendered.dataUrl, 'PNG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST')
}

interface ConnectionLegendItem { color: string; dash?: string; label: string }

function connectionLegendItems(edges: TopologyEdge[]): ConnectionLegendItem[] {
  const unique = new Map<string, ConnectionLegendItem>()
  edges.forEach((edge) => {
    const cableType = edge.data?.cableType ?? 'copper-straight'
    const preset = CABLE_PRESETS[cableType]
    const color = edge.data?.color ?? preset.color
    const label = edge.data?.speed ?? 'Auto'
    const key = `${color}|${preset.dash ?? ''}|${label}`
    if (!unique.has(key)) unique.set(key, { color, dash: preset.dash, label })
  })
  return unique.size ? [...unique.values()] : [{ color: '#94a3b8', label: 'No connections' }]
}

function drawStandardConnectionLegend(pdf: jsPDF, edges: TopologyEdge[], pageWidth: number, pageHeight: number): number {
  const items = connectionLegendItems(edges)
  const columns = Math.min(4, Math.max(1, items.length))
  const rows = Math.ceil(items.length / columns)
  const height = 10 + rows * 7
  const x = 14
  const y = pageHeight - 8 - height
  const width = pageWidth - 28
  const cellWidth = width / columns
  pdf.setFillColor(247, 250, 252)
  pdf.setDrawColor(207, 216, 222)
  pdf.roundedRect(x, y, width, height, 1.5, 1.5, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(65, 83, 96)
  pdf.text('CONNECTION LEGEND', x + 4, y + 6)
  items.forEach((item, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const itemX = x + column * cellWidth + 4
    const itemY = y + 12 + row * 7
    const color = item.color.replace('#', '')
    pdf.setDrawColor(Number.parseInt(color.slice(0, 2), 16), Number.parseInt(color.slice(2, 4), 16), Number.parseInt(color.slice(4, 6), 16))
    pdf.setLineWidth(0.7)
    if (item.dash) pdf.setLineDashPattern(item.dash.split(' ').map(Number).map((value) => value * 0.35), 0)
    else pdf.setLineDashPattern([], 0)
    pdf.line(itemX, itemY, itemX + 12, itemY)
    pdf.setLineDashPattern([], 0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(43, 61, 74)
    const clipped = pdf.splitTextToSize(item.label, cellWidth - 21)[0] ?? item.label
    pdf.text(clipped, itemX + 16, itemY + 2)
  })
  return height + 4
}

function drawItzoneTemplate(
  pdf: jsPDF,
  logoDataUrl: string,
  projectName: string,
  generated: string,
  rendered: RenderedDiagram,
  background: ExportBackground,
  edges: TopologyEdge[],
  details: PdfExportDetails,
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const portrait = pageHeight > pageWidth
  const margin = 5
  const sideWidth = portrait ? 61 : 70
  const sideX = pageWidth - margin - sideWidth
  const titleHeight = 68
  const titleY = pageHeight - margin - titleHeight
  const legendItems = connectionLegendItems(edges)
  const legendColumns = legendItems.length > 10 ? 2 : 1
  const legendRows = Math.ceil(legendItems.length / legendColumns)
  const legendRowHeight = legendColumns === 2 ? 5 : 6
  const legendHeight = Math.min(titleY - margin - 8, Math.max(portrait ? 42 : 36, 14 + legendRows * legendRowHeight))

  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.setDrawColor(11, 27, 42)
  pdf.setLineWidth(0.5)
  pdf.rect(2.5, 2.5, pageWidth - 5, pageHeight - 5)
  pdf.setLineWidth(0.16)
  pdf.rect(4.2, 4.2, pageWidth - 8.4, pageHeight - 8.4)

  pdf.setDrawColor(32, 53, 69)
  pdf.setLineWidth(0.25)
  pdf.rect(sideX, margin, sideWidth, legendHeight)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(15, 41, 60)
  pdf.text('LEGEND', sideX + 4, margin + 7)
  pdf.setDrawColor(193, 205, 214)
  pdf.line(sideX, margin + 10, sideX + sideWidth, margin + 10)

  legendItems.forEach((item, index) => {
    const column = Math.floor(index / legendRows)
    const row = index % legendRows
    const columnWidth = sideWidth / legendColumns
    const itemX = sideX + column * columnWidth
    const itemY = margin + 16 + row * legendRowHeight
    const color = item.color.replace('#', '')
    pdf.setDrawColor(Number.parseInt(color.slice(0, 2), 16), Number.parseInt(color.slice(2, 4), 16), Number.parseInt(color.slice(4, 6), 16))
    pdf.setLineWidth(0.7)
    if (item.dash) pdf.setLineDashPattern(item.dash.split(' ').map(Number).map((value) => value * 0.35), 0)
    else pdf.setLineDashPattern([], 0)
    pdf.line(itemX + 4, itemY, itemX + (legendColumns === 2 ? 11 : 18), itemY)
    pdf.setLineDashPattern([], 0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(legendColumns === 2 ? 5.4 : 7)
    pdf.setTextColor(43, 61, 74)
    const labelWidth = columnWidth - (legendColumns === 2 ? 17 : 25)
    const clipped = pdf.splitTextToSize(item.label, labelWidth)[0] ?? item.label
    pdf.text(clipped, itemX + (legendColumns === 2 ? 14 : 22), itemY + 2)
  })

  pdf.setDrawColor(32, 53, 69)
  pdf.setLineWidth(0.25)
  pdf.rect(sideX, titleY, sideWidth, titleHeight)
  pdf.line(sideX, titleY + 24, sideX + sideWidth, titleY + 24)
  pdf.line(sideX, titleY + 35, sideX + sideWidth, titleY + 35)
  pdf.line(sideX, titleY + 56, sideX + sideWidth, titleY + 56)
  pdf.line(sideX + 27, titleY, sideX + 27, titleY + 24)
  pdf.addImage(logoDataUrl, 'PNG', sideX + 3.5, titleY + 3, 20, 18)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.5)
  pdf.setTextColor(40, 52, 61)
  pdf.text('ITZone LLC, Khan-Uul District', sideX + 29, titleY + 6)
  pdf.text('Ulaanbaatar 17010, Mongolia', sideX + 29, titleY + 11)
  pdf.text('Khan Bank Tower, 22nd floor', sideX + 29, titleY + 16)
  pdf.text(`Date: ${generated}`, sideX + 29, titleY + 21)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.7)
  pdf.setTextColor(25, 37, 46)
  pdf.text('Project:', sideX + 3, titleY + 31)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  const projectLine = pdf.splitTextToSize(projectName || 'Untitled Network', sideWidth - 22)[0] ?? 'Untitled Network'
  pdf.text(projectLine, sideX + 19, titleY + 31)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.3)
  pdf.text('Notes:', sideX + 3, titleY + 41)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.7)
  const noteLines = pdf.splitTextToSize(details.notes || '-', sideWidth - 8).slice(0, 3)
  pdf.text(noteLines, sideX + 3, titleY + 46)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.7)
  pdf.text('Author:', sideX + 3, titleY + 64)
  pdf.setFont('helvetica', 'normal')
  const authorLine = pdf.splitTextToSize(details.author || '-', sideWidth - 22)[0] ?? '-'
  pdf.text(authorLine, sideX + 19, titleY + 64)
  pdf.setTextColor(15, 41, 60)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(portrait ? 13 : 15)
  pdf.text('PHYSICAL NETWORK TOPOLOGY', 10, 14)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(85, 102, 114)
  pdf.text(projectName || 'Untitled Network', 10, 20)

  if (portrait) {
    addFittedDiagram(pdf, rendered, 9, margin + legendHeight + 8, pageWidth - 18, titleY - legendHeight - 18, background)
  } else {
    addFittedDiagram(pdf, rendered, 9, 27, sideX - 15, pageHeight - 38, background)
  }
}

function drawPageHeader(pdf: jsPDF, title: string, subtitle: string, pageWidth: number) {
  pdf.setFillColor(7, 16, 29)
  pdf.rect(0, 0, pageWidth, 24, 'F')
  pdf.setTextColor(56, 189, 248)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('NETWORK TOPOLOGY BUILDER', 14, 10)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(17)
  pdf.text(title, 14, 19)
  pdf.setTextColor(89, 112, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(subtitle, pageWidth - 14, 18, { align: 'right' })
}

function addTable(pdf: jsPDF, title: string, headers: string[], rows: string[][], widths: number[], generated: string, startOnNewPage: boolean) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const availableWidth = pageWidth - 28
  const widthTotal = widths.reduce((sum, width) => sum + width, 0)
  const widthScale = Math.min(1, availableWidth / widthTotal)
  const fittedWidths = widths.map((width) => width * widthScale)
  if (startOnNewPage) pdf.addPage()
  let y = 34
  drawPageHeader(pdf, title, generated, pageWidth)
  const rowHeight = 9
  const drawHeader = () => {
    pdf.setFillColor(230, 238, 243)
    pdf.rect(14, y, fittedWidths.reduce((a, b) => a + b, 0), rowHeight, 'F')
    pdf.setTextColor(24, 49, 68)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    let x = 16
    headers.forEach((header, index) => { pdf.text(header, x, y + 6); x += fittedWidths[index] ?? 0 })
    y += rowHeight
  }
  drawHeader()
  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > pageHeight - 14) {
      pdf.addPage()
      y = 34
      drawPageHeader(pdf, title, generated, pageWidth)
      drawHeader()
    }
    if (rowIndex % 2 === 1) { pdf.setFillColor(247, 250, 252); pdf.rect(14, y, fittedWidths.reduce((a, b) => a + b, 0), rowHeight, 'F') }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(35, 54, 68)
    let x = 16
    row.forEach((cell, index) => {
      const maxWidth = (fittedWidths[index] ?? 20) - 4
      const clipped = pdf.splitTextToSize(cell || '—', maxWidth)[0] ?? ''
      pdf.text(clipped, x, y + 6)
      x += fittedWidths[index] ?? 0
    })
    y += rowHeight
  })
}

export async function exportTopologyPdf(
  projectName: string,
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  background: ExportBackground = 'canvas',
  layout: PdfLayout = 'standard',
  details: PdfExportDetails = { author: '', notes: '' },
): Promise<void> {
  const rendered = await renderCompleteDiagram(nodes, background)
  const deviceNodes = nodes.filter((node) => node.data.deviceType !== 'text-box' && node.data.deviceType !== 'zone')
  const generated = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())
  const orientation = layout === 'itzone-portrait' ? 'portrait' : 'landscape'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  if (layout === 'standard') {
    drawPageHeader(pdf, 'NETWORK TOPOLOGY', generated, pageWidth)
  pdf.setTextColor(24, 49, 68); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text(projectName || 'Untitled Network', 14, 34)
  pdf.setTextColor(89, 112, 128); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(`${deviceNodes.length} devices  •  ${edges.length} connections`, 14, 40)
  const detailSummary = [details.author ? `Author: ${details.author}` : '', details.notes ? `Notes: ${details.notes}` : ''].filter(Boolean).join('  |  ')
  if (detailSummary) {
    pdf.setFontSize(6.5)
    const clippedDetails = pdf.splitTextToSize(detailSummary, pageWidth - 28)[0] ?? detailSummary
    pdf.text(clippedDetails, 14, 44)
  }
  const maxWidth = pageWidth - 28
  const legendHeight = drawStandardConnectionLegend(pdf, edges, pageWidth, pageHeight)
  const maxHeight = Math.max(40, pageHeight - 58 - legendHeight)
  const ratio = Math.min(maxWidth / rendered.width, maxHeight / rendered.height)
  const imageWidth = rendered.width * ratio
  const imageHeight = rendered.height * ratio
  const imageX = (pageWidth - imageWidth) / 2
  if (background === 'white') {
    pdf.setFillColor(255, 255, 255); pdf.setDrawColor(207, 216, 222); pdf.roundedRect(imageX - 2, 46, imageWidth + 4, imageHeight + 4, 2, 2, 'FD')
  } else {
    pdf.setFillColor(27, 34, 40); pdf.roundedRect(imageX - 2, 46, imageWidth + 4, imageHeight + 4, 2, 2, 'F')
  }
  pdf.addImage(rendered.dataUrl, 'PNG', imageX, 48, imageWidth, imageHeight, undefined, 'FAST')
  } else {
    const logoDataUrl = await loadImageDataUrl(`${import.meta.env.BASE_URL}itzone.png`)
    drawItzoneTemplate(pdf, logoDataUrl, projectName, generated, rendered, background, edges, details)
  }

  const inventoryRows = deviceNodes.map((node) => [node.data.name, DEVICE_PRESETS[node.data.deviceType].label, node.data.hostname, node.data.managementIp || '—'])
  if (inventoryRows.length) addTable(pdf, 'DEVICE INVENTORY', ['Device', 'Type', 'Hostname', 'Management IP'], inventoryRows, [72, 52, 72, 72], generated, true)

  const interfaceRows = deviceNodes.flatMap((node) => node.data.interfaces.map((item) => [node.data.name, item.name, item.ip || '—', item.vlan || '—', item.role || '—', item.description || '—']))
  if (interfaceRows.length) addTable(pdf, 'INTERFACE / IP INFORMATION', ['Device', 'Interface', 'IP / CIDR', 'VLAN', 'Role', 'Description'], interfaceRows, [48, 38, 62, 26, 36, 58], generated, true)
  pdf.save(`${safeFilename(projectName)}-topology-report.pdf`)
}
