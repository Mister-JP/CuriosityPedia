import assert from "node:assert/strict";

export type TestElement = {
  type: unknown;
  key: string | null;
  props: Record<string, unknown> & { children?: unknown };
};

export class HookHarness {
  private slots: unknown[] = [];
  private cursor = 0;

  reset(): void {
    this.cursor = 0;
  }

  clear(): void {
    this.slots = [];
    this.cursor = 0;
  }

  setSlot(index: number, value: unknown): void {
    this.slots[index] = value;
  }

  useState<T>(initial: T | (() => T)): [T, (next: T | ((current: T) => T)) => void] {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    const setState = (next: T | ((current: T) => T)) => {
      const current = this.slots[index] as T;
      this.slots[index] = typeof next === "function" ? (next as (value: T) => T)(current) : next;
    };
    return [this.slots[index] as T, setState];
  }

  useRef<T>(initial: T): { current: T } {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = { current: initial };
    return this.slots[index] as { current: T };
  }
}

export function elements(node: unknown): TestElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as TestElement;
  return [element, ...elements(element.props.children)];
}

export function text(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (!node || typeof node !== "object" || !("props" in node)) return "";
  return text((node as TestElement).props.children);
}

export function find(root: TestElement, predicate: (element: TestElement) => boolean): TestElement {
  const match = elements(root).find(predicate);
  assert.ok(match, "expected rendered element was not found");
  return match;
}

export function buttonByText(root: TestElement, label: string): TestElement {
  return find(root, (element) => element.type === "button" && text(element).trim() === label);
}
