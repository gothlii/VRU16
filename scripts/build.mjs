import {readFile,writeFile,readdir,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),source=new URL('public/',root),output=new URL('dist/',root);
const files=(await readdir(source)).sort(),contents=new Map();
const hash=createHash('sha256');
for(const file of files){const value=await readFile(new URL(file,source));contents.set(file,value);hash.update(file).update(value);}
const version=hash.digest('hex').slice(0,12);
await rm(output,{recursive:true,force:true});await mkdir(output);
for(const [file,bytes] of contents){
 let value=bytes;
 if(file.endsWith('.js'))value=bytes.toString().replace(/from '(\.\/[^']+\.js)'/g,`from '$1?v=${version}'`);
 if(file==='index.html')value=bytes.toString().replace(/((?:src|href)="\.\/[^"?]+\.(?:js|css))"/g,`$1?v=${version}"`);
 await writeFile(new URL(file,output),value);
}
console.log(`VRU16 byggd: ${version}`);
