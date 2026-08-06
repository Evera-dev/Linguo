export interface ParsedCard {
  id: string
  front: string
  back: string
  example?: string
  notes?: string
  tags: string[]
  errors: string[]
  warnings: string[]
}

