import { describe, it, expect } from "vitest";
import { basename } from "./paths";

describe("basename", () => {
  it("ruta Windows con backslashes", () => {
    expect(basename("C:\\Users\\danfm\\fotos\\IMG_1.JPG")).toBe("IMG_1.JPG");
  });

  it("ruta Unix con slashes", () => {
    expect(basename("/home/user/fotos/a.png")).toBe("a.png");
  });

  it("nombre sin carpetas", () => {
    expect(basename("foto.jpg")).toBe("foto.jpg");
  });
});
