import { describe, expect, it } from "vitest";
import { slugify } from "../slug";
import fixtures from "./slug.fixtures.json";

describe("slugify", () => {
  it.each(fixtures)("slugify($code) === $slug", ({ code, slug }) => {
    expect(slugify(code)).toBe(slug);
  });
});
