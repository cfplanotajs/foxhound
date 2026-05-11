import { PNG } from "pngjs";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

function parseMockSize(size?: string | null): { width: number; height: number } {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) return { width: 1024, height: 1024 };
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return { width: 1024, height: 1024 };
  if (width < 64 || height < 64 || width > 4096 || height > 4096) return { width: 1024, height: 1024 };
  return { width, height };
}

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
    const { width, height } = parseMockSize(request.size);
    const inset1 = Math.max(2, Math.floor(Math.min(width, height) * 0.03125));
    const inset2 = Math.max(4, Math.floor(Math.min(width, height) * 0.0546875));
    const cardW = Math.max(16, width - inset2 * 2);
    const cardH = Math.max(16, height - inset2 * 2);
    const lineStartX = Math.max(8, Math.floor(width * 0.0976));
    const titleY = Math.max(8, Math.floor(height * 0.1172));
    const titleH = Math.max(8, Math.floor(height * 0.03125));
    const lineStartY = Math.max(16, Math.floor(height * 0.2148));
    const lineGap = Math.max(10, Math.floor(height * 0.0371));
    const lineH = Math.max(4, Math.floor(height * 0.0156));
    const lineBaseW = Math.max(20, Math.floor(width * 0.8047));

    const png = new PNG({ width, height });
    drawRect(png, 0, 0, width, height, [236, 253, 245, 255]);
    drawRect(png, inset1, inset1, Math.max(1, width - inset1 * 2), Math.max(1, height - inset1 * 2), [16, 185, 129, 255]);
    drawRect(png, inset2, inset2, cardW, cardH, [255, 255, 255, 255]);
    const markerLines = Math.min(12, Math.max(2, Math.floor((request.prompt.length || 1) / 12)));
    for (let i = 0; i < markerLines; i += 1) {
      drawRect(png, lineStartX, lineStartY + i * lineGap, Math.max(10, lineBaseW - (i % 3) * Math.floor(width * 0.1074)), lineH, [15, 118, 110, 255]);
    }
    drawRect(png, lineStartX, titleY, lineBaseW, titleH, [6, 95, 70, 255]);

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
