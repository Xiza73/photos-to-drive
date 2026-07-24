import { describe, it, expect } from "vitest";
import { buildUploadItems } from "./upload";

describe("buildUploadItems", () => {
  it("empareja cada foto con su nombre renombrado, en orden", () => {
    const photos = [
      { id: "/a/IMG_1.jpg", originalName: "IMG_1.jpg" },
      { id: "/b/IMG_2.PNG", originalName: "IMG_2.PNG" },
    ];
    const items = buildUploadItems("boda", photos);
    expect(items).toEqual([
      { photo: photos[0], name: "boda (1).jpg" },
      { photo: photos[1], name: "boda (2).png" },
    ]);
  });

  it("propaga el error si el baseName está vacío", () => {
    expect(() =>
      buildUploadItems("", [{ id: "a.jpg", originalName: "a.jpg" }])
    ).toThrow();
  });
});
