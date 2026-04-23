import * as tf from "@tensorflow/tfjs";

const networkInputSize = 64;

function cropCentralSquare(arr: number[][][]): number[][][] {
  const width = arr.length;
  const height = arr[0].length;

  if (width < networkInputSize || height < networkInputSize) {
    const cropDimensions = Math.min(width, height);
    const startX = Math.floor(width / 2) - cropDimensions / 2;
    const startY = Math.floor(height / 2) - cropDimensions / 2;
    return arr
      .slice(startX, startX + cropDimensions)
      .map((row) => row.slice(startY, startY + cropDimensions));
  }
  const startX = Math.floor(width / 2) - Math.floor(networkInputSize / 2);
  const startY = Math.floor(height / 2) - Math.floor(networkInputSize / 2);
  return arr
    .slice(startX, startX + networkInputSize)
    .map((row) => row.slice(startY, startY + networkInputSize));
}

function imageDataTo3DTensor(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  normalize = true,
): tf.Tensor3D {
  let imageArray = tf.fill([width, height, 3], 0).arraySync() as number[][][];

  for (let i = 0; i < imageData.length; i++) {
    const pixelIndex = Math.floor(i / 4);
    const channelIndex = i % 4;
    const row =
      width === height
        ? Math.floor(pixelIndex / width)
        : pixelIndex % width;
    const column =
      width === height
        ? pixelIndex % width
        : Math.floor(pixelIndex / width);

    if (channelIndex < 3) {
      const curEntry = imageData[i];
      const value = normalize ? curEntry / 255 : curEntry;
      imageArray[row][column][channelIndex] = value;
    }
  }

  if (width !== networkInputSize && height !== networkInputSize) {
    imageArray = cropCentralSquare(imageArray);
  }

  return tf.tensor3d(imageArray);
}

/**
 * Load an image from URL, crop/resize to 64x64, return a Tensor3D (HWC).
 */
export function getInputImageArray(
  imgFile: string,
  normalize = true,
): Promise<tf.Tensor3D> {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:none;";
  document.body.appendChild(canvas);
  const context = canvas.getContext("2d")!;

  return new Promise((resolve, reject) => {
    const inputImage = new Image();
    inputImage.crossOrigin = "Anonymous";
    inputImage.src = imgFile;
    let canvasImage: ImageData;

    inputImage.onload = () => {
      canvas.width = inputImage.width;
      canvas.height = inputImage.height;

      if (
        inputImage.width > networkInputSize ||
        inputImage.height > networkInputSize
      ) {
        const resizeCanvas = document.createElement("canvas");
        const resizeContext = resizeCanvas.getContext("2d")!;
        const smallerDimension = Math.min(inputImage.width, inputImage.height);
        const resizeFactor = (networkInputSize + 1) / smallerDimension;
        resizeCanvas.width = inputImage.width * resizeFactor;
        resizeCanvas.height = inputImage.height * resizeFactor;
        resizeContext.drawImage(
          inputImage,
          0,
          0,
          resizeCanvas.width,
          resizeCanvas.height,
        );

        if (inputImage.width !== inputImage.height) {
          context.translate(resizeCanvas.width, 0);
          context.scale(-1, 1);
          context.translate(
            resizeCanvas.width / 2,
            resizeCanvas.height / 2,
          );
          context.rotate((90 * Math.PI) / 180);
          context.drawImage(
            resizeCanvas,
            -resizeCanvas.width / 2,
            -resizeCanvas.height / 2,
          );
        } else {
          context.drawImage(resizeCanvas, 0, 0);
        }

        canvasImage = context.getImageData(
          0,
          0,
          resizeCanvas.width,
          resizeCanvas.height,
        );
      } else {
        context.drawImage(inputImage, 0, 0);
        canvasImage = context.getImageData(
          0,
          0,
          inputImage.width,
          inputImage.height,
        );
      }

      const imageData = canvasImage.data;
      const imageWidth = canvasImage.width;
      const imageHeight = canvasImage.height;

      canvas.parentNode?.removeChild(canvas);

      resolve(
        imageDataTo3DTensor(imageData, imageWidth, imageHeight, normalize),
      );
    };
    inputImage.onerror = (e) => {
      canvas.parentNode?.removeChild(canvas);
      reject(e);
    };
  });
}
