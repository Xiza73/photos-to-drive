import { describe, it, expect } from "vitest";
import { renamePhotos } from "./rename";

describe("renamePhotos", () => {
  it('aplica el formato "<nombre> (<orden>).<tipo>"', () => {
    const result = renamePhotos({
      baseName: "boda",
      photos: [{ originalName: "IMG_1.jpg" }, { originalName: "IMG_2.png" }],
    });
    expect(result.map((r) => r.newName)).toEqual(["boda (1).jpg", "boda (2).png"]);
  });

  it("normaliza la extensión a minúsculas", () => {
    const [first] = renamePhotos({
      baseName: "x",
      photos: [{ originalName: "A.JPEG" }],
    });
    expect(first.newName).toBe("x (1).jpeg");
  });

  it("respeta startOrder", () => {
    const result = renamePhotos({
      baseName: "lote",
      photos: [{ originalName: "a.jpg" }],
      startOrder: 5,
    });
    expect(result[0].newName).toBe("lote (5).jpg");
  });

  it("recorta espacios del baseName", () => {
    const [first] = renamePhotos({
      baseName: "  viaje  ",
      photos: [{ originalName: "a.jpg" }],
    });
    expect(first.newName).toBe("viaje (1).jpg");
  });

  it("archivo sin extensión: no agrega punto final", () => {
    const [first] = renamePhotos({
      baseName: "x",
      photos: [{ originalName: "sin_extension" }],
    });
    expect(first.newName).toBe("x (1)");
  });

  it("lanza si baseName está vacío", () => {
    expect(() =>
      renamePhotos({ baseName: "   ", photos: [{ originalName: "a.jpg" }] })
    ).toThrow();
  });

  it("lanza si no hay fotos", () => {
    expect(() => renamePhotos({ baseName: "x", photos: [] })).toThrow();
  });
});
