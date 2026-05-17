const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

const skyProxy = createProxyMiddleware({
    target:'http://127.0.0.1:3007',
    changeOrigin:true
});

const moruviProxy = createProxyMiddleware({
    target:'http://127.0.0.1:3008',
    changeOrigin:true
});

const skyStatic = express.static(path.join(__dirname,'projects','skyAcademy','dist'));
const moruviStatic = express.static(path.join(__dirname,'projects','moruvi','dist'));

const proxyRoutes = ['/api','/login'];

app.use(proxyRoutes,(req,res,next)=>{
    if(req.hostname === 'moruvi.sclemon1013.com'){
        return moruviProxy(req,res,next);
    }
    return skyProxy(req,res,next);
});

app.use((req,res,next)=>{
    if(req.hostname === 'moruvi.sclemon1013.com'){
        return moruviStatic(req,res,next);
    }
    return skyStatic(req,res,next);
});

app.get('*',(req,res)=>{
    if(req.hostname === 'moruvi.sclemon1013.com'){
        return res.sendFile(path.join(__dirname,'projects','moruvi','dist','index.html'));
    }
    return res.sendFile(path.join(__dirname,'projects','skyAcademy','dist','index.html'));
});

app.use((err,req,res,next)=>{
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT,'0.0.0.0',()=>{
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});