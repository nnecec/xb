// forked from https://github.com/cristicretu/meshgrad

// Generate a random hue from 0 - 360
const getColor = (): number => {
  return Math.round(Math.random() * 360)
}

const getPercent = (value: number): number => {
  return Math.round((Math.random() * (value * 100)) % 100)
}

const getHashPercent = (value: number, hash: number, length: number): number => {
  return Math.round(((hash / length) * (value * 100)) % 100)
}

const hexToHSL = (hex?: string): number | undefined => {
  if (!hex) return undefined
  hex = hex.replace(/#/g, '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(function (hex) {
        return hex + hex
      })
      .join('')
  }
  var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})[\da-z]{0,0}$/i.exec(hex)
  if (!result) {
    return undefined
  }
  var r = parseInt(result[1], 16)
  var g = parseInt(result[2], 16)
  var b = parseInt(result[3], 16)
  ;((r /= 255), (g /= 255), (b /= 255))
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  var h = (max + min) / 2
  if (max == min) {
    h = 0
  } else {
    var d = max - min
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  h = Math.round(360 * h)

  return h
}

const genColors = (length: number, initialHue: number): string[] => {
  return Array.from({ length }, (_, i) => {
    // analogous colors + complementary colors
    // https://uxplanet.org/how-to-use-a-split-complementary-color-scheme-in-design-a6c3f1e22644

    // base color
    if (i === 0) {
      return `hsl(${initialHue}, 100%, 74%)`
    }
    // analogous colors
    if (i < length / 1.4) {
      return `hsl(${
        initialHue - 30 * (1 - 2 * (i % 2)) * (i > 2 ? i / 2 : i)
      }, 100%, ${64 - i * (1 - 2 * (i % 2)) * 1.75}%)`
    }

    // complementary colors
    return `hsl(${initialHue - 150 * (1 - 2 * (i % 2))}, 100%, ${
      66 - i * (1 - 2 * (i % 2)) * 1.25
    }%)`
  })
}

const genGrad = (length: number, colors: string[], hash?: number): string[] => {
  return Array.from({ length }, (_, i) => {
    return `radial-gradient(at ${
      hash ? getHashPercent(i, hash, length) : getPercent(i)
    }% ${hash ? getHashPercent(i * 10, hash, length) : getPercent(i * 10)}%, ${
      colors[i]
    } 0px, transparent 55%)\n`
  })
}

const genStops = (length: number, baseColor?: number, hash?: number) => {
  // get the color for the radial gradient
  const colors = genColors(length, baseColor ? baseColor : getColor())
  // generate the radial gradient
  const proprieties = genGrad(length, colors, hash ? hash : undefined)
  return [colors[0], proprieties.join(',')]
}

const generateMeshGradient = (length: number, baseColor?: string, hash?: number) => {
  const [bgColor, bgImage] = genStops(
    length,
    hexToHSL(baseColor) ? hexToHSL(baseColor) : undefined,
    hash ? hash : undefined,
  )
  return `background-color: ${bgColor}; background-image:${bgImage}`
}

const generateJSXMeshGradient = (length: number, baseColor?: string, hash?: number) => {
  const [bgColor, bgImage] = genStops(
    length,
    hexToHSL(baseColor) ? hexToHSL(baseColor) : undefined,
    hash ? hash : undefined,
  )
  return { backgroundColor: bgColor, backgroundImage: bgImage }
}

export { generateMeshGradient }
export { generateJSXMeshGradient }
