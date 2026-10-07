import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import type { TopologyEdge, TopologyNode } from '../types/topology'
import { DEVICE_PRESETS } from '../constants/devices'
import { safeFilename } from './project'

interface RenderedDiagram { dataUrl: string; width: number; height: number }

async function renderCompleteDiagram(nodes: TopologyNode[]): Promise<RenderedDiagram> {
  if (!nodes.length) throw new Error('Add at least one device before exporting.')
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
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
  const dataUrl = await toPng(viewport, {
    backgroundColor: '#07101d',
    width,
    height,
    pixelRatio: 2,
    cacheBust: true,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
    filter: (node) => !(node instanceof HTMLElement) || !node.classList.contains('react-flow__attribution'),
  })
  return { dataUrl, width, height }
}

export async function exportTopologyPng(projectName: string, nodes: TopologyNode[]): Promise<void> {
  const image = await renderCompleteDiagram(nodes)
  const anchor = document.createElement('a')
  anchor.href = image.dataUrl
  anchor.download = `${safeFilename(projectName)}-topology.png`
  anchor.click()
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
  if (startOnNewPage) pdf.addPage()
  let y = 34
  drawPageHeader(pdf, title, generated, pageWidth)
  const rowHeight = 9
  const drawHeader = () => {
    pdf.setFillColor(230, 238, 243)
    pdf.rect(14, y, widths.reduce((a, b) => a + b, 0), rowHeight, 'F')
    pdf.setTextColor(24, 49, 68)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    let x = 16
    headers.forEach((header, index) => { pdf.text(header, x, y + 6); x += widths[index] ?? 0 })
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
    if (rowIndex % 2 === 1) { pdf.setFillColor(247, 250, 252); pdf.rect(14, y, widths.reduce((a, b) => a + b, 0), rowHeight, 'F') }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(35, 54, 68)
    let x = 16
    row.forEach((cell, index) => {
      const maxWidth = (widths[index] ?? 20) - 4
      const clipped = pdf.splitTextToSize(cell || '—', maxWidth)[0] ?? ''
      pdf.text(clipped, x, y + 6)
      x += widths[index] ?? 0
    })
    y += rowHeight
  })
}

export async function exportTopologyPdf(projectName: string, nodes: TopologyNode[], edges: TopologyEdge[]): Promise<void> {
  const rendered = await renderCompleteDiagram(nodes)
  const generated = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  drawPageHeader(pdf, 'NETWORK TOPOLOGY', generated, pageWidth)
  pdf.setTextColor(24, 49, 68); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text(projectName || 'Untitled Network', 14, 34)
  pdf.setTextColor(89, 112, 128); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(`${nodes.length} devices  •  ${edges.length} connections`, 14, 40)
  const maxWidth = pageWidth - 28
  const maxHeight = pageHeight - 58
  const ratio = Math.min(maxWidth / rendered.width, maxHeight / rendered.height)
  const imageWidth = rendered.width * ratio
  const imageHeight = rendered.height * ratio
  const imageX = (pageWidth - imageWidth) / 2
  pdf.setFillColor(7, 16, 29); pdf.roundedRect(imageX - 2, 46, imageWidth + 4, imageHeight + 4, 2, 2, 'F')
  pdf.addImage(rendered.dataUrl, 'PNG', imageX, 48, imageWidth, imageHeight, undefined, 'FAST')

  const inventoryRows = nodes.map((node) => [node.data.name, DEVICE_PRESETS[node.data.deviceType].label, node.data.hostname, node.data.managementIp || '—'])
  addTable(pdf, 'DEVICE INVENTORY', ['Device', 'Type', 'Hostname', 'Management IP'], inventoryRows, [72, 52, 72, 72], generated, true)

  const interfaceRows = nodes.flatMap((node) => node.data.interfaces.map((item) => [node.data.name, item.name, item.ip || '—', item.vlan || '—', item.role || '—', item.description || '—']))
  if (interfaceRows.length) addTable(pdf, 'INTERFACE / IP INFORMATION', ['Device', 'Interface', 'IP / CIDR', 'VLAN', 'Role', 'Description'], interfaceRows, [48, 38, 62, 26, 36, 58], generated, true)
  pdf.save(`${safeFilename(projectName)}-topology-report.pdf`)
}
