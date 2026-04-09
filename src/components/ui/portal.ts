let uiPortalContainer: HTMLElement | undefined

function normalizePortalContainer(
  container: Node | null | undefined,
): HTMLElement | undefined {
  if (!container) {
    return undefined
  }

  if (container instanceof ShadowRoot) {
    return container as unknown as HTMLElement
  }

  return container instanceof HTMLElement ? container : undefined
}

function getActivePortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }

  return normalizePortalContainer(document.activeElement?.getRootNode())
}

export function setUiPortalContainer(container: Node | null | undefined) {
  uiPortalContainer = normalizePortalContainer(container)
}

export function getUiPortalContainer(): HTMLElement | undefined {
  console.log(
    '🚀 ~ getUiPortalContainer ~ uiPortalContainer:',
    uiPortalContainer,
  )
  return uiPortalContainer ?? getActivePortalContainer()
}
