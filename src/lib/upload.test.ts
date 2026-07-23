import { describe, it, expect } from "vitest";
import { buildUploadItems } from "./upload";

describe("buildUploadItems", () => {
  it("empareja path con el nombre renombrado, en orden", () => {
    const items = buildUploadItems("boda", [
      { path: "/a/IMG_1.jpg", originalName: "IMG_1.jpg" },
      { path: "/b/IMG_2.PNG", originalName: "IMG_2.PNG" },
    ]);
    expect(items).toEqual([
      { path: "/a/IMG_1.jpg", name: "boda (1).jpg" },
      { path: "/b/IMG_2.PNG", name: "boda (2).png" },
    ]);
  });

  it("propaga el error si el baseName está vacío", () => {
    expect(() =>
      buildUploadItems("", [{ path: "/a.jpg", originalName: "a.jpg" }])
    ).toThrow();
  });
});
