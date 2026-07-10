// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnboarding } from "./use-onboarding";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useOnboarding", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }),
      ),
    );
  });

  it("back from step 2 goes to 1", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => result.current.goToStep(2));
    expect(result.current.step).toBe(2);

    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("back from step 1 stays at 1", () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe(1);

    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("forward still works", () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.selectMode("PERSONAL");
      result.current.updateFormField("personalName", "Juan");
    });

    act(() => result.current.next());
    expect(result.current.step).toBe(2);
  });
});
