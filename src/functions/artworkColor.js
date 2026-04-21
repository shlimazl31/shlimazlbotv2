function createArtworkColor(track, fallbackColor) {
    const seed = track?.artworkUrl || track?.identifier || track?.title || "";
    if (!seed) return fallbackColor;

    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }

    const hue = hash % 360;
    return hslToHex(hue, 68, 58);
}

function hslToHex(hue, saturation, lightness) {
    saturation /= 100;
    lightness /= 100;

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    const match = lightness - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (huePrime >= 0 && huePrime < 1) [red, green, blue] = [chroma, x, 0];
    else if (huePrime < 2) [red, green, blue] = [x, chroma, 0];
    else if (huePrime < 3) [red, green, blue] = [0, chroma, x];
    else if (huePrime < 4) [red, green, blue] = [0, x, chroma];
    else if (huePrime < 5) [red, green, blue] = [x, 0, chroma];
    else [red, green, blue] = [chroma, 0, x];

    return `#${toHex(red + match)}${toHex(green + match)}${toHex(blue + match)}`;
}

function toHex(value) {
    return Math.round(value * 255).toString(16).padStart(2, "0").toUpperCase();
}

module.exports = {
    createArtworkColor,
};
