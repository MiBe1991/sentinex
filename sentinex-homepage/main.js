const revealNodes = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.15 },
);

revealNodes.forEach((node, index) => {
  node.style.transitionDelay = `${index * 70}ms`;
  observer.observe(node);
});

const copyButton = document.getElementById("copy-quickstart");
const codeNode = document.getElementById("quickstart-code");

if (copyButton && codeNode) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(codeNode.textContent ?? "");
      const original = copyButton.textContent;
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = original;
      }, 1200);
    } catch {
      copyButton.textContent = "Copy failed";
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1200);
    }
  });
}
