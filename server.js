let [ http, https, fs, path ] = [ 'http', 'https', 'fs', 'path' ].map(require);
let [ protocol, host, port ] = (process.argv[2] || 'http://localhost:80').split(/:[/][/]|:/);
console.log('Params:', { protocol, host, port });

let createProtocolServer = {
  http: async fn => {
    http.createServer(fn).listen(port, host);
  },
  https: async fn => {
    
    // TLS server on given port (probably 443)
    throw new Error('No cert available');
    let certDir = [];
    let [ key, cert ] = await Promise.all([
      fs.promises.readFile(path.join(...certDir, 'key.pem')), // privkey
      fs.promises.readFile(path.join(...certDir, 'cert.pem')) // fullchain
    ]);
    https.createServer({ key, cert }, fn).listen(port, host);
    
    // Port 80 redirects to http
    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
      res.end();
    }).listen(80);
    
  }
};
if (!createProtocolServer.hasOwnProperty(protocol)) throw new Error(`Invalid protocol: ${protocol}`);

(async () => {
  
  // Read (potentially cached) file
  let cacheMs = 2000;
  let fileCache = new Map();
  let readFile = (...fp) => {
    fp = path.join(...fp);
    if (!fileCache.has(fp)) {
      fileCache.set(fp, fs.promises.readFile(path.join(__dirname, fp)));
      setTimeout(() => fileCache.delete(fp), cacheMs);
    }
    return fileCache.get(fp);
  };
  
  await createProtocolServer[protocol](async (req, res) => {
    
    let t = +new Date();
    let reqMsg = [];
    let addReqMsg = ln => reqMsg.push(...ln.split('\n'));
    let serveReq = (res, status, content, type) => {
      
      res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(content) });
      res.end(content);
      
      console.log(`${req.connection.remoteAddress} <- ${req.url}${reqMsg.length ? ':' : ''} (${((new Date() - t) / 1000).toFixed(2)}s)`);
      if (reqMsg.length) console.log(reqMsg.map(ln => `> ${ln}`).join('\n'));
      console.log('');
      
    };
    
    try {
      
      let servables = JSON.parse(await readFile('asset', 'assets.json'));
      let [ contentType=null, ...fp ] = servables[req.url.slice(1)] || [];
      if (!contentType) throw new Error(`Unknown asset: ${req.url}`);
      serveReq(res, 200, await readFile(...fp), contentType);
      
    } catch(err) {
      
      addReqMsg(`Error occurred: ${err.stack}`);
      serveReq(res, 400, 'Sad :(', 'text/plain');
      
    }
    
  });
  console.log(`Listening on ${protocol}://${host}:${port}`);
  
})();
