// Run only after reviewing the target project's package and test configuration.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
if (!process.argv[2]) { console.error('Usage: node review.cjs <trusted-project-root>'); process.exit(2); }
const root = path.resolve(process.argv[2]);
const commands = [['typecheck','typescript/bin/tsc',['--noEmit']], ['tests','jest/bin/jest.js',['--runInBand','--forceExit']]];
const results=[];let output='';
const missing=commands.filter(([,binary])=>!fs.existsSync(path.join(root,'node_modules',binary)));
for(const [name, binary, args] of commands){
 const file=path.join(root,'node_modules',binary);
 if(missing.length){results.push({name,exitCode:null,error:missing.some(([check])=>check===name)?'Required local dependency missing':'Skipped because a required local dependency is missing'});continue;}
 const r=spawnSync(process.execPath,[file,...args],{cwd:root,encoding:'utf8',timeout:60000,env:{...process.env,CI:'true'}});
 results.push({name,exitCode:r.status,error:r.error?.message});output+=`\n## ${name}\n`+(r.stdout||'')+(r.stderr||'');
}
const report={at:new Date().toISOString(),checks:results,passed:results.every(r=>r.exitCode===0),scope:'local typecheck and existing tests; no cloud or compliance certification'};
const dir=path.join(root,'data/evidence');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'power-review.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(dir,'power-review.txt'),output);console.log(JSON.stringify(report,null,2));process.exit(report.passed?0:1);
