// Local preview only. Production is static GitHub Pages; Firebase protects all data.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const files=new Map([['index.html','text/html; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['firebase.js','text/javascript; charset=utf-8'],['model.js','text/javascript; charset=utf-8'],['style.css','text/css; charset=utf-8'],['visby-roma.png','image/png']]);
export function previewServer(){return createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const prefix=path.startsWith('/VRU16/')?'/VRU16/':'/';
 const file=path.slice(prefix.length)||'index.html';
 if(!files.has(file)||req.method!=='GET'){res.writeHead(404);res.end('Sidan finns inte.');return;}
 try{const data=await readFile(new URL('./public/'+file,import.meta.url));res.writeHead(200,{'Content-Type':files.get(file),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end();}
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||3000);previewServer().listen(port,'127.0.0.1',()=>console.log(`VRU16: http://127.0.0.1:${port}/VRU16/`));}
