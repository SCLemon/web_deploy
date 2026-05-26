# Cloudflare Tunnel（僅 `*.sclemon1013.com`）完整流程

適用： - Windows + Docker - Cloudflare - HTTPS service (`443`) - CGNAT -
僅 wildcard：`*.sclemon1013.com`

## 1. Cloudflare Tunnel Login（第一步）

建立資料夾：

``` powershell
mkdir cloudflared
```

登入：

``` powershell
docker run --rm -it `
-v ${PWD}/cloudflared:/home/nonroot/.cloudflared `
cloudflare/cloudflared:latest `
tunnel login
```

登入完成確認：

``` powershell
dir .\cloudflared
```

應看到：

``` text
cert.pem
```

------------------------------------------------------------------------

## 2. 建立 Tunnel

``` powershell
docker run --rm -it `
-v ${PWD}/cloudflared:/home/nonroot/.cloudflared `
cloudflare/cloudflared:latest `
tunnel create sclemon
```

記下 Tunnel ID。

------------------------------------------------------------------------

## 3. 建立 `config.yml`

內容：

``` yaml
tunnel: TUNNEL_ID
credentials-file: /home/nonroot/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: "*.sclemon1013.com"
    service: https://host.docker.internal:443
    originRequest:
      noTLSVerify: true

  - service: http_status:404
```

將 `TUNNEL_ID` 換成實際值。

------------------------------------------------------------------------

## 4. 綁 wildcard DNS

``` powershell
docker run --rm -it `
-v ${PWD}/cloudflared:/home/nonroot/.cloudflared `
cloudflare/cloudflared:latest `
tunnel route dns sclemon *.sclemon1013.com
```

------------------------------------------------------------------------

## 5. 啟動 tunnel

``` powershell
docker stop cloudflared
docker rm cloudflared

docker run -d `
--name cloudflared `
--restart unless-stopped `
-v ${PWD}/cloudflared:/home/nonroot/.cloudflared `
cloudflare/cloudflared:latest `
tunnel --config /home/nonroot/.cloudflared/config.yml run
```

------------------------------------------------------------------------

## 6. 看 log

``` powershell
docker logs -f cloudflared
```

成功：

``` text
Registered tunnel connection
```

------------------------------------------------------------------------

## 7. 測試

例如：

``` text
https://api.sclemon1013.com
https://www.sclemon1013.com
```

------------------------------------------------------------------------

## 常見錯誤

-   `config.yml not found` → 檔名不是 `config.yaml`
-   1033 → tunnel 沒跑
-   DNS exists → 刪舊 A record
