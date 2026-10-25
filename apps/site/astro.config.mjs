import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { defaultClientConditions } from 'vite';
import { versionStamp } from '../../scripts/lib/version.mjs';

// BASE_PATH is set by tools/deploy.sh (/nurseprimer/); local dev and CI serve from /.
const base = process.env.BASE_PATH ?? '/';
const stamp = versionStamp();

export default defineConfig({
  base,
  trailingSlash: 'always',
  srcDir: './src',
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    // Math is rendered at build time to HTML + MathML, so it survives reader mode, text extraction
    // and screen readers without any client-side script.
    rehypePlugins: [[rehypeKatex, { output: 'htmlAndMathml', throwOnError: true }]],
  },
  vite: {
    define: { __PRIMER_VERSION__: JSON.stringify(stamp) },
    // GPT-2 (the Sixth Night) runs on ONNX Runtime Web. This condition picks its build that loads the 27 MB
    // WebAssembly engine at run time (transformers.js fetches it from jsDelivr, compressed, only when the reader
    // presses Download) instead of copying it into the site.
    resolve: { conditions: ['onnxruntime-web-use-extern-wasm', ...defaultClientConditions] },
  },
});
