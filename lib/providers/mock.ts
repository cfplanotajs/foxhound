import { PNG } from "pngjs";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

function drawRect(png: PNG, x: number, y: number, w: number, h: number, color: [number, number, number, number]) {
  for (let iy = y; iy < y + h; iy += 1) {
    for (let ix = x; ix < x + w; ix += 1) {
      const idx = (png.width * iy + ix) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }
}

export class MockProvider implements ImageProvider {
  async generateImage(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const png = new PNG({ width: 1024, height: 1024 });
    drawRect(png, 0, 0, 1024, 1024, [236, 253, 245, 255]);
    drawRect(png, 32, 32, 960, 960, [16, 185, 129, 255]);
    drawRect(png, 56, 56, 912, 912, [255, 255, 255, 255]);
    const markerLines = Math.min(12, Math.max(2, Math.floor((request.prompt.length || 1) / 12)));
    for (let i = 0; i < markerLines; i += 1) {
      drawRect(png, 100, 220 + i * 38, 824 - (i % 3) * 110, 16, [15, 118, 110, 255]);
    }
    drawRect(png, 100, 120, 824, 32, [6, 95, 70, 255]);

    const bytes = PNG.sync.write(png);
    return {
      images: [{ bytes, mimeType: "image/png" }],
      providerMetadata: {
        kind: "mock",
        banner: "MOCK GENERATED IMAGE",
        presetName: request.presetName ?? null,
        promptSnippet: request.prompt.slice(0, 100),
        upstreamPayload: { ...request }
      }
    };
  }
}
