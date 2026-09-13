import { useEffect, useRef } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isDialogOpen(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('[role="dialog"]')) {
    return true;
  }
  return Boolean(document.querySelector('[role="dialog"]'));
}

export function newFlowPath(pathname: string, search = ""): string | null {
  if (pathname === "/accounts") {
    return "/accounts/new";
  }
  if (pathname === "/transactions") {
    const account = new URLSearchParams(search).get("account");
    return account
      ? `/transactions/new?from=${encodeURIComponent(account)}`
      : "/transactions/new";
  }
  if (pathname === "/" || pathname === "/months" || pathname === "/years") {
    return "/transactions/new";
  }
  return null;
}

export function useKeystroke(key: string, onStroke: () => void) {
  const onStrokeRef = useRef(onStroke);
  onStrokeRef.current = onStroke;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }
      if (isTypingTarget(event.target) || isDialogOpen(event.target)) {
        return;
      }
      event.preventDefault();
      onStrokeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
