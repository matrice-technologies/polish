import { useEffect, useState } from "react"

import type { AppState, PolishApi } from "../../../common/types"

declare global {
  interface Window {
    polish: PolishApi
  }
}

export const polish = window.polish

/** The main process's state, kept current by its broadcasts. */
export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null)
  useEffect(() => {
    void polish.getState().then(setState)
    return polish.onState(setState)
  }, [])
  return state
}
