import * as tf from "@tensorflow/tfjs";

const networkInputSize = 64;

/**
 * Load an <img> from a URL or data: URI, resolving once it has decoded.
 */
function loadImageElement(imgFile: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = imgFile;
  });
}

/**
 * Load an image (bundled path or uploaded data URL), center-crop it to a
 * square, and resize to 64x64. Returns a Tensor3D in HWC layout, optionally
 * normalized to [0, 1]. All intermediate tensors are reclaimed by tf.tidy.
 */
export async function getInputImageArray(
  imgFile: string,
  normalize = true,
): Promise<tf.Tensor3D> {
  const img = await loadImageElement(imgFile);

  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(img); // [h, w, 3], 0..255
    const [h, w] = pixels.shape;

    const side = Math.min(h, w);
    const top = Math.floor((h - side) / 2);
    const left = Math.floor((w - side) / 2);
    const cropped = tf.slice(pixels, [top, left, 0], [side, side, 3]);

    const resized = tf.image.resizeBilinear(cropped, [
      networkInputSize,
      networkInputSize,
    ]);

    return (normalize ? resized.div(255) : resized) as tf.Tensor3D;
  });
}
