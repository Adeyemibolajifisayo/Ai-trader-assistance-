const WS_URL='wss://api.derivws.com/trading/v1/options/ws/public';
const assets={
 boom500:{label:'Boom 500',tv:'DERIV:BOOM_500_INDEX',terms:['boom 500 index','boom 500']},
 boom1000:{label:'Boom 1000',tv:'DERIV:BOOM_1000_INDEX',terms:['boom 1000 index','boom 1000']},
 crash500:{label:'Crash 500',tv:'DERIV:CRASH_500_INDEX',terms:['crash 500 index','crash 500']},
 crash1000:{label:'Crash 1000',tv:'DERIV:CRASH_1000_INDEX',terms:['crash 1000 index','crash 1000']},
 v75:{label:'Volatility 75',tv:'DERIV:VOLATILITY_75_INDEX',terms:['volatility 75 index','volatility 75']}
};
const tfs=[{v:900,n:'15m'},{v:3600,n:'1h'},{v:14400,n:'4h'}];
let socket, symbols={}, activeAsset='boom500', currentBars={}, allAnalyses={}, lastAlertKey='';
const $=id=>document.getElementById(id);
function setConnection(ok,msg){$('connection').textContent=msg;$('connection').className='pill '+(ok?'good':'warn')}
function connect(){
 try{socket=new WebSocket(WS_URL);socket.onopen=()=>{setConnection(true,'Deriv connected');socket.send(JSON.stringify({active_symbols:'brief',req_id:1}))};
 socket.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return}
 if(d.msg_type==='active_symbols'){const list=d.active_symbols||[];for(const [k,a] of Object.entries(assets)){let found=list.find(x=>a.terms.some(t=>(x.display_name||'').toLowerCase()===t));if(!found)found=list.find(x=>a.terms.some(t=>(x.display_name||'').toLowerCase().includes(t)));if(found)symbols[k]=found.symbol;}
 updateSymbolMeta();if(symbols[activeAsset]){loadPrice(activeAsset);scanAll();}}
 if(d.msg_type==='tick'){let k=Object.keys(symbols).find(k=>symbols[k]===d.tick?.symbol);if(k===activeAsset){$('price').textContent=Number(d.tick.quote).toLocaleString(undefined,{maximumFractionDigits:5});$('priceMeta').textContent='Live tick · '+new Date(d.tick.epoch*1000).toLocaleTimeString();}}
 if(d.error){setConnection(false,'Data error');$('priceMeta').textContent=d.error.message||'Market data error';}
 };
 socket.onerror=()=>setConnection(false,'Connection issue');socket.onclose=()=>{setConnection(false,'Disconnected');setTimeout(connect,5000)};
 }catch(e){setConnection(false,'Unavailable')}
}
function updateSymbolMeta(){$('symbolMeta').textContent=symbols[activeAsset]?'Deriv symbol: '+symbols[activeAsset]:'No matching Deriv symbol found. Check market availability on Deriv.'}
function send(req){return new Promise((resolve,reject)=>{if(!socket||socket.readyState!==1)return reject(Error('Deriv is not connected'));let id=Math.floor(Math.random()*1e9);let handler=e=>{let d=JSON.parse(e.data);if(d.req_id===id){socket.removeEventListener('message',handler);d.error?reject(Error(d.error.message)):resolve(d)}};socket.addEventListener('message',handler);socket.send(JSON.stringify({...req,req_id:id}));setTimeout(()=>{socket.removeEventListener('message',handler);reject(Error('Market data request timed out'))},12000)})}
async function loadBars(asset,granularity){let sym=symbols[asset];if(!sym)throw Error('No matching Deriv symbol was found for '+assets[asset].label);let d=await send({ticks_history:sym,count:250,end:'latest',style:'candles',granularity});return (d.candles||[]).map(c=>({time:+c.epoch,open:+c.open,high:+c.high,low:+c.low,close:+c.close}));}
function ema(vals,p){let k=2/(p+1),out=[];vals.forEach((v,i)=>out.push(i? v*k+out[i-1]*(1-k):v));return out}
function rsi(vals,p=14){if(vals.length<=p)return null;let gains=0,loss=0;for(let i=vals.length-p;i<vals.length;i++){let d=vals[i]-vals[i-1];if(d>0)gains+=d;else loss-=d}if(!loss)return 100;let rs=(gains/p)/(loss/p);return 100-100/(1+rs)}
function atr(bars,p=14){if(bars.length<p+1)return null;let tr=[];for(let i=1;i<bars.length;i++)tr.push(Math.max(bars[i].high-bars[i].low,Math.abs(bars[i].high-bars[i-1].close),Math.abs(bars[i].low-bars[i-1].close)));return tr.slice(-p).reduce((a,b)=>a+b,0)/p}
function analyse(bars){if(bars.length<40)throw Error('Not enough candles yet');let closes=bars.map(b=>b.close),fast=ema(closes,20),slow=ema(closes,50),rv=rsi(closes),av=atr(bars),last=closes.at(-1),bull=fast.at(-1)>slow.at(-1)&&last>fast.at(-1),bear=fast.at(-1)<slow.at(-1)&&last<fast.at(-1),trend=bull?'Bullish':bear?'Bearish':'Mixed / sideways';let signal=bull&&rv>50&&rv<70?'Bullish bias':bear&&rv<50&&rv>30?'Bearish bias':'Wait / no clear setup';
let ranges=bars.slice(-51,-1).map(b=>b.high-b.low).sort((a,b)=>a-b);
let medianRange=ranges.length?ranges[Math.floor(ranges.length/2)]:0;
let recent=bars.slice(-30), large=recent.filter(b=>medianRange>0&&(b.high-b.low)>medianRange*2.2);
let upSpikes=large.filter(b=>(b.close-b.open)>0).length,downSpikes=large.filter(b=>(b.close-b.open)<0).length;
let spikeText=`Recent unusually large candles: ${large.length} in the last 30 candles (${upSpikes} upward, ${downSpikes} downward), using 2.2× the recent median candle range as a simple flag. This describes past activity; it does not predict when the next Boom or Crash spike will occur.`;
let notes=[];notes.push(`Price is ${last>fast.at(-1)?'above':'below'} the 20-period EMA and the 20 EMA is ${fast.at(-1)>slow.at(-1)?'above':'below'} the 50 EMA.`);notes.push(`RSI is ${rv.toFixed(1)} (${rv>70?'overbought territory':rv<30?'oversold territory':'not at an extreme'}).`);notes.push(signal==='Wait / no clear setup'?'Momentum and trend filters do not align cleanly; waiting is the more cautious reading.':'Trend and RSI currently support the same directional bias, but this is not confirmation of a trade.');
notes.push(spikeText);
return{last,rv,av,trend,signal,notes:notes.join(' '),bars,upSpikes,downSpikes,largeSpikes:large.length}}
function render(a,gran){let r=a;let s=$('signal');s.textContent=r.signal;s.className='signal '+(r.signal.startsWith('Bull')?'buy':r.signal.startsWith('Bear')?'sell':'wait');$('explain').textContent=r.notes;$('rsi').textContent=r.rv.toFixed(1);$('trend').textContent=r.trend;$('atr').textContent=r.av.toFixed(5);$('price').textContent=r.last.toLocaleString(undefined,{maximumFractionDigits:5});$('priceMeta').textContent='Latest completed candle · '+new Date(r.bars.at(-1).time*1000).toLocaleString();$('updated').textContent='Updated '+new Date().toLocaleTimeString();updateAlert(r,gran)}
async function scanOne(gran){let bars=await loadBars(activeAsset,gran),r=analyse(bars);allAnalyses[gran]=r; if(+ $('tf').value===gran)render(r,gran);return r}
async function scanAll(){if(!symbols[activeAsset]){updateSymbolMeta();return} $('allScanBtn').disabled=true;$('timeframes').innerHTML='<div class="muted">Scanning Deriv candles…</div>';let out=[];for(let t of tfs){try{let r=await scanOne(t.v);out.push({t,r})}catch(e){out.push({t,error:e.message})}}$('timeframes').innerHTML=out.map(x=>`<div class="tf-row"><span>${x.t.n}</span><span>${x.error||x.r.trend+' · '+x.r.signal}</span></div>`).join('');$('allScanBtn').disabled=false; if(allAnalyses[+$('tf').value])render(allAnalyses[+$('tf').value],+$('tf').value)}
function updateAlert(r,gran){if(!('Notification'in window)||Notification.permission!=='granted')return;let key=activeAsset+gran+r.signal;if(r.signal!=='Wait / no clear setup'&&key!==lastAlertKey){new Notification('AI Trader Assistant · '+assets[activeAsset].label,{body:`${tfs.find(t=>t.v===gran).n}: ${r.signal}. ${r.trend}. Review manually; no trade has been placed.`});lastAlertKey=key}}
function loadChart(){let a=assets[activeAsset],tf=+$('tf').value,interval=tf===900?'15':tf===3600?'60':'240';$('tvLink').href='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(a.tv);$('tv_chart').innerHTML=`<iframe title="TradingView chart" src="https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(a.tv)}&interval=${interval}&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=%23131e30&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&studies=RSI%40tv-basicstudies" loading="lazy"></iframe>`}
function updateRisk(){let b=+$('balance').value||0,p=+$('risk').value||0,entry=+$('entry').value,stop=+$('stop').value;$('riskCash').textContent='£'+(b*p/100).toFixed(2);if(entry>0&&stop>0&&entry!==stop){$('distance').textContent=Math.abs(entry-stop).toPrecision(6);$('size').textContent=(b*p/100/Math.abs(entry-stop)).toFixed(4)+' price-units*'}else{$('distance').textContent='—';$('size').textContent='Enter entry and stop'}}
function journal(){let items=JSON.parse(localStorage.getItem('traderJournal')||'[]');$('journalList').innerHTML=items.slice().reverse().map(x=>`<div class="journal-item"><b>${escapeHtml(x.asset)} · ${escapeHtml(x.side)}</b> <span class="muted">${escapeHtml(x.date)}</span><div>${escapeHtml(x.note)}</div></div>`).join('')||'<p class="muted small">No journal entries yet.</p>'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('asset').onchange=()=>{activeAsset=$('asset').value;updateSymbolMeta();loadChart();if(symbols[activeAsset]){loadPrice(activeAsset);scanAll()}};
$('tf').onchange=()=>{loadChart();if(allAnalyses[+$('tf').value])render(allAnalyses[+$('tf').value],+$('tf').value);else scanOne(+$('tf').value).catch(e=>$('explain').textContent=e.message)};
$('scanBtn').onclick=()=>scanOne(+$('tf').value).catch(e=>$('explain').textContent=e.message);
$('allScanBtn').onclick=scanAll;
$('notifyBtn').onclick=async()=>{if(!('Notification'in window)){alert('This browser does not support notifications.');return}let p=await Notification.requestPermission();$('notifyBtn').textContent=p==='granted'?'Alerts enabled':'Alerts not enabled'};
['balance','risk','entry','stop'].forEach(id=>$(id).oninput=updateRisk);
$('saveJournal').onclick=()=>{let items=JSON.parse(localStorage.getItem('traderJournal')||'[]');items.push({asset:$('journalAsset').value,side:$('journalSide').value,note:$('journalNote').value,date:new Date().toLocaleString()});localStorage.setItem('traderJournal',JSON.stringify(items));$('journalNote').value='';journal()};
async function loadPrice(k){try{let d=await send({ticks:symbols[k],subscribe:1});if(d.tick&&k===activeAsset){$('price').textContent=Number(d.tick.quote).toLocaleString();$('priceMeta').textContent='Live tick · '+new Date(d.tick.epoch*1000).toLocaleTimeString()}}catch(e){$('priceMeta').textContent=e.message}}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
loadChart();updateRisk();journal();connect();
// Refresh all three timeframes every 60 seconds while the app remains open.
setInterval(()=>{if(document.visibilityState==='visible'&&symbols[activeAsset])scanAll().catch(()=>{});},60000);
