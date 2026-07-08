#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "../parser/index.js";
import { renderDevPdf } from "../render/index.js";

async function main(): Promise<void> {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: pdfforge <input.json> <output.pdf>");
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(await readFile(inputPath, "utf-8"));
  const model = parse(raw);
  const pdf = await renderDevPdf(model);
  await writeFile(outputPath, pdf);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
