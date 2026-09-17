import React from 'react';
import type {ReadStream, WriteStream} from 'node:tty';
import {PassThrough} from 'node:stream';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Box,Text,renderSync,evictInkCaches} from '@hermes/ink';
import {StreamingMd} from '../../src/components/streamingMarkdown.tsx';
import {DEFAULT_THEME} from '../../src/theme.ts';
const dir=process.env.BENCH_OUT!;
const parts=[
 '你好世界 日本語 한국어 é café 👩‍💻 👨‍👩‍👧‍👦 🇮🇳 ⚠️ क्‍ष مرحبا שלום ',
 'The tool result explains **Unicode** width and `rendering` behavior. ',
 'Path /some/very/long/path/without/spaces/你好/👩‍💻/example.ts ',
];
const full=Array.from({length:24},(_,i)=>`### Step ${i}\n\n${parts[i%3].repeat(4)}\n\n- item ${i} ${parts[(i+1)%3]}\n\n`).join('');
const chunks:string[]=[];for(let p=0;p<full.length;p+=64)chunks.push(full.slice(p,Math.min(full.length,p+64)));
if(chunks.join('')!==full)throw Error('Chunk reconstruction failed');
function run(round:number,kind:string,capture=false){
 const stream=()=>{const s=new PassThrough();Object.assign(s,{columns:100,rows:40,isTTY:false});s.on('data',()=>{});return s as PassThrough & ReadStream & WriteStream;};
 const stdout=stream();const hash=crypto.createHash('sha256');stdout.on('data',x=>hash.update(x));
 const theme={...DEFAULT_THEME};let width=100;
 const node=(text:string)=><Box width={width} flexDirection="column"><StreamingMd t={theme} text={text}/><Text>{'\x1b[32m工具完成 👩‍💻 é '+ 'details '.repeat(20)+'\x1b[0m'}</Text></Box>;
 evictInkCaches('all');
 const instance=renderSync(node(''),{patchConsole:false,stdout,stdin:stream(),stderr:stream()});
 const operations=[];
 for(let i=0;i<chunks.length;i++){
  const resize=kind.includes('resize')&&i%12===0;
  if(resize){width=[60,80,120,100][Math.floor(i/12)%4];stdout.columns=width;}

  const cpu=process.cpuUsage(),start=performance.now();
  if(resize)stdout.emit('resize');
  instance.rerender(node(kind.startsWith('cumulative') ? chunks.slice(0,i+1).join('') : chunks[i]));
  const elapsed=performance.now()-start,c=process.cpuUsage(cpu);
  operations.push({index:i,resize,width,ms:elapsed,cpuMs:(c.user+c.system)/1000});

  if(i%64===0){performance.clearMarks();performance.clearMeasures();}
 }
 instance.unmount();instance.cleanup();
 return {round,kind,variant:process.env.VARIANT??'current',operations,outputHash:hash.digest('hex')};
}
run(-1,'resize');const result=run(Number(process.env.ROUND??0),process.env.KIND??'resize',process.env.CAPTURE==='1');
fs.writeFileSync(`${dir}/${process.env.OUT??'trial.json'}`,JSON.stringify(result));
console.log(JSON.stringify({operations:result.operations.length,totalMs:result.operations.reduce((n,x)=>n+x.ms,0),hash:result.outputHash}));
