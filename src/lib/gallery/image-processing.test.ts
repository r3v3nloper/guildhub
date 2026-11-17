import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareImage } from "./image-processing";

function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#6d4aff" },
  })
    .png()
    .toBuffer();
}

describe("prepareImage", () => {
  it("shrinks a 4K screenshot to 2560 pixels on the long edge", async () => {
    // Arrange
    const screenshot = await png(3840, 2160);

    // Act
    const prepared = await prepareImage(screenshot);

    // Assert
    expect(prepared).toMatchObject({ width: 2560, height: 1440 });
    const stored = await sharp(prepared!.image).metadata();
    expect(stored).toMatchObject({ format: "webp", width: 2560, height: 1440 });
  });

  it("keeps a Full HD screenshot at its size", async () => {
    // Arrange
    const screenshot = await png(1920, 1080);

    // Act
    const prepared = await prepareImage(screenshot);

    // Assert
    expect(prepared).toMatchObject({ width: 1920, height: 1080 });
  });

  it("makes a small preview for the grid", async () => {
    // Arrange
    const portrait = await png(1080, 1920);

    // Act
    const prepared = await prepareImage(portrait);

    // Assert
    const preview = await sharp(prepared!.preview).metadata();
    expect(preview).toMatchObject({ width: 360, height: 640 });
  });

  it("rejects files that are no JPEG, PNG or WebP", async () => {
    // Arrange
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#000" },
    })
      .gif()
      .toBuffer();
    const text = new TextEncoder().encode("kein Bild");

    // Act & Assert
    expect(await prepareImage(gif)).toBeUndefined();
    expect(await prepareImage(text)).toBeUndefined();
  });
});
