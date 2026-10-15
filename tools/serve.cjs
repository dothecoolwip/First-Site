// Dedicated loopback-only editor and candidate preview. No deployment or cloud credentials.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../dist'),port=Number(process.env.MAP_EDITOR_PORT||8848);
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);}).listen(port,'127.0.0.1',()=>console.log('Map editor: http://127.0.0.1:'+port+'/map-editor/'));
