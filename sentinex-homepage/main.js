/* =========================================================
   Sentinex · main.js
   ========================================================= */

// ── Scroll reveal ────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((el) => {
  revealObserver.observe(el);
});

// ── Header scroll state ───────────────────────────────────────
const header = document.getElementById("site-header");
if (header) {
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
}

// ── Copy quickstart ───────────────────────────────────────────
const copyBtn   = document.getElementById("copy-quickstart");
const copyLabel = document.getElementById("copy-label");
const codeNode  = document.getElementById("quickstart-code");

if (copyBtn && codeNode && copyLabel) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(codeNode.textContent ?? "");
      copyLabel.textContent = "Copied!";
      copyBtn.style.color = "var(--allow)";
      copyBtn.style.borderColor = "rgba(34,197,94,0.4)";
      setTimeout(() => {
        copyLabel.textContent = "Copy";
        copyBtn.style.color = "";
        copyBtn.style.borderColor = "";
      }, 1800);
    } catch {
      copyLabel.textContent = "Failed";
      setTimeout(() => { copyLabel.textContent = "Copy"; }, 1200);
    }
  });
}

// ── Policy eval animation ─────────────────────────────────────
const evalRows = [
  { tool: "fs.read",     path: "/var/log/**",      verdict: "allow", ms: "2ms"  },
  { tool: "fs.write",    path: "**",               verdict: "deny",  ms: "1ms"  },
  { tool: "http.fetch",  path: "api.internal/GET", verdict: "allow", ms: "3ms"  },
  { tool: "http.fetch",  path: "external.io/POST", verdict: "deny",  ms: "1ms"  },
  { tool: "fs.read",     path: "/tmp/sentinex/**", verdict: "allow", ms: "2ms"  },
  { tool: "exec.shell",  path: "*",                verdict: "deny",  ms: "0ms"  },
];

const evalBody = document.getElementById("policy-eval-body");

function buildEvalRow(row) {
  const div = document.createElement("div");
  div.className = `eval-row eval-row--${row.verdict}`;
  div.innerHTML = `
    <span class="eval-badge eval-badge--${row.verdict}">${row.verdict.toUpperCase()}</span>
    <span class="eval-row-tool">${row.tool}</span>
    <span class="eval-row-path">${row.path}</span>
    <span class="eval-row-time">${row.ms}</span>
  `;
  return div;
}

function runEvalAnimation() {
  if (!evalBody) return;
  evalBody.innerHTML = "";

  evalRows.forEach((row, i) => {
    const el = buildEvalRow(row);
    evalBody.appendChild(el);

    setTimeout(() => {
      el.classList.add("visible");
    }, i * 380);
  });

  // Loop after all rows shown
  const totalDuration = evalRows.length * 380 + 2400;
  setTimeout(runEvalAnimation, totalDuration);
}

// Start eval animation when policy section enters view
const policySection = document.getElementById("policy");
if (policySection && evalBody) {
  const policyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runEvalAnimation();
          policyObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );
  policyObserver.observe(policySection);
}

// ── Terminal typewriter animation ─────────────────────────────
// Stagger terminal lines in on page load
const terminalBody = document.getElementById("terminal-body");
if (terminalBody) {
  const lines = terminalBody.querySelectorAll(".term-line, .term-spacer");
  lines.forEach((line, i) => {
    line.style.opacity = "0";
    line.style.transform = "translateX(-6px)";
    line.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    setTimeout(() => {
      line.style.opacity = "1";
      line.style.transform = "translateX(0)";
    }, 400 + i * 120);
  });
}
