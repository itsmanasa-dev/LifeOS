import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;

class ImageProcessor {
  static Future<XFile> preprocessImage(XFile inputFile) async {
    try {
      final bytes = await inputFile.readAsBytes();
      img.Image? image = img.decodeImage(bytes);
      if (image == null) return inputFile;

      // 1. Convert to Grayscale
      image = img.grayscale(image);

      // 2. Increase Contrast (using contrast scaling factor)
      image = img.contrast(image, contrast: 1.5);

      // 3. Denoise using Gaussian Blur filter with small radius
      image = img.gaussianBlur(image, radius: 1);

      // 4. Auto Crop (Trims solid color background borders starting from top-left color)
      image = img.trim(image, mode: img.TrimMode.topLeftColor);

      // 5. Encode preprocessed image to Png bytes
      final Uint8List outputBytes = Uint8List.fromList(img.encodePng(image));

      // 6. Return as memory-based cross-platform XFile
      return XFile.fromData(
        outputBytes,
        mimeType: 'image/png',
        name: 'preprocessed_ocr.png',
      );
    } catch (e) {
      // Fallback to original file on error
      return inputFile;
    }
  }
}
