import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=process.env.BENCH_OUT;
const rows=[];
const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
for(let round=0;round<7;round++) {
  let order=['cumulative-stream','cumulative-resize'].flatMap(kind=>['current','integrated'].map(variant=>({kind,variant})));
  if(round%2)order.reverse();
  for(const {kind,variant} of order){
    const out=`${variant}-${kind}-${round}.json`;
    const start=performance.now();
    const result=spawnSync(process.execPath,[variant+'.mjs'],{cwd:root,encoding:'utf8',timeout:90000,env:{PATH:process.env.PATH,HOME:process.env.HOME,BENCH_OUT:root,LANG:'C.UTF-8',TZ:'UTC',NODE_ENV:'production',KIND:kind,VARIANT:variant,ROUND:String(round),OUT:out}});
    fs.writeFileSync(root+'/'+out+'.stderr',result.stderr??'');
    if(result.status!==0)throw Error(result.stderr);
    const data=JSON.parse(fs.readFileSync(root+'/'+out));
    rows.push({round,variant,kind,processMs:performance.now()-start,ms:data.operations.reduce((s,x)=>s+x.ms,0),cpuMs:data.operations.reduce((s,x)=>s+x.cpuMs,0),n:data.operations.length,resizes:data.operations.filter(x=>x.resize).length,outputHash:data.outputHash});
    fs.writeFileSync(root+'/cumulative-raw.json',JSON.stringify(rows,null,2));
  }
}
const summary=[];
for(const kind of ['cumulative-stream','cumulative-resize']){
  if(new Set(rows.filter(x=>x.kind===kind).map(x=>x.outputHash)).size!==1)throw Error('Output hash mismatch');
  for(const variant of ['current','integrated']){
    const data=rows.filter(x=>x.kind===kind&&x.variant===variant);
    summary.push({kind,variant,n:data[0].n,resizes:data[0].resizes,medianMs:median(data.map(x=>x.ms)),medianCpuMs:median(data.map(x=>x.cpuMs)),outputHash:data[0].outputHash});
  }
}
fs.writeFileSync(root+'/cumulative-summary.json',JSON.stringify({node:process.version,summary},null,2));
console.log(JSON.stringify(summary,null,2));
