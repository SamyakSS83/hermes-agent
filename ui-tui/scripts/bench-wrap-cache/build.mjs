import {build} from 'esbuild';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../..');
const root=path.resolve(process.env.BENCH_OUT);
const baseline=path.resolve(process.env.BENCH_BASELINE);
fs.mkdirSync(root,{recursive:true});
const manifest={};
for (const [variant,entry] of Object.entries({current:baseline+'/ui-tui/packages/hermes-ink/dist/entry-exports.js',integrated:repo+'/ui-tui/packages/hermes-ink/dist/entry-exports.js'})) {
  manifest[variant]={entry,sha256:crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex')};
  await build({entryPoints:[here+'/harness.tsx'],outfile:root+'/'+variant+'.mjs',bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',alias:{'@hermes/ink':entry},define:{'process.env.NODE_ENV':'"production"'}});
}
fs.writeFileSync(root+'/build-manifest.json',JSON.stringify(manifest,null,2));
