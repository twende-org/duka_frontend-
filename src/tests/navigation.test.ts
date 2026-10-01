import { describe, expect, it } from "vitest";
import { navigationGroups } from "@/config/navigation";

const allPaths = navigationGroups.flatMap((group) => group.items.map((item) => item.path));

describe("navigationGroups", () => {
  it("does not expose AI product intake in the sidebar (specific flow only)", () => {
    expect(allPaths).not.toContain("/dashboard/intake");
  });

  it("does not expose stock transfers in the sidebar (specific flow only)", () => {
    expect(allPaths).not.toContain("/dashboard/transfers");
  });
});
