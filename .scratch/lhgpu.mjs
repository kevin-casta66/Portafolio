import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire("C:/Users/User/Documents/GitHubPersonal/Portafolio/package.json");
const lhRequire = createRequire(require.resolve("lighthouse"));
const cl = lhRequire("chrome-launcher");
const flagsets = { headlessnew:["--headless=new"], "headlessnew+gpu":["--headless=new","--enable-gpu","--use-angle=d3d11","--ignore-gpu-blocklist"] };
for (const [name,flags] of Object.entries(flagsets)) {
 const chrome = await cl.launch({chromeFlags:flags});
 const { default: CDP } = await import("node:net").then(()=>({default:null}));
 const r = await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`,{method:"PUT"}).then(r=>r.json());
 console.log(name, r.webSocketDebuggerUrl?"ok":"?");
 await chrome.kill();
}
