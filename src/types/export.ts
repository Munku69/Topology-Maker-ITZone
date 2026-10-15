export type ExportBackground = 'canvas' | 'white'

export type PdfLayout = 'standard' | 'itzone-portrait' | 'itzone-landscape'

export interface PdfExportDetails {
  author: string
  notes: string
}
