import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function injectCSS(
  css: string,
  element: HTMLElement | ShadowRoot = document.documentElement,
): HTMLStyleElement {
  console.log(document.readyState)

  const el = document.createElement('style')
  el.setAttribute('rel', 'stylesheet')
  el.textContent = css
  element.appendChild(el)
  return el
}
