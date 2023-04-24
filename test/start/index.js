"use strict";var e=require("node:fs"),t=require("node:fs/promises"),r=require("node:path"),n=require("puppeteer"),o=require("chalk"),a=require("node:http"),i=require("node:https"),s=require("node:url"),l=require("https-proxy-agent");function c(e,t=0){let r=Math.floor(Math.random()*e);for(;r<t;)r=Math.floor(Math.random()*e);return r}const u=console.log,m=o.hex("#a57fff"),p=o.green,d=o.red,f=o.yellow;function h(e){return void 0===e}function g(e){return"number"==typeof e}function w(e){return"object"==typeof e&&e&&!Array.isArray(e)}function y(e){return Array.isArray(e)}async function x(e,t,r,n){if(e&&n>1){const e=t?r:c(r.max,r.min);u(`Id: ${m(n)} - Crawl needs to sleep for ${m(e+"ms")} milliseconds before sending`),await function(e){return new Promise((t=>setTimeout(t,e)))}(e)}else u(`Id: ${m(n)} - Crawl does not need to sleep, send immediately`)}async function v(e,t,r){const{intervalTime:n}=t,o=!h(n),a=g(n),i=[];for(const s of e){const{id:e}=s;await x(o,a,n,e),i.push(r(s,t))}await Promise.all(i)}async function T(e,t,r){const{intervalTime:n}=t,o=!h(n),a=g(n);for(const i of e){const{id:e}=i;await x(o,a,n,e),await r(i,t)}}function C(e,t,r){const n=e[t];e[t]=e[r],e[r]=n}function S(e){if(1===e.length)return e;const t=Math.floor(e.length/2),r=S(e.slice(0,t)),n=S(e.slice(t)),o=[];let a=0,i=0;for(;a<r.length&&i<n.length;)r[a]>=n[i]?(o.push(r[a]),a++):(o.push(n[i]),i++);return a<r.length&&o.push(...r.slice(a)),i<n.length&&o.push(...n.splice(i)),o}function b(e){const{detailTargetConfig:t,detailTargetResult:r}=e;let n=null;if(w(r)&&Object.hasOwn(r,"response")&&r.response){n=r.response.status()}else w(r)&&(n=r.statusCode??null);let o=!1;const a=t.proxy?.switchByHttpStatus;return n&&a&&a.includes(n)&&(o=!0),o}async function I(e,t,r,n,o){const a=(!r.every((e=>e.priority===r[0].priority))?S(r.map((e=>({...e,valueOf:()=>e.priority})))):r).map(((e,t)=>{const r=++t,{maxRetry:n,proxyDetails:o}=e,a=[];return{id:r,isHandle:!1,isSuccess:!1,isStatusNormal:!1,detailTargetConfig:e,detailTargetResult:null,maxRetry:n,retryCount:0,proxyDetails:o,crawlErrorQueue:a,result:{id:r,isSuccess:!1,maxRetry:n,retryCount:0,proxyDetails:o,crawlErrorQueue:a,data:null}}}));u(`${p("Start crawling")} - name: ${f(e)}, mode: ${f(t)}, total: ${m(a.length)} `);const i="async"===t?v:T;let s=0,l=a;for(;l.length;)if(await i(l,n,o),l=l.filter((e=>{const{isHandle:t,detailTargetConfig:r,proxyDetails:n,crawlErrorQueue:o,isStatusNormal:a}=e;let i=!1;if(!t&&(i=!0,n.length>=2)){const e=r.proxy?.switchByErrorCount;if(!a||!h(e)&&e>=o.length){n.find((e=>e.url===r.proxyUrl)).state=!1;const e=n.find((e=>e.state))?.url;h(e)||(r.proxyUrl=e)}}return i})),l.length){const e=l.map((e=>(e.retryCount++,e.id)));u(f(`Retry: ${++s} - Ids to retry: [ ${e.join(" - ")} ]`))}const c=[],g=[];return a.forEach((e=>{e.isSuccess?c.push(e.id):g.push(e.id)})),u("Crawl the final result:"),u(p(`  Success - total: ${c.length}, ids: [ ${c.join(" - ")} ]`)),u(d(`    Error - total: ${g.length}, ids: [ ${g.join(" - ")} ]`)),a.map((e=>e.result))}function $(e,t){let r=e?`${e}`:"?";if(t)for(const e in t){r+=`&${e}=${t[e]}`}else r=e;return r}function j(e){const{protocol:t,hostname:r,port:n,pathname:o,search:c}=new s.URL(e.url),u="http:"===t,m={agent:e.proxyUrl?l(e.proxyUrl):u?new a.Agent:new i.Agent,protocol:t,hostname:r,port:n,path:o,search:$(c,e.params),method:e.method?.toLocaleUpperCase()??"GET",headers:{},timeout:e.timeout};return m.headers=function(e,t){const r={"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",...e.headers??{}};return"POST"===t.method&&e.data&&(r["Content-Type"]="application/json",r["Content-Length"]=Buffer.byteLength(e.data)),r}(e,m),m}function E(e){return new Promise(((t,r)=>{const n=h(e.data);e.data=n?e.data:JSON.stringify(e.data);const o=j(e);function s(e){const{statusCode:r,headers:n}=e,o=[];e.on("data",(e=>o.push(e))),e.on("end",(()=>{const e=Buffer.concat(o);t({statusCode:r,headers:n,data:e})}))}let l;l="http:"===o.protocol?a.request(o,s):i.request(o,s),l.on("timeout",(()=>{r(new Error(`Timeout ${e.timeout}ms`))})),l.on("error",(e=>{r(e)})),"POST"!==o.method||n||l.write(e.data),l.end()}))}const M=[{platform:"Windows",mobile:"random",userAgent:{value:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",versions:[{name:"Chrome",maxMajorVersion:112,minMajorVersion:100,maxMinorVersion:10,maxPatchVersion:5615},{name:"Safari",maxMinorVersion:36,maxPatchVersion:2333}]}},{platform:"Windows",mobile:"random",userAgent:{value:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",versions:[{name:"Chrome",maxMajorVersion:91,minMajorVersion:88,maxMinorVersion:10,maxPatchVersion:5615},{name:"Safari",maxMinorVersion:36,maxPatchVersion:2333},{name:"Edg",maxMinorVersion:10,maxPatchVersion:864}]}},{platform:"Windows",mobile:"random",userAgent:{value:"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",versions:[{name:"Firefox",maxMajorVersion:47,minMajorVersion:43,maxMinorVersion:10,maxPatchVersion:5e3}]}}];function R(e){return y(e)?e.map((e=>w(e)?e:{url:e})):[w(e)?e:{url:e}]}function P(e,t){const{ua:r,platform:n,platformVersion:o,mobile:a,acceptLanguage:i,userAgent:s}=t;let l=e.headers;if(l||(e.headers=l={}),r&&(l["sec-ch-ua"]=r),a&&(l["sec-ch-ua-mobile"]="random"===a?c(2)?"?1":"?0":a),n&&(l["sec-ch-platform"]=n),o&&(l["sec-ch-ua-platform-version"]=o),i&&(l["accept-language"]=i),s){let e=s.value;s.versions?.forEach((t=>{const{name:r,maxMajorVersion:n,minMajorVersion:o,maxMinorVersion:a,minMinorVersion:i,maxPatchVersion:s,minPatchVersion:l}=t,u=e.split(`${r}/`)[1].split(" ")[0].split("."),m=u.join(".");h(n)||(u[0]=n===o?n:c(n,o)),h(a)||(u[1]=a===i?a:c(a,i)),h(s)||(u[2]=s===l?s:c(s,l));const p=`${r}/${m}`,d=`${r}/${u.join(".")}`;e=e.replace(p,d)})),l["user-agent"]=e}}function V(e,t){const{maxWidth:r,minWidth:n,maxHeight:o,minHidth:a}=t,i=e.viewport??{};r&&(i.width=r===n?r:c(r,n)),o&&(i.height=o===a?o:c(o,a)),Object.hasOwn(i,"width")&&Object.hasOwn(i,"height")&&(e.viewport=i)}function F(e,t,r){r.detailTargets=t.detailTargets.map((n=>{const o=n,{url:a,timeout:i,proxy:s,maxRetry:l,priority:u,headers:m,fingerprint:p}=o;if(h(e.baseUrl)||(o.url=e.baseUrl+a),h(i)&&(h(t.timeout)?o.timeout=e.timeout:o.timeout=t.timeout),h(l)&&(h(t.maxRetry)?o.maxRetry=e.maxRetry:o.maxRetry=t.maxRetry),h(s)&&(h(t.proxy)?h(e.proxy)||(o.proxy=e.proxy):o.proxy=t.proxy),!h(o.proxy?.urls)){const e=o.proxy.urls;o.proxyUrl=e[0],o.proxyDetails=e.map((e=>({url:e,state:!0})))}if(h(u)&&(o.priority=0),h(m)&&t.headers&&(o.headers={...t.headers}),p)P(o,p);else if(h(p)&&y(t.fingerprints)&&t.fingerprints.length){const e=t.fingerprints,n=c(e.length),a=e[n];r.selectFingerprintIndexs.push(n),P(o,a)}else if(h(p)&&!y(t.fingerprints)&&e.enableRandomFingerprint){P(o,M[c(M.length)])}return o})),r.intervalTime=t.intervalTime,h(t.intervalTime)&&!h(e.intervalTime)&&(r.intervalTime=e.intervalTime),r.onCrawlItemComplete=t.onCrawlItemComplete}async function O(e,t){const{detailTargetConfig:r,detailTargetResult:n,retryCount:o,maxRetry:a,crawlErrorQueue:i}=e,{browser:s}=t,l=o===a,c=n?.page??await s.newPage();r.viewport&&await c.setViewport(r.viewport);let u=null,m=!0;try{if(r.proxyUrl?await s.createIncognitoBrowserContext({proxyServer:r.proxyUrl}):await s.createIncognitoBrowserContext({proxyServer:void 0}),r.cookies){const e=function(e,t){const r=[];return"string"==typeof t?t.split("; ").forEach((t=>{const n=t.split("=");r.push({name:n[0],value:n[1],url:e})})):Array.isArray(t)?t.forEach((t=>{t.url||(t.url=e),r.push(t)})):"object"==typeof t&&t&&(t.url||(t.url=e),r.push(t)),r}(r.url,r.cookies);await c.setCookie(...e)}else{const e=await c.cookies(r.url);await c.deleteCookie(...e)}r.headers&&await c.setExtraHTTPHeaders(r.headers),u=await c.goto(r.url,{timeout:r.timeout})}catch(e){m=!1,i.push(e)}e.detailTargetResult={response:u,page:c};const p=!b(e),d=m&&p;return e.isStatusNormal=p,e.isSuccess=d,(d||l)&&(e.isHandle=!0,function(e,t){const{detailTargetResult:r,result:n}=e,{browser:o,onCrawlItemComplete:a}=t;D(e),n.data={browser:o,...r},a&&a(e.result)}(e,t)),{response:u,page:c}}async function k(n,o){const{detailTargetConfig:a,crawlErrorQueue:i,maxRetry:s,retryCount:l}=n,c=s===l;let u=null,m=!0;try{u=await E(a)}catch(e){m=!1,i.push(e)}n.detailTargetResult=u;const p=!b(n),d=m&&p;return n.isStatusNormal=p,n.isSuccess=d,(d||c)&&(n.isHandle=!0,"data"===o.type?function(e,t){const{isSuccess:r,detailTargetResult:n,result:o}=e,{onCrawlItemComplete:a}=t;if(D(e),r&&n){const e=n.headers["content-type"]??"",t="application/json"===e?JSON.parse(n.data.toString()):e.includes("text")?n.data.toString():n.data;o.data={...n,data:t}}a&&a(o)}(n,o):"file"===o.type&&function(n,o){const{id:a,isSuccess:i,detailTargetConfig:s,detailTargetResult:l,result:c}=n,{saveFileErrorArr:u,saveFilePendingQueue:m,onCrawlItemComplete:p,onBeforeSaveItemFile:d}=o;if(D(n),i&&l){const o=l.headers["content-type"]??"",i=s.fileName??`${a}-${(new Date).getTime()}`,h=s.extension??`.${o.split("/").pop()}`;s.storeDir&&!e.existsSync(s.storeDir)&&(f=s.storeDir,r.resolve(f).split(r.sep).reduce(((t,n,o)=>{const a=0!==o?r.join(t,n):n;return e.existsSync(a)||e.mkdirSync(a),a}),""));const g=s.storeDir??__dirname,w=r.resolve(g,i+h),y=l.data;let x=Promise.resolve(y);d&&(x=d({id:a,fileName:i,filePath:w,data:y}));const v=x.then((async e=>{let r=!0;try{await t.writeFile(w,e)}catch(e){r=!1;const t=`File save error at id ${a}: ${e.message}`,n=()=>a;u.push({message:t,valueOf:n})}const s=e.length;c.data={...l,data:{isSuccess:r,fileName:i,fileExtension:h,mimeType:o,size:s,filePath:w}},p&&p(n.result)}));m.push(v)}else p&&p(n.result);var f}(n,o)),await E(a)}const A=["isSuccess","retryCount"];function D(e){Object.keys(e).forEach((t=>{A.includes(t)&&(e.result[t]=e[t])}))}function W(e){let t=null,r=null,o=!1;return async function(a,i){o||(o=!0,r=n.launch(e.crawlPage?.launchBrowser).then((e=>{t=e}))),r&&(await r,r&&(r=null));const{detailTargets:s,intervalTime:l,onCrawlItemComplete:c}=function(e,t){const r={detailTargets:[],intervalTime:void 0,selectFingerprintIndexs:[],onCrawlItemComplete:void 0};let n={targets:[],detailTargets:[]};if(w(t)&&Object.hasOwn(t,"targets")){const{targets:e}=t;n=t,n.detailTargets=R(e)}else n.detailTargets=R(t);return F(e,n,r),r.detailTargets.forEach(((e,t)=>{const{cookies:o,viewport:a,fingerprint:i}=e;if(h(o)&&n.cookies&&(e.cookies=n.cookies),h(a)&&n.viewport&&(e.viewport=n.viewport),i)V(e,i);else if(h(i)&&n.fingerprints?.length){const o=r.selectFingerprintIndexs[t];V(e,n.fingerprints[o])}})),r}(e,a),u={browser:t,intervalTime:l,onCrawlItemComplete:c},m=await I("page",e.mode,s,u,O),p=y(a)||w(a)&&Object.hasOwn(a,"targets")?m:m[0];return i&&i(p),p}}function B(e){return async function(t,r){const{detailTargets:n,intervalTime:o,onCrawlItemComplete:a}=function(e,t){const r={detailTargets:[],intervalTime:void 0,selectFingerprintIndexs:[],onCrawlItemComplete:void 0};let n={targets:[],detailTargets:[]};if(w(t)&&Object.hasOwn(t,"targets")){const{targets:e}=t;n=t,n.detailTargets=R(e)}else n.detailTargets=R(t);return F(e,n,r),r}(e,t),i={type:"data",intervalTime:o,onCrawlItemComplete:a},s=await I("data",e.mode,n,i,k),l=y(t)||w(t)&&Object.hasOwn(t,"targets")?s:s[0];return r&&r(l),l}}function N(e){return async function(t,r){const{detailTargets:n,intervalTime:o,onBeforeSaveItemFile:a,onCrawlItemComplete:i}=function(e,t){const r={detailTargets:[],intervalTime:void 0,selectFingerprintIndexs:[],onBeforeSaveItemFile:void 0,onCrawlItemComplete:void 0};let n={targets:[],detailTargets:[]};if(w(t)&&Object.hasOwn(t,"targets")){const{targets:e}=t;n=t,n.detailTargets=R(e)}else n.detailTargets=y(t)?t:[t];F(e,n,r);const o=!h(n?.storeDir),a=!h(n?.extension);return r.detailTargets.forEach((e=>{h(e.storeDir)&&o&&(e.storeDir=n.storeDir),h(e.extension)&&a&&(e.extension=n.extension)})),r.onBeforeSaveItemFile=n.onBeforeSaveItemFile,r}(e,t),s={type:"file",saveFileErrorArr:[],saveFilePendingQueue:[],intervalTime:o,onCrawlItemComplete:i,onBeforeSaveItemFile:a},l=await I("file",e.mode,n,s,k),{saveFilePendingQueue:c,saveFileErrorArr:m}=s;var f;await Promise.all(c),(f=m,function e(t,r){if(t>=r)return;const n=f[r];let o=t,a=r-1;for(;o<=a;){for(;f[o]<n;)o++;for(;f[a]>n;)a--;o<=a&&(C(f,o,a),o++,a--)}C(f,o,r),e(t,o-1),e(o+1,r)}(0,f.length-1),f).forEach((e=>u(d(e.message))));const g=[],x=[];l.forEach((e=>{e.data?.data.isSuccess?g.push(e.id):x.push(e.id)})),u("Save file final result:"),u(p(`  Success - total: ${g.length}, ids: [ ${g.join(" - ")} ]`)),u(d(`    Error - total: ${x.length}, ids: [ ${x.join(" - ")} ]`));const v=y(t)||w(t)&&Object.hasOwn(t,"targets")?l:l[0];return r&&r(v),v}}function H(e,t){const{d:r,h:n,m:o}=e,a=(h(r)?0:1e3*r*60*60*24)+(h(n)?0:1e3*n*60*60)+(h(o)?0:1e3*o*60);let i=0;l();const s=setInterval(l,a);function l(){console.log(p(`Start the ${f.bold(++i)} polling`)),t(i,c)}function c(){clearInterval(s),console.log(p("Stop the polling"))}}const q=function(e){const t=function(e){const t=e||{};return h(t.mode)&&(t.mode="async"),h(t.enableRandomFingerprint)&&(t.enableRandomFingerprint=!0),h(e?.timeout)&&(t.timeout=1e4),h(e?.maxRetry)&&(t.maxRetry=0),t}(e);return function(e){return{crawlPage:W(e),crawlData:B(e),crawlFile:N(e),startPolling:H}}(t)}({intervalTime:{max:5e3,min:3e3}});q.crawlPage({targets:["https://www.google.com","https://github.com/coder-hxl"],proxy:{urls:["http://localhost:14897","http://localhost:14892"],switchByErrorCount:1},maxRetry:3}).then((e=>{console.log("================== res =================="),console.log(e),e.forEach(((e,t)=>{console.log(e.proxyDetails)})),e[0].data.browser.close()}));
