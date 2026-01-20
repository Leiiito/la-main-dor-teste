// Utils image (client-side) — resize + compression vers DataURL
// Objectif : limiter le poids lors du stockage en localStorage / export JSON.

/**
 * Estime le poids (octets) d'un DataURL base64.
 * @param {string} dataUrl
 * @returns {number}
 */
export function estimateDataUrlBytes(dataUrl) {
  const s = String(dataUrl || "");
  const idx = s.indexOf(",");
  if (idx < 0) return 0;
  const b64 = s.slice(idx + 1);
  const padding = (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/**
 * Charge une image HTMLImageElement depuis un Blob/File.
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Compresse un fichier image (input type=file) en DataURL.
 * Par défaut : JPEG qualité 0.82, max 900×900.
 *
 * @param {File} file
 * @param {{maxW?:number, maxH?:number, quality?:number, format?:string}} [opts]
 * @returns {Promise<{dataUrl:string, width:number, height:number, bytes:number}>}
 */
export async function compressImageFileToDataUrl(file, opts = {}) {
  const maxW = Number.isFinite(opts.maxW) ? opts.maxW : 900;
  const maxH = Number.isFinite(opts.maxH) ? opts.maxH : 900;
  const quality = Number.isFinite(opts.quality) ? opts.quality : 0.82;
  const format = opts.format || "image/jpeg";

  const img = await loadImageFromBlob(file);

  const inW = img.naturalWidth || img.width;
  const inH = img.naturalHeight || img.height;

  const ratio = Math.min(1, maxW / inW, maxH / inH);
  const outW = Math.max(1, Math.round(inW * ratio));
  const outH = Math.max(1, Math.round(inH * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D indisponible.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);

  const dataUrl = canvas.toDataURL(format, quality);
  return {
    dataUrl,
    width: outW,
    height: outH,
    bytes: estimateDataUrlBytes(dataUrl),
  };
}
