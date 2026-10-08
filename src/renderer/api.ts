import type { GridApi } from '../shared/api'

declare global {
  interface Window {
    gridApi: GridApi
  }
}

export const api: GridApi = window.gridApi
