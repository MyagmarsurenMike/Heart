// Inlined script that runs before paint to set the theme class on <html>.
// Reading order: localStorage → prefers-color-scheme → dark.
const script = `(() => {
  try {
    const stored = localStorage.getItem("hearth-theme");
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored !== "light" && sys);
    if (dark) document.documentElement.classList.add("dark");
  } catch {
    document.documentElement.classList.add("dark");
  }
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
