"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scroll-reveals-enabled");

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]").forEach((element) => {
        element.classList.add("is-visible");
      });
      return () => root.classList.remove("scroll-reveals-enabled");
    }

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );

    function observeWithin(node: Node) {
      if (!(node instanceof Element)) return;
      const candidates = [
        ...(node.matches("[data-scroll-reveal]") ? [node] : []),
        ...node.querySelectorAll("[data-scroll-reveal]"),
      ];
      candidates.forEach((element) => {
        if (observed.has(element)) return;
        observed.add(element);
        observer.observe(element);
      });
    }

    observeWithin(document.body);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(observeWithin));
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      root.classList.remove("scroll-reveals-enabled");
    };
  }, []);

  return null;
}
