// Script one-off (no queda como parte del roadmap) para exportar el HTML
// renderizado de cada página y llevarlo a Claude Design como referencia.
// Uso: node --env-file=.env.export-design.local scripts/export_html_para_design.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "design", "html-export");

const EMAIL = process.env.EXPORT_LOGIN_EMAIL;
const PASSWORD = process.env.EXPORT_LOGIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    "Faltan EXPORT_LOGIN_EMAIL/EXPORT_LOGIN_PASSWORD — correr con --env-file",
  );
}

async function guardar(nombre, html) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, `${nombre}.html`), html, "utf-8");
  console.log(`guardado: ${nombre}.html`);
}

const browser = await chromium.launch();
const page = await browser.newPage();

// Páginas públicas (sin sesión)
await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
await guardar("login", await page.content());

await page.goto(`${BASE_URL}/login/recuperar`, { waitUntil: "networkidle" });
await guardar("login-recuperar", await page.content());

// Login real
await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
await page.waitForLoadState("networkidle");
await guardar("home", await page.content());

// Detalle de requerimiento: tomar el primer link de card
const detalleHref = await page
  .locator('a[href^="/requerimiento/"]')
  .first()
  .getAttribute("href");
if (detalleHref) {
  await page.goto(`${BASE_URL}${detalleHref}`, { waitUntil: "networkidle" });
  await guardar("requerimiento-detalle", await page.content());
} else {
  console.warn("No se encontró ningún link a /requerimiento/* en home");
}

// Planeación (Gantt)
await page.goto(`${BASE_URL}/planeacion`, { waitUntil: "networkidle" });
await guardar("planeacion", await page.content());

const editarHref = await page
  .locator('a[href*="/planeacion/"][href$="/editar"]')
  .first()
  .getAttribute("href");
if (editarHref) {
  await page.goto(`${BASE_URL}${editarHref}`, { waitUntil: "networkidle" });
  await guardar("planeacion-editar", await page.content());
} else {
  console.warn("No se encontró ningún link a .../editar en /planeacion");
}

await browser.close();
console.log(`\nListo. HTML exportado en: ${OUT_DIR}`);
