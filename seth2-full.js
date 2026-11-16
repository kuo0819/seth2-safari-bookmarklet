/* Seth2 full feature migration; page-context Safari test; CSP may block. */
(() => {
  'use strict';
  // 網址白名單：不符合時，不建立介面、計時器或監聽。
  const assistantHost=location.hostname.toLowerCase();
  if(!['http:','https:'].includes(location.protocol)||!(assistantHost==='godeebxp.com'||assistantHost.endsWith('.godeebxp.com')))return;

  // Prevent duplicate bookmark injections, which multiply timers and listeners.
  const SINGLETON='__seth2_mobile_safe_1198';
  if(window[SINGLETON]){alert('賽特2助手已載入，請勿重複執行書籤。');return;}
  window[SINGLETON]={loadedAt:Date.now()};
  let launched=false,wasActive=null;
  const ROUTER_TAG='game-assistant-router-seth2-1190';
  function launch(){if(launched)return;launched=true;setTimeout(boot,300);}
  window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin||event.data?.tag!==ROUTER_TAG||event.data?.game!=='g1005')return;
    const active=event.data.active===true;if(active)launch();
    for(const id of ['room-panel-201','room-license-gate-seth2-v1']){const node=document.getElementById(id);if(node)node.style.setProperty('visibility',active?'visible':'hidden','important');}
    if(launched&&wasActive!==active)window.postMessage({tag:'room-assistant-201',from:'ui',kind:active?'start':'stop',data:{}},location.origin);wasActive=active;
  });
  function pageProbe(){
    const key='game-assistant-router-seth2-1190';if(window[key]){window[key].check();return;}
    let timer=null;
    function check(){if(document.hidden)return;try{const view=window.App?.entryManager?.getEntry?.('g1005')?.gameView;
      window.postMessage({tag:'game-assistant-router-seth2-1190',game:'g1005',active:view?.bundle==='g1005'&&view.node?.activeInHierarchy===true},location.origin);
    }catch(_){}}
    function run(){if(timer===null)timer=setInterval(check,1500);check();}
    window[key]={check};window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});window.addEventListener('pageshow',event=>{if(event.persisted)run();});run();
  }
  if(window.App)pageProbe();else{const script=document.createElement('script');script.textContent='('+pageProbe.toString()+')();';(document.documentElement||document.body).appendChild(script);script.remove();}
  function boot(){
  if(document.getElementById('room-panel-201'))return;
  const LOCAL_SCORE_PARAMS={"seth1": {"bet30": 70000000, "bet": 55000, "c0": 25, "c1": 45, "c2": 50, "rtp30Base": 93, "rtp30Range": 5}, "seth2": {"bet30": 42000000, "bet": 170000, "c0": 80, "c1": 110, "c2": 100, "rtp30Base": 92, "rtp30Range": 7}, "red3k": {"bet30": 20000000, "bet": 22000, "c0": 35, "c1": 75, "c2": 70, "rtp30Base": 92, "rtp30Range": 6}, "hades": {"bet30": 70000000, "bet": 55000, "c0": 25, "c1": 45, "c2": 50, "rtp30Base": 93, "rtp30Range": 5}, "tiger": {"bet30": 800000, "bet": 28000, "c0": 26, "c1": 80, "c2": 76, "rtp30Base": 93, "rtp30Range": 12}, "vampire": {"bet30": 800000, "bet": 28000, "c0": 26, "c1": 80, "c2": 76, "rtp30Base": 93, "rtp30Range": 12}, "jinlian": {"bet30": 800000, "bet": 28000, "c0": 26, "c1": 80, "c2": 76, "rtp30Base": 93, "rtp30Range": 12}};
  const LOCAL_SCORE_ALIASES=Object.assign(Object.create(null),{"賽特 i": "seth1", "賽特 ii": "seth2", "賽特一代": "seth1", "賽特二代": "seth2", "戰神賽特": "seth1", "戰神賽特2": "seth2", "戰神賽特 ii": "seth2"});
  function analyzeLocalRooms(payload) {
    const {minBet,maxAge,gameSelection}=payload.options;
    const now=Date.now();
    const keys=['c0','c1','c2','rtp','bet','rtp30','bet30'];
    const countKeys=keys.slice(0,3);
    const params=LOCAL_SCORE_PARAMS;
    const metric=(raw,percent=false)=>{
      if(typeof raw==='string'&&raw.length<=80){
        const value=percent?raw.trim().replace(/%$/,'').trim():raw.trim();
        if(!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))return null;
        raw=Number(value);
      }
      return typeof raw==='number'&&Number.isFinite(raw)&&raw>=0?raw:null;
    };
    const age=record=>{
      const stamp=Date.parse(record?.receivedAt);
      return Number.isFinite(stamp)?Math.max(0,(now-stamp)/1000):Infinity;
    };
    const results=payload.rooms.map(({room,detail})=>{
      const records=[{row:detail,age:age(detail),label:'明細'},{row:room,age:age(room),label:'列表'}].sort((a,b)=>a.age-b.age);
      const gameRaw=gameSelection==='auto'?(detail?.gameRaw||room.gameRaw||payload.detected_game):gameSelection;
      const rawKey=typeof gameRaw==='string'?gameRaw.trim().toLowerCase():null;
      const game=Object.hasOwn(params,rawKey)?rawKey:LOCAL_SCORE_ALIASES[rawKey]??null;
      const inputs=Object.fromEntries(keys.map(key=>[key,null]));
      inputs.game=game??gameRaw;
      const fieldSources={},usedAges=[],stale=new Set(),issues=new Set();
      function read(record,key){
        const aliases=key==='rtp30'?['rtp30','rtp_30']:key==='bet30'?['bet30','bet_30']:[key];
        const entries=aliases.filter(alias=>record.row?.scoreFields?.[alias]!=null);
        if(!entries.length)return [null,null];
        const values=entries.map(alias=>metric(record.row.scoreFields[alias],key==='rtp'||key==='rtp30'));
        if(values.some(value=>value===null||value!==values[0]||(countKeys.includes(key)&&!Number.isSafeInteger(value)))){
          issues.add(record.label+'.'+entries.join('/')+'：格式無效或同義欄位衝突');
          return [null,null];
        }
        return [values[0],record.label+'.'+entries.join('/')];
      }
      function accept(record,key,value,source){
        if(record.age>maxAge){stale.add(key);return false;}
        inputs[key]=value;fieldSources[key]=source;usedAges.push(record.age);stale.delete(key);
        return true;
      }
      for(const [index,key] of countKeys.entries()){
        for(const record of records){
          const [value,source]=read(record,key);
          if(value!==null&&accept(record,key,value,source))break;
        }
        const count=metric(detail?.mgCounts?.[index]);
        if(inputs[key]===null&&Number.isSafeInteger(count)){
          accept(records.find(record=>record.label==='明細'),key,count,'明細.mgCounts['+index+']');
        }
      }
      function acceptPair(record,rateKey,betKey,rate,bet,rateSource,betSource){
        if(rate===null||!Number.isFinite(rate)||!(bet>0))return false;
        const fresh=accept(record,rateKey,rate,rateSource);
        accept(record,betKey,bet,betSource);
        return fresh;
      }
      for(const record of records){
        const [rate,rateSource]=read(record,'rtp'),[bet,betSource]=read(record,'bet');
        if(acceptPair(record,'rtp','bet',rate,bet,rateSource,betSource))break;
        const [paid,paidSource]=read(record,'todayBet'),[win,winSource]=read(record,'todayWin');
        if(win!==null&&paid>0&&acceptPair(record,'rtp','bet',win/paid*100,paid,winSource+'÷'+paidSource+'×100',paidSource))break;
      }
      for(const record of records){
        let [rate,rateSource]=read(record,'rtp30'),[bet,betSource]=read(record,'bet30');
        if(record.label==='明細'&&detail?.day30Profile==='g1001-user-verified'){
          const dayBet=metric(detail.dayBet),dayWin=metric(detail.dayWin);
          if(bet===null&&dayBet!==null){bet=dayBet;betSource='明細.dayBet（已核對近30天）';}
          if(rate===null&&dayWin!==null&&dayBet>0&&bet===dayBet){rate=dayWin/dayBet*100;rateSource='明細.dayWin÷dayBet×100（已核對近30天）';}
        }
        if(acceptPair(record,'rtp30','bet30',rate,bet,rateSource,betSource))break;
      }
      if(inputs.rtp===null)issues.add('今日統計缺少同一快照的有效得分率與下注組合');
      if(inputs.rtp30===null)issues.add('近30日統計缺少同一快照的有效得分率與下注組合');
      const p=Object.hasOwn(params,game)?params[game]:null;
      const missing=p?keys.filter(key=>inputs[key]===null):['game'];
      if(p&&!missing.length&&inputs.bet<minBet)missing.push('bet:低於設定下限');
      const status=!p?'不支援此遊戲':missing.length?'資料不足':'規則評分';
      let score_combo=null,score_boom=null,score_return=null,confidence=null;
      if(status==='規則評分'){
        const {c0,c1,c2,rtp,bet,rtp30,bet30}=inputs;
        const revised=['seth1','seth2','tiger'].includes(game), weight=bet/(bet+p.bet);
        const today=revised?p.rtp30Base+weight*(rtp-p.rtp30Base):rtp;
        const wait=revised?c0/(c0+p.c0/3):Math.min(1,c0/p.c0);
        const long=rtp30-p.rtp30Base;
        const returns=Math.min(300,Math.max(0,long*300/p.rtp30Range))+Math.min(250,bet30/p.bet30*250)+200*wait+
          Math.min(150,bet/p.bet*150)+Math.min(75,c1/p.c1*75)+Math.min(75,c2/p.c2*75);
        const boom=350*Math.min(1,Math.max(0,(105-today)/35))+Math.min(125,c1/p.c1*125)+Math.min(125,c2/p.c2*125)+
          Math.min(200,Math.max(0,long*200/p.rtp30Range))+150*wait+Math.min(100,bet/p.bet*100);
        const score=value=>Math.min(1000,Math.round(value*1000/1050));
        score_combo=score(.55*returns+.45*boom);score_boom=score(boom);score_return=score(returns);
        const ageShare=Math.max(...usedAges)/maxAge;
        if(revised)confidence=weight<.25||ageShare>=.75?'偏低':weight<.5||ageShare>=.5?'普通':'較高';
      }
      const reasons=status==='規則評分'?['本機規則評分，依已取得的房間統計計算。']:!p?['不支援此遊戲，請核對遊戲識別。']:
        ['資料不足：'+missing.join('、'),...issues,...(stale.size?['過期欄位：'+[...stale].join('、')]:[])];
      const detailAge=age(detail),listAge=age(room);
      const valid_for_seconds=Math.max(.001,Math.min(30,...usedAges.map(value=>maxAge-value)));
      return {roomId:room.roomId,analysis:{score_combo,score_boom,score_return,score:score_combo,status,missing,inputs,breakdown:null,
        today:inputs.rtp,rtp30:inputs.rtp30,wait:inputs.c0,reasons,game:p?game:null,gameRaw,fieldSources,
        listAge:Number.isFinite(listAge)?listAge:null,detailAge:Number.isFinite(detailAge)?detailAge:null,
        freshWait:Number.isSafeInteger(inputs.c0),empty:room.status==='Empty'&&!room.entryFailure,
        formulaSource:'本機規則評分',confidence,valid_for_seconds,
        period:detail?.day30Profile==='g1001-user-verified'?'近30日欄位或已核對的 day 統計。':'近30日採明確欄位及遊戲來源已核對的快照。'}};
    });
    return {results,server_time:now/1000,source:'本機規則評分'};
  }

  const localAccess={"license_ref": "offline", "tier": "advanced", "tier_name": "免驗證暫用版", "entitlements": {"name": "進階版", "daily_rooms": null, "max_speed": 100, "max_batch": null, "history_count": 11, "all_scores": true, "long_stats": true, "strategy": true, "max_symbol_rules": 8, "rtp_stop": true, "bonus_stop": true, "sample_compare": true}, "usage": {"day": "", "used": 0, "limit": null, "room_ids": []}};
  const licenseControl={isAuthorized:()=>true,access:()=>localAccess,analyze:analyzeLocalRooms};

  function startAuthorizedAssistant(){
  function installPageReader(){
  'use strict';
  if(window.__roomReaderSeth2_1180)return;
  window.__roomReaderSeth2_1180=true;
  const TAG='room-assistant-201', subscriptions=[],knownRooms=new Map();let licenseBlocked=false;
  let powerSaving=/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent||'')||(/Mac/i.test(navigator.userAgent||'')&&(navigator.maxTouchPoints||0)>1);
  const roomQueryDelay=()=>powerSaving?3000:500;
  let activeGame=null;
  const detailTimes=new Map(),ownedRooms=new Set(),packetHandlers=new Map();
  let received=0,errors=0,compressedDecoded=0;
  const n=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const id=v=>(typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&/^\d+$/.test(v))?String(v):null;
  const send=(kind,data)=>window.postMessage({tag:TAG,from:'reader',kind,data},location.origin);
  function report(note){send('status',{connections:subscriptions.length,received,errors,note});}
  function decode(v){
    if(!v||v.zip!==1)return v;
    const codec=window.pako||(typeof pako==='object'?pako:null),Inflate=codec?.Inflate;
    if(typeof Inflate!=='function')throw Error('遊戲解壓元件不可存取');
    let b=v.data;if(b?.type==='Buffer')b=b.data;
    if(b instanceof ArrayBuffer)b=new Uint8Array(b);
    else if(ArrayBuffer.isView(b))b=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);
    else if(Array.isArray(b))b=new Uint8Array(b);
    else if(typeof b==='string')b=Uint8Array.from(atob(b),c=>c.charCodeAt(0));
    if(!(b instanceof Uint8Array)||b.length>2000000)throw Error('壓縮格式不支援');
    const z=new Inflate(),parts=[];let size=0;
    z.onData=p=>{size+=p.length;if(size>4000000)throw Error('資料過大');parts.push(p);};
    z.push(b,true);if(z.err)throw Error('解壓失敗');
    const raw=new Uint8Array(size);let offset=0;
    for(const p of parts){raw.set(p,offset);offset+=p.length;}
    const decoded=JSON.parse(new TextDecoder().decode(raw));compressedDecoded++;return decoded;
  }
  function scoreSnapshot(raw){
    const result={};if(!raw||typeof raw!=='object')return result;
    const put=(key,value)=>{result[key]=(value===null||typeof value==='number'||(typeof value==='string'&&value.length<=80))?value:null;};
    for(const key of ['c0','c1','c2','rtp','rtp30','rtp_30','bet30','bet_30'])if(Object.prototype.hasOwnProperty.call(raw,key))put(key,raw[key]);
    // 只有明確的評分格式 rtp + bet 才把普通 bet 視為今日下注。
    // 原遊戲列表的普通 win/bet 屬時段統計，今日下注另取 today.bet。
    if(Object.prototype.hasOwnProperty.call(raw,'rtp')&&Object.prototype.hasOwnProperty.call(raw,'bet'))put('bet',raw.bet);
    for(const key of ['todayWin','todayBet'])if(Object.prototype.hasOwnProperty.call(raw,key))put(key,raw[key]);
    if(raw.today&&typeof raw.today==='object'){
      if(Object.prototype.hasOwnProperty.call(raw.today,'win'))put('todayWin',raw.today.win);
      if(Object.prototype.hasOwnProperty.call(raw.today,'bet'))put('todayBet',raw.today.bet);
    }
    return result;
  }
  function rawGame(raw){
    if(!raw||typeof raw!=='object')return null;
    for(const key of ['game','gameKey','gameCode','game_code','gameName']){
      const value=raw[key];if(typeof value==='string'&&value.trim()&&value.length<=80)return value.trim();
    }
    return null;
  }
  function observeGame(data,payload){
    const value=rawGame(data)||rawGame(payload);
    if(value&&value!==activeGame){activeGame=value;send('game',{value});}
    return value;
  }
  // 賽特 II 使用獨立的原生欄位對照，沿用原有評分介面。
  function day30Profile(){return null;}
  function consume(event,payload,own=false,periodProfile=null){
    if(!payload||typeof payload!=='object')return;
    if(event==='slotTableUpdated'){
      const updates=[];
      for(const [key,value] of Object.entries(payload).slice(0,5000)){
        if(/^\d+$/.test(key)&&typeof value==='string')updates.push({roomId:key,status:value.slice(0,30)});
      }
      for(const row of updates){const r=knownRooms.get(row.roomId);if(r){r.status=row.status;r.statusAt=Date.now();r.live=true;}}
      if(updates.length)send('updates',updates);
      return;
    }
    const data=payload.data;if(!data||typeof data!=='object')return;
    if(Array.isArray(data.tables)){
      const gameRaw=observeGame(data,payload);
      const rooms=[];
      for(const row of data.tables.slice(0,5000)){
        if(!row||id(row.roomId)===null)continue;
        knownRooms.set(id(row.roomId),{roomId:id(row.roomId),number:n(row.number),nativeRoomId:row.roomId,status:row.status,live:true,statusAt:Date.now(),page:n(data.tableMeta?.currentPage),entryFailure:knownRooms.get(id(row.roomId))?.entryFailure??null});
        rooms.push({roomId:id(row.roomId),number:n(row.number),gameRaw:rawGame(row)||gameRaw,scoreFields:scoreSnapshot(row),status:typeof row.status==='string'?row.status.slice(0,30):'未知',entryFailure:knownRooms.get(id(row.roomId))?.entryFailure??null,
          win:n(row.win),bet:n(row.bet),todayWin:n(row.today?.win),todayBet:n(row.today?.bet)});
      }
      send('rooms',rooms);
    }
    if(id(data.roomId)!==null&&data.detail&&typeof data.detail==='object'){
      if(!own&&ownedRooms.has(id(data.roomId)))return;
      const result={roomId:id(data.roomId),gameRaw:rawGame(data.detail)||observeGame(data,payload),scoreFields:scoreSnapshot(data.detail),day30Profile:periodProfile};
      for(const k of ['hourWin','hourBet','todayWin','todayBet','dayWin','dayBet'])result[k]=n(data.detail[k]);
      result.mgCounts=Array.isArray(data.detail.mgCounts)?data.detail.mgCounts.slice(0,64).map(n):null;
      if(Array.isArray(result.mgCounts)&&result.mgCounts.length>=11&&result.mgCounts.slice(0,11).every(v=>Number.isInteger(v)&&v>=0))detailTimes.set(result.roomId,Date.now());
      send('detail',result);
    }
  }
  function packet(p,manager=null){
    try{
      if(!p||![2,3,5,6].includes(p.type)||!Array.isArray(p.data))return;
      received++;
      const event=p.type===2||p.type===5;
      const name=event?String(p.data[0]):'ACK';
      if(event&&name!=='slotTableUpdated')return;
      for(const v of (event?p.data.slice(1):p.data).slice(0,10))consume(name,decode(v),false,day30Profile(manager));
    }catch(_){errors++;}
    report('賽特 II 自動監聽中；背景讀取清單分頁與房間明細。');
  }

  // Sequential detail queries. Never call the native detail UI handler.
  const scan={running:false,queue:[],done:0,total:0,skipped:0,failed:0,interval:500,pending:null,phase:'pages',pageQueue:[],pagesDone:0,pagesTotal:0,expectedRooms:null,perPage:null,pagesComplete:false,pageIds:new Set(),settings:null,priority:null,continueRequested:false,continueSettings:null,conflictRetries:new Set(),lastError:null,note:'等待自動取得分頁清單'};
  let nextScanTimer=null,controlFocus=false,pendingAction=null;
  function scanReport(){send('scan',{running:scan.running,done:scan.done,total:scan.total,skipped:scan.skipped,failed:scan.failed,remaining:scan.phase==='pages'?scan.pageQueue.length:scan.queue.length,pending:scan.pending?.roomId||null,queryPending:!!scan.pending,pendingPage:scan.pending?.kind==='page'?scan.pending.page:null,phase:scan.phase,pagesDone:scan.pagesDone,pagesTotal:scan.pagesTotal,expectedRooms:scan.expectedRooms,pagesComplete:scan.pagesComplete,compressedDecoded,interval:scan.interval,priority:scan.priority,continueRequested:scan.continueRequested,nativeQueries:nativeQueries.size,lastError:scan.lastError,scope:scan.settings?.scope==='all'?'all':'empty',note:scan.note});}
  let issuingHelper=false,nativeQueryWatch=null;
  const nativeQueries=new Set();let lastNativeQueryAt=-Infinity;
  function clearPendingRoomQuery(ticket){
    if(!ticket||scan.pending!==ticket)return false;
    clearTimeout(ticket.timeout);
    scan.pending=null;
    if(ticket.roomId)ownedRooms.delete(ticket.roomId);
    return true;
  }
  function noteReadTimeout(phase,roomId=null,page=null){
    scan.failed++;
    scan.continueRequested=false;
    scan.lastError={time:new Date().toISOString(),phase,roomId,page,timeout:true,message:'房間資料查詢逾時'};
    cancelAction('房間查詢逾時，已取消待執行操作。回到遊戲畫面後可再按開始旋轉。');
    pauseScan('房間資料查詢逾時，已解除等待。按「繼續查詢明細」可保留進度重試。');
    controls.report();
  }
  function expireRoomQuery(ticket){
    if(!clearPendingRoomQuery(ticket))return;
    if(ticket.kind==='switch-check'){
      roomSwitchContext=null;
      switchNotice(false,'空房核對逾時，沒有送出切房。',ticket.roomId);
    }
    noteReadTimeout(ticket.kind==='page'?'pages':ticket.kind||'details',ticket.roomId??null,ticket.page??null);
  }
  function nativeQueryBusy(){
    if(roomSwitchPending||nativeQueries.size||Date.now()-lastNativeQueryAt<500)return true;
    try{const view=window.App?.entryManager?.getEntry?.('g1005')?.gameView;
      if(view?.node?.activeInHierarchy===true&&view.className&&window.App?.uiManager?.IsOnlyGameViewOpen?.(view.className)===false)return true;
    }catch(_){}return false;
  }
  function observeNativeQueries(sender){
    if(nativeQueryWatch?.object===sender)return;
    restoreNativeQueries();
    const original=sender.send,descriptor=Object.getOwnPropertyDescriptor(sender,'send'),gen={active:true,object:sender,descriptor,wrapper:null};
    const wrapper=function(...args){
      if(!gen.active||issuingHelper||this!==sender||!['getSlotTables','getSlotTableDetail','updateSlotTable'].includes(args[0])||typeof args[2]!=='function')return Reflect.apply(original,this,args);
      const ticket={name:args[0],switchRequest:args[0]==='updateSlotTable'?captureSwitchRequest(args[1]):null};nativeQueries.add(ticket);
      if(ticket.switchRequest)ticket.switchTimeout=setTimeout(()=>{if(nativeQueries.has(ticket))switchNotice(true,'切房回覆逾時，結果尚未確認；請以原生畫面為準，必要時重新載入。',ticket.switchRequest.target);},12000);
      if(scan.pending)scan.pending.interrupted=true;
      if(scan.running)pauseScan('原生選房查詢優先，關閉選房介面後接續助手進度。');
      if(ticket.name!=='updateSlotTable')ticket.readTimeout=setTimeout(()=>{
        if(!gen.active||!nativeQueries.delete(ticket))return;
        lastNativeQueryAt=Date.now();
        noteReadTimeout(ticket.name==='getSlotTables'?'pages':'details');
      },12000);
      const callback=args[2];args[2]=function(...reply){
        clearTimeout(ticket.readTimeout);
        // Keep the game's own callback, but expired reads no longer update assistant state.
        if(!gen.active||!nativeQueries.has(ticket))return Reflect.apply(callback,this,reply);
        if(ticket.switchTimeout)clearTimeout(ticket.switchTimeout);
        if(ticket.name==='updateSlotTable')try{reportSwitchReply(ticket.switchRequest,reply[0]);}catch(_){switchNotice(false,'切房回覆診斷未完成，請以原生提示為準。',ticket.switchRequest?.target);}
        if(ticket.name!=='updateSlotTable')try{received++;consume('ACK',decode(reply[0]),false,null);}catch(_){errors++;}
        try{return Reflect.apply(callback,this,reply);}finally{nativeQueries.delete(ticket);lastNativeQueryAt=Date.now();scanReport();controls.report();drainAction();maybeContinueRooms();}
      };
      try{return Reflect.apply(original,this,args);}catch(e){clearTimeout(ticket.readTimeout);clearTimeout(ticket.switchTimeout);nativeQueries.delete(ticket);lastNativeQueryAt=Date.now();throw e;}
    };
    gen.wrapper=wrapper;Object.defineProperty(sender,'send',descriptor?{...descriptor,value:wrapper}:{configurable:true,writable:true,value:wrapper});nativeQueryWatch=gen;
  }
  function restoreNativeQueries(){const p=nativeQueryWatch;nativeQueryWatch=null;if(p){p.active=false;try{if(p.object.send===p.wrapper){if(p.descriptor)Object.defineProperty(p.object,'send',p.descriptor);else delete p.object.send;}}catch(_){}}for(const ticket of nativeQueries){clearTimeout(ticket.readTimeout);clearTimeout(ticket.switchTimeout);}nativeQueries.clear();}
  function sendHelper(sender,...args){issuingHelper=true;try{return sender.send(...args);}finally{issuingHelper=false;}}
  function queryFailure(ticket,payload,message){
    const status=payload?.status,key=ticket.kind==='page'?'p'+ticket.page:'r'+ticket.roomId;
    scan.lastError={time:new Date().toISOString(),phase:ticket.kind==='page'?'pages':'details',roomId:ticket.roomId??null,page:ticket.page??null,status:typeof status==='number'||typeof status==='string'?status:null,message:String(message||'查詢失敗').slice(0,180),nativeOverlap:ticket.interrupted===true};
    if(ticket.interrupted&&Number.isFinite(status)&&![200,401,403].includes(status)&&!scan.conflictRetries.has(key)){
      scan.conflictRetries.add(key);pauseScan('原生選房查詢交錯，保留進度；關閉選房介面後自動重試本筆一次。');return;
    }
    scan.failed++;pauseScan(message);
  }

  let roomSwitchPending=false,roomSwitchContext=null,switchSequence=0;const switchEvidence=[];
  function switchNotice(pending,note,target=roomSwitchContext?.roomId??null){roomSwitchPending=pending;send('roomSwitch',{pending,note,target});}
  function setEntryFailure(key,failure){
    const room=knownRooms.get(key);if(!room)return;
    room.entryFailure=failure;send('roomEntry',{roomId:key,failure});
  }
  function captureSwitchRequest(payload){
    const context=roomSwitchContext?.stage==='submitted'?roomSwitchContext:null;
    const requested=id(payload?.roomId),target=context?.roomId??requested;
    // Only copy known, non-secret request fields. Never retain payload/token objects.
    return {attempt:++switchSequence,source:context?'assistant':'native',target,number:knownRooms.get(target)?.number??null,
      request:payload?.request==='updateSlotTable'?'updateSlotTable':null,requestRoomId:requested,
      roomIdType:typeof payload?.roomId,matchesTarget:context?requested===context.roomId:null,
      checkedAt:context?.checkedAt??null,checkedPage:context?.page??null,listStatus:context?.listStatus??knownRooms.get(target)?.status??null,
      sentAt:new Date().toISOString()};
  }
  function reportSwitchReply(request,raw){
    let status=null,code=null,message='';
    try{const p=decode(raw);status=typeof p?.status==='number'?p.status:null;code=typeof p?.code==='number'?p.code:null;
      message=typeof p?.message==='string'?p.message.slice(0,160).replace(/(?:token|authorization|password)\s*[:=]\s*\S+/ig,'[已隱去]'):'';
    }catch(_){}
    const target=request?.target??null,ok=status===200;
    const classification=ok?'accepted':status===401||status===403?'authorization':status===429?'throttled':status===304&&request?.listStatus==='Empty'?'list-conflict':status===304?'native-rejection':status!==null&&status>=500?'server-error':'unconfirmed';
    const explanations={accepted:'原生回覆成功，等待重新載入',authorization:'登入或權限遭拒，請先恢復遊戲連線',throttled:'伺服器限制請求頻率，已暫停且未重送','list-conflict':'清單回覆空房，但入座被拒；具體入座條件仍待核對','native-rejection':'原生拒絕入座，請以遊戲提示為準','server-error':'伺服器回覆錯誤，沒有自動重送',unconfirmed:'切房結果未能確認'};
    const previous=switchEvidence.find(x=>x.target===target&&x.source!==request?.source&&Date.now()-x.at<120000);
    const comparison=previous?(previous.status===status?'；同房另一入口也收到相同狀態':'；同房兩個入口結果不同，仍需核對時序及入座條件'):'';
    switchEvidence.unshift({target,source:request?.source,status,at:Date.now()});if(switchEvidence.length>8)switchEvidence.pop();
    const roomLabel=request?.number!=null?String(request.number)+'號房':'選定房間';
    const requestNote=request?.source==='assistant'?(request.matchesTarget?'；請求房號與選定房一致':'；請求房號未吻合，需核對入口'):'';
    const note=ok?'原生已回覆，等待重新載入；尚未宣稱已進房。':roomLabel+'｜'+explanations[classification]+'｜狀態 '+String(status)+(message?'｜'+message:'')+requestNote+comparison+'；請先重新核對空房。';
    if(!ok&&target)setEntryFailure(target,{time:new Date().toISOString(),status,message,classification});
    switchNotice(ok,note,target);pauseScan(ok?'切房回覆成功，等待原生重新載入。':'切房未完成，背景查詢維持暫停；可重新核對空房。');
    send('roomSwitchDiagnostic',{...request,status,code,message,classification,comparison,receivedAt:new Date().toISOString()});
    if(roomSwitchContext?.roomId===target)roomSwitchContext.stage=ok?'reloading':'rejected';
  }
  function seedRooms(value){
    for(const r of (Array.isArray(value?.rooms)?value.rooms:[]).slice(0,5000)){
      const key=id(r?.roomId);if(key&&!knownRooms.has(key))knownRooms.set(key,{roomId:key,number:n(r.number),status:typeof r.status==='string'?r.status.slice(0,30):'未知',entryFailure:r.entryFailure?{time:typeof r.entryFailure.time==='string'?r.entryFailure.time.slice(0,40):null,status:n(r.entryFailure.status),message:''}:null,live:false});
    }
    for(const d of (Array.isArray(value?.details)?value.details:[]).slice(0,5000)){
      const key=id(d?.roomId),time=Date.parse(d?.receivedAt);if(key&&knownRooms.has(key)&&Number.isFinite(time)&&time<=Date.now()&&!detailTimes.has(key))detailTimes.set(key,time);
    }
    const selected=id(value?.selected);if(selected&&knownRooms.has(selected))scan.priority=selected;
  }
  function prioritizeRoom(value){
    const key=id(value?.roomId);if(!key||!knownRooms.has(key)){send('priorityNote','選定房間尚未載入，請等清單更新。');return;}
    scan.priority=key;scanReport();send('priorityNote','已優先排入 '+String(knownRooms.get(key)?.number??key)+' 號房；等待目前查詢回覆後更新。');
    if(scan.failed>0){send('priorityNote','已排為優先；請按繼續查詢明細解除異常暫停。');return;}
    if(scan.pending||scan.running)return;
    if(!scan.settings){startScan(value);return;}
    scan.running=true;nextDetail();
  }
  function continueRooms(value){
    scan.continueRequested=true;if(value)scan.continueSettings=value;
    if(scan.pending){pauseScan('繼續查詢已排程；等待在途回覆後接續，不重複發送。');return;}
    scanReport();maybeContinueRooms();
  }
  function maybeContinueRooms(){
    if(licenseBlocked)return;
    if(!scan.continueRequested||scan.pending||nativeQueryBusy()||roomSwitchPending||document.hidden||controlFocus||controls.scanBlocked()||playSession.isBusy())return;
    const resumePage=scan.lastError?.timeout&&scan.phase==='pages'&&scan.pageQueue.length>0;
    scan.continueRequested=false;scan.failed=0;scan.lastError=null;scan.conflictRetries.clear();send('scanRestarted',{note:'已由保留進度繼續查詢。'});
    const options=scan.settings||scan.continueSettings||{scope:'empty',interval:500,maxAge:300};
    if(resumePage){scan.running=true;nextDetail();return;}
    if(scan.phase==='pages'||!scan.pagesComplete){startScan(options);return;}
    if(scan.queue.length||scan.priority){scan.running=true;nextDetail();}
    else prepareDetails(options);
  }
  function changeRoom(value,checked=false){
    const key=id(value?.roomId),room=key?knownRooms.get(key):null,checkOnly=value?.checkOnly===true;
    if(!key||!Number.isSafeInteger(Number(key))||Number(key)<=0){switchNotice(false,'房間識別碼無效。');return;}
    if(roomSwitchPending){send('priorityNote','原生切房仍待回覆，沒有重送。');return;}
    const control=controls.report();
    if(!control.ready||control.active!==false||playSession.isBusy()||document.hidden){switchNotice(false,control.reason||'請先停止旋轉並完成本局結算。',key);return;}
    if(!room||room.live!==true||(checked&&room.status!=='Empty')){
      switchNotice(false,'請先取得此房最新空房狀態；快照、使用中或鎖定房不能直接切換。',key);return;
    }
    if(room.entryFailure&&!checkOnly){switchNotice(false,'此房上次進房遭拒；請先按「重新核對空房」，再手動決定是否切換。',key);return;}
    let sender;try{sender=querySender();}catch(e){switchNotice(false,e.message,key);return;}
    if(!checkOnly&&typeof sender.changeSlotTable!=='function'){switchNotice(false,'未找到已核對的原生切房方法，沒有送出切房。',key);return;}
    if(!checked){
      if(!Number.isSafeInteger(room.page)||room.page<1){switchNotice(false,'房間清單頁次尚未核對，請繼續查詢清單後再切房。',key);return;}
      roomSwitchContext={roomId:key,number:room.number,page:room.page,stage:'checking',checkedAt:null,listStatus:null};
      switchNotice(true,'正在核對選定房的最新空房狀態。',key);const ticket={kind:'switch-check',roomId:key,timeout:null};scan.pending=ticket;scanReport();
      ticket.timeout=setTimeout(()=>expireRoomQuery(ticket),12000);
      try{sendHelper(sender,'getSlotTables',{request:'getSlotTables',page:room.page},raw=>{
        if(scan.pending!==ticket)return;clearTimeout(ticket.timeout);scan.pending=null;
        try{const p=decode(raw);if(p?.status!==200||!Array.isArray(p.data?.tables))throw Error('查詢未成功（狀態 '+String(p?.status)+'），未重送');sender.setToken(p);
          if(p.data.tableMeta?.currentPage!==room.page)throw Error('回覆頁次不符');
          const row=p.data.tables.find(r=>id(r?.roomId)===key);consume('ACK',p,true,day30Profile(sender.service?._client?._io?.io));if(!row)throw Error('房間不在回覆清單');
          roomSwitchContext={...roomSwitchContext,checkedAt:new Date().toISOString(),listStatus:row.status,stage:'checked'};
          if(checkOnly){
            setEntryFailure(key,null);switchNotice(false,'已重新核對：'+(row.status==='Empty'?'清單回覆空房；可手動切換，入座仍由伺服器決定。':'目前不是空房（'+String(row.status)+'）。'),key);
            pauseScan('空房狀態核對完成；未送出切房。');controls.report();return;
          }
          if(row.status!=='Empty')throw Error('房間已非空房');
          switchNotice(false,'空房狀態已更新，準備交由原生切房。',key);changeRoom(value,true);
        }catch(e){const note='沒有送出切房：'+String(e.message||'狀態未核對');switchNotice(false,note,key);pauseScan(note);controls.report();}
      });}catch(_){clearTimeout(ticket.timeout);scan.pending=null;switchNotice(false,'狀態核對呼叫失敗，沒有送出切房。',key);pauseScan('空房狀態核對失敗；未送出切房。');}
      return;
    }
    pauseScan('切換房間中，等待原生回覆及重新載入。');
    roomSwitchContext={...roomSwitchContext,roomId:key,stage:'submitted'};
    switchNotice(true,'已交由原生切房，等待回覆／重新載入。',key);
    try{if(id(room.nativeRoomId)!==key)throw Error('native room id mismatch');sender.changeSlotTable({roomId:room.nativeRoomId});}catch(_){switchNotice(false,'原生切房呼叫失敗；未自動重送。',key);pauseScan('原生切房呼叫失敗；背景查詢維持暫停。');}
  }

  function cancelAction(note){if(!pendingAction)return;pendingAction=null;controlFocus=false;send('queuedControl',{waiting:false,note});}
  function drainAction(){
    if(licenseBlocked){cancelAction('授權待驗證，取消待執行操作。');return;}
    if(!pendingAction)return;
    if(document.hidden||scan.failed>pendingAction.failed){cancelAction('查詢異常或頁面離開，已取消待執行操作；沒有自動重試。');return;}
    if(scan.pending||nativeQueries.size)return;
    const action=pendingAction;pendingAction=null;
    try{if(action.kind==='start')playSession.start(action.data);else if(action.kind==='switch')changeRoom(action.data);else if(action.kind==='roomCheck')changeRoom({...action.data,checkOnly:true});else controls.applyBet(action.data?.key);}
    finally{controlFocus=false;send('queuedControl',{waiting:false,note:''});controls.report();}
  }
  function queueAction(kind,data){
    if(roomSwitchPending){send('priorityNote','切房仍待回覆，未執行其他控制操作。');return;}
    if(pendingAction){send('queuedControl',{waiting:true,note:'已有操作等待回覆，請先完成或取消。'});return;}
    pendingAction={kind,data,failed:scan.failed};controlFocus=true;
    pauseScan('控制操作優先；等在途回覆後執行，再接續背景查詢。');send('queuedControl',{waiting:true,note:'等目前房間查詢回覆後執行；尚未開始新的投注。'});drainAction();
  }

  function pauseScan(note='已暫停，可繼續剩餘房間。'){
    if(pendingAction&&scan.failed>pendingAction.failed)cancelAction('房間查詢異常，已取消待執行操作。');
    scan.running=false;clearTimeout(nextScanTimer);nextScanTimer=null;scan.note=note;scanReport();
  }
  function querySender(){
    const sender1=window.App?.senderManager?.get?.('g1005',false);
    const candidates=sender1&&typeof sender1.getSlotTableDetail==='function'&&typeof sender1.send==='function'&&typeof sender1.setToken==='function'&&subscriptions.includes(sender1.service?._client?._io?.io)?[sender1]:[];
    if(candidates.length!==1)throw Error('賽特 II 查詢通道尚未就緒，等待遊戲載入。');
    const sender=candidates[0],socket=sender.service?._client?._io;
    if(!socket||socket.connected!==true)throw Error('遊戲連線尚未就緒或已中斷。');
    observeNativeQueries(sender);return sender;
  }
  function nextDetail(){
    if(licenseBlocked){pauseScan('授權待驗證，已暫停查詢。');return;}
    nextScanTimer=null;if(!scan.running||scan.pending)return;
    if(nativeQueryBusy()){pauseScan('選房介面或原生查詢使用中，稍後自動接續。');return;}
    if(controlFocus){pauseScan('等待控制操作完成後接續房間查詢。');return;}
    if((controls.scanBlocked()||playSession.isBusy())){pauseScan('自動旋轉進行中，房間補齊暫停。');return;}
    if(document.hidden){pauseScan('頁面已進入背景，查詢暫停；回到遊戲後自動接續。');return;}
    if(scan.priority&&!knownRooms.has(scan.priority))scan.priority=null;
    const priority=scan.priority&&knownRooms.has(scan.priority)?scan.priority:null;
    if(!priority&&scan.phase==='pages'){nextPage();return;}
    if(!scan.queue.length&&!priority){scan.running=false;scan.note='本輪補齊完成。各房間是不同時間的快照，過期資料不參與完整評分。';scanReport();return;}
    let sender;try{sender=querySender();}catch(e){pauseScan(e.message);return;}
    const roomId=priority||scan.queue[0],ticket={roomId,priority:!!priority,timeout:null};scan.pending=ticket;ownedRooms.add(roomId);
    scan.note='正在查詢 '+(knownRooms.get(roomId)?.number??roomId)+' 號房；同時只查一間。';scanReport();
    ticket.timeout=setTimeout(()=>expireRoomQuery(ticket),12000);
    try{
      sendHelper(sender,'getSlotTableDetail',{request:'getSlotTableDetail',roomId:Number(roomId)},raw=>{
        if(scan.pending!==ticket)return;
        clearTimeout(ticket.timeout);
        let ok=false,note='',payload=null;
        try{
          payload=decode(raw);
          if(!payload)throw Error('明細回覆解析失敗，已暫停。');if(payload.status!==200)throw Error('明細查詢未成功（狀態 '+String(payload.status)+'），已暫停。');
          // Preserve native session rotation, but do not update the game's room model or dispatch its detail UI event.
          sender.setToken(payload);
          const data=payload.data;
          if(!data||id(data.roomId)!==roomId||!data.detail||!Array.isArray(data.detail.mgCounts)||data.detail.mgCounts.length<11||!data.detail.mgCounts.slice(0,11).every(v=>Number.isInteger(v)&&v>=0))throw Error('明細房間或歷史格式不符，已暫停。');
          consume('ACK',payload,true,day30Profile(sender.service?._client?._io?.io));ok=true;
        }catch(e){note=e.message||'明細解析失敗，已暫停。';}
        ownedRooms.delete(roomId);scan.pending=null;
        if(ok){const index=scan.queue.indexOf(roomId);if(index>=0){scan.queue.splice(index,1);scan.done++;}if(scan.priority===roomId)scan.priority=null;if(scan.running)scan.note='已收到明細，等待下一間。';}
        else queryFailure(ticket,payload,note);
        if(!scan.queue.length&&ok&&scan.phase!=='pages'&&!scan.priority){scan.running=false;scan.note='本輪補齊完成。';}
        scanReport();controls.report();drainAction();maybeContinueRooms();
        if(scan.running)nextScanTimer=setTimeout(nextDetail,scan.interval);
      });
    }catch(_){clearTimeout(ticket.timeout);ownedRooms.delete(roomId);scan.pending=null;scan.failed++;pauseScan('查詢通道執行失敗，已暫停。');}
  }
  function startScan(data){
    if(nativeQueryBusy()){pauseScan('選房介面或原生查詢使用中，稍後自動接續。');return;}
    if(controlFocus){pauseScan('等待控制操作完成後接續房間查詢。');return;}
    if((controls.scanBlocked()||playSession.isBusy())){pauseScan('請先停止自動旋轉，再補齊房間資料。');return;}
    if(scan.pending||scan.running){scan.note='已有查詢進行中；可先暫停，再等待目前回覆。';scanReport();return;}
    if(document.hidden){pauseScan('請回到遊戲頁面後開始。');return;}
    if(!subscriptions.length)start();
    try{querySender();}catch(e){pauseScan(e.message);return;}
    scan.conflictRetries.clear();scan.lastError=null;scan.settings={...data};scan.interval=roomQueryDelay();
    scan.phase='pages';scan.pageQueue=[1];scan.pagesDone=0;scan.pagesTotal=0;scan.expectedRooms=null;scan.perPage=null;scan.pagesComplete=false;scan.pageIds=new Set();
    scan.queue=[];scan.total=0;scan.done=0;scan.skipped=0;scan.failed=0;
    scan.running=true;scan.note='自動取得清單第一頁與總頁數。';scanReport();nextDetail();
  }
  function prepareDetails(data,run=true){
    scan.phase='details';
    const scope=data?.scope==='empty'?'empty':'all';
    const maxAge=Number.isFinite(data?.maxAge)?Math.max(30,Math.min(86400,data.maxAge)):300;
    scan.interval=roomQueryDelay();
    const limit=Math.min(powerSaving?25:(data?.mode==='probe'?3:data?.mode==='batch'?50:5000),Number.isSafeInteger(data?.roomLimit)?Math.max(0,data.roomLimit):5000);
    const editionRooms=Array.isArray(data?.roomIds)?new Set(data.roomIds):null;
    const pool=[...knownRooms.values()].filter(r=>(!editionRooms||editionRooms.has(r.roomId))&&(scope==='all'||(r.status==='Empty'&&!r.entryFailure))).sort((a,b)=>(a.number??Infinity)-(b.number??Infinity));
    const needed=pool.filter(r=>!detailTimes.has(r.roomId)||Date.now()-detailTimes.get(r.roomId)>maxAge*1000);
    clearTimeout(nextScanTimer);scan.queue=needed.slice(0,limit).map(r=>r.roomId);scan.total=scan.queue.length;scan.done=0;scan.failed=0;scan.skipped=pool.length-needed.length;
    if(!pool.length){scan.running=false;scan.note='清單已取得，目前沒有符合範圍的房間。';scanReport();return;}
    scan.running=run&&scan.queue.length>0;scan.note='開始逐間補齊，已略過有效期內的快照。';scanReport();if(scan.running)nextDetail();
  }
  function resumeScan(){
    if(nativeQueryBusy()){pauseScan('選房介面或原生查詢使用中，稍後自動接續。');return;}
    if(controlFocus){pauseScan('等待控制操作完成後接續房間查詢。');return;}
    if((controls.scanBlocked()||playSession.isBusy())){pauseScan('請先停止自動旋轉，再繼續補齊。');return;}
    if(scan.running)return;
    if(scan.pending){scan.note='上一筆尚未回覆，暫時無法繼續。若一直沒有回覆，請重新載入頁面。';scanReport();return;}
    if(!scan.priority&&!(scan.phase==='pages'?scan.pageQueue.length:scan.queue.length)){pauseScan('沒有待查房間，請建立新一輪補齊。');return;}
    scan.running=true;nextDetail();
  }
  // Lists and details share scan.pending: no overlapping helper queries or UI dispatch.
  function nextPage(){
    const page=scan.pageQueue[0];
    if(!Number.isSafeInteger(page)||page<1){scan.failed++;pauseScan('分頁佇列異常，已暫停。');return;}
    let sender;try{sender=querySender();}catch(e){pauseScan(e.message);return;}
    const ticket={kind:'page',page,timeout:null};scan.pending=ticket;
    scan.note='背景讀取房間清單第 '+page+' 頁'+(scan.pagesTotal?'／'+scan.pagesTotal:'；等待總頁數');scanReport();
    ticket.timeout=setTimeout(()=>expireRoomQuery(ticket),12000);
    try{
      sendHelper(sender,'getSlotTables',{request:'getSlotTables',page},raw=>{
        if(scan.pending!==ticket)return;
        clearTimeout(ticket.timeout);
        let ok=false,payload=null;
        try{
          payload=decode(raw);
          if(!payload)throw Error('清單回覆解析失敗，已暫停。');if(payload.status!==200)throw Error('清單查詢未成功（狀態 '+String(payload.status)+'），已暫停。');
          sender.setToken(payload);
          const data=payload.data,meta=data?.tableMeta,rows=data?.tables;
          if(!Array.isArray(rows)||!meta||meta.currentPage!==page||!Number.isSafeInteger(meta.totalPages)||meta.totalPages<1||meta.totalPages>100||!Number.isSafeInteger(meta.tablePerPage)||meta.tablePerPage<1||meta.tablePerPage>5000||!Number.isSafeInteger(meta.totalTableCount)||meta.totalTableCount<0||meta.totalTableCount>5000||Math.max(1,Math.ceil(meta.totalTableCount/meta.tablePerPage))!==meta.totalPages)throw Error('清單分頁資訊缺少、格式不符或超過處理範圍，已暫停。');
          if(page===1){
            scan.pagesTotal=meta.totalPages;scan.expectedRooms=meta.totalTableCount;scan.perPage=meta.tablePerPage;
            scan.pageQueue=Array.from({length:meta.totalPages},(_,i)=>i+1);
          }else if(meta.totalPages!==scan.pagesTotal||meta.totalTableCount!==scan.expectedRooms||meta.tablePerPage!==scan.perPage)throw Error('查詢期間分頁總量改變，請重試清單。');
          const expected=Math.min(scan.perPage,Math.max(0,scan.expectedRooms-(page-1)*scan.perPage));
          const ids=rows.map(row=>id(row?.roomId));
          if(rows.length!==expected||ids.some(x=>x===null)||new Set(ids).size!==ids.length||ids.some(x=>scan.pageIds.has(x)))throw Error('清單筆數或房間識別重複／不符，請重試清單。');
          // Never call getSlotTablePage: its native callback changes the game's UI model.
          consume('ACK',payload,true,day30Profile(sender.service?._client?._io?.io));
          for(const value of ids)scan.pageIds.add(value);
          scan.pageQueue.shift();scan.pagesDone++;ok=true;
          if(!scan.pageQueue.length){
            if(scan.pageIds.size!==scan.expectedRooms)throw Error('清單房間總數尚未完整，請重試。');
            scan.pagesComplete=true;
            for(const key of knownRooms.keys())if(!scan.pageIds.has(key))knownRooms.delete(key);
            send('roomSet',[...scan.pageIds]);
          }
        }catch(e){ok=false;queryFailure(ticket,payload,e.message||'清單解析失敗，已暫停。');}
        scan.pending=null;
        if(ok&&scan.pagesComplete){
          const continuing=scan.running,reason=scan.note;
          prepareDetails(scan.settings,false);
          scan.running=continuing&&scan.queue.length>0;
          if(!continuing)scan.note=reason;
          else scan.note=scan.queue.length?'清單已完整取得，接著補齊房間明細。':'清單已完整取得；明細均在有效期內。';
        }else if(ok&&scan.running)scan.note='清單第 '+page+' 頁已收到，等待下一頁。';
        scanReport();controls.report();drainAction();maybeContinueRooms();
        if(scan.running)nextScanTimer=setTimeout(nextDetail,scan.phase==='pages'?1000:scan.interval);
      });
    }catch(_){clearTimeout(ticket.timeout);scan.pending=null;scan.failed++;pauseScan('清單查詢通道執行失敗，已暫停。');}
  }

  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAction('頁面已離開，取消待執行操作。');if(document.hidden&&scan.running)pauseScan('頁面進入背景，已暫停。回到遊戲後自動接續。');});

  // BEGIN SETH CONTROLS
  // Native event names and data access are taken from the supplied g1005 GameLogic/GameView.
  // Only loaded SystemJS exports are read. No module is imported and no spin packet is built.
  function createSethControls(publish, beforeAuto, queryPending){
    let modules=null, lastLookup=0, timer=null, factor=1, note='等待遊戲控制入口。', owned=null;
    const patches=[], channels=new Set();
    let generation={factor:1}, gsapLease=null;
    let engineTime={mode:'單次引擎更新＋同步GSAP',frames:0,inputDt:null,scaledDt:null};
    const finite=v=>typeof v==='number'&&Number.isFinite(v);
    function lookup(refresh=false){
      if(!refresh&&modules&&Date.now()-lastLookup<2000)return modules;
      const entries=[];try{if(typeof window.System?.entries==='function')for(const x of window.System.entries()){entries.push(x);if(entries.length>=6000)break;}}catch(_){}
      const get=name=>{
        const keys=[name,'chunks:///_virtual/'+name];
        try{if(typeof window.System?.resolve==='function')keys.push(window.System.resolve(name));}catch(_){}
        for(const k of keys){try{const m=window.System?.get?.(k);if(m)return m;}catch(_){}}
        const found=entries.filter(([k])=>typeof k==='string'&&(k.endsWith('/'+name)||k===name));
        return found.length===1?found[0][1]:null;
      };
      const enums=[];for(const [,v] of entries){if(v?.ESpinStatus&&v.ESpinStatus.IDLE!==undefined)enums.push(v.ESpinStatus);}
      const type=get('type2.ts')?.ESpinStatus||get('types.ts')?.ESpinStatus;
      modules={auto:get('AutoPlayModel.ts')?.default, events:get('SlotFrameworkEvent.ts')?.SlotFrameworkEvent,
        platform:get('PlatformModel.ts')?.default, stake:get('StakeModel.ts')?.default, definition:get('DefinitionModel.ts')?.default, slot:get('SlotFrameworkData.ts')?.default,
        replay:get('ReplayModel.ts')?.default, spinEnum:type||([...new Set(enums)].length===1?enums[0]:null),
        cc:get('cc')||window.cc||window.cclegacy,
        time:get('TimeManager.ts')?.TimeManager};
      lastLookup=Date.now();return modules;
    }
    function modelData(type){
      if(!type)return null;
      // false is SingletonT.get's do-not-create argument in the supplied source.
      const model=typeof type.getData==='function'?type:window.App?.dataCenter?.get?.(type,false);
      return typeof model?.getData==='function'?model.getData():null;
    }
    function detect(){
      const m=lookup(), a=window.App;
      let view=null, slot=null, platform=null, error=null, connected=false, onlyGame=false;
      const uiGate={className:null,viewActive:false,nativeResult:null,attachedViews:[]};
      try{
        view=a?.entryManager?.getEntry?.('g1005')?.gameView;
        slot=modelData(m.slot);platform=modelData(m.platform);
        const sender=a?.senderManager?.get?.('g1005',false);
        connected=sender?.service?._client?._io?.connected===true;
        // UIManager._addComponent assigns this exact map key to view.className.
        // IsOnlyGameViewOpen expects that view key, never the resource bundle g1005.
        const className=typeof view?.className==='string'&&view.className?view.className:null;
        uiGate.className=className;uiGate.viewActive=view?.node?.activeInHierarchy===true;
        if(className&&typeof a?.uiManager?.IsOnlyGameViewOpen==='function')uiGate.nativeResult=a.uiManager.IsOnlyGameViewOpen(className);
        const map=a?.uiManager?._viewDatas;
        if(map&&typeof map.entries==='function')for(const [key,entry] of map.entries()){
          if(entry?.node?.parent&&uiGate.attachedViews.length<20)uiGate.attachedViews.push(String(key).slice(0,100));
        }
        onlyGame=!!view&&view.bundle==='g1005'&&uiGate.viewActive&&uiGate.nativeResult===true;
      }catch(_){error='原生控制狀態讀取失敗。';}
      const auto=m.auto, active=typeof auto?.active==='boolean'?auto.active:null;
      const nativeCounts=platform?.player?.settings?.autoPlay?.numberOfPlays;
      const counts=Array.isArray(nativeCounts)?nativeCounts.filter(v=>Number.isSafeInteger(v)&&(v>0||v===-1)):[];
      const idle=slot&&m.spinEnum&&slot.spinStatus===m.spinEnum.IDLE;
      let reason=error;
      if(!reason&&(!view||view.bundle!=='g1005'||window.System?.get?.('chunks:///_virtual/GameData.ts')?.default?.module!=='g1005'))reason='尚未找到已核對的賽特 g1005 遊戲畫面；其他版本暫不套用控制。';
      if(!reason&&(!auto||active===null||!m.events||m.events.SELECT_AUTO_SPIN_COUNT===undefined||m.events.STOP_AUTO_SPIN===undefined||typeof window.dispatch!=='function'))reason='原生自動旋轉事件或狀態尚未載入。';
      if(!reason&&(!counts.length||!slot||!m.spinEnum||typeof m.replay?.isReplay!=='boolean'))reason='等待原生次數、旋轉狀態與回放狀態。';
      if(!reason&&m.replay.isReplay)reason='目前為回放，無法開啟自動旋轉。';
      if(!reason&&!connected)reason='遊戲連線尚未就緒。';
      if(!reason&&!uiGate.className)reason='尚未取得原生遊戲畫面className，請等載入完成後重新偵測。';
      if(!reason&&!onlyGame)reason='原生畫面檢查未通過；請關閉機台列表／彈窗並進入遊戲畫面，詳見uiGate。';
      if(!reason&&active)reason='原生自動旋轉進行中。';
      if(!reason&&!idle)reason='等待目前旋轉或免費流程結束。';
      if(!reason&&queryPending())reason='等待在途房間明細回覆，收到後可開始。';
      if(!reason&&document.hidden)reason='請回到遊戲前景後開始。';
      if(!reason&&betFault)reason=betFault;
      if(owned&&owned.auto.active===false)owned=null;
      return {m,view,auto,active,counts,nativeCounts,reason,uiGate,ready:!reason,
        canStop:!!view&&view.bundle==='g1005'&&active===true&&m.events?.STOP_AUTO_SPIN!==undefined&&typeof window.dispatch==='function'};
    }
    function restoreSpeed(){
      // Disable old wrappers even if a foreign extension has since wrapped our function.
      generation.factor=1;generation.requested=1;
      for(const p of patches.splice(0).reverse())try{
        if(p.obj[p.key]===p.wrapper){if(p.descriptor)Object.defineProperty(p.obj,p.key,p.descriptor);else delete p.obj[p.key];}
      }catch(_){}
      if(gsapLease){try{if(gsapLease.timeline.timeScale()===gsapLease.applied)gsapLease.timeline.timeScale(gsapLease.base);}catch(_){}gsapLease=null;}
      channels.clear();factor=1;
    }
    function wrap(obj,key,label,group){
      if(!obj||typeof obj[key]!=='function')return false;
      const original=obj[key],descriptor=Object.getOwnPropertyDescriptor(obj,key),gen=generation;
      function syncGsap(rate){if(gsapLease)try{const next=gsapLease.base*rate;if(Math.abs(gsapLease.applied-next)>0.001){gsapLease.timeline.timeScale(next);gsapLease.applied=next;}}catch(_){} }
      const wrapper=function(...args){
        const raw=args[0];if(group.depth||!finite(raw)||raw<0)return Reflect.apply(original,this,args);
        group.depth++;
        try{
          const requested=gen.requested||1,foreground=!document.hidden,effectiveRequest=powerSaving?Math.min(requested,10):requested;
          // One native tick/render per real frame. Do not slow the clock because effects cost CPU.
          // Retain a bounded accelerated timestep; never reduce native unaccelerated progress.
          const scaled=foreground&&requested>1&&raw>0?Math.max(raw,Math.min(raw*effectiveRequest,powerSaving?0.2:0.5)):raw;
          const rate=raw>0?scaled/raw:foreground?requested:1;
          gen.factor=rate;syncGsap(rate);args[0]=scaled;
          engineTime={...engineTime,frames:engineTime.frames+1,inputDt:raw,scaledDt:scaled,substeps:1,limited:foreground&&raw>0&&rate<requested-1e-8,
            reason:!foreground?'背景不放大時間':powerSaving&&requested>10?'手機省電保護：實際最多10×':rate<requested-1e-8?'單幀步長保護':'固定倍率同步',maxStep:powerSaving?0.2:0.5,powerSaving};
          return Reflect.apply(original,this,args);
        }catch(error){gen.requested=1;gen.factor=1;syncGsap(1);note='引擎呼叫異常，已退出加速；請以遊戲狀態為準。';throw error;}
        finally{group.depth--;}
      };
      try{
        if(descriptor&&(!('value' in descriptor)||(!descriptor.configurable&&!descriptor.writable)))return false;
        Object.defineProperty(obj,key,descriptor?{...descriptor,value:wrapper}:{configurable:true,writable:true,value:wrapper});
        patches.push({obj,key,descriptor,wrapper});channels.add(label);return true;
      }catch(_){return false;}
    }
    function speed(value){
      if(!Number.isInteger(value)||value<1||value>100){note='引擎倍率必須是1～100的整數。';return report();}
      restoreSpeed();
      if(value===1){note='引擎與GSAP已恢復原速。';return report();}
      const d=detect(),cc=d.m.cc,director=cc?.director||cc?.cclegacy?.director;
      if(!d.view||d.view.bundle!=='g1005'||d.m.replay?.isReplay!==false){note='未找到已核對的賽特執行環境，未套用倍速。';return report();}
      const nativeTime=d.m.time?._instance;
      if(finite(nativeTime?._timeScale)&&nativeTime._timeScale!==1){note='遊戲整體時間倍率不是1；請先還原，避免重複加速。';return report();}
      if(typeof director?.tick!=='function'){note='尚未找到Cocos引擎tick，保持原速。';return report();}
      generation={factor:value,requested:value};engineTime={mode:'單次引擎更新＋同步GSAP',frames:0,inputDt:null,scaledDt:null};
      if(!wrap(director,'tick','Cocos引擎時間（消除／掉落／引擎計時）',{depth:0})){restoreSpeed();note='無法接管引擎tick，保持原速。';return report();}
      const gs=window.gsap?.globalTimeline;
      if(typeof gs?.timeScale==='function')try{
        const base=gs.timeScale();if(finite(base)&&base>0){gs.timeScale(base*value);gsapLease={timeline:gs,base,applied:base*value};channels.add('轉輪與獨立GSAP');}
      }catch(_){}
      // Do not also patch Tween/Animation/Spine clocks: they already receive scaled engine dt.
      factor=value;note=`設定 ${value}×；消除、掉落與轉輪同步；單幀時間過大時保留步長保護。`;
      return report();
    }
    function stopAuto(onlyOwned=false){
      let auto,events;
      if(onlyOwned){auto=owned?.auto;events=owned?.events;}
      else{const d=detect();if(!d.canStop){note='目前沒有可停止的原生自動旋轉。';return report();}auto=d.auto;events=d.m.events;}
      if(auto?.active===true&&events?.STOP_AUTO_SPIN!==undefined&&typeof window.dispatch==='function'){
        try{window.dispatch(events.STOP_AUTO_SPIN);owned=null;note='已呼叫原生停止；進行中的旋轉依遊戲流程結算。';}
        catch(_){note='原生停止呼叫失敗，請使用遊戲停止按鈕。';}
      }
      return onlyOwned?null:report();
    }
    function startAuto(count){
      beforeAuto();const d=detect();
      if(!d.ready){note=d.reason;return report();}
      const index=d.nativeCounts.indexOf(count);
      if(index<0||!d.counts.includes(count)){note='此次數不在原生可選清單內。';return report();}
      // Same event and index as GameLogic.SELECT_AUTO_SPIN_COUNT; native flow handles bets.
      try{
        window.dispatch(d.m.events.SELECT_AUTO_SPIN_COUNT,{data:index});
        if(d.auto.active===true){owned={auto:d.auto,events:d.m.events,view:d.view};note='已開啟原生自動旋轉，沿用遊戲目前投注。';}
        else note='已送出原生開始事件，但尚未確認啟用；沒有重送。';
      }catch(_){note='原生開始呼叫失敗；請複製診斷資料。';}
      return report();
    }
    let betFault=null;
    function betChoices(){
      const model=lookup().stake,result={available:false,status:'等待原生下注組合。',total:null,stakeIndex:null,ratioIndex:null,selected:null,options:[]};
      if(!model)return result;
      try{
        result.total=finite(model.totalStake)&&model.totalStake>=0?model.totalStake:null;
        result.stakeIndex=Number.isSafeInteger(model.stakeIndex)?model.stakeIndex:null;
        result.ratioIndex=Number.isSafeInteger(model.ratioIndex)?model.ratioIndex:null;
        const stakes=model.stakeList,ratios=model.ratioList,map=model.totalStakeMap;
        if(!Array.isArray(stakes)||!Array.isArray(ratios)||typeof map?.entries!=='function'){result.status='原生下注清單格式尚未核對。';return result;}
        const seen=new Set();let count=0;
        for(const [,vo] of map.entries()){
          if(count++>=2000)break;
          const si=vo?.stakeIndex,ri=vo?.ratioIndex;
          if(!Number.isSafeInteger(si)||!Number.isSafeInteger(ri)||si<0||ri<0||!finite(stakes[si])||stakes[si]<=0||!finite(ratios[ri])||ratios[ri]<=0)continue;
          const key=si+':'+ri;if(seen.has(key))continue;seen.add(key);
          result.options.push({key,stakeIndex:si,ratioIndex:ri,stakeValue:stakes[si],ratioValue:ratios[ri]});
          if(si===result.stakeIndex&&ri===result.ratioIndex)result.selected=key;
          if(result.options.length>=500)break;
        }
        // Native updateStake formula supplied by user: round(stake*ratio*lines*extra*10)/10.
        // Only label amounts after the same formula reproduces the current native total.
        const defs=modelData(lookup().definition);
        const lines=Array.isArray(defs?.winlineDefs)?defs.winlineDefs.length:null;
        const extra=model.data?.extraStakeTimes;
        const cost=(stake,ratio)=>Math.round(stake*ratio*lines*extra*10)/10;
        result.amountsVerified=Number.isSafeInteger(lines)&&lines>0&&finite(extra)&&extra>0&&finite(model.stakeValue)&&finite(model.ratioValue)&&result.total!==null&&Math.abs(cost(model.stakeValue,model.ratioValue)-result.total)<1e-8;
        for(const option of result.options){const amount=result.amountsVerified?cost(option.stakeValue,option.ratioValue):null;option.amount=finite(amount)&&amount>0?amount:null;}
        if(result.amountsVerified){
          const unique=new Map();
          for(const option of result.options){if(option.amount===null)continue;const saved=unique.get(option.amount);if(!saved||option.key===result.selected)unique.set(option.amount,option);}
          result.options=[...unique.values()].sort((a,b)=>a.amount-b.amount);
        }
        result.available=!!result.options.length&&typeof model.updateStake==='function'&&typeof model.getStakeVO==='function'&&lookup().events?.UPDATE_STAKE!==undefined;
        result.status=betFault?'注額核對失敗，請重新整理遊戲。':result.available?result.amountsVerified?'依總投注額由小到大排列；只列遊戲支援的金額。':'總投注額對照尚未核對，暫不開放套用。':'原生調注方法、組合或更新事件尚未就緒。';
        return result;
      }catch(_){result.status='讀取原生注額失敗，未修改設定。';return result;}
    }
    function applyBet(key){
      const d=detect(),choices=betChoices(),model=d.m.stake;
      if(!d.ready||betFault){note=betFault||d.reason;return report();}
      if(!choices.available){note=choices.status;return report();}
      const option=choices.options.find(x=>x.key===key);
      const previous=choices.options.find(x=>x.key===choices.selected);
      if(!option||!previous||choices.total===null||!finite(option.amount)||option.amount<=0){note='下注組合或目前注額無法核對，未修改。';return report();}
      const indices=x=>({stakeIndex:x.stakeIndex,ratioIndex:x.ratioIndex});
      const check=x=>model.stakeIndex===x.stakeIndex&&model.ratioIndex===x.ratioIndex&&model.stakeValue===x.stakeValue&&model.ratioValue===x.ratioValue&&finite(model.totalStake)&&model.totalStake>0;
      try{
        // Confirmed native signature supplied by the user. Never assign totalStake alone.
        model.updateStake(indices(option));
        const vo=model.getStakeVO(indices(option));
        if(!vo||vo.stakeIndex!==option.stakeIndex||vo.ratioIndex!==option.ratioIndex||!check(option)||Math.abs(model.totalStake-option.amount)>1e-8)throw Error('native verification failed');
        window.dispatch(d.m.events.UPDATE_STAKE);
        if(!check(option))throw Error('notification changed stake');
        note='已套用原生下注組合；目前總注額 '+model.totalStake+'。未開始旋轉。';
      }catch(_){
        let restored=false;
        try{model.updateStake(indices(previous));model.getStakeVO(indices(previous));window.dispatch(d.m.events.UPDATE_STAKE);restored=check(previous)&&Math.abs(model.totalStake-choices.total)<1e-8;}catch(_){}
        if(restored)note='套用核對失敗，已還原原注額。未開始旋轉。';
        else{betFault='注額套用與還原無法確認；請重新整理遊戲後再操作。';note=betFault;}
      }
      return report();
    }

    function betSettings(){
      const model=lookup().stake;
      if(!model)return {modelFound:false,status:'下注模型尚未載入；未開放調注'};
      try{
        const members=[];const seen=new Set();
        for(const target of [model,model.prototype,Object.getPrototypeOf(model)]){
          if(!target)continue;
          for(const [name,d] of Object.entries(Object.getOwnPropertyDescriptors(target))){
            if(!/stake|ratio|bet|select|set|change|update|plus|minus|init/i.test(name)||seen.has(name)||members.length>=60)continue;
            seen.add(name);members.push({name,method:typeof d.value==='function',getter:typeof d.get==='function',setter:typeof d.set==='function'});
          }
        }
        return {modelFound:true,status:'只讀入口診斷；調注方法待核對，尚未開放套用',stakeIndex:Number.isSafeInteger(model.stakeIndex)?model.stakeIndex:null,stakeValue:finite(model.stakeValue)?model.stakeValue:null,ratioIndex:Number.isSafeInteger(model.ratioIndex)?model.ratioIndex:null,ratioValue:finite(model.ratioValue)?model.ratioValue:null,members};
      }catch(_){return {modelFound:true,status:'下注入口讀取失敗；未修改注額'};}
    }
    function report(){
      try{
        const d=detect();
        if(d.active===true)beforeAuto();
        // Navigating out of the verified game invalidates the animation hooks.
        if(factor!==1&&(!d.view||d.view.bundle!=='g1005'||d.m.replay?.isReplay!==false)){restoreSpeed();note='已離開已核對的遊戲環境，動畫恢復原速。';}
        if(owned&&owned.view!==d.view)stopAuto(true);
        const missing=['Cocos引擎時間（消除／掉落／引擎計時）','轉輪與獨立GSAP'].filter(x=>!channels.has(x));
        const data={note,ready:d.ready,reason:d.reason,uiGate:d.uiGate,canStop:d.canStop,active:d.active,
          owned:!!owned,betSettings:{...betSettings(),...betChoices()},remaining:Number.isSafeInteger(d.auto?.spinsRemaining)?d.auto.spinsRemaining:null,
          counts:d.counts,factor,effectiveFactor:engineTime.inputDt>0?engineTime.scaledDt/engineTime.inputDt:1,engineTime,channels:[...channels],missing,
          speedAvailable:!!d.view&&d.view.bundle==='g1005'&&typeof (d.m.cc?.director||d.m.cc?.cclegacy?.director)?.tick==='function'&&d.m.replay?.isReplay===false,
          detected:{gameView:!!d.view,bundle:d.view?.bundle==='g1005'?'g1005':null,events:!!d.m.events,autoModel:!!d.auto,spinEnum:!!d.m.spinEnum,slotData:!!d.m.slot,cc:!!d.m.cc,gsap:!!window.gsap?.globalTimeline},
          scope:'同一實際倍率推進Cocos引擎與獨立GSAP時間線；引擎內動畫、消除、掉落、scheduler計時與原生自動旋轉間隔一起加速。瀏覽器時鐘、音效及伺服器回覆不變；引擎外等待不保證加速。'};
        publish(data);return data;
      }catch(_){const data={note:'控制偵測失敗，請按重新偵測並複製診斷。',ready:false,canStop:false,active:null,owned:false,counts:[],factor,channels:[],missing:[],speedAvailable:false};publish(data);return data;}
    }
    function run(){if(timer===null)timer=setInterval(report,1200);report();}
    function halt(){stopAuto(true);restoreSpeed();clearInterval(timer);timer=null;note='助手控制已停止，動畫已還原。';report();}
    function scanBlocked(){try{return detect().active===true;}catch(_){return true;}}
    return {run,halt,report,speed,startAuto,stopAuto,applyBet,scanBlocked,recheck(){lookup(true);run();}};
  }
  // END SETH CONTROLS

  function compareValue(op,a,b,epsilon=0){if(op==='ge')return a>=b-epsilon;if(op==='le')return a<=b+epsilon;if(op==='gt')return a>b+epsilon;if(op==='lt')return a<b-epsilon;return op==='eq'&&Math.abs(a-b)<=epsilon;}

  // BEGIN BOARD RULES
  function createBoardWatcher(publish,stopAuto){
    const names={1:'眼睛',2:'蛇',3:'弓箭',4:'彎刀',5:'黃寶石',6:'紅寶石',7:'紫寶石',8:'藍寶石',9:'綠寶石',10:'綠倍數',11:'藍倍數',12:'紫倍數',13:'紅倍數',14:'JP',15:'甲蟲',16:'金色甲蟲',17:'男性圖騰',18:'女性圖騰'};
    const enums=['EYE','SNAKE','BOW','MACHETE','ORANGE_GEM','RED_GEM','PURPLE_GEM','BLUE_GEM','GREEN_GEM','T1','T2','T3','T4','JACKPOT','SCATTER','GOLD_SCATTER','MEN_TOTEM','WOMEN_TOTEM'];
    let model=null,lease=null,timer=null,patches=[],ready=false,last=null,lastHit=null,note='等待賽特 II 盤面資料。',errors=0;
    let modules=null,lookupAt=0;
    let config={enabled:false,join:'any',includeCascades:false,includeFree:false,rules:[]};
    const seen=new Set(),history=[];
    function loadedModules(){
      if(modules&&Date.now()-lookupAt<5000)return modules;
      const system=window.System,names=['GameData.ts','ReplayModel.ts','GameSymbolID.ts','AutoPlayModel.ts'];
      const found=new Map();
      for(const name of names)for(const key of [name,'chunks:///_virtual/'+name]){
        try{const value=system?.get?.(key);if(value){found.set(name,value);break;}}catch(_){}
      }
      const missing=new Set(names.filter(name=>!found.has(name))),candidates=new Map();
      if(missing.size)try{
        let checked=0;
        for(const [key,value] of system?.entries?.()||[]){
          if(++checked>6000)break;
          const name=typeof key==='string'?key.slice(key.lastIndexOf('/')+1):null;
          if(!value||!missing.has(name)||name==='GameData.ts'&&value.default?.module!=='g1005')continue;
          if(!candidates.has(name))candidates.set(name,new Set());
          candidates.get(name).add(value);
        }
        for(const [name,values] of candidates)if(values.size===1)found.set(name,values.values().next().value);
      }catch(_){}
      modules={type:found.get('GameData.ts')?.default,replay:found.get('ReplayModel.ts')?.default,
        ids:found.get('GameSymbolID.ts')?.EBackendSymbolID,auto:found.get('AutoPlayModel.ts')?.default};
      lookupAt=Date.now();return modules;
    }
    function context(){
      const app=window.App,view=app?.entryManager?.getEntry?.('g1005')?.gameView;
      if(view?.bundle!=='g1005'||view.node?.activeInHierarchy!==true)return {note:'等待賽特 II 遊戲畫面。'};
      const {type,replay,ids,auto}=loadedModules();
      if(replay?.isReplay!==false)return {note:replay?.isReplay===true?'重播中，等待返回遊戲。':'等待確認遊戲的重播狀態。'};
      if(!ids||!enums.every((name,index)=>ids[name]===index+1))return {note:'等待賽特 II 的 18 種原生符號表。'};
      if(type?.module!=='g1005')return {note:'等待載入賽特 II 盤面模組。'};
      // The read-only diagnostic confirmed that GameData._ins holds the active board.
      const current=type._ins;
      if(!current)return {note:'已找到盤面模組，等待遊戲建立盤面。'};
      const active=auto?.active??auto?.data?.active;
      return {current,active};
    }
    function snapshot(source){
      const d=model?.data,state=d?.gameState;
      if(!state||!Array.isArray(state.view))return null;
      const flat=state.view.flat(2);
      if(flat.length!==30||!flat.every(v=>Number.isSafeInteger(v)&&v>=1&&v<=18))return null;
      const counts={};for(let id=1;id<=18;id++)counts[id]=0;for(const id of flat)counts[id]++;
      const spinId=(typeof d.spinId==='string'&&d.spinId.length>0&&d.spinId.length<=100)||(typeof d.spinId==='number'&&Number.isSafeInteger(d.spinId))?String(d.spinId):null;
      const index=Number.isSafeInteger(model.currSpinIndex)&&model.currSpinIndex>=0?model.currSpinIndex:null;
      return {receivedAt:new Date().toISOString(),spinId,index,action:['spin','freeSpin','superSpin'].includes(state.action)?state.action:'unknown',source,counts,total:30,rows:5,columns:6,cells:flat.slice()};
    }
    function report(){const result={ready,enabled:config.enabled,config:{...config,rules:config.rules.map(x=>({...x}))},names,last,lastHit,history:history.slice(),note,errors,source:'原生解析盤面，動畫可能尚未呈現；不是下一轉預測。'};publish(result);return result;}
    function observe(source,evaluate=false,ctx=context()){
      if(!ctx.current||ctx.current!==model){
        ready=false;config.enabled=false;last=null;note=ctx.note||'遊戲盤面已更換，等待重新讀取。';
        return report();
      }
      const board=snapshot(source);
      if(!board){
        ready=false;config.enabled=false;last=null;
        note='等待遊戲提供完整 30 格盤面。';
        return report();
      }
      if(source!=='snapshot'||!last||last.spinId!==board.spinId||last.index!==board.index||
        last.action!==board.action||board.cells.some((value,index)=>value!==last.cells[index]))last=board;
      ready=patches.length===2&&typeof ctx.active==='boolean';
      if(!ready)config.enabled=false;
      if(!evaluate||!config.enabled){
        if(!config.enabled&&!lastHit)note=ready?'已讀取遊戲盤面。':'已讀取遊戲盤面；停止規則入口尚未就緒。';
        return report();
      }
      if(board.spinId===null||board.index===null||board.action==='unknown'){config.enabled=false;note='缺少局號、盤面序號或流程代碼；規則已解除。';return report();}
      if(!config.includeCascades&&source!=='newSpin')return report();
      if(!config.includeFree&&board.action!=='spin')return report();
      const key=board.spinId+'/'+board.index+'/'+board.action;if(seen.has(key))return report();
      seen.add(key);if(seen.size>256)seen.delete(seen.values().next().value);
      const matched=config.rules.filter(rule=>compareValue(rule.op,board.counts[rule.symbol],rule.count));
      const hit=config.join==='all'?matched.length===config.rules.length:matched.length>0;
      if(!hit){note='規則監看中；本盤 '+matched.length+'/'+config.rules.length+' 條成立（'+(config.join==='all'?'並且':'或')+'）。';return report();}
      // One shot; disarm before native dispatch, including reentrant/early-flow events.
      config.enabled=false;
      let stop='當時未開啟原生自動旋轉。';
      if(ctx.active===true){
        try{const state=stopAuto();stop=state?.active===false?'原生自動旋轉已停止；在途流程仍依遊戲結算。':'已請求原生停止，但尚未確認；請查看遊戲停止按鈕。';}
        catch(_){stop='停止呼叫失敗，請使用遊戲停止按鈕。';errors++;}
      }
      const messages=[];
      lastHit={join:config.join,time:board.receivedAt,spinId:board.spinId,index:board.index,matched:matched.map(rule=>({...rule,name:names[rule.symbol],actual:board.counts[rule.symbol]})),stop,messages};
      history.unshift(lastHit);if(history.length>20)history.pop();note='自訂條件命中，已解除規則。'+stop;return report();
    }
    function unhook(){
      if(lease)lease.active=false;
      for(const p of patches.splice(0).reverse())try{
        if(p.object[p.key]===p.wrapper){
          if(p.descriptor)Object.defineProperty(p.object,p.key,p.descriptor);
          else delete p.object[p.key];
        }
      }catch(_){}
      lease=null;
    }
    function install(){
      const ctx=context(),current=ctx.current;
      if(current!==model){
        unhook();config.enabled=false;seen.clear();last=null;lastHit=null;model=current??null;
      }
      if(!current)return observe('snapshot',false,ctx);
      if(!lease&&typeof ctx.active==='boolean'&&
        typeof current.setNewSpinData==='function'&&typeof current.setNextSpinData==='function'){
        lease={active:true};
        try{
          for(const [key,source] of [['setNewSpinData','newSpin'],['setNextSpinData','cascade']]){
            const descriptor=Object.getOwnPropertyDescriptor(current,key),original=current[key],gen=lease;
            if(descriptor&&(!('value'in descriptor)||(!descriptor.configurable&&!descriptor.writable)))throw Error('unwritable');
            const wrapper=function(...args){
              const result=Reflect.apply(original,this,args);
              if(gen.active&&this===current)try{observe(source,true);}catch(_){
                errors++;config.enabled=false;ready=false;note='盤面診斷異常，規則已解除。';
                try{report();}catch(_){}
              }
              return result;
            };
            Object.defineProperty(current,key,descriptor?{...descriptor,value:wrapper}:{configurable:true,writable:true,value:wrapper});
            patches.push({object:current,key,descriptor,wrapper});
          }
        }catch(_){unhook();lease={active:false};}
      }
      return observe('snapshot',false,ctx);
    }
    function configure(value){
      if(value?.enabled===false){config.enabled=false;note='已解除盤面規則；保留符號統計。';return report();}
      config.enabled=false;
      install();
      if(!ready||!model||!last||last.spinId===null||last.index===null){note='目前資料不足，不能啟用盤面規則。';return report();}
      if(!value||value.enabled!==true||!Array.isArray(value.rules)||value.rules.length<1||value.rules.length>8){note='請設定1至8條完整規則。';return report();}
      const rules=[];
      for(const r of value.rules){if(!r||!Number.isSafeInteger(r.symbol)||r.symbol<1||r.symbol>18||!['ge','le','gt','lt','eq'].includes(r.op)||!Number.isSafeInteger(r.count)||r.count<0||r.count>30||!['stop'].includes(r.action)){note='規則無效；數量須為0至30的整數。';return report();}rules.push({symbol:r.symbol,op:r.op,count:r.count,action:r.action});}
      config={enabled:true,join:value.join==='all'?'all':'any',includeCascades:value.includeCascades===true,includeFree:value.includeFree===true,rules};seen.clear();lastHit=null;
      seen.add(last.spinId+'/'+last.index+'/'+last.action);note='已啟用；從之後的新盤面開始判斷，不回頭觸發目前盤面。';return report();
    }
    function halt(){config.enabled=false;clearInterval(timer);timer=null;unhook();model=null;last=null;ready=false;note='盤面監看已停止，原生入口已還原。';return report();}
    function run(){if(timer===null)timer=setInterval(install,1500);return install();}
    return {run,recheck(){modules=null;if(lease?.active===false)lease=null;return run();},halt,configure,report};
  }
  // END BOARD RULES

  function readNativeBalance(){
    try{const get=window.System?.get?.bind(window.System),p=get?.('chunks:///_virtual/PlatformModel.ts')?.default||get?.('PlatformModel.ts')?.default;
      const value=p?.amount;if(typeof value==='number'&&Number.isFinite(value)&&value>=0)return value;
      const fallback=p?.getData?.()?.player?.balance?.amount;return typeof fallback==='number'&&Number.isFinite(fallback)&&fallback>=0?fallback:null;
    }catch(_){return null;}
  }
  function replyBalance(payload){const value=payload?.platform?.player?.balance?.amount;return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;}
  function pairedBalanceResult(before,after,cost){
    if(![before,after,cost].every(v=>typeof v==='number'&&Number.isFinite(v))||before<0||after<0||cost<=0)return null;
    const net=after-before,payout=net+cost;if(!Number.isFinite(net)||!Number.isFinite(payout)||payout< -1e-7)return null;
    return {before,after,cost,net,payout:payout<0?0:payout,source:'原生SPIN_START扣款前餘額與同局結算餘額差'};
  }

  // SPIN_START is dispatched before native firstSpinFlow deducts PlatformModel.amount.
  function createBalanceAnchors(){
    let listener=null,snapshot=null,epoch=0;const used=new Map();
    function halt(){if(listener)try{listener.dispatcher.off(listener.event,listener.target);}catch(_){}listener=null;snapshot=null;used.clear();}
    function start(){
      const get=n=>window.System?.get?.('chunks:///_virtual/'+n)||window.System?.get?.(n);
      const event=get('GameEvent.ts')?.GameEvent?.SPIN_START,dispatcher=window.App?.dispatcher;
      if(typeof event!=='string'||typeof dispatcher?.on!=='function'||typeof dispatcher?.off!=='function')return false;
      if(listener?.dispatcher===dispatcher&&listener.event===event)return true;
      halt();const target={};
      dispatcher.on(event,()=>{snapshot={value:readNativeBalance(),at:Date.now(),epoch:++epoch};},target,false);
      listener={dispatcher,event,target};return true;
    }
    return {start,halt,take(consumer){
      if(!snapshot||used.get(consumer)===snapshot.epoch||Date.now()-snapshot.at>120000)return null;
      used.set(consumer,snapshot.epoch);return snapshot.value;
    }};
  }
  const balanceAnchors=createBalanceAnchors();

  // Cumulative snapshots are not separate credits. Preserve boundaries, not guessed spin counts.
  function auditSettlementRows(rows){
    const money=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const all=Array.isArray(rows)?rows:[],firstFree=all.findIndex(r=>r?.action==='freeSpin');
    let monotonic=true,previous=null;
    for(const row of all){if(!money(row?.totalWinnings)||(previous!==null&&row.totalWinnings<previous-1e-7))monotonic=false;previous=money(row?.totalWinnings)?row.totalWinnings:null;}
    const final=all.at(-1),total=money(final?.totalWinnings)?final.totalWinnings:null;
    const base=firstFree>0&&money(all[firstFree-1]?.totalWinnings)?all[firstFree-1].totalWinnings:null;
    const complete=Number.isSafeInteger(final?.currentView)&&Number.isSafeInteger(final?.totalViews)&&final.currentView+1===final.totalViews&&!final.startFreeGame;
    const freeAward=complete&&monotonic&&firstFree>0&&base!==null&&total!==null&&total>=base?total-base:null;
    const samples=all.length<=64?all.map((r,i)=>[r,i]):[...all.slice(0,32).map((r,i)=>[r,i]),...all.slice(-32).map((r,i)=>[r,all.length-32+i])];
    return {stateCount:all.length,hasFree:firstFree>=0||all.some(r=>r?.startFreeGame),firstFreeIndex:firstFree,complete,monotonic,reportedTotal:total,baseAward:monotonic?base:null,freeAward,samplesTruncated:all.length>64,
      samples:samples.map(([r,i])=>({index:i,action:['spin','freeSpin'].includes(r?.action)?r.action:'unknown',view:Number.isSafeInteger(r?.currentView)?r.currentView:null,cumulative:money(r?.totalWinnings)?r.totalWinnings:null}))};
  }
  function finishSettlementAudit(spinId,rows,balance,cost,reported){
    const difference=balance&&typeof reported==='number'?balance.payout-reported:null;
    const aligned=balance&&typeof difference==='number'&&Math.abs(difference)<=1e-7;
    return {spinId,at:new Date().toISOString(),status:balance?(aligned?'balance-matched':'balance-corrected'):'native-general-only',
      before:balance?.before??null,after:balance?.after??null,cost,payout:balance?.payout??reported,net:balance?.net??(reported-cost),reportedPayout:reported,difference,
      baseAward:aligned?rows?.baseAward??null:null,freeAward:aligned?rows?.freeAward??null:null,rows,
      note:balance?(aligned?'同局進出餘額與累計派彩一致':'依同局進出餘額核對，未把累計段落相加；免費分段仍待核對'):'一般派彩核對；缺少完整餘額證據'};
  }

  // BEGIN PLAY SESSION
  // g1005 commands and the response parser share GameData.ins. Observe the
  // already-created instance; DataCenter.get(type) may create a separate model.
  function nativeSeth2GameData(type){return type?.module==='g1005'?type._ins??null:null;}

  function hasPercentLimits(options){return options?.limits?.unit==='percent';}
  function createVolatilityWindow(){
    const limit=50, rows=[];
    let cached=null;
    return {
      add(order, bet, payout, purchased){
        rows.push({order,bet,payout,purchased,time:Date.now()});
        rows.sort((a,b)=>b.order-a.order);
        if(rows.length>limit)rows.pop();
        cached=null;
      },
      reset(){rows.length=0;cached=null;},
      snapshot(){
        if(cached)return cached;
        const sample=[];
        for(const row of rows){
          if(sample.length&&row.order!==sample.at(-1).order-1)break;
          sample.push(row);
        }
        sample.reverse();
        const count=sample.length;
        if(!count)return null;
        const ordinary={count:0,bet:0,payout:0}, purchase={count:0,bet:0,payout:0};
        const outcomes={zero:0,lossWithPayout:0,even:0,profit:0};
        let net=0,peak=0,drawdown=0,streak=0,longest=0,largest=0,bet=0,payout=0;
        let first=Infinity,last=-Infinity;
        const multiples=[];
        for(const row of sample){
          const change=row.payout-row.bet;
          net+=change;
          peak=Math.max(peak,net);
          drawdown=Math.max(drawdown,peak-net);
          if(row.payout===0){streak++;outcomes.zero++;}
          else {
            streak=0;
            if(Math.abs(change)<1e-8)outcomes.even++;
            else if(change<0)outcomes.lossWithPayout++;
            else outcomes.profit++;
          }
          longest=Math.max(longest,streak);
          largest=Math.max(largest,row.payout);
          bet+=row.bet;payout+=row.payout;
          multiples.push(row.payout/row.bet);
          const mode=row.purchased?purchase:ordinary;
          mode.count++;mode.bet+=row.bet;mode.payout+=row.payout;
          first=Math.min(first,row.time);last=Math.max(last,row.time);
        }
        multiples.sort((a,b)=>a-b);
        const median=(multiples[Math.floor((count-1)/2)]+multiples[Math.floor(count/2)])/2;
        const mean=multiples.reduce((sum,value)=>sum+value,0)/count;
        const deviation=count>1?Math.sqrt(multiples.reduce((sum,value)=>sum+(value-mean)**2,0)/(count-1)):null;
        cached={count,from:sample[0].order,to:sample.at(-1).order,longest,streak,drawdown,
          largestShare:payout>0?100*largest/payout:null,rtp:100*payout/bet,rtpWithoutLargest:100*(payout-largest)/bet,
          median,deviation,outcomes,ordinary,purchase,turnsPerMinute:last>first?(count-1)*60000/(last-first):null,
          variedBet:sample.some(row=>Math.abs(row.bet-sample[0].bet)>=1e-8)};
        return cached;
      }
    };
  }
  function createPlaySession(publish,controls,board,decode){
    const get=name=>{try{return window.System?.get?.('chunks:///_virtual/'+name)||window.System?.get?.(name);}catch(_){return null;}};
    let ready=false,note='等待原生結算入口。',sender=null,model=null,patches=[],listener=null,timer=null,lease=null,proof=null;
    let state='idle',mode=null,target=null,reason='',invalid=false,submitted=0,accepted=0,settled=0,bet=0,win=0,rtpRule=null,stopSent=false,sessionId=0,inReply=false,freeStopLease=null,lastRtpCheck=null,lastBalanceResult=null,limits=null,lastLimitCheck=null,bonusStop=null,lastBonusHit=null,bonusPreference=null;
    const pending=new Set(),flows=new Map(),paidPurchases=new Map(),seen=new Set(),records=[],history=[];
    const volatility=createVolatilityWindow();
    const finite=v=>typeof v==='number'&&Number.isFinite(v),id=v=>(typeof v==='string'&&v.length>0&&v.length<=100)||(typeof v==='number'&&Number.isSafeInteger(v))?String(v):null;
    const busy=()=>state==='running'||state==='stopping';
    function restoreFreeStop(){const p=freeStopLease;freeStopLease=null;if(p)try{if(p.object.stopOnFg===false)p.object.stopOnFg=p.original;}catch(_){} }
    function ratio(){const value=!invalid&&settled>0&&bet>0?win/bet*100:null;return finite(value)?value:null;}
    function report(){const value=ratio(),out={ready,busy:busy(),state,mode,target,reason,note,invalid,volatility:invalid?null:volatility.snapshot(),submitted,accepted,settled,bet,win,net:settled?win-bet:null,rtpPercent:mode==='strategy'||mode==='manual'||state==='done'?value:null,pending:pending.size+flows.size+paidPurchases.size,pendingResults:[...flows.values()].map(flow=>({id:flow.id,bet:flow.bet,payout:flow.win,net:flow.win-flow.bet,settled:false})),proof,lastRtpCheck,lastBalanceResult,limits,lastLimitCheck,bonusStop,lastBonusHit,settlementAudits:records.filter(r=>r.audit).map(r=>r.audit),freeStopSettingLeased:!!freeStopLease,records:records.slice(),history:history.slice(),rtpRule,scope:mode==='manual'?'本段手動購買免費累計；以實際購買費用及整段已核對派彩計算，不另扣免費續轉。':'只含本次配對成功且完整結算的付費主流程；自然免費含在原流程，手動購買整段算一次，購買費用計入投注。',prefetchSuppressed:busy()};publish(out);return out;}
    function readBonusTiers(config){
      const native=get('DefinitionModel.ts')?.default?.getData?.()?.winOddsTypes||model?.data?.definition?.winOddsTypes;
      const named=native&&typeof native==='object'?Object.entries(native).filter(([,v])=>finite(v)&&v>=0).sort((a,b)=>a[1]-b[1]):[];
      const wanted=['mega','ultra','legendary'].filter(k=>config?.[k]===true);
      if(wanted.every(k=>named.some(([name])=>new RegExp(k==='legendary'?'legend':k,'i').test(name))))return named;
      // Supplied native playWinBtm: levels 0..4 = Big, Super, Mega, Ultra, Legendary.
      const parsed=model?.data?.parser?.winOdds,labels=['BIG','SUPER','MEGA','ULTRA','LEGENDARY'];
      if(Array.isArray(parsed)&&parsed.length<=5&&new Set(parsed.map(row=>row?.level)).size===parsed.length&&parsed.every(row=>Number.isInteger(row?.level)&&row.level>=0&&row.level<5&&finite(row.reachRate)&&row.reachRate>=0))return parsed.map(row=>[labels[row.level],row.reachRate]).sort((a,b)=>a[1]-b[1]);
      return named;
    }
    function configureBonus(config){
      bonusPreference=config?{...config}:null;
      if(!config||!['mega','ultra','legendary'].some(k=>config[k]===true)){bonusStop=null;return report();}
      const tiers=readBonusTiers(config);
      if(!Number.isSafeInteger(config.speed)||config.speed<1||config.speed>100||['mega','ultra','legendary'].some(k=>config[k]===true&&!tiers.some(([name])=>new RegExp(k==='legendary'?'legend':k,'i').test(name)))){
        bonusStop=null;note='原生大獎門檻或降速設定尚未核對，未啟用大獎策略。';return report();
      }
      bonusStop={mega:config.mega===true,ultra:config.ultra===true,legendary:config.legendary===true,speed:config.speed,tiers};
      for(const flow of flows.values())checkBonus(flow,flow.freeAward);return report();
    }
    function beginManualPurchase(){
      for(const ticket of pending)clearTimeout(ticket.timeout);pending.clear();flows.clear();
      for(const ticket of paidPurchases.values())clearTimeout(ticket.awaitTimeout);paidPurchases.clear();
      if(mode!=='manual'||invalid){submitted=0;accepted=0;settled=0;bet=0;win=0;seen.clear();records.length=0;volatility.reset();invalid=false;}
      sessionId++;state='running';mode='manual';target=null;reason='';stopSent=false;rtpRule=null;limits=null;lastRtpCheck=null;lastBalanceResult=null;
      note='被動監看手動購買免費；購買費用與整段派彩完整核對後才納入RTP。';
    }
    function awaitPurchase(key,ticket){
      const previous=paidPurchases.get(key);if(previous)clearTimeout(previous.awaitTimeout);
      const waiting={...ticket,id:key};
      waiting.awaitTimeout=setTimeout(()=>{if(paidPurchases.get(key)!==waiting)return;paidPurchases.delete(key);fault('購買免費的後續結果逾時，未以0元或部分派彩計算RTP。');},30000);
      paidPurchases.set(key,waiting);note='購買費用已配對；等待同局免費結果，不重複扣款或計次。';
    }
    function checkBonus(flow,freeAward,confirmed=false){
      if(!busy()||invalid||!bonusStop||!flow?.hasFree||flow.bonusTriggered||!finite(freeAward)||!finite(flow.baseBet)||flow.baseBet<=0)return;
      const odds=freeAward/flow.baseBet,level=bonusStop.tiers.filter(([,reach])=>odds>=reach).at(-1)?.[0]||'';
      if((bonusStop.mega&&/mega/i.test(level))||(bonusStop.ultra&&/ultra/i.test(level))||(bonusStop.legendary&&/legend/i.test(level))){
        flow.bonusTriggered=true;lastBonusHit={level,freeAward,bet:flow.bet,baseBet:flow.baseBet,purchased:flow.purchase,odds,speed:bonusStop.speed,confirmed};
        controls.speed(Math.min(bonusStop.speed,controls.report()?.factor||bonusStop.speed));stop('免費遊戲 '+level+'：已降速並停止後續付費旋轉');
      }
    }
    function stop(why='手動停止'){
      if(busy()){state='stopping';reason=reason||why;board.configure({enabled:false});}
      if(!stopSent||!busy()||why==='手動停止'){
        stopSent=true;
        try{const result=controls.stopAuto();if(result?.active!==false)note='原生停止尚未確認，請使用遊戲停止按鈕；本次仍等待結清。';}catch(_){note='原生停止呼叫失敗，請使用遊戲停止按鈕；本次仍等待結清。';}
      }
      finish();return report();
    }
    function fault(message){if(!busy())return;invalid=true;note=message;reason=message;if(inReply){state='stopping';return;}stop(message);}
    function finish(){
      if(!busy()||pending.size||flows.size||paidPurchases.size)return;
      const active=get('AutoPlayModel.ts')?.default?.active;
      if(active!==false&&mode!=='manual')return;
      const early=mode==='count'&&settled<target;if(early&&!reason)reason='原生提前停止，已完成 '+settled+'/'+target+' 次。';
      restoreFreeStop();state='done';note=invalid?'資料不足，未提供本次RTP。':early?'本次提前停止；僅顯示實際已結算流程。':settled?'本次已完整結算。':'本次沒有已核對的付費流程。';
      history.unshift({time:new Date().toISOString(),mode,target,settled,bet,win,rtpPercent:ratio(),reason:reason||'原生旋轉結束',complete:!invalid&&(mode!=='count'||settled===target)});if(history.length>20)history.pop();
    }
    function settle(flow){
      if(!flow||!flow.visual||!flow.closed)return;
      flows.delete(flow.id);if(seen.has(flow.id))return;seen.add(flow.id);if(seen.size>2048)seen.delete(seen.values().next().value);
      const balance=pairedBalanceResult(flow.balanceBefore,flow.balanceAfter,flow.bet);
      if(flow.hasFree&&!balance){lastBalanceResult={status:'資料不足',hasFree:true,before:flow.balanceBefore??null,after:flow.balanceAfter??null,cost:flow.bet,net:null,payout:null,reportedPayout:flow.reportedPayout};fault('免費流程缺少可配對的進場前／結算後餘額，未以最後一段派彩替代。');return;}
      if(balance){flow.win=balance.payout;lastBalanceResult={...balance,status:'已核對',hasFree:flow.hasFree,reportedPayout:flow.reportedPayout,difference:balance.payout-flow.reportedPayout};}
      else lastBalanceResult={status:'依已核對一般派彩',hasFree:false,before:flow.balanceBefore??null,after:flow.balanceAfter??null,cost:flow.bet,payout:flow.win,net:flow.win-flow.bet,reportedPayout:flow.reportedPayout};
      flow.audit=finishSettlementAudit(flow.id,flow.rowAudit,balance,flow.bet,flow.reportedPayout);
      settled++;bet+=flow.bet;win+=flow.win;
      if(!finite(bet)||!finite(win)||bet<=0){fault('本次金額合計格式異常。');return;}
      if(finite(flow.bet)&&flow.bet>0&&finite(flow.win)&&flow.win>=0)volatility.add(flow.order,flow.bet,flow.win,flow.purchase===true);
      records.unshift({id:flow.id,bet:flow.bet,win:flow.win,net:flow.win-flow.bet,purchased:flow.purchase===true,baseBet:flow.baseBet,settlement:flow.closeType,audit:flow.audit,balance:lastBalanceResult,hasFree:flow.hasFree,rtpPercent:mode==='strategy'||mode==='manual'?ratio():null});if(records.length>20)records.pop();
      if(flow.purchase&&balance)checkBonus(flow,balance.payout,true);
      if(state==='running'&&limits){
        const net=win-bet,take=finite(limits.takeProfit)&&net>=limits.takeProfit-1e-8,loss=finite(limits.stopLoss)&&net<=-limits.stopLoss+1e-8;
        lastLimitCheck={net,bet,win,settled,takeProfit:limits.takeProfit,stopLoss:limits.stopLoss,matched:take||loss};
        if(take||loss)stop((take?'止盈':'止損')+'命中；本次累計損益 '+net.toFixed(4));
      }
      if(state==='running'&&mode==='strategy'&&rtpRule){
        const r=ratio(),minimumMet=settled>=rtpRule.min,difference=r===null?null:r-rtpRule.value;
        const matched=minimumMet&&difference!==null&&compareValue(rtpRule.op,r,rtpRule.value,1e-9);
        lastRtpCheck={settled,bet,win,net:win-bet,rtp:r,op:rtpRule.op,threshold:rtpRule.value,minimum:rtpRule.min,minimumMet,matched};
        if(matched)stop('本次累計RTP '+({ge:'≥',le:'≤',gt:'>',lt:'<',eq:'='}[rtpRule.op])+' '+rtpRule.value+'%（已結算'+settled+'次）');
      }
      if(state==='running'&&mode==='count'&&settled>=target)stop('指定 '+target+' 次付費主流程已結算');
      finish();report();
    }
    function closed(){
      if(!busy())return;
      const d=model?.data,key=id(d?.spinId);if(seen.has(key))return;const flow=key?flows.get(key):null;
      if(!flow){if(paidPurchases.has(key))return;fault('原生流程結束無法配對本次局號；RTP資料不足。');return;}
      const last=d.gameState;
      if(!last||last.currentView+1!==last.totalViews||!!last.startFreeGame){fault('原生流程尚未完整結束，未納入RTP。');return;}
      flow.visual=true;
      if(!flow.closed){
        const waitingClose=[...pending].some(ticket=>ticket.kind==='closeSpin'&&ticket.id===key);
        if(waitingClose){note='畫面已結束，等待同局原生結算回覆。';report();return;}
        fault('流程結束但結算回覆未配對，已請求停止，RTP資料不足。');return;
      }
      settle(flow);
    }
    function capture(name,payload){
      if(this!==sender||!['spin','closeSpin'].includes(name))return null;
      const purchase=name==='spin'&&payload?.action==='buyFeature',linked=name==='spin'?paidPurchases.get(id(payload?.spinId)):null;
      if(!busy()){if(!purchase)return null;beginManualPurchase();}
      const ticket={kind:name,session:sessionId,done:false,timeout:null};pending.add(ticket);
      ticket.timeout=setTimeout(()=>{if(ticket.session===sessionId&&pending.has(ticket))fault('原生回覆逾時，已請求停止；等待在途回覆，RTP暫不可用。');},30000);
      if(name==='closeSpin'){ticket.id=id(payload?.spinId);return ticket;}
      if(linked&&payload?.action===undefined&&payload?.cheat==null){
        clearTimeout(linked.awaitTimeout);paidPurchases.delete(linked.id);Object.assign(ticket,{purchase:true,continuation:true,id:linked.id,base:linked.base,bet:linked.bet,balanceBefore:linked.balanceBefore,valid:linked.valid});return ticket;
      }
      ticket.balanceBefore=balanceAnchors.take('ledger');submitted++;
      const stake=get('StakeModel.ts')?.default,defs=get('DefinitionModel.ts')?.default?.getData?.(),lines=defs?.winlineDefs?.length;
      const raw=payload||{};
      ticket.purchase=purchase;if(purchase)ticket.balanceBefore=readNativeBalance();
      ticket.forceClose=id(raw.forceClose);if(ticket.forceClose)ticket.balanceBefore=null;ticket.valid=(raw.action===undefined||purchase)&&(raw.spinId===undefined||raw.spinId===null||raw.spinId==='')&&raw.cheat==null&&Number.isSafeInteger(raw.stakeIndex)&&Number.isSafeInteger(raw.ratioIndex)&&finite(raw.stakeValue)&&raw.stakeValue>0&&finite(raw.ratioValue)&&raw.ratioValue>0&&Number.isSafeInteger(lines)&&lines>0&&stake?.data?.extraStakeTimes===1&&stake.stakeIndex===raw.stakeIndex&&stake.ratioIndex===raw.ratioIndex&&stake.stakeValue===raw.stakeValue&&stake.ratioValue===raw.ratioValue;
      ticket.bet=ticket.valid?Math.round(raw.stakeValue*raw.ratioValue*lines*10)/10:null;
      ticket.valid=ticket.valid&&finite(ticket.bet)&&ticket.bet>0&&finite(stake.totalStake)&&Math.abs(ticket.bet-stake.totalStake)<1e-8;
      ticket.base=ticket.bet;
      if(purchase){const index=raw.featureIndex,rate=Number.isSafeInteger(index)&&index>=0?model?.data?.definition?.buyFeature?.[index]?.featureRate:null;ticket.bet=finite(rate)&&rate>0?ticket.base*rate:null;ticket.valid=ticket.valid&&['freeGame','superFreeGame'].includes(model?.data?.definition?.buyFeature?.[index]?.feature)&&raw.featureValue===model?.data?.definition?.buyFeature?.[index]?.feature&&finite(ticket.bet)&&ticket.bet>0&&!ticket.forceClose;}
      if(!ticket.valid){invalid=true;note='收到未核對的購買、續接、加注、測試或下注格式，未計入RTP。';}
      return ticket;
    }
    const successful=status=>status===200||status==='200';
    function response(ticket,raw){
      if(ticket.session!==sessionId||ticket.done)return;ticket.done=true;clearTimeout(ticket.timeout);pending.delete(ticket);
      const payload=decode(raw);
      if(ticket.kind==='closeSpin'){
        if(!successful(payload?.status)){fault('原生結算未成功；RTP資料不足。');return;}
        const returnedId=id(payload?.engine?.spinId)||id(payload?.data?.spinId);
        if(returnedId&&returnedId!==ticket.id){fault('結算回覆局號與請求不符，未納入RTP。');return;}
        const flow=flows.get(ticket.id);if(flow){flow.closed=true;flow.balanceAfter=replyBalance(payload);flow.closeType='已配對closeSpin成功回覆';}return;
      }
      pending.delete(ticket);
      if(!successful(payload?.status)||!ticket.valid){fault(note||'原生旋轉未成功，未計入RTP。');return;}
      const engine=payload.engine,rows=engine?.gameState,key=id(engine?.spinId)||id(rows?.spinId),first=Array.isArray(rows)?rows[0]:null,last=Array.isArray(rows)?rows.at(-1):null;
      if(ticket.continuation&&key!==ticket.id){fault('購買免費的後續局號不符，未納入RTP。');return;}
      if(ticket.purchase&&key&&(!Array.isArray(rows)||!Number.isSafeInteger(last?.currentView)||last.currentView+1!==last.totalViews||last.startFreeGame)){awaitPurchase(key,ticket);return;}
      proof={expectedBet:ticket.bet,responseBet:finite(first?.totalStake)?first.totalStake:null,finalPayout:finite(last?.totalWinnings)?last.totalWinnings:null,states:Array.isArray(rows)?rows.length:null,firstAction:typeof first?.action==='string'?first.action.slice(0,30):null,lastAction:typeof last?.action==='string'?last.action.slice(0,30):null,currentView:Number.isSafeInteger(last?.currentView)?last.currentView:null,totalViews:Number.isSafeInteger(last?.totalViews)?last.totalViews:null};
      if(!key||!rows?.length||rows.length>10000||!(ticket.purchase?['spin','freeSpin']:['spin']).includes(first?.action)||!finite(first.totalStake)||Math.abs(first.totalStake-ticket.base)>1e-8||!finite(last?.totalWinnings)||last.totalWinnings<0||!Number.isSafeInteger(last?.currentView)||!Number.isSafeInteger(last?.totalViews)||last.totalViews<1||last.currentView+1!==last.totalViews||!['spin','freeSpin'].includes(last.action)||!!last.startFreeGame){fault('派彩、下注單位或完整流程格式未核對；RTP資料不足。');return;}
      if(rows.some(row=>!['spin','freeSpin'].includes(row?.action)||row?.noWinReward>0||row?.isJp?.length>0)){fault('二代特殊流程、JP或寶箱派彩尚待核對，未納入本次RTP。');return;}
      if(flows.has(key)||seen.has(key)){fault('本次旋轉局號重複，未重複計算。');return;}
      accepted++;
      if(ticket.purchase){const waiting=paidPurchases.get(key);if(waiting)clearTimeout(waiting.awaitTimeout);paidPurchases.delete(key);}
      // g1005 GameHandler sends closeSpin for the non-prefetch path even when the shared flag is set.
      const audit=auditSettlementRows(rows),freeAward=ticket.purchase&&audit.firstFreeIndex===0&&audit.complete&&audit.monotonic?audit.reportedTotal:audit.freeAward;
      flows.set(key,{id:key,order:accepted,bet:ticket.bet,baseBet:ticket.base,purchase:ticket.purchase===true,win:last.totalWinnings,reportedPayout:last.totalWinnings,rowAudit:audit,freeAward,hasFree:ticket.purchase||rows.some(r=>r?.action==='freeSpin'||r?.startFreeGame),balanceBefore:ticket.balanceBefore,balanceAfter:null,visual:false,closed:false,closeType:''});
      if(ticket.forceClose){const previous=flows.get(ticket.forceClose);if(previous){previous.closed=true;previous.closeType='已配對forceClose成功回覆';previous.balanceAfter=null;}}
      note='已收到本局結果，等待完整流程結束。';
    }
    function freeAwardFromRows(rows){return auditSettlementRows(rows).freeAward;}
    function afterResponse(ticket){
      if(ticket.session!==sessionId)return;
      if(state==='running'&&!invalid&&bonusStop)for(const flow of flows.values())checkBonus(flow,flow.freeAward);
      if(invalid&&busy())stop(note||'資料不足');
      for(const flow of [...flows.values()])settle(flow);
      finish();report();
    }
    function restore(){if(lease)lease.active=false;for(const p of patches.splice(0).reverse())try{if(p.object[p.key]===p.wrapper){if(p.descriptor)Object.defineProperty(p.object,p.key,p.descriptor);else delete p.object[p.key];}}catch(_){}if(listener)try{listener.dispatcher.off(listener.event,listener.target);}catch(_){}listener=null;sender=null;model=null;lease=null;}
    function install(){
      balanceAnchors.start();const app=window.App,view=app?.entryManager?.getEntry?.('g1005')?.gameView,type=get('GameData.ts')?.default,replay=get('ReplayModel.ts')?.default,event=get('GameEvent.ts')?.GameEvent?.SPIN_CLOSED;
      const nextSender=app?.senderManager?.get?.('g1005',false),nextModel=nativeSeth2GameData(type);
      const valid=view?.bundle==='g1005'&&replay?.isReplay===false&&typeof nextSender?.send==='function'&&typeof nextModel?.judgeIsOpenEarlyFlag==='function'&&typeof app?.dispatcher?.on==='function'&&typeof app.dispatcher.off==='function'&&typeof event==='string';
      if(!valid){ready=false;if(busy())fault('結算入口、連線或遊戲狀態改變；停止本次統計。');return report();}
      ready=true;
      if(nextSender!==sender||nextModel!==model){
        if(busy())fault('遊戲資料或連線已更換，本次RTP不完整；請重新整理。');
        restore();sender=nextSender;model=nextModel;lease={active:true};const gen=lease;
        try{
          const original=sender.send,object=sender,descriptor=Object.getOwnPropertyDescriptor(sender,'send');
          const wrapper=function(...args){
            let ticket=null;try{if(gen.active)ticket=capture.apply(this,args);}catch(_){fault('下注請求無法核對。');}
            if(ticket&&typeof args[2]==='function'){
              const native=args[2];args[2]=function(...reply){
                if(gen.active){inReply=true;try{response(ticket,reply[0]);}catch(_){clearTimeout(ticket.timeout);pending.delete(ticket);invalid=true;note='本局資料無法解析；RTP資料不足。';}finally{inReply=false;}}
                try{return Reflect.apply(native,this,reply);}finally{if(gen.active)afterResponse(ticket);}
              };
            }else if(ticket){pending.delete(ticket);fault('找不到可配對的原生回呼。');}
            try{return Reflect.apply(original,this,args);}catch(error){if(ticket){pending.delete(ticket);fault('原生發送失敗，RTP資料不足。');}throw error;}
          };
          Object.defineProperty(object,'send',descriptor?{...descriptor,value:wrapper}:{configurable:true,writable:true,value:wrapper});patches.push({object,key:'send',descriptor,wrapper});
          const key='judgeIsOpenEarlyFlag',originalJudge=model[key],judgeDescriptor=Object.getOwnPropertyDescriptor(model,key),judgeObject=model;
          const judge=function(...args){const result=Reflect.apply(originalJudge,this,args);if(gen.active&&busy()&&this===judgeObject)this.isOpenEarlyFlag=false;return result;};
          Object.defineProperty(model,key,judgeDescriptor?{...judgeDescriptor,value:judge}:{configurable:true,writable:true,value:judge});patches.push({object:model,key,descriptor:judgeDescriptor,wrapper:judge});
          const target={};app.dispatcher.on(event,closed,target,false);listener={dispatcher:app.dispatcher,event,target};if(state==='idle')note='結算監看已就緒，開始後逐局核對金額。';
        }catch(_){restore();ready=false;note='無法建立完整結算監看，未開放兩種執行模式。';}
      }
      if(bonusPreference&&!bonusStop)configureBonus(bonusPreference);
      finish();return report();
    }
    function start(options){
      install();if(!ready||busy()){note=busy()?'請等目前這批完整結算。':'結算入口尚未就緒。';return report();}
      const current=controls.report(),counts=current.counts||[],nextMode=options?.mode;
      if(!current.ready){note=current.reason||'請先等遊戲就緒。';return report();}
      if(model.isSendOutEarlyFlag===true||model.earlyData){note='原生尚有預跑資料，請先等待遊戲完成。';return report();}
      if(!['strategy','count'].includes(nextMode)){note='請選擇執行模式。';return report();}
      const r=options?.rtpRule,nextLimits=options?.limits;
      const baselineBalance=hasPercentLimits(options)?readNativeBalance():null;
      if(hasPercentLimits(options)&&(!finite(baselineBalance)||baselineBalance<=0)){note='旋轉前餘額未核對，未開始百分比風控。';return report();}
      if(nextLimits&&['takeProfit','stopLoss'].some(k=>nextLimits[k]!=null&&(!finite(nextLimits[k])||nextLimits[k]<=0))){note='止盈／止損門檻須大於0。';return report();}
      if(nextLimits?.unit==='percent'&&finite(nextLimits.stopLoss)&&nextLimits.stopLoss>100){note='止損百分比不能超過100%。';return report();}
      const bonus=options?.bonusStop;
      if(bonus&&(!Number.isSafeInteger(bonus.speed)||bonus.speed<1||bonus.speed>100)){note='大獎降速請填1至100整數。';return report();}
      const tiers=readBonusTiers(bonus);
      if(bonus&&((bonus.mega&&!tiers.some(([k])=>/mega/i.test(k)))||(bonus.ultra&&!tiers.some(([k])=>/ultra/i.test(k)))||(bonus.legendary&&!tiers.some(([k])=>/legend/i.test(k))))){note='原生Mega／Ultra／Legendary門檻尚未讀取，未啟動這批旋轉。';return report();}
      const hasBonus=bonus&&(bonus.mega===true||bonus.ultra===true||bonus.legendary===true);
      const hasLimit=nextLimits&&(finite(nextLimits.takeProfit)||finite(nextLimits.stopLoss));
      if(nextMode==='strategy'){
        if(!counts.includes(-1)){note='此遊戲未提供原生持續旋轉選項，無法啟動策略模式。';return report();}
        if(r&&(!['ge','le','gt','lt','eq'].includes(r.op)||!finite(r.value)||r.value<0||!Number.isSafeInteger(r.min)||r.min<1)){note='RTP停止條件無效。';return report();}
        if(!r&&!options.useSymbols&&!hasLimit&&!hasBonus){note='請至少設定一種停止條件。';return report();}
        if(options.useSymbols){const result=board.configure({...options.symbols,enabled:true});if(!result.enabled){note=result.note;return report();}}else board.configure({enabled:false});
      }else{
        if(!Number.isSafeInteger(options.count)||options.count<=0||(!counts.includes(-1)&&!counts.includes(options.count))){note='請輸入正整數轉數；自訂次數需要原生持續旋轉入口。';return report();}
        board.configure({enabled:false});
      }
      const gameConfig=get('GameConfigModel.ts')?.default;
      if(typeof gameConfig?.stopOnFg!=='boolean'){board.configure({enabled:false});note='免費遊戲停轉設定尚未核對，未開始旋轉。';return report();}
      const previous=gameConfig.stopOnFg;
      try{gameConfig.stopOnFg=false;if(gameConfig.stopOnFg!==false)throw Error('unwritable');}catch(_){board.configure({enabled:false});note='無法設定免費結束後接續，未開始旋轉。';return report();}
      freeStopLease={object:gameConfig,original:previous};lastRtpCheck=null;lastBalanceResult=null;limits=hasLimit?{unit:nextLimits.unit==='percent'?'percent':'amount',baselineBalance,takeProfit:finite(nextLimits.takeProfit)?(nextLimits.unit==='percent'?baselineBalance*nextLimits.takeProfit/100:nextLimits.takeProfit):null,stopLoss:finite(nextLimits.stopLoss)?(nextLimits.unit==='percent'?baselineBalance*nextLimits.stopLoss/100:nextLimits.stopLoss):null,takeProfitPercent:nextLimits.unit==='percent'?nextLimits.takeProfit??null:null,stopLossPercent:nextLimits.unit==='percent'?nextLimits.stopLoss??null:null}:null;lastLimitCheck=null;bonusStop=hasBonus?{mega:bonus.mega===true,ultra:bonus.ultra===true,legendary:bonus.legendary===true,speed:bonus.speed,tiers}:null;lastBonusHit=null;bonusPreference=hasBonus?{mega:bonus.mega===true,ultra:bonus.ultra===true,legendary:bonus.legendary===true,speed:bonus.speed}:null;
      sessionId++;state='running';mode=nextMode;target=mode==='count'?options.count:null;rtpRule=mode==='strategy'?(r||null):null;reason='';invalid=false;submitted=0;accepted=0;settled=0;bet=0;win=0;proof=null;stopSent=false;pending.clear();flows.clear();for(const ticket of paidPurchases.values())clearTimeout(ticket.awaitTimeout);paidPurchases.clear();seen.clear();records.length=0;volatility.reset();note='已建立本次統計，等待原生付費流程。';report();
      model.isOpenEarlyFlag=false;
      const result=controls.startAuto(mode==='strategy'||counts.includes(-1)?-1:target);
      if(result.active!==true&&submitted===0){restoreFreeStop();state='done';board.configure({enabled:false});note=result.note||'原生未確認開始，本次未計入投注。';}
      return report();
    }
    function halt(){if(busy()){invalid=true;stop('頁面停止，本次統計中斷');state='done';}for(const ticket of paidPurchases.values())clearTimeout(ticket.awaitTimeout);paidPurchases.clear();bonusPreference=null;restoreFreeStop();restore();ready=false;clearInterval(timer);timer=null;return report();}
    return {run(){if(timer===null)timer=setInterval(install,1500);return install();},start,stop,halt,report,configureBonus,isBusy:busy};
  }
  // END PLAY SESSION

  // BEGIN EARLY OUTCOME
  function createEarlyOutcome(publish,decode){
    let sender=null,patch=null,timer=null,ready=false,latest=null,lastAward=null,awardPending=false,note='等待原生回覆。',errors=0;
    const purchases=new Map(),finite=v=>typeof v==='number'&&Number.isFinite(v),money=v=>finite(v)&&v>=0?v:null;
    const id=v=>(typeof v==='string'&&v.length>0&&v.length<=100)||(typeof v==='number'&&Number.isSafeInteger(v))?String(v):null;
    const get=name=>{try{return window.System?.get?.('chunks:///_virtual/'+name)||window.System?.get?.(name);}catch(_){return null;}};
    function report(){const out={ready,note,errors,latest,lastAward,awardPending,scope:'僅讀取已回傳結果；不是預知尚未投注的下一局，不作入帳證明，不納入正式RTP。'};try{publish(out);}catch(_){errors++;}return out;}
    function receipt(payload){
      latest=null;lastAward=null;awardPending=true;
      const raw=payload||{},type=get('GameData.ts')?.default,model=nativeSeth2GameData(type);
      const stake=get('StakeModel.ts')?.default,definition=get('DefinitionModel.ts')?.default?.getData?.(),lines=definition?.winlineDefs?.length;
      const t={requestId:id(raw.spinId),purchase:raw.action==='buyFeature',balanceBefore:raw.action==='buyFeature'?readNativeBalance():balanceAnchors.take('preview'),base:null,cost:null};
      if(id(raw.forceClose))t.balanceBefore=null;
      if(t.requestId&&raw.action===undefined&&raw.cheat==null&&purchases.has(t.requestId))return {...purchases.get(t.requestId),requestId:t.requestId,purchase:false,linkedPurchase:true};
      if(raw.cheat!==undefined||!Number.isSafeInteger(raw.stakeIndex)||!Number.isSafeInteger(raw.ratioIndex)||!finite(raw.stakeValue)||raw.stakeValue<=0||!finite(raw.ratioValue)||raw.ratioValue<=0||!Number.isSafeInteger(lines)||lines<1||stake?.data?.extraStakeTimes!==1||stake.stakeIndex!==raw.stakeIndex||stake.ratioIndex!==raw.ratioIndex||stake.stakeValue!==raw.stakeValue||stake.ratioValue!==raw.ratioValue)return t;
      const base=Math.round(raw.stakeValue*raw.ratioValue*lines*10)/10;
      if(!finite(base)||base<=0||!finite(stake.totalStake)||Math.abs(base-stake.totalStake)>1e-8)return t;
      t.base=base;
      if(t.purchase){
        const index=raw.featureIndex,rate=Number.isSafeInteger(index)&&index>=0?model?.data?.definition?.buyFeature?.[index]?.featureRate:null;
        if(raw.featureValue===model?.data?.definition?.buyFeature?.[index]?.feature&&['freeGame','superFreeGame'].includes(model?.data?.definition?.buyFeature?.[index]?.feature)&&finite(rate)&&rate>0&&finite(base*rate)){t.cost=base*rate;t.costSource='已配對購買請求與原生featureRate試算；不是扣款證明';}
      }else if(!t.requestId&&raw.action===undefined){t.cost=base;t.costSource='已配對普通spin請求、原生注額及回覆totalStake';}
      return t;
    }
    function outcome(payload,ticket,source){
      const engine=payload?.engine,rows=engine?.gameState,key=id(engine?.spinId)||id(rows?.spinId);
      if(ticket?.purchase){
        if(key){purchases.set(key,ticket);if(purchases.size>20)purchases.delete(purchases.keys().next().value);}
        if(!Array.isArray(rows)){note='購買回覆已收到，等待免費遊戲結果；尚無可顯示的派彩。';latest={source,receivedAt:new Date().toISOString(),spinId:key,type:'購買免費',complete:false,payout:null,basePayout:null,freePayout:null,cost:ticket.cost,net:null,costSource:ticket.costSource||'購買成本未核對',settlement:'尚未核對入帳'};return;}
      }
      if(!Array.isArray(rows)||!rows.length||rows.length>10000){note='回覆尚無可辨識的盤面序列。';return;}
      const first=rows[0],last=rows.at(-1),payout=money(last?.totalWinnings),freeIndex=rows.findIndex(x=>x?.action==='freeSpin');
      const special=rows.some(x=>!['spin','freeSpin'].includes(x?.action)||x?.noWinReward>0||x?.isJp?.length>0);
      const terminal=Number.isSafeInteger(last?.currentView)&&Number.isSafeInteger(last?.totalViews)&&last.totalViews>0&&last.currentView+1===last.totalViews&&!last.startFreeGame&&['spin','freeSpin'].includes(last.action);
      const complete=terminal&&['spin','freeSpin'].includes(first?.action)&&!special&&payout!==null;
      let basePayout=null,freePayout=null;
      if(freeIndex>0){const before=money(rows[freeIndex-1]?.totalWinnings),consistent=rows.slice(freeIndex-1).every((row,i,all)=>money(row?.totalWinnings)!==null&&(i===0||row.totalWinnings>=all[i-1].totalWinnings));if(consistent&&before!==null&&payout!==null&&payout>=before){basePayout=before;if(complete)freePayout=payout-before;}}
      else if(freeIndex===0&&(ticket?.linkedPurchase||ticket?.purchase)&&complete)freePayout=payout;
      else if(freeIndex<0&&complete)basePayout=payout;
      const unitVerified=ticket?.base!==null&&ticket?.base!==undefined&&finite(first?.totalStake)&&Math.abs(first.totalStake-ticket.base)<1e-8;
      const cost=unitVerified?money(ticket?.cost):null,net=complete&&cost!==null?payout-cost:null;
      latest={source,rowAudit:auditSettlementRows(rows),balanceBefore:ticket?.balanceBefore??null,balanceResult:null,reportedPayout:payout,receivedAt:new Date().toISOString(),spinId:id(engine?.spinId),type:ticket?.linkedPurchase||ticket?.purchase?'購買免費':freeIndex>0?'自然免費（含觸發局）':freeIndex===0?'免費流程（來源未核對）':'一般遊戲',complete,payout,basePayout,freePayout,cost,net,costSource:cost!==null?ticket.costSource:'未配對成本或下注單位未核對',settlement:source==='已載入快照'?'舊快照，未配對本次結算':'尚未核對入帳',status:special?'JP／寶箱額外派彩未核對':complete?'回覆已含終局累計派彩':'目前僅有部分／未核對的回覆'};
      if(latest.type.includes('免費'))latest={...latest,net:null};
      note='已讀取伺服器回傳結果；動畫可能尚未播完。';
    }
    function rememberAward(){
      if(!latest?.complete||latest.source==='已載入快照')return;
      const confirmed=latest.balanceResult||(!latest.type.includes('免費')&&latest.cost!==null);
      if(!confirmed||!finite(latest.payout)||latest.payout<0)return;
      lastAward={spinId:latest.spinId,type:latest.type,payout:latest.payout,net:latest.net,receivedAt:new Date().toISOString(),includesFree:latest.type.includes('免費'),source:latest.balanceResult?'同局結算餘額':'已配對一般結算'};awardPending=false;
    }
    function confirmBalance(payload){
      if(!latest?.complete||latest.source==='已載入快照')return;
      const result=pairedBalanceResult(latest.balanceBefore,replyBalance(payload),latest.cost);
      if(result)latest={...latest,audit:finishSettlementAudit(latest.spinId,latest.rowAudit,result,latest.cost,latest.reportedPayout),balanceResult:result,payout:result.payout,net:result.net,...(Math.abs(result.payout-latest.reportedPayout)>1e-7?{basePayout:null,freePayout:null}:{}),settlement:'已配對結算餘額',status:'回分已用進場前後餘額核對'};
      else if(latest.type.includes('免費'))latest={...latest,net:null,settlement:'免費流程結算餘額待核對'};
      rememberAward();
    }
    function restore(){if(patch){patch.active=false;try{if(patch.object.send===patch.wrapper){if(patch.descriptor)Object.defineProperty(patch.object,'send',patch.descriptor);else delete patch.object.send;}}catch(_){}}patch=null;sender=null;}
    function install(){
      try{
        balanceAnchors.start();const app=window.App,view=app?.entryManager?.getEntry?.('g1005')?.gameView,replay=get('ReplayModel.ts')?.default,next=app?.senderManager?.get?.('g1005',false);
        if(view?.bundle!=='g1005'||view.node?.activeInHierarchy===false||replay?.isReplay!==false||typeof next?.send!=='function'){restore();purchases.clear();ready=false;note='等待賽特 II 遊戲與非重播資料。';latest=null;lastAward=null;awardPending=false;return report();}
        if(next!==sender){
          restore();purchases.clear();latest=null;lastAward=null;awardPending=false;sender=next;
          const object=sender,original=object.send,descriptor=Object.getOwnPropertyDescriptor(object,'send'),gen={object,descriptor,wrapper:null,active:true};
          const wrapper=function(...args){
            if(!gen.active||this!==object||!['spin','closeSpin'].includes(args[0])||typeof args[2]!=='function')return Reflect.apply(original,this,args);
            const kind=args[0],requestId=id(args[1]?.spinId);let ticket=null;
            try{if(kind==='spin'){ticket=receipt(args[1]);report();}}catch(_){errors++;}
            const callback=args[2];args[2]=function(...reply){
              if(gen.active)try{const data=decode(reply[0]);if(data?.status===200||data?.status==='200'){
                if(kind==='spin')outcome(data,ticket,'已配對原生回覆');
                else if(latest?.spinId===requestId){
                  const returnedId=id(data?.engine?.spinId)||id(data?.data?.spinId);
                  if(returnedId&&returnedId!==requestId){latest={...latest,balanceResult:null,net:null,settlement:'結算局號不符，餘額未採用'};}
                  else{latest={...latest,settlement:'已收到配對的closeSpin成功回覆'};confirmBalance(data);}
                }
                report();
              }}catch(_){errors++;note='本局結果無法解析，未補入虛構金額。';report();}
              return Reflect.apply(callback,this,reply);
            };
            return Reflect.apply(original,this,args);
          };
          gen.wrapper=wrapper;Object.defineProperty(object,'send',descriptor?{...descriptor,value:wrapper}:{configurable:true,writable:true,value:wrapper});patch=gen;
        }
        ready=true;
        if(!latest){const type=get('GameData.ts')?.default,model=nativeSeth2GameData(type),d=model?.data;if(Array.isArray(d?.newGameState))outcome({engine:{spinId:d.spinId,gameState:d.newGameState}},null,'已載入快照');}
      }catch(_){restore();ready=false;errors++;note='尚未找到可讀取的原生結果入口。';}
      return report();
    }
    return {run(){if(timer===null)timer=setInterval(install,1500);return install();},report,halt(){clearInterval(timer);timer=null;restore();ready=false;return report();}};
  }
  // END EARLY OUTCOME

  const controls=createSethControls(data=>send('controls',data),()=>{if(scan.running)pauseScan('自動旋轉期間暫停補齊；停止旋轉後自動接續。');},()=>!!scan.pending||nativeQueries.size>0||roomSwitchPending);
  const board=createBoardWatcher(data=>send('board',data),()=>{playSession.stop('盤面停止條件命中');return controls.report();});
  const playSession=createPlaySession(data=>send('session',data),controls,board,decode);
  const earlyOutcome=createEarlyOutcome(data=>send('earlyOutcome',data),decode);
  let parsedStatusWatch=null;
  function detachParsedStatus(){const old=parsedStatusWatch;parsedStatusWatch=null;if(old)try{old.dispatcher.off(old.event,old.target);}catch(_){}}
  function attachParsedStatus(sender){
    const dispatcher=window.App?.dispatcher,event=window.System?.get?.('chunks:///_virtual/SlotFrameworkEvent.ts')?.SlotFrameworkEvent?.SLOT_TABLES_UPDATED_RESPONSE;
    if(parsedStatusWatch?.sender===sender&&parsedStatusWatch.dispatcher===dispatcher)return;
    detachParsedStatus();if(typeof event!=='string'||typeof dispatcher?.on!=='function'||typeof dispatcher?.off!=='function')return;
    const target={},entry={dispatcher,event,target,sender};parsedStatusWatch=entry;
    dispatcher.on(event,payload=>{if(parsedStatusWatch!==entry)return;try{received++;consume('slotTableUpdated',payload,false,null);}catch(_){errors++;}},target,false);
  }
  function stop(stopControls=true){clearPendingRoomQuery(scan.pending);restoreNativeQueries();detachParsedStatus();balanceAnchors.halt();cancelAction('已取消待執行操作。');earlyOutcome.halt();playSession.halt();board.halt();if(stopControls)controls.halt();pauseScan('已停止監看及補齊；目前在途回覆仍可能抵達。');subscriptions.length=0;}
  function start(){
    controls.run();board.run();playSession.run();earlyOutcome.run();
    try{
      const sender=window.App?.senderManager?.get?.('g1005',false),socket=sender?.service?._client?._io,manager=socket?.io||socket;
      const view=window.App?.entryManager?.getEntry?.('g1005')?.gameView;
      if(!manager||socket.connected!==true||view?.bundle!=='g1005'||typeof sender?.send!=='function'){
        detachParsedStatus();restoreNativeQueries();subscriptions.length=0;
        report('等待賽特 II 載入與連線；會自動重新偵測。');return;
      }
      subscriptions.length=0;subscriptions.push(manager);observeNativeQueries(sender);attachParsedStatus(sender);
      report('賽特 II 自動監聽中；使用原生已解析回覆，背景依序讀取清單與明細。');maybeContinueRooms();
    }catch(_){errors++;report('等待賽特 II 查詢通道。');}
  }
  window.addEventListener('message',e=>{
    if(e.source!==window||e.origin!==location.origin)return;
    const m=e.data;if(!m||m.tag!==TAG||m.from!=='ui')return;
    if(m.kind==='performanceMode'){
      if(licenseBlocked)return;
      powerSaving=m.data?.enabled===true;scan.interval=roomQueryDelay();
      if(scan.running&&!scan.pending){clearTimeout(nextScanTimer);nextScanTimer=setTimeout(nextDetail,scan.interval);}
      controls.report();scanReport();return;
    }
    if(m.kind==='editionScope'){
      const allowed=Array.isArray(m.data?.roomIds)?new Set(m.data.roomIds):null;
      if(scan.settings)scan.settings={...scan.settings,...m.data};
      if(allowed){scan.queue=scan.queue.filter(id=>allowed.has(id));if(scan.priority&&!allowed.has(scan.priority))scan.priority=null;scan.total=scan.done+scan.queue.length;}
      return;
    }
    if(m.kind==='licensePause'){licenseBlocked=true;scan.continueRequested=false;cancelAction('授權待驗證。');pauseScan('授權待驗證。');return;}
    if(m.kind==='licenseResume'){licenseBlocked=false;return;}
    if(licenseBlocked&&!['autoSpinStop','scanPause','stop'].includes(m.kind))return;
    if(m.kind==='roomSeed')seedRooms(m.data);
    if(m.kind==='priorityRoom')prioritizeRoom(m.data);
    if(m.kind==='scanContinue')continueRooms(m.data);
    if(m.kind==='changeRoom')queueAction('switch',m.data);
    if(m.kind==='checkRoom')queueAction('roomCheck',m.data);
    if(m.kind==='scanStart')startScan(m.data);
    if(m.kind==='scanSpeed'&&Number.isFinite(m.data?.interval)){
      scan.interval=roomQueryDelay();if(scan.settings)scan.settings.interval=scan.interval;
      if(scan.running&&!scan.pending){clearTimeout(nextScanTimer);nextScanTimer=setTimeout(nextDetail,scan.phase==='pages'?1000:scan.interval);}
      scanReport();
    }
    if(m.kind==='scanPause')pauseScan();
    if(m.kind==='scanResume')resumeScan();
    if(m.kind==='scanRetry'&&!scan.pending){scan.failed=0;scan.lastError=null;if(scan.phase==='pages')startScan(scan.settings);else resumeScan();}
    if(m.kind==='ping'){report('讀取端已就緒，按開始後才監看。');controls.run();}
    if(m.kind==='controlDetect'){controls.recheck();board.run();playSession.run();earlyOutcome.run();}
    if(m.kind==='boardDetect')board.recheck();
    if(m.kind==='boardConfigure')board.configure(m.data);
    if(m.kind==='controlFocus'){controlFocus=m.data?.active===true;if(controlFocus&&scan.running)pauseScan('等待控制操作完成後接續房間查詢。');controls.report();}
    if(m.kind==='animationSpeed')controls.speed(m.data?.factor);
    if(m.kind==='bonusConfigure')playSession.configureBonus(m.data);
    if(m.kind==='playStart')queueAction('start',m.data);
    if(m.kind==='autoSpinStop'){cancelAction('已取消待執行操作。');playSession.stop('手動停止');}
    if(m.kind==='betApply')queueAction('bet',m.data);
    if(m.kind==='start')start();
    if(m.kind==='stop'){stop();report('已停止監看。');}
  });
  window.addEventListener('pagehide',()=>stop());
  }

  // BEGIN CLOUD LABELS
  const GAME_LABELS=Object.freeze({seth1:'賽特 I',seth2:'賽特 II',red3k:'red3k',hades:'hades',tiger:'tiger',vampire:'vampire',jinlian:'jinlian'});
  const SCORE_KEYS=['c0','c1','c2','rtp','bet','rtp30','bet30'];
  const own=(object,key)=>object!=null&&Object.prototype.hasOwnProperty.call(object,key);
  function gameId(value){if(typeof value!=='string')return null;const key=value.trim().toLowerCase();return own(GAME_LABELS,key)?key:null;}
  // END CLOUD LABELS

  const TAG='room-assistant-201',rooms=new Map(),details=new Map();
  let lowPower=/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent||'')||(/Mac/i.test(navigator.userAgent||'')&&(navigator.maxTouchPoints||0)>1),roomRevision=0;
  let restoringPreferences=true,preferredBet=null,preferredCount=null,preferredSpeed=1,speedPreferenceApplied=false;
  let tab='combined',page=0,pageSize=10,sortBy='score_combo',sortDir='desc',layout='cards';
  let autoEnabled=true,autoLaunched=false,autoAttempts=0,autoQueueTimer=null,autoHold=false;
  let mainPanel='rank',queryInterval=500,queryScope='empty';
  let options={gameSelection:'seth2',minBet:0,maxAge:300};
  let detectedGame=null;
  try {const q=new URL(location.href).searchParams;for(const key of ['game','gameKey','gameCode','game_code']){const value=q.get(key);if(value){detectedGame=value.slice(0,80);break;}}}catch(_){}
  const access=()=>licenseControl?.access?.()||null;
  const rights=()=>access()?.entitlements||{max_speed:1,max_batch:1,history_count:1,max_symbol_rules:0};
  let eligibilityCache=null;
  function eligibleRoomIds(){
    const a=access();if(!a)return new Set();
    const stamp=[roomRevision,rooms.size,selected,a.license_ref,a.tier,a.usage.day,a.usage.used,a.usage.limit].join('|');
    if(eligibilityCache?.stamp===stamp)return eligibilityCache.ids;
    if(a.entitlements.daily_rooms===null){const ids=new Set(rooms.keys());eligibilityCache={stamp,ids};return ids;}
    const ids=new Set(a.usage.room_ids.map(fromAnalysisIdentity).filter(Boolean)),left=Math.max(0,a.entitlements.daily_rooms-a.usage.used);
    const ordered=[...rooms.values()].sort((x,y)=>(x.roomId===selected?-1:y.roomId===selected?1:0)||(x.status==='Empty'?0:1)-(y.status==='Empty'?0:1)||(x.number??Infinity)-(y.number??Infinity));
    let added=0;for(const room of ordered)if(!ids.has(room.roomId)&&added<left){ids.add(room.roomId);added++;}
    eligibilityCache={stamp,ids};return ids;
  }
  function analysisIdentity(value){return typeof value==='string'&&/^[1-9]\d{0,10}$/.test(value)?'1005'+value.padStart(11,'0'):null;}
  function fromAnalysisIdentity(value){return typeof value==='string'&&/^1005\d{11}$/.test(value)?value.slice(4).replace(/^0+(?=\d)/,''):null;}
  // Cloud analysis transports measured room statistics; no scoring rules live in this client.
  const cloudScores=new Map(),cloudDirty=new Set();
  let cloudTimer=null,cloudRunning=false,cloudFailures=0,cloudNextAt=0,cloudGeneration=0,cloudPaused=false,cloudError='';
  const cloudClock=()=>window.performance?.now?.()??Date.now();
  function cloudRecord(room,detail){
    const basic=record=>({roomId:analysisIdentity(record.roomId),receivedAt:record.receivedAt,gameRaw:record.gameRaw??null,scoreFields:cleanScoreFields(record.scoreFields)});
    const row=basic(room);row.status=room.status;row.entryFailure=room.entryFailure?true:null;
    let extra=null;
    if(detail){extra=basic(detail);extra.mgCounts=Array.isArray(detail.mgCounts)?detail.mgCounts.slice(0,3):null;
      // g1005 原生選房明細「近30天」：betDay = dayBet；rateDay = dayWin / dayBet × 100。
      // 保留伺服器提供的明確欄位（含別名），衍生值沿用這筆明細的時間。
      const hasPeriodField=(...names)=>names.some(name=>own(extra.scoreFields,name)||own(row.scoreFields,name));
      const bet=detail.dayBet,win=detail.dayWin;
      if(n(bet)!==null&&bet>=0){
        if(!hasPeriodField('bet30','bet_30'))extra.scoreFields.bet30=bet;
        if(bet>0&&n(win)!==null&&win>=0&&!hasPeriodField('rtp30','rtp_30')){
          const rate=win/bet*100;
          if(Number.isFinite(rate))extra.scoreFields.rtp30=rate;
        }
      }
    }
    return {room:row,detail:extra};
  }
  const cloudSnapshots=new Map();
  function cloudSnapshot(id){
    const room=rooms.get(id);if(!room||!analysisIdentity(id))return null;
    const detail=details.get(id),a=access(),prior=cloudSnapshots.get(id);
    if(prior&&prior.room===room&&prior.detail===detail&&prior.status===room.status&&prior.failure===room.entryFailure&&prior.options===options&&prior.game===detectedGame&&prior.tier===a?.tier&&prior.license===a?.license_ref)return prior.snapshot;
    const item=cloudRecord(room,detail),settings={gameSelection:options.gameSelection,minBet:options.minBet,maxAge:options.maxAge};
    const snapshot={id,item,settings,detectedGame,key:JSON.stringify([item,settings,detectedGame,a?.tier,a?.license_ref])};
    cloudSnapshots.set(id,{room,detail,status:room.status,failure:room.entryFailure,options,game:detectedGame,tier:a?.tier,license:a?.license_ref,snapshot});
    if(cloudSnapshots.size>5000)cloudSnapshots.delete(cloudSnapshots.keys().next().value);
    return snapshot;
  }
  function queueCloud(id){
    if(rooms.has(id)&&eligibleRoomIds().has(id))cloudDirty.add(id);
    if(cloudTimer!==null||cloudRunning||cloudPaused||document.hidden||!cloudDirty.size||licenseControl?.isAuthorized?.()!==true)return;
    cloudTimer=setTimeout(()=>{cloudTimer=null;runCloudBatch();},Math.max(lowPower?1000:600,cloudNextAt-cloudClock()));
  }
  function pendingCloud(room){
    const note=cloudError?'本機暫不可用':'本機評分中';
    return {score_combo:null,score_boom:null,score_return:null,score:null,status:note,missing:[],inputs:{},breakdown:null,
      today:null,rtp30:null,wait:null,freshWait:false,empty:room.status==='Empty'&&!room.entryFailure,
      reasons:[cloudError||'房間資料正在本機計算。'],game:gameId(options.gameSelection),gameRaw:options.gameSelection,
      fieldSources:{},listAge:null,detailAge:null,formulaSource:'本機規則評分',period:'等待本機核對統計期間。'};
  }
  function cloudRoomAnalysis(room){
    const snapshot=cloudSnapshot(room.roomId),cached=cloudScores.get(room.roomId);
    if(licenseControl?.isAuthorized?.()===true&&cached&&cached.key===snapshot.key&&cached.until>cloudClock())return cached.value;
    queueCloud(room.roomId);return pendingCloud(room);
  }
  function validateCloudResponse(data,batch){
    if(!data||!Array.isArray(data.results)||data.results.length!==batch.length)throw Error('本機回覆不完整，等待重新查詢。');
    const wanted=new Set(batch.map(item=>item.id)),seen=new Set();
    for(const row of data.results){
      const value=row?.analysis;
      if(!wanted.has(row?.roomId)||seen.has(row.roomId)||!value||!['規則評分','資料不足','不支援此遊戲','版本額度已滿'].includes(value.status))throw Error('本機回覆格式不正確。');
      seen.add(row.roomId);
      for(const field of ['score_combo','score_boom','score_return'])if(value[field]!==null&&(!Number.isInteger(value[field])||value[field]<0||value[field]>1000))throw Error('本機分數格式不正確。');
      if(value.status==='規則評分'&&(rights().all_scores?['score_combo','score_boom','score_return']:['score_combo']).some(field=>value[field]===null))throw Error('本機分數不完整。');
      if(value.status!=='規則評分'&&['score_combo','score_boom','score_return'].some(field=>value[field]!==null))throw Error('本機狀態與分數不一致。');
      for(const field of ['today','rtp30','wait'])if(value[field]!==null&&(typeof value[field]!=='number'||!Number.isFinite(value[field])||value[field]<0))throw Error('本機統計格式不正確。');
      if(!Array.isArray(value.missing)||!Array.isArray(value.reasons)||!value.inputs||typeof value.inputs!=='object'||!value.fieldSources||typeof value.fieldSources!=='object'||!Number.isFinite(value.valid_for_seconds)||value.valid_for_seconds<=0||value.valid_for_seconds>30)throw Error('本機有效期或欄位回覆無效。');
      if(value.breakdown!==null)throw Error('本機回覆包含非公開欄位。');
    }
    return data.results;
  }
  async function runCloudBatch(){
    if(cloudRunning||cloudPaused||document.hidden||licenseControl?.isAuthorized?.()!==true)return;
    const ids=[...cloudDirty];if(selected!==null&&cloudDirty.has(selected)){ids.splice(ids.indexOf(selected),1);ids.unshift(selected);}
    const eligible=eligibleRoomIds();for(const id of ids)if(!eligible.has(id))cloudDirty.delete(id);
    const batch=ids.filter(id=>eligible.has(id)).map(cloudSnapshot).filter(Boolean).slice(0,lowPower?100:50);
    for(const id of ids)if(!rooms.has(id)){cloudDirty.delete(id);cloudScores.delete(id);}
    if(!batch.length)return;
    for(const item of batch)cloudDirty.delete(item.id);
    cloudRunning=true;const generation=cloudGeneration,started=cloudClock();
    try{
      const wire=await licenseControl.analyze({rooms:batch.map(row=>row.item),options:batch[0].settings,detected_game:batch[0].detectedGame});
      const data={...wire,results:Array.isArray(wire?.results)?wire.results.map(row=>({...row,roomId:fromAnalysisIdentity(row.roomId)})):wire?.results};
      const rows=validateCloudResponse(data,batch);
      if(generation!==cloudGeneration||licenseControl?.isAuthorized?.()!==true){for(const item of batch)if(rooms.has(item.id))cloudDirty.add(item.id);return;}
      const snapshots=new Map(batch.map(item=>[item.id,item]));
      for(const row of rows){
        const snapshot=cloudSnapshot(row.roomId);if(!snapshot)continue;
        if(snapshot.key!==snapshots.get(row.roomId).key){cloudDirty.add(row.roomId);continue;}
        cloudScores.set(row.roomId,{key:snapshot.key,value:row.analysis,until:started+row.analysis.valid_for_seconds*1000});
      }
      cloudFailures=0;cloudNextAt=0;cloudError='';
    }catch(error){
      for(const item of batch)if(rooms.has(item.id))cloudDirty.add(item.id);
      cloudFailures++;cloudNextAt=cloudClock()+Math.min(30000,1000*2**Math.min(cloudFailures-1,5));
      cloudError=error.message||'本機評分失敗。';
      if(error.status===401||error.status===403)cloudScores.clear();
    }finally{
      cloudRunning=false;refresh();if(cloudDirty.size)queueCloud(cloudDirty.values().next().value);
    }
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.tag!=='room-assistant-201'||event.data?.from!=='ui')return;
    if(event.data.kind==='licensePause'){cloudGeneration++;cloudScores.clear();clearTimeout(cloudTimer);cloudTimer=null;}
    if(event.data.kind==='licenseResume')for(const id of rooms.keys())queueCloud(id);
  });
  window.addEventListener('pagehide',()=>{cloudPaused=true;cloudGeneration++;clearTimeout(cloudTimer);cloudTimer=null;});
  window.addEventListener('pageshow',()=>{cloudPaused=false;for(const id of rooms.keys())queueCloud(id);});

  let selected=null,connected=false,pending=false,timer=null,readerReady=false,lastReaderProbe=0;
  let controlState=null,controlReceivedAt=0,queuedState=null,switchState=null,earlyState=null,playState=null,boardState=null,previewFrozen=false,boardPreview=null;
  let scanState={running:false,done:0,total:0,skipped:0,failed:0,remaining:0,pending:null,interval:500,queryPending:false,phase:'pages',pagesDone:0,pagesTotal:0,pagesComplete:false,expectedRooms:null,note:'等待自動取得分頁清單'};
  function injectReader(){
    try {
      if(readerReady)return;
      const script=document.createElement('script');
      script.textContent='('+installPageReader.toString()+')();';
      (document.head||document.documentElement).appendChild(script);script.remove();
    }catch(_){status='Userscripts 介面已啟動，但 Safari 頁面讀取端無法建立；請確認遊戲網站權限。';}
  }
  let status='介面已執行；尚未確認讀取端。',refreshNote='尚未收到列表';
  const host=document.createElement('div');host.id='room-panel-201';
  for(const [k,v] of Object.entries({position:'fixed',top:'max(8px, env(safe-area-inset-top))',left:'50%',right:'auto',display:'block',visibility:'visible',opacity:'1','z-index':'2147483647',margin:'0',padding:'0',transform:'translateX(-50%)'}))host.style.setProperty(k,v,'important');
  const root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>
:host{color-scheme:dark}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}button:disabled{opacity:.38;cursor:default}[hidden]{display:none!important}
button,input,select,textarea{font-family:system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #ffe29b;outline-offset:2px}
section{width:min(94vw,432px);max-height:88vh;overflow:auto;overscroll-behavior:contain;color:#f4ecd9;background:radial-gradient(ellipse at 100% 0,#5d472329,transparent 46%),#100d0d;border:1px solid #a8873d;border-radius:17px;padding:15px;box-shadow:0 18px 65px #000b;font:12px/1.55 system-ui;scrollbar-width:thin;scrollbar-color:#a5833a #121819}
button{color:#e8d6aa;border:1px solid #66542b;border-radius:7px;background:#141b1b;padding:8px 10px}button:hover{border-color:#e7bf61;background:#24251b}#toggle,.gold{background:linear-gradient(120deg,#ffe49b,#d6a940);color:#211b0e;border-color:#fce5a5;box-shadow:inset 0 1px #fff6;font-weight:750}#toggle{padding:9px 15px;margin-bottom:6px;border-radius:10px;font-size:13px;box-shadow:0 6px 23px #0007}
.mast{display:flex;align-items:center;gap:10px;padding:1px 0 12px}.emblem{width:36px;height:36px;border:1px solid #9c803d;border-radius:50%;display:grid;place-items:center;color:#f4cf75;background:radial-gradient(circle,#5b452c,#101719);font-size:23px;box-shadow:0 0 0 3px #d3ab4a0c}.brand{flex:1}h2{font-size:19px;letter-spacing:1px;margin:0;color:#f4d890}h2 small{font-size:10px;letter-spacing:0;color:#a89874;font-weight:400}.eyebrow{font-size:10px;color:#9e9986;letter-spacing:1px}.live{font-size:10px;color:#9fdfc4;border:1px solid #3f6b54;border-radius:99px;padding:3px 7px;background:#13251d}#minimize{font-size:18px;padding:0 7px;border:0;background:transparent}
.gamebar{display:flex;justify-content:space-between;align-items:center;border:1px solid #3b4b46;background:linear-gradient(100deg,#17272a,#101b1d);border-radius:7px;padding:10px 11px;font-weight:650}.gamebar small{font-weight:400;color:#c6b67d}.sessionbar{display:flex;align-items:center;gap:8px;margin:9px 0}.sessionbar #start{white-space:nowrap;font-size:11px;padding:6px 10px}#status{flex:1;font-size:10px;color:#aab9ad;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.muted,#domain{font-size:10px;color:#a79f87}.tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;background:#0c1314;border:1px solid #2f3831;padding:3px;border-radius:8px;margin:10px 0}.tabs button{border:0;background:transparent;font-size:11px;padding:9px 2px;color:#c0bba6}.tabs button span{display:block;font-size:9px;color:#908e7e}.tabs button[aria-selected="true"]{background:linear-gradient(125deg,#ffe5a0,#d2a33f);color:#251e0f;box-shadow:inset 0 0 0 1px #ffe4a2;border-radius:5px;font-weight:750}.tabs button[aria-selected="true"] span{color:#72531b}
input,select,textarea{background:#111a1b;border:1px solid #4a4b36;color:#f5eedc;border-radius:6px;padding:8px;max-width:100%}.filterbar{display:flex;align-items:center;gap:8px}.filterbar #search{flex:1;min-width:0;font-size:11px}.filterbar label{white-space:nowrap;font-size:11px;color:#c6b994}input[type=checkbox]{accent-color:#d5b15b;width:auto;vertical-align:middle}.stats{display:flex;gap:0;padding:9px 0;color:#aaa48b}.stats>div{flex:1;text-align:center;border-right:1px solid #393b2d}.stats>div:last-child{border:0}.stats span{font-size:9px;margin-right:6px}.stats b{font-size:16px;font-weight:650;color:#e4ca8e;font-variant-numeric:tabular-nums}.gamebar select{font-size:10px;padding:5px;max-width:112px}.gamebar label{font-size:9px;color:#b9ad89}.scoretriplet{grid-column:2/-1;display:flex;justify-content:space-between;gap:5px;border-top:1px solid #51432a;padding-top:5px;font-size:9px;color:#bdb292}.scoretriplet b{color:#e5cb88;font-size:11px}.scorebox b.pending{font-size:11px;line-height:1.5;overflow-wrap:anywhere}
.periodNotice{font-size:10px;color:#d5bd80;border:1px solid #62512c;border-radius:6px;padding:7px;margin:5px 0}.periodNotice button{padding:4px 6px;margin-left:5px;font-size:10px}
.scanstrip{margin:0 0 8px;font-size:10px;color:#bca76e}.scanstrip progress{display:block;width:100%;height:4px;accent-color:#d9b85f;margin:0 0 4px}
.list{display:grid;gap:6px;max-height:43vh;overflow:auto;padding:2px 4px 2px 1px;scrollbar-width:thin;scrollbar-color:#c0a354 #151b16}.row{display:grid;grid-template-columns:25px minmax(0,1fr) 72px 65px;gap:7px;align-items:center;position:relative;isolation:isolate;min-width:0;border:1px solid #8b7136;border-radius:9px;padding:10px 8px;background:linear-gradient(105deg,#1f2315aa,#0b1112 55%);box-shadow:inset 0 0 0 2px #cba4410b;overflow:hidden}.row:after{content:'◈';position:absolute;z-index:-1;right:9px;top:-26px;color:#d4b65d0b;font-size:125px;line-height:1;transform:rotate(15deg);pointer-events:none}.row.active{border-color:#ffe2a0;box-shadow:inset 3px 0 #f5cf77,0 0 0 1px #e2bd5144}.medal{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;border:1px solid #7b806a;background:linear-gradient(135deg,#909686,#3f4b47);color:#fff9df;font-size:15px;font-weight:750}.medal.first{color:#503b0b;border-color:#fff0a0;background:linear-gradient(135deg,#fff7b6,#d4aa33);box-shadow:0 0 12px #d9bd4f35}.medal.second{color:#343f43;border-color:#edf1ed;background:linear-gradient(135deg,#fcffff,#96a8ab)}.medal.third{color:#572d12;border-color:#f6c295;background:linear-gradient(135deg,#f8d0aa,#b97943)}.roomline{display:flex;align-items:baseline;gap:4px;white-space:nowrap}.roomline small{font-size:9px;color:#aba48a}.roomtitle{font-size:29px;font-weight:800;letter-spacing:-.8px;color:#fff4cf;line-height:1.1;font-variant-numeric:tabular-nums}.roominfo{min-width:0}.roomsub{font-size:10px;color:#d6dccc;white-space:nowrap}.roomsub b{font-weight:550;color:#f6e5aa}.positive{color:#f0aa8e!important}.negative{color:#8ed6b5!important}.roomhint{font-size:9px;color:#a59d81;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scorebox{text-align:center;border-left:1px solid #4b4228;border-right:1px solid #4b4228;padding:0 4px}.scorebox span{display:block;font-size:9px;color:#d0c5a4}.scorebox b{display:block;color:#ffe187;font-size:29px;line-height:1.15;font-weight:800;text-shadow:0 2px #8c622640;font-variant-numeric:tabular-nums}.scorebox small{display:block;color:#918b76;font-size:9px}.scorebox b.pending{font-size:13px;line-height:2;color:#b2a683}.actions{display:grid;gap:5px}.actions button{font-size:10px;padding:5px 3px;white-space:nowrap}.actions .gold{font-size:11px;padding:7px 3px}.badge{font-size:9px;color:#a5cdb4}.badge.locked{color:#c7ac74}.badge.full{color:#b9adc3}
.list.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.list.grid .row{grid-template-columns:25px minmax(0,1fr);gap:6px}.list.grid .scorebox{grid-column:2;border:0;text-align:left}.list.grid .actions{grid-column:1/-1;display:flex}.list.grid .actions button{flex:1}.list.grid .roomtitle{font-size:25px}.list.compact .row{padding:6px 8px}.list.compact .roomtitle{font-size:23px}.list.compact .scorebox b{font-size:24px}.list.compact .roomhint{display:none}.list.compact .actions button{padding:3px}.emptybox{padding:35px 15px;text-align:center;color:#b6aa87;border:1px dashed #665737;border-radius:9px;grid-column:1/-1}.emptybox strong{display:block;font-size:16px;color:#e4cb8f;margin-bottom:6px}
.pager{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 0 7px}.pager button{font-size:10px;padding:6px 9px}.pagetext{flex:1;min-width:0;color:#aaa58e;font-size:10px}.pagetext span{display:block}#page{color:#ddd1af}#lastUpdated{font-size:9px}.sortbar{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:6px;margin:8px 0}.sortbar label{font-size:10px;color:#b6ac90}.sortbar select{display:block;width:100%;padding:6px 2px;margin-top:3px;font-size:10px}.displayOptions{margin:4px 0 8px;padding:0;border:0}.displayOptions summary{text-align:right;font-size:10px;color:#c0ad75}
details{border:1px solid #4b452f;border-radius:8px;padding:8px 9px;margin:9px 0;background:#10161466}summary{cursor:pointer;font-size:11px;color:#dfc586}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.75 system-ui;color:#ded8c5}.controls{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.controls label{font-size:10px;color:#b7ae95}.controls input{display:block;width:76px;padding:6px}.controls button{align-self:end}.historygrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.historycell{background:#19201a;border:1px solid #4c4d31;border-radius:6px;padding:6px;text-align:center}.historycell:first-child{grid-column:span 2;background:#30311a}.historycell span{display:block;font-size:9px;color:#b8b091}.historycell b{font-size:20px;color:#f3d67f}.historycell small{display:block;font-size:8px;color:#a7a188}.controlbuttons{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0}.controlbuttons button{font-size:10px}#scanNote,#count{font-size:10px;color:#a7ac94;margin:6px 0}textarea{width:100%;height:170px;font:10px monospace}#copy{width:100%;font-size:11px}.autoSetting{display:flex;align-items:center;justify-content:space-between;margin:8px 0;font-size:11px;color:#e4cf98}.autoSetting select{font-size:10px;padding:5px}.footnote{font-size:9px;color:#9b977e;border-top:1px solid #343a2b;padding-top:9px;margin-top:10px}

.playControls{padding:10px;border:1px solid #9a7c3c;border-radius:10px;background:linear-gradient(135deg,#282316,#111a1b);margin:10px 0}.playHeading,.speedHeading{display:flex;align-items:center;gap:7px;color:#f4d890}.playHeading strong,.speedHeading strong{flex:1}.playHeading span{font-size:10px;color:#a8d7bb}.playHeading button{font-size:10px;padding:5px 7px}.spinControls{display:flex;gap:6px;align-items:end;margin:9px 0}.spinControls label{font-size:10px;flex:1;min-width:0}.spinControls select{display:block;width:100%;font-size:11px;padding:7px 3px;margin-top:3px}.spinControls button{font-size:11px;padding:8px 6px;min-height:38px}.controlNote{font-size:10px;line-height:1.6;color:#b5b29c;margin:5px 0;overflow-wrap:anywhere}.speedHeading{margin-top:10px;font-size:11px}.speedHeading span{color:#f8d887;font-size:13px}.speedButtons{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:7px 0}.speedButtons button{min-height:35px;padding:6px}.speedButtons button[aria-pressed=true]{background:linear-gradient(125deg,#ffe5a0,#d2a33f);color:#251e0f;border-color:#ffe4a2;font-weight:750}#spinStop{border-color:#aa7954;color:#ffd4a6}
@media(max-width:600px){.list{max-height:clamp(160px,calc(88vh - 460px),43vh)}}
@media(max-width:360px){section{padding:11px}.row{grid-template-columns:23px minmax(0,1fr) 60px 56px;gap:5px;padding:9px 6px}.roomtitle{font-size:25px}.scorebox b{font-size:25px}.roomsub{font-size:9px}.sortbar{grid-template-columns:1fr 1fr}.sortbar label:first-child{grid-column:1/-1}}
@supports(height:100dvh){section{max-height:calc(100dvh - 66px)}}
@media(pointer:coarse){input,select,textarea{font-size:16px!important}.sortbar{grid-template-columns:1fr 1fr}.autoSetting{flex-wrap:wrap;gap:6px}.gamebar select{max-width:126px}}
@media(max-height:500px){section{max-height:82vh}.list{max-height:40vh}.mast{padding-bottom:6px}}

.roomHistory{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;margin-top:4px;min-width:0}.roomHistoryCell{min-width:0;border:1px solid #51462d;border-radius:5px;background:#191d17;padding:4px 2px;text-align:center}.roomHistoryCell:first-child{grid-column:span 2;background:#302a17;border-color:#96804b}.roomHistoryCell span{display:block;font-size:9px;line-height:1.2;color:#beb59b;white-space:nowrap}.roomHistoryCell b{display:block;color:#f6da8d;font-size:14px;line-height:1.4}.roomHistoryNote{grid-column:1/-1;color:#a7a18c;font-size:9px}.staleHistory .roomHistoryCell{opacity:.6}
.roomTools{display:flex;flex-wrap:wrap;gap:5px;margin:5px 0}.roomTools button{font-size:10px;padding:6px 8px;min-height:32px}#roomCacheNote{font-size:10px;margin:4px 0}
.riskCard{padding:10px;border:1px solid #7e6540;border-radius:12px;background:#251f15;margin:9px 0}.riskInputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.riskInputs label{display:grid;gap:5px;font-size:11px}.riskInputs input[type=number]{min-width:0;width:100%;padding:8px}.manualSpeed{display:flex;align-items:center;gap:6px;margin:8px 0}.manualSpeed input{width:70px;min-width:0;padding:8px}.manualSpeed button{padding:8px;font-size:11px}.sessionNetBadge{font-size:11px;color:#d8c79b}.sessionNetBadge.loss{color:#ffac98}.sessionNetBadge.gain{color:#a4e8bf}#sessionRtp{font-size:34px}.earlyCard,.riskCard,.sessionResult{box-shadow:inset 0 1px #ffffff08}.sessionModes>#strategySettings{padding:8px;background:#151c19}.sessionModes>label{grid-template-columns:1fr;gap:5px}
.moneyHighlights{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.moneyHighlights>div{padding:12px 9px;background:linear-gradient(135deg,#342811,#18140c);border:1px solid #9e7c31;border-radius:12px}.moneyHighlights span{display:block;color:#d1c7ae;font-size:11px}.moneyHighlights strong{display:block;font-size:25px;color:#ffe094;line-height:1.3;overflow-wrap:anywhere}.moneyHighlights strong.loss{color:#ff9b8a}.moneyHighlights strong.gain{color:#8cf1bc}
.boardJoinLabel{display:grid;gap:5px;font-size:11px;margin:7px 0}.boardJoinLabel select{width:100%}
.earlyCard{padding:9px;margin:8px 0;border:1px solid #a78441;border-radius:9px;background:linear-gradient(135deg,#30291a,#111d1b)}.earlyCard pre{font-size:11px;line-height:1.6;margin:5px 0}.earlyCard button{font-size:10px;padding:5px 8px}
.sessionModes{display:grid;gap:7px;margin:10px 0}.sessionModes>label,.sessionModes>#strategySettings{display:grid;gap:6px}.sessionModes select,.sessionModes input[type=number]{width:100%;min-width:0}.sessionModes label{font-size:11px;color:#d6c8a4}.sessionModes button{font-size:10px;padding:5px}.rtpStopInputs{display:grid;grid-template-columns:85px minmax(0,1fr) 18px;align-items:center;gap:5px}.sessionResult{padding:9px;border:1px solid #5b4a2b;border-radius:8px;background:#101a19}.sessionResult>span{display:block;font-size:10px;color:#bfb08a}.sessionResult>strong{font-size:25px;color:#ffe397}.sessionResult pre{font-size:10px;margin:5px 0}
.previewHeading{display:flex;justify-content:space-between;gap:6px;align-items:center;margin:7px 0;font-size:11px;color:#f4d890}.previewHeading span{font-size:9px;color:#a8ccb3}.boardGrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;margin:5px 0}.boardTile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:52px;padding:13px 2px 4px;border:1px solid #66512d;border-radius:6px;background:linear-gradient(140deg,#292b20,#121b1c);color:#efdbad;text-align:center}.boardTile small{position:absolute;top:2px;left:4px;color:#9b967f;font-size:8px}.boardTile span{font-size:10px;line-height:1.2;white-space:nowrap}.boardTile b{font-size:9px;font-weight:500;color:#b8ad8c}.boardTile.symbol-5{color:#ffb462}.boardTile.symbol-6{color:#ff8d7a}.boardTile.symbol-7{color:#d3a1ff}.boardTile.symbol-8{color:#8acaff}.boardTile.symbol-9{color:#83e0b8}.boardTile.symbol-14,.boardTile.symbol-15{background:linear-gradient(140deg,#59401c,#231d16);border-color:#b89147;color:#ffe397}.boardTile.unknown{border-style:dashed;opacity:.65}.previewButtons{display:flex;gap:6px;margin:7px 0}.previewButtons button{flex:1;font-size:11px;padding:7px}#boardPreviewText{height:160px}
.symbolCounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.symbolCell{display:flex;justify-content:space-between;align-items:center;gap:4px;padding:5px 6px;border:1px solid #423d2c;border-radius:6px;color:#cfc4a5;font-size:10px;background:#111918}.symbolCell b{font-size:16px;color:#ffe296}.boardRule{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px;padding:8px 0;border-bottom:1px solid #3c3d2c}.boardRule select,.boardRule input{min-width:0;width:100%;font-size:11px;padding:6px}.boardRule button{justify-self:start;padding:4px 8px;font-size:10px}.boardScopes{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:11px}.boardHit{white-space:pre-wrap;color:#ffe2a0;border:1px solid #be9142;border-radius:8px;padding:8px;background:#302516;font-size:11px}
/* Compact top-centre dock: one independently scrolling feature panel at a time. */
section{width:min(400px,calc(100vw - 20px));max-height:min(60vh,510px);padding:10px;display:flex;flex-direction:column;overflow:hidden;border-radius:14px;gap:0}
.dockBar{display:flex;align-items:center;justify-content:center;gap:6px;margin:0 0 5px}
#toggle{margin:0;padding:7px 12px;font-size:12px;max-width:calc(100vw - 64px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#miniStop{min-height:32px;padding:5px 10px;border-radius:9px;background:#542c22;color:#ffe3bd;border-color:#bd8a55;font-size:11px}
.mast{flex:0 0 auto;padding:0 0 5px;gap:7px}.emblem{width:26px;height:26px;font-size:17px}.brand h2{font-size:15px;letter-spacing:.5px}.brand h2 small{font-size:9px}.eyebrow{font-size:9px;letter-spacing:0}.live{font-size:9px;padding:2px 6px}
.sessionbar{flex:0 0 auto;margin:0 0 5px;min-width:0}#status{-webkit-line-clamp:1;font-size:9px}
.mainTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;flex:0 0 auto;background:#080e10;padding:3px;border:1px solid #4a4028;border-radius:9px}
.mainTabs button{font-size:11px;min-height:34px;border:0;background:transparent;padding:6px 3px;color:#bfb7a0;font-size:12px}
.mainTabs button[aria-selected=true]{background:linear-gradient(125deg,#ffe5a0,#d2a33f);color:#261e10;font-weight:750;border-radius:6px}
.featurePanel{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#b39757 #121819;padding:5px 2px 2px;flex:0 1 auto}
.featurePanel select,.featurePanel input{touch-action:manipulation}
.scanstrip{flex:0 0 auto;margin:5px 0 1px;font-size:9px}.scanstrip progress{height:3px;margin-bottom:2px}
.featurePanel .list{max-height:none;overflow:visible;padding-right:1px}.tabs{margin:5px 0;padding:2px}.tabs button{padding:5px 1px;font-size:10px}.tabs button span{display:none}
.periodNotice{font-size:9px;padding:5px;margin:2px 0 5px}.stats{padding:5px 0}.stats b{font-size:14px}.filterbar #search{padding:6px}.pager{margin-top:6px}.row{padding:7px 6px;gap:5px}.roomtitle,.scorebox b{font-size:25px}.roomsub{font-size:10px}.row:after{font-size:100px}
.playControls{margin:0;border:0;background:none;padding:3px}.betControls{padding-bottom:7px;border-bottom:1px solid #433b28}.playHeading{margin-bottom:8px}.speedHeading{padding-top:7px;border-top:1px solid #433b28}
.settingsCard{background:#141a18;border:1px solid #49432e;border-radius:8px;padding:9px;margin:2px 0 8px}.settingsCard strong{display:block;margin-bottom:6px;color:#e4ce99}.settingsCard select{width:100%;margin:4px 0}.settingsCard p{margin:4px 0 0}
.featurePanel .footnote{font-size:9px;margin-top:7px;padding-top:6px}.featurePanel>details{margin:7px 0}#copy{margin-top:7px}
@supports(height:100dvh){section{max-height:min(60dvh,510px)}}
@media(max-height:500px){section{max-height:68vh;width:min(380px,calc(100vw - 20px));padding:8px}.mast{padding-bottom:3px}.sessionbar{margin-bottom:3px}.eyebrow{display:none}.mainTabs button{min-height:30px;padding:4px}.scanstrip{margin-top:3px}}
@media(max-height:500px) and (min-width:500px){@supports(height:100dvh){section{max-height:68dvh}}}
#toggle{min-height:48px;min-width:126px;padding:11px 14px;font-size:16px}#miniStart,#miniStop{min-height:46px;min-width:68px;font-size:13px;padding:8px}.dockBar{gap:6px;flex-wrap:wrap}.dockStats{display:flex;justify-content:center;gap:18px;padding:8px 12px;margin-bottom:6px;background:#101b1ef2;border:1px solid #a38444;border-radius:12px;color:#d8c89d;font:12px system-ui}.dockStats b{font-size:19px;color:#ffe3a0}.riskCard #bonusSpeed{width:65px}.featurePanel details:has(#earlyResult),.featurePanel details:has(#sessionSummary),#boardHistory{display:none}

/* One compact dock, never wrap the controls onto another line on phones. */
:host{width:min(340px,calc(100vw - 16px));pointer-events:none}
.dockStats,.dockBar,section{pointer-events:auto}
.dockStats{height:32px;min-width:0;gap:10px;margin:0;padding:3px 8px;border-radius:10px 10px 0 0;font-size:11px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.dockStats:before{content:'⠿';color:#c9b886;font-size:20px;flex:none}.dockStats b{font-size:16px}.dockStats span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dockBar{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:4px;margin:0;padding:4px;border:1px solid #a38444;border-top:0;border-radius:0 0 10px 10px;background:#101b1ef2;width:100%}
#toggle,#miniStart,#miniStop{min-width:0;min-height:44px;max-width:none;margin:0;padding:6px 3px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
section{position:absolute;left:0;top:100%;width:100%;margin-top:5px;max-height:var(--dock-room,55vh)}


/* Phone cards use the available panel width, including a previously saved grid preference. */
:host{width:min(460px,calc(100vw - 16px))}
.roomHistoryCell b{font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.list.grid .roomHistory{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:520px){
  .list,.list.grid{grid-template-columns:minmax(0,1fr)}
  .list .row,.list.grid .row{grid-template-columns:28px minmax(0,1fr) minmax(70px,90px);gap:8px;padding:10px;min-width:0}
  .list .roominfo{grid-column:2;min-width:0}.list .roomsub{overflow-wrap:anywhere;font-size:12px}
  .list.grid .scorebox,.list .scorebox{grid-column:3;grid-row:1;text-align:center;min-width:0;border:0;padding:0}
  .list .scorebox b{font-size:27px}.list .scorebox b.pending{font-size:17px;white-space:normal}
  .list .roomtitle,.list.grid .roomtitle{font-size:30px}
  .list .actions,.list.grid .actions{grid-column:2/-1;display:flex}.list .actions button{flex:1;min-height:40px}
  .list .roomHistory,.list.grid .roomHistory{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
  .roomHistoryCell{padding:6px 3px}.roomHistoryCell span{font-size:11px}.roomHistoryCell b{font-size:17px}
  .roomhint{white-space:normal;overflow:visible;text-overflow:clip}
  .mainTabs{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:330px){.list .row,.list.grid .row{grid-template-columns:24px minmax(0,1fr)}.list .scorebox,.list.grid .scorebox{grid-column:2;grid-row:auto;text-align:left}.list .scorebox b{font-size:23px}.list .roomHistory,.list.grid .roomHistory{grid-template-columns:repeat(3,minmax(0,1fr))}}



/* Highlight a measured comparison, preserving every original rule score and RTP field. */
.roomCompare{grid-column:1/-1;min-width:0;padding:12px;border:1px solid #ba8d43;border-radius:11px;background:radial-gradient(ellipse at 100% 0,#74302b66,transparent 70%),linear-gradient(125deg,#302016,#161410);color:#f5dcb1;box-shadow:inset 0 1px #ffe7a329,0 0 12px #c68c2420}
.roomCompare.is-focus{border-color:#f0c65b;box-shadow:inset 0 1px #fff3,0 0 14px #f4b74430}
.roomCompareTitle{color:#edc97d;font-size:10px;font-weight:750;letter-spacing:1px;margin-bottom:6px}
.roomCompareLabel{color:#e0cfac;font-size:11px;margin-right:9px}
.roomCompareValue{display:inline-block;color:#ffe5a0;font-size:32px;line-height:1.15;font-weight:850;letter-spacing:-1px;font-variant-numeric:tabular-nums;text-shadow:0 0 10px #f0b44350;overflow-wrap:anywhere}
.roomCompareTrack{height:4px;overflow:hidden;border-radius:9px;background:#77623b44;margin:9px 0}
.roomCompareTrack span{display:block;height:100%;background:linear-gradient(90deg,#bf6846,#ffe3a1);border-radius:inherit}
.roomCompareMeta{font-size:11px;line-height:1.55;color:#ead8ba;overflow-wrap:anywhere}
.roomCompareRank{font-size:11px;line-height:1.6;font-weight:650;color:#f2cd7f;overflow-wrap:anywhere}
.roomCompareScope{display:block;font-size:9px;color:#b9ac95;line-height:1.5;margin-top:5px}
.roomCompare.is-pending{border-color:#62563e;background:#211d17;box-shadow:none}
.roomCompare.is-pending .roomCompareValue{font-size:19px;color:#c8bfae;letter-spacing:0;text-shadow:none}
</style>
<div id="dockGrip" class="dockStats" title="拖曳此列移動助手；輕點兩下回到上方置中" aria-label="RTP與單次得分，可拖曳移動"><span>RTP <b id="dockRtp">—</b></span><span><span id="dockAwardLabel">本局總得分</span> <b id="dockAward">—</b></span></div><div id="dockControls" class="dockBar"><button id="toggle" aria-expanded="false" aria-controls="assistantWindow">◈ 賽特 II 助手 ▾</button><button id="miniStart" type="button" disabled>開始旋轉</button><button id="miniStop" type="button" hidden disabled>停止旋轉</button></div>
<section id="assistantWindow" hidden>
  <p class="periodNotice">賽特 II · 房間明細提供近 30 日統計。盤面分頁可查看已讀取的 30 格符號。</p><header class="mast"><div class="emblem" aria-hidden="true">◈</div><div class="brand"><h2>賽特 II 助手 <small>1.19.7 正式版</small></h2><div class="eyebrow"><span id="gameLabel">賽特 II · 規則評分</span></div></div><span class="live" id="liveState">自動模式</span><button id="minimize" aria-label="收合面板">−</button></header>
  <div id="tierSummary" style="padding:8px 0;color:#ffe3a2;font-size:12px;line-height:1.7"></div><button id="licenseInfo" type="button" style="font-size:11px;padding:5px 8px;margin:4px 0">授權資訊</button><div class="sessionbar"><div id="status" role="status"></div></div>
  <nav class="mainTabs" role="tablist" aria-label="助手功能">
    <button id="mainRank" type="button" role="tab" aria-controls="panelRank" aria-selected="true">房間排行</button>
    <button id="mainPlay" type="button" role="tab" aria-controls="panelPlay" aria-selected="false" tabindex="-1">遊戲控制</button>
    <button id="mainBoard" type="button" role="tab" aria-controls="panelBoard" aria-selected="false" tabindex="-1">盤面</button>
    <button id="mainSettings" type="button" role="tab" aria-controls="panelSettings" aria-selected="false" tabindex="-1">資料設定</button>
  </nav>
  <div class="scanstrip" id="scanStrip" hidden><progress id="scanProgress" max="1" value="0"></progress><span id="scanBrief"></span></div>
  <div id="panelRank" class="featurePanel" role="tabpanel" aria-labelledby="mainRank">
  <div class="roomTools"><button id="resumeDetails" type="button">繼續查詢明細</button><button id="refreshSelected" type="button">優先更新選定房</button><button id="recheckSelected" type="button">重新核對空房</button><button id="switchSelected" class="gold" type="button">切換選定房間</button></div><div id="roomActionNote" class="controlNote" role="status"></div><div id="switchProblem" class="controlNote" role="alert" hidden style="white-space:pre-wrap;border:1px solid #ae7746;padding:8px;border-radius:8px;color:#ffe0aa"></div><div id="roomCacheNote" class="muted"></div><div id="dataNotice" class="periodNotice">等待遊戲識別與必要欄位；資料不足時不計分。<button id="fieldJump">欄位對照</button></div>
  <nav class="tabs" aria-label="排行榜"><button id="combined" aria-selected="true">◈ 綜合榜<span>本機規則評分</span></button><button id="boom">◇ 爆分榜<span>公式條件分</span></button><button id="returns">↗ 回分榜<span>公式條件分</span></button><button id="waiting">◷ 未開榜<span>歷史索引</span></button><button id="all">☷ 全房表<span>已收到房間</span></button></nav>
  <div class="filterbar"><input id="search" placeholder="搜尋房號或中文狀態" aria-label="搜尋房間"><label><input id="empty" type="checkbox" checked> 只看空房</label></div>
  <details class="displayOptions"><summary>排序與排版 ▾</summary><div class="sortbar"><label>排序依據<select id="sort"><option value="score_combo">綜合規則評分</option><option value="score_boom">爆分規則評分</option><option value="score_return">回分規則評分</option><option value="today">今日得分率</option><option value="wait">目前未開</option><option value="profit">今日盈虧</option><option value="number">房號</option><option value="status">房間狀態</option></select></label><label>順序<select id="direction"><option value="desc">由高到低</option><option value="asc">由低到高</option></select></label><label>排版<select id="layout"><option value="cards">排行榜</option><option value="grid">雙欄卡片</option><option value="compact">精簡排行</option></select></label><label>每頁顯示<select id="pageSize"><option value="10">十間</option><option value="25">二十五間</option><option value="50">五十間</option></select></label></div></details>
  <div class="stats"><div><span>房間</span><b id="totalStat">0</b></div><div><span>明細</span><b id="detailStat">0</b></div><div><span>可計分</span><b id="validStat">0</b></div></div>
  <div class="list" id="list" aria-label="房間排行"></div>
  <footer class="pager"><div class="pagetext"><span id="page"></span><span id="lastUpdated">等待房間列表</span></div><button id="prev" aria-label="上一頁">‹</button><button id="next" aria-label="下一頁">›</button><button id="repaint">重排資料</button></footer>
  <details id="selectedPanel" hidden><summary id="selectedSummary">選定房間 · 未開與前十</summary><div id="selectedPeriod" class="controlNote"></div><div class="historygrid" id="historyCards"></div><details hidden><summary>完整明細與欄位對照 ▾</summary><pre id="detail"></pre></details></details>
  <div class="footnote">排行依已取得的歷史快照排序。分數為規則評分；未開索引零及部分歷史含義待核對。選定只標記助手房號。明細查詢不會入座或投注。</div>
  </div>
  <div id="panelPlay" class="featurePanel" role="tabpanel" aria-labelledby="mainPlay" hidden>
  <div class="playControls" aria-label="遊戲控制">
    <div class="playHeading"><strong>遊戲控制</strong><span id="playBadge">等待偵測</span><button id="controlDetect">重新偵測</button></div>
    <div class="earlyCard"><div class="playHeading"><strong>當局結果預覽</strong><span id="earlyBadge">等待回覆</span></div><div class="moneyHighlights"><div><span id="earlyAwardLabel">本局總得分（含免費）</span><strong id="earlyPayout">—</strong></div><div><span id="earlyNetLabel">本局獲利</span><strong id="earlyNet">—</strong></div></div><details><summary>當局結果核對 ▾</summary><pre id="earlyResult">尚未收到結果，不會推算下一局派彩。</pre><p class="muted">讀取已回傳資料，動畫可能尚未完成；這裡不作入帳證明、不納入正式RTP。也支援遊戲原生按鈕的正常旋轉。</p></details><button id="earlyCopy" type="button">複製當局結果</button><details id="earlyExport"><summary>當局結果／手動複製</summary><textarea id="earlyText" readonly></textarea></details></div>
    <details class="betControls"><summary>投注額設定 ▾</summary><div id="betCurrent" class="controlNote">目前總注額：等待遊戲資料</div><div class="spinControls"><label>每次總投注額<select id="betChoice" aria-label="每次總投注額"><option value="">等待原生選項</option></select></label><button id="betApply" type="button" disabled>套用注額</button></div><div id="betNote" class="controlNote"></div></details>
    <div class="sessionModes"><label>執行模式<select id="playMode" aria-label="自動旋轉模式"><option value="strategy">策略模式 · 依條件停止</option><option value="count">指定轉數 · 整批結算</option></select></label>
    <details id="strategySettings"><summary>盤面／RTP停止策略 ▾</summary><label><input id="useSymbolStop" type="checkbox" checked> 使用「盤面規則」中的停止條件</label><button id="goBoard" type="button">設定盤面條件 ›</button>
    <label><input id="useRtpStop" type="checkbox"> 使用本次累計RTP停止條件</label><div class="rtpStopInputs"><select id="rtpStopOp" aria-label="RTP比較方式"><option value="le">RTP ≤</option><option value="ge">RTP ≥</option><option value="gt">RTP &gt;</option><option value="lt">RTP &lt;</option><option value="eq">RTP =</option></select><input id="rtpStopValue" type="number" min="0" step="0.01" placeholder="百分比門檻" aria-label="RTP百分比門檻"><span>%</span></div><label>至少結算幾次後套用RTP條件<input id="rtpMin" type="number" min="1" step="1" value="1" aria-label="RTP條件最低結算次數"></label><p class="muted">策略模式不選轉數；每次付費主流程完整結算後更新本次RTP並檢查門檻。至少設定盤面、RTP或止盈／止損任一條件，盤面規則內可選或／並且；盤面策略和RTP門檻之間仍為任一命中就停止。</p></details>
    <label id="countSettings" hidden>要執行幾轉<input id="spinCount" type="number" inputmode="numeric" min="1" step="1" value="20" aria-label="要執行幾轉"><span class="muted">轉完所選次數並完整結算後，計算這一批RTP；不套用盤面或RTP停轉門檻。</span></label></div>
    <div class="riskCard"><div class="playHeading"><strong>百分比止盈／止損</strong><span>以本次開始前餘額為基準</span></div><div class="riskInputs"><label><span><input id="useProfitStop" type="checkbox"> 止盈</span><input id="profitTarget" type="number" min="0.01" step="any" inputmode="decimal" placeholder="止盈 %（例10）"></label><label><span><input id="useLossStop" type="checkbox"> 止損</span><input id="lossTarget" type="number" min="0.01" step="any" inputmode="decimal" placeholder="止損 %（例5）"></label></div><div id="limitStatus" class="muted">完整結算後檢查；進行中的一局會先結算。</div></div>
    <div class="riskCard"><strong>免費大獎降速／停轉（含手動購買）</strong><div class="boardScopes"><label><input id="stopMega" type="checkbox"> Mega Win</label><label><input id="stopUltra" type="checkbox"> Ultra Win</label><label><input id="stopLegendary" type="checkbox"> Legendary Win</label></div><label>命中後降至 <input id="bonusSpeed" type="number" min="1" max="100" step="1" value="5"> ×</label><p class="muted">自然免費及手動買免遊都監看；依原生大獎門檻與整段回傳免費派彩判斷，降速並停止後續付費旋轉，免費流程仍完整結算。購買費用計入RTP投注。</p></div>
    <div id="bonusNote" class="controlNote"></div><div id="playError" class="controlNote" role="status"></div><div class="spinControls"><button class="gold" id="spinStart" disabled>開始策略旋轉</button><button id="spinStop" disabled>停止旋轉</button></div>
    <div class="sessionResult"><span id="sessionRtpLabel">本次 RTP 得分率</span><strong id="sessionRtp">—</strong><div id="sessionNetBadge" class="sessionNetBadge">尚未開始統計</div><details class="controlNote"><summary>近期波動 ▾</summary>
      <div id="volatilityNote" class="muted"></div><pre id="volatilitySummary" style="white-space:pre-wrap"></pre>
      <details><summary>回收與派彩明細 ▾</summary><pre id="volatilityDetail" style="white-space:pre-wrap"></pre>
      <p class="muted">本批最多取最近 50 局連續結算。派彩倍數以各局實際成本為分母；最大回撤以這段累計淨損益計算。扣除最大派彩保留全部下注。結算速度取樣本內首末結算時間。</p></details>
    </details><details><summary>統計與金額核對 ▾</summary><div id="balanceAudit" class="controlNote"></div><pre id="sessionSummary">尚未開始本次統計。</pre><div id="pendingOutcome" class="controlNote"></div><div id="rtpDecision" class="controlNote"></div><div id="sessionNote" class="controlNote"></div></details></div>
    <div id="spinStatus" class="controlNote" role="status">尚未讀取原生旋轉狀態。</div>
    <div class="riskCard"><label><input id="lowPower" type="checkbox"> 手機省電保護</label><p id="powerNote" class="muted"></p></div><div class="speedHeading"><strong>引擎倍速（含消除流程）</strong><span id="speedValue">1× 原速</span></div>
    <div class="manualSpeed"><input id="speedInput" type="number" inputmode="numeric" min="1" max="100" step="1" value="1" aria-label="動畫倍速1至100"><span>×</span><button id="speedApply" type="button">套用倍速</button><button id="speedReset" type="button">原速</button></div>
    <div class="controlNote" id="speedStatus">等待Cocos引擎與獨立GSAP偵測。</div>
    <div class="controlNote" id="controlNote">開啟後沿用遊戲目前下注；載入助手不會開始旋轉。停止按鈕不會撤銷已開始的旋轉。</div>
  </div>
  </div>
  <div id="panelBoard" class="featurePanel" role="tabpanel" aria-labelledby="mainBoard" hidden>
    <div class="playHeading"><strong>盤面符號分佈</strong><span id="boardBadge">等待盤面</span><button id="boardDetect" type="button">重新偵測</button></div>
    <div id="boardStatus" class="controlNote" role="status"></div>
    <div class="previewHeading"><strong>解析盤面預覽 · 6欄 × 5列</strong><span id="previewMode">即時更新</span></div>
    <div id="boardGrid" class="boardGrid" role="group" aria-label="解析盤面6欄5列，由左上逐列排列"></div>
    <div class="previewButtons"><button id="boardFreeze" type="button" disabled>凍結預覽</button><button id="boardPreviewCopy" type="button" disabled>複製這個盤面</button></div>
    <div id="previewNotice" class="controlNote">用符號名稱與代碼對照遊戲，不會啟用規則。凍結只固定顯示，已啟用規則仍依最新盤面判斷。</div>
    <details id="boardPreviewExport"><summary>盤面資料／手動複製</summary><textarea id="boardPreviewText" readonly aria-label="盤面預覽資料"></textarea></details>
    <div id="boardCounts" class="symbolCounts"></div><div id="boardSource" class="controlNote"></div>
    <div id="boardStrategyArea"><div class="settingsCard"><strong>自訂停止條件</strong><p class="muted">可選「或」或「並且」；並且要求同一盤的所有條件一起成立，命中後停止並解除規則。僅提供停止自動旋轉，不再顯示升注或購買免費提示。</p><label class="boardJoinLabel">條件組合<select id="boardJoin" aria-label="盤面條件組合"><option value="any">或：任一條成立就停</option><option value="all">並且：同一盤全部成立才停</option></select></label><div id="boardRuleList"></div><button id="boardAdd" type="button">＋新增條件</button><div class="boardScopes"><label><input id="boardCascades" type="checkbox"> 包含連消盤面</label><label><input id="boardFree" type="checkbox"> 包含免費遊戲</label></div><div id="boardRuleError" class="controlNote" role="status"></div><div class="spinControls"><button id="boardApply" class="gold" disabled>套用並啟用</button><button id="boardOff" disabled>解除規則</button></div></div>
    <div id="boardHit" class="boardHit" role="status" hidden></div><details><summary>最近20次命中紀錄</summary><pre id="boardHistory"></pre></details>
    <p class="muted">策略模式可直接採用這些停止條件；指定轉數模式會停用符號條件。預設只判斷啟用後的一般遊戲首盤；不回頭觸發既有盤面。符號數量不是下一轉勝率，綠、藍、紫、紅倍數按符號個數計算，不是倍率加總。停止不撤銷在途投注，也不取消已開始的免費流程。符號名稱仍請與遊戲畫面核對。</p></div>
  </div>
  <div id="panelSettings" class="featurePanel" role="tabpanel" aria-labelledby="mainSettings" hidden>
    <div class="settingsCard"><strong>瀏覽器設定紀錄</strong><p id="storageNote" class="muted"></p><p class="muted">只記錄設定，不保存登入憑證或恢復未結算投注；不同網域、瀏覽器各自保存。清除網站資料會移除設定。</p></div><div class="settingsCard"><strong>房間明細讀取速度</strong><label>讀取範圍<select id="queryScope"><option value="empty">只補空房（較快）</option><option value="all">全部房間</option></select></label><p class="muted">切換範圍於下一輪套用。其他房間未補齊時仍顯示資料不足；切換助手分頁或收合會持續讀取。</p><label>每筆回覆後等待<select id="queryInterval" disabled aria-label="明細查詢固定間隔"><option value="500">0.5 秒（固定）</option></select></label><p class="muted">實際每間耗時＝伺服器回應時間＋等待間隔。每次只查一間，逾時或拒絕時暫停。清單分頁仍間隔1秒。</p></div>
  <details><summary>資料進度／維護</summary><div id="scanNote"></div><div id="count"></div><div id="domain"></div><button id="retryScan">繼續查詢明細</button><p class="muted">進遊戲即自動監聽賽特 II。先背景讀取第1頁，再依伺服器總頁數逐頁取得完整清單，按房間識別碼去重後補齊明細，每次只查一間，回覆後依省電設定等待0.5或1.5秒再讀取下一間；資料過期會於後續輪次更新。收合助手、關閉選房介面不影響補齊。使用已核對的 getSlotTables 與 page 參數，不呼叫會開啟原生清單介面的事件；無需手動打開或翻頁。每輪補齊前重新讀取分頁，缺少總頁數、筆數不符或分頁改變時暫停，不假裝已完整。自動旋轉期間暫停查詢，停止後接續。切換 App、鎖屏或頁面隱藏時暫停，回到遊戲後接續；逾時、拒絕或格式異常需處理後重試。連續模式沒有固定額外等待，但仍需逐間等待伺服器回覆，各房並非同時快照。房間快照會自動存入此瀏覽器，下次先顯示並保留原取得時間；過期資料等待更新。選定房間優先查詢。</p></details>
  <details id="fieldSettings"><summary>資料欄位對照／有效期</summary><p class="muted">c0／c1／c2：未開、前一、前二；優先同名欄位，否則讀 mgCounts[0..2]。rtp 是今日百分比，96 表示96%，0.96仍表示0.96%；或由明確今日派彩÷今日下注×100計算。bet 只取今日下注。rtp30／bet30 可由 rtp_30／bet_30 映射；明確欄位缺少時，依二代原生「近30天」列由 dayWin／dayBet 換算；沒有可用資料時顯示資料不足。</p><div class="controls"><label>最低今日下注<input id="minBet" type="number" value="0" min="0"></label><label>資料有效秒數<input id="maxAge" type="number" value="300" min="30"></label><button id="apply">套用設定</button></div><p class="muted">本版固定使用賽特 II（g1005）通道；其他遊戲通道不納入。欄位缺少、格式錯誤或過期時，三分數顯示「資料不足」。評分由授權本機服務計算，使用者腳本不包含公式或參數。</p><details><summary>本機評分服務</summary><pre id="parameterTable"></pre></details></details>
  <button id="copy">複製選定房間與診斷資料</button><details id="export"><summary>分析資料／手動複製</summary><textarea id="text" readonly></textarea></details>
  </div>
</section>
`;
  const $=id=>root.getElementById(id);
  $('parameterTable').textContent='評分公式與參數只保存在後端；此處不下發原始公式或加分明細。';
  const mainViews=[['rank','mainRank','panelRank'],['play','mainPlay','panelPlay'],['board','mainBoard','panelBoard']];
  function syncControlFocus(){scheduleAuto();}
  let dockLayoutStamp='';
  let dockDrag=null,dockRestored=false,dockPosition=null,dockLastTap=0;
  const dockPositionKey='room-assistant:seth2:dock-position:v1';
  function dockBounds(x,y,w,h,vw,vh,ox=0,oy=0){
    return {x:Math.max(ox+8,Math.min(x,ox+Math.max(8,vw-w-8))),y:Math.max(oy+8,Math.min(y,oy+Math.max(8,vh-h-8)))};
  }
  function layoutDock(position){
    if(typeof host.getBoundingClientRect!=='function')return;
    const viewport=window.visualViewport,vw=viewport?.width||window.innerWidth,vh=viewport?.height||window.innerHeight,ox=viewport?.offsetLeft||0,oy=viewport?.offsetTop||0;
    if(!Number.isFinite(vw)||!Number.isFinite(vh))return;
    if(!dockRestored){dockRestored=true;try{const p=JSON.parse(localStorage.getItem(dockPositionKey));if(Number.isFinite(p?.x)&&Number.isFinite(p?.y))dockPosition=p;}catch(_){} }
    const rect=host.getBoundingClientRect(),bar=$('dockControls'),stats=$('dockGrip'),height=(bar?.getBoundingClientRect?.()?.height||52)+(stats?.getBoundingClientRect?.()?.height||32);
    const preferred=position||dockPosition||{x:ox+(vw-rect.width)/2,y:oy+8};
    const opened=!root.querySelector('section').hidden;
    const p=dockBounds(preferred.x,preferred.y,rect.width,height+(opened?Math.min(188,Math.max(0,vh-height-24)):0),vw,vh,ox,oy);
    for(const [key,value] of Object.entries({left:p.x+'px',top:p.y+'px',transform:'none'}))host.style.setProperty(key,value,'important');
    host.style.setProperty('--dock-room',Math.max(60,vh-(p.y-oy)-height-16)+'px');
    if(position)dockPosition=p;
  }
  function saveDockPosition(){try{if(dockPosition)localStorage.setItem(dockPositionKey,JSON.stringify(dockPosition));else localStorage.removeItem(dockPositionKey);}catch(_){} }
  const dockGrip=$('dockGrip');
  dockGrip.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false||event.button>0||typeof host.getBoundingClientRect!=='function')return;
    const r=host.getBoundingClientRect();dockDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};
    try{dockGrip.setPointerCapture(event.pointerId);}catch(_){}event.preventDefault();
  });
  dockGrip.addEventListener('pointermove',event=>{if(!dockDrag||dockDrag.id!==event.pointerId)return;layoutDock({x:dockDrag.left+event.clientX-dockDrag.x,y:dockDrag.top+event.clientY-dockDrag.y});event.preventDefault();});
  const endDockDrag=event=>{if(!dockDrag||dockDrag.id!==event.pointerId)return;const tap=event.type!=='pointercancel'&&Math.hypot(event.clientX-dockDrag.x,event.clientY-dockDrag.y)<6;dockDrag=null;if(tap&&Date.now()-dockLastTap<350){dockPosition=null;dockLastTap=0;saveDockPosition();layoutDock();}else{dockLastTap=tap?Date.now():0;saveDockPosition();}};
  dockGrip.addEventListener('pointerup',endDockDrag);dockGrip.addEventListener('pointercancel',endDockDrag);
  dockGrip.addEventListener('dblclick',()=>{dockPosition=null;saveDockPosition();layoutDock();});
  window.addEventListener('resize',()=>layoutDock());window.visualViewport?.addEventListener('resize',()=>layoutDock());window.visualViewport?.addEventListener('scroll',()=>layoutDock());

  function currentScorePreview(state){
    const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const r=state?.latest,a=state?.lastAward;
    if(!state?.awardPending&&a&&finite(a.payout))return {...a,confirmed:true,complete:true};
    if(!r||r.source==='已載入快照'||!finite(r.payout))return null;
    return {...r,confirmed:!!r.balanceResult,complete:r.complete===true};
  }

  function paintDock(){
    const rate=playState?.rtpPercent,award=currentScorePreview(earlyState);
    $('dockRtp').textContent=typeof rate==='number'?rate.toFixed(2)+'%':'—';
    $('dockAward').textContent=typeof award?.payout==='number'?award.payout.toLocaleString('zh-TW',{maximumFractionDigits:2}):earlyState?.awardPending?'等待回傳':'—';
    $('dockAwardLabel').textContent=award?(award.complete?(award.confirmed?'本局總得分':'本局回傳總分'):'目前回傳得分'):'本局總得分';
    $('dockAward').title=award?(award.confirmed?'本局已核對結算':award.complete?'整段已回傳，待入帳':'只含已回傳資料，未必為最終總分'):'等待當局資料';
    const collapsed=root.querySelector('section').hidden;
    const label=boardState?.lastHit&&!boardState.enabled?'盤面條件命中':controlState?.active===true?'旋轉中':autoHold?'查詢暫停':scanState.running?(scanState.phase==='pages'?'讀取清單':`明細 ${scanState.done}/${scanState.total}`):'賽特 II 助手';
    $('toggle').textContent='◈ '+(collapsed?label:'收合助手')+(collapsed?' ▾':' ▴');$('toggle').setAttribute('aria-expanded',String(!collapsed));const stamp=[collapsed,window.innerWidth,window.innerHeight,window.visualViewport?.width,window.visualViewport?.height].join('|');if(stamp!==dockLayoutStamp){dockLayoutStamp=stamp;layoutDock();}
    const stale=!controlState||Date.now()-controlReceivedAt>6000;
    $('miniStop').hidden=false;$('miniStop').disabled=queuedState?.waiting===true?false:stale||controlState?.canStop!==true;$('miniStop').textContent=queuedState?.waiting?'取消待執行':'停止旋轉';
  }
  function showMain(name,focus=false){
    if(!mainViews.some(row=>row[0]===name))return;mainPanel=name;
    for(const [key,button,panel] of mainViews){const active=key===name;$(panel).hidden=!active;$(button).setAttribute('aria-selected',String(active));$(button).setAttribute('tabindex',active?'0':'-1');if(active&&focus)$(button).focus();}
    syncControlFocus();if(name==='board'){paintBoard();command('boardDetect');}if(name==='rank'&&!restoringPreferences)paint();
  }
  for(const [name,button] of mainViews){
    $(button).onclick=()=>showMain(name);
    $(button).addEventListener('keydown',event=>{
      const index=mainViews.findIndex(row=>row[0]===mainPanel);let next=null;
      if(event.key==='ArrowRight')next=(index+1)%mainViews.length;
      if(event.key==='ArrowLeft')next=(index+mainViews.length-1)%mainViews.length;
      if(event.key==='Home')next=0;if(event.key==='End')next=mainViews.length-1;
      if(next!==null){event.preventDefault();showMain(mainViews[next][0],true);}
    });
  }
  $('queryScope').onchange=()=>{queryScope=$('queryScope').value==='all'?'all':'empty';scheduleAuto();};
  $('queryInterval').onchange=()=>{const value=500;queryInterval=500;command('scanSpeed',{interval:value});};
  $('miniStart').onclick=()=>{$('spinStart').onclick();if($('playError').textContent){showMain('play');root.querySelector('section').hidden=false;paintDock();}};
  $('miniStop').onclick=()=>command('autoSpinStop');

  function applyTierUI(){
    const a=access(),e=rights();if(!a)return;
    const summary=$('tierSummary');if(summary)summary.textContent='免驗證暫用版 · 房間分數由此裝置計算';
    preferredSpeed=Math.min(preferredSpeed,e.max_speed);
    if(e.max_batch!==null&&preferredCount!==null)preferredCount=Math.min(preferredCount,e.max_batch);
    $('speedInput').max=String(e.max_speed);$('bonusSpeed').max=String(e.max_speed);
    $('speedInput').setAttribute('aria-label','動畫倍速1至'+e.max_speed);
    if(Number($('speedInput').value)>e.max_speed)$('speedInput').value=String(e.max_speed);
    if(Number($('bonusSpeed').value)>e.max_speed)$('bonusSpeed').value=String(e.max_speed);
    if(e.max_batch!==null){$('spinCount').max=String(e.max_batch);if(Number($('spinCount').value)>e.max_batch)$('spinCount').value=String(e.max_batch);}else $('spinCount').removeAttribute('max');
    for(const option of Array.from($('playMode').children))if(option.value==='strategy')option.disabled=!e.strategy;
    if(!e.strategy&&$('playMode').value==='strategy'){$('playMode').value='count';$('strategySettings').hidden=true;$('countSettings').hidden=false;}
    for(const id of ['boom','returns'])$(id).hidden=!e.all_scores;
    if(!e.all_scores){if(['boom','returns'].includes(tab))tab='combined';if(['score_boom','score_return'].includes(sortBy)){sortBy='score_combo';$('sort').value=sortBy;}}
    for(const option of Array.from($('sort').children))if(['score_boom','score_return'].includes(option.value))option.disabled=!e.all_scores;
    $('boardStrategyArea').hidden=!e.strategy;
    $('selectedPanel').hidden=!e.long_stats;
    for(const [ids,allowed] of [[['useSymbolStop','boardAdd','boardApply'],e.strategy],[['useRtpStop','rtpStopOp','rtpStopValue','rtpMin'],e.rtp_stop],[['stopMega','stopUltra','stopLegendary','bonusSpeed'],e.bonus_stop]])for(const id of ids)if(!allowed){$(id).disabled=true;if('checked' in $(id))$(id).checked=false;}
    if(!e.strategy)$('useSymbolStop').checked=false;
    if(!e.bonus_stop){$('stopMega').checked=false;$('stopUltra').checked=false;$('stopLegendary').checked=false;}
    if(!e.rtp_stop)$('useRtpStop').checked=false;
    $('boardAdd').disabled=$('boardAdd').disabled||ruleRows.length>=e.max_symbol_rules;
    // Visible permissions are descriptive; commands and cloud API also validate them.
    $('tierSummary').title='一般：綜合分、前三間隔；加強：三分、前十、單條策略；進階：完整策略及本次資料領先卡。RTP與止盈止損所有版本保留。';
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.tag!==TAG||event.data?.from!=='license'||event.data?.kind!=='accessChanged')return;
    cloudGeneration++;cloudScores.clear();cloudDirty.clear();autoHold=false;
    preferredSpeed=Math.min(preferredSpeed,rights().max_speed);
    command('animationSpeed',{factor:Math.min(Number(controlState?.factor)||1,rights().max_speed)});
    command('licenseResume');command('editionScope',{roomIds:[...eligibleRoomIds()],roomLimit:rights().daily_rooms??5000});for(const id of rooms.keys())queueCloud(id);applyTierUI();syncBonusSettings();paintSession();paintControls();paint();
  });

  function paintVolatility(state){
    const data=state?.volatility, note=$('volatilityNote'), output=$('volatilitySummary'), detail=$('volatilityDetail');
    if(!data){
      note.textContent=state?.invalid?'本批有未核對資料，暫停顯示波動。':'等待本批第一筆完整結算。';
      output.textContent='';detail.textContent='';
      return;
    }
    const fmt=value=>Number.isFinite(value)?value.toLocaleString('zh-TW',{maximumFractionDigits:2}):'—';
    const pct=value=>value===null?'—':fmt(value)+'%';
    const modeText=mode=>mode.count?mode.count+' 局 · '+pct(mode.payout/mode.bet*100):'無已結算紀錄';
    note.textContent='第 '+data.from+'–'+data.to+' 局 · '+data.count+' 筆連續已核對'+(data.variedBet?' · 注額有變動':'');
    output.textContent=[
      '最長空轉 '+data.longest+' 局（目前 '+data.streak+' 局）',
      '最大回撤 '+fmt(data.drawdown),
      '最大單局派彩占比 '+pct(data.largestShare)+(data.largestShare>50?'（超過一半）':'')
    ].join('\n');
    detail.textContent=[
      '樣本 RTP '+pct(data.rtp)+' · 扣除最大派彩後 '+pct(data.rtpWithoutLargest),
      '派彩倍數中位數 '+fmt(data.median)+'× · 樣本標準差 '+(data.deviation===null?'—':fmt(data.deviation)+'×'),
      '零派彩 '+data.outcomes.zero+' 局 · 有派彩但淨輸 '+data.outcomes.lossWithPayout+' 局',
      '打平 '+data.outcomes.even+' 局 · 淨賺 '+data.outcomes.profit+' 局',
      '一般付費（含自然免遊） '+modeText(data.ordinary),
      '購買免遊 '+modeText(data.purchase),
      '結算速度 '+(data.turnsPerMinute===null?'—':fmt(data.turnsPerMinute)+' 局／分鐘')
    ].join('\n');
  }

  function paintControls(){
    paintDock();
    const c=controlState,stale=!c||Date.now()-controlReceivedAt>6000;
    const reason=String(c?.reason||'');
    const actionReady=c?.ready===true||(/在途.*回覆/.test(reason)&&c?.active===false);
    $('playBadge').textContent=stale?'等待偵測':c.active===true?'旋轉中':c.ready?'已就緒':/在途|回覆/.test(reason)?'等待查詢回覆':/目前旋轉|免費流程/.test(reason)?'本局進行中':/彈窗|畫面檢查/.test(reason)?'請關閉彈窗':/連線/.test(reason)?'等待連線':'等待遊戲資料';
    const counts=Array.isArray(c?.counts)?c.counts.filter(v=>Number.isSafeInteger(v)&&v>0):[];
    $('spinCount').disabled=stale||playState?.busy===true||queuedState?.waiting===true;
    const bet=c?.betSettings;
    const betOptions=Array.isArray(bet?.options)?bet.options.filter(x=>typeof x.key==='string'&&typeof x.stakeValue==='number'&&typeof x.ratioValue==='number'):[];
    const betSelect=$('betChoice'),betStamp=JSON.stringify(betOptions);
    if(betSelect.dataset.signature!==betStamp&&root.activeElement!==betSelect){
      const previous=betSelect.value;betSelect.textContent='';betSelect.dataset.signature=betStamp;
      if(!betOptions.length){const option=document.createElement('option');option.value='';option.textContent='等待原生選項';betSelect.appendChild(option);}
      else for(const x of betOptions){const option=document.createElement('option');option.value=x.key;option.textContent=typeof x.amount==='number'&&Number.isFinite(x.amount)?x.amount.toLocaleString('zh-TW',{maximumFractionDigits:8}):'投注額待核對';option.disabled=!(typeof x.amount==='number'&&Number.isFinite(x.amount)&&x.amount>0);betSelect.appendChild(option);}
      if(preferredBet&&betOptions.some(x=>x.key===preferredBet))betSelect.value=preferredBet;else if(betOptions.some(x=>x.key===previous))betSelect.value=previous;
      else if(betOptions.some(x=>x.key===bet?.selected))betSelect.value=bet.selected;
    }
    $('betCurrent').textContent='目前總注額：'+(typeof bet?.total==='number'&&Number.isFinite(bet.total)?bet.total.toLocaleString('zh-TW',{maximumFractionDigits:8}):'等待遊戲資料');
    betSelect.disabled=stale||!actionReady||bet?.available!==true||playState?.busy===true||queuedState?.waiting===true;
    $('betApply').disabled=betSelect.disabled||!betOptions.some(x=>typeof x.amount==='number'&&Number.isFinite(x.amount)&&x.amount>0);
    $('betNote').textContent=!stale&&c?.ready===true&&preferredBet&&betSelect.value!==bet?.selected?'已恢復注額選項；按套用後才變更實際下注。':stale?'等待原生注額資料。':c?.active===true?'自動旋轉中，停止並完成本局後才能調注。':c?.ready!==true?c?.reason||'等待遊戲就緒。':bet?.status||'等待原生下注組合。';
    const strategy=$('playMode').value==='strategy';
    $('spinStart').disabled=stale||!actionReady||playState?.ready!==true||playState?.busy===true||queuedState?.waiting===true||(strategy?!c?.counts?.includes(-1):!counts.length);
    $('spinStart').textContent=strategy?'開始策略旋轉':'開始指定轉數';
    $('spinStop').disabled=queuedState?.waiting===true?false:stale||c?.canStop!==true;
    const remaining=c?.remaining===-1?'持續':Number.isSafeInteger(c?.remaining)?c.remaining+'次':'待確認';
    $('spinStatus').textContent=stale?'控制端尚未回應，請按重新偵測。':c.active===true?`原生自動旋轉中｜剩餘 ${remaining}｜${c.owned?'由助手開啟':'由遊戲開啟'}`:c.reason||'已就緒，請先確認遊戲目前下注，再按開始。';
    $('miniStart').disabled=$('spinStart').disabled;
    const speed=Number.isInteger(c?.factor)?c.factor:1;
    $('speedValue').textContent=stale?'倍率待確認':speed===1?'1× 原速':speed+'× 設定 / '+(Number.isFinite(c?.effectiveFactor)?c.effectiveFactor.toFixed(1):'待測')+'× 實際';
    $('speedApply').disabled=stale||c?.speedAvailable!==true;$('speedReset').disabled=stale;
    const channels=Array.isArray(c?.channels)?c.channels.join('、'):'';
    const missing=Array.isArray(c?.missing)?c.missing.join('、'):'';
    $('speedStatus').textContent=stale?'等待動畫控制端。':speed===1?'目前原速；此版本可設定2×～'+rights().max_speed+'×。':`已接管：${channels||'無'}${missing?'｜未接管：'+missing:''}｜${c?.engineTime?.limited?'單幀步長保護中':'固定倍率同步'}｜每幀分步 ${c?.engineTime?.substeps??0} 次`;
    applyTierUI();
    $('controlNote').textContent=(stale?'載入助手不會開始旋轉。':c.note||'')+' 使用遊戲目前下注與原生流程；旋轉中暫停房間補齊。動畫倍速不改派彩或伺服器結果。';
  }

  function paintEarly(){
    const state=earlyState,r=state?.latest,money=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('zh-TW',{maximumFractionDigits:4}):'資料不足';
    $('earlyBadge').textContent=r?(r.source==='已載入快照'?'已載入快照':r.audit?.status==='balance-corrected'?'已依本局餘額修正派彩':r.balanceResult?'本局派彩已核對（含免費）':r.complete?'整段已回傳／待入帳':'部分回傳／未完整'):'等待回覆';
    const freePending=r?.type?.includes('免費')&&!r?.balanceResult;
    const award=currentScorePreview(state);
    $('earlyPayout').textContent=award?money(award.payout):state?.awardPending?'等待回傳':'—';
    $('earlyAwardLabel').textContent=award&&!award.complete?'目前回傳得分（未完整）':'本局總得分（含免費）';
    $('earlyNet').textContent=award?.confirmed&&typeof award.net==='number'?(award.net>0?'+':'')+money(award.net):award||state?.awardPending?'待核對':'—';
    $('earlyNetLabel').textContent='本局獲利';
    $('earlyNet').className=typeof award?.net==='number'?(award.net<0?'loss':'gain'):'';
    $('earlyResult').textContent=r?[r.type+'｜局號 '+(r.spinId??'待核對'),r.status||state.note,'已回傳累計派彩：'+money(r.payout),'一般段派彩：'+money(r.basePayout)+'｜免費段派彩（差額試算）：'+money(r.freePayout),'配對／試算成本：'+money(r.cost),'完整回傳的試算淨損益：'+money(r.net),r.costSource,r.settlement,'來源：'+r.source,'讀取：'+r.receivedAt].join('\n'):(state?.note||'尚未收到結果，不會推算下一局派彩。');
  }
  $('earlyCopy').onclick=async()=>{$('earlyText').value=JSON.stringify(earlyState,null,2);$('earlyExport').open=true;try{await navigator.clipboard.writeText($('earlyText').value);}catch(_){$('earlyText').focus();$('earlyText').select();}};

  function paintSession(){
    const mode=$('playMode').value,strategy=mode==='strategy',busy=playState?.busy===true||queuedState?.waiting===true;
    $('strategySettings').hidden=!strategy;$('countSettings').hidden=strategy;
    for(const id of ['playMode','spinCount','useSymbolStop','useRtpStop','rtpStopOp','rtpStopValue','rtpMin','useProfitStop','profitTarget','useLossStop','lossTarget','stopMega','stopUltra','stopLegendary','bonusSpeed'])$(id).disabled=busy;
    $('sessionRtpLabel').textContent=playState?.mode==='manual'?'本段手動免遊累計 RTP':'本次 RTP（含自然／購買免費）';
    const value=playState?.rtpPercent;
    $('sessionRtp').textContent=typeof value==='number'&&Number.isFinite(value)?value.toFixed(2)+'%':playState?.invalid?'資料不足':playState?.mode==='count'&&busy?'等整批結算':'—';
    paintVolatility(playState);
    const net=playState?.net;$('sessionNetBadge').textContent=playState?.settled&&!playState?.invalid?'同批累計損益 '+(net>0?'+':'')+Number(net).toFixed(2)+' · 已結算 '+playState.settled+' 次':playState?.invalid?'資料不足':'尚未開始統計';$('sessionNetBadge').className='sessionNetBadge '+(typeof net==='number'?(net<0?'loss':'gain'):'');
    $('limitStatus').textContent=playState?.limits?'基準餘額 '+(playState.limits.baselineBalance??'—')+'｜止盈金額 '+(playState.limits.takeProfit??'未啟用')+' ／ 止損 '+(playState.limits.stopLoss??'未啟用')+'｜每次完整結算後檢查':'完整結算後檢查；進行中的一局會先結算。';
    const money=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('zh-TW',{maximumFractionDigits:4}):'—';
    const balance=playState?.lastBalanceResult;
    $('balanceAudit').textContent=balance?JSON.stringify(balance,null,2):'餘額核對會在完整結算後更新。';
    $('sessionSummary').textContent=playState?.mode?`${playState.mode==='strategy'?'策略模式':playState.mode==='manual'?'手動購買免費累計':'指定轉數 '+playState.target+' 次'}｜${playState.state==='running'?'執行中':playState.state==='stopping'?'已要求停止／等結算':playState.state==='done'?'本次已結束':'尚未開始'}
已送出 ${playState.submitted}｜已接受 ${playState.accepted}｜完整結算 ${playState.settled}
已納入下注 ${money(playState.bet)}｜派彩 ${money(playState.win)}
已納入淨損益 ${money(playState.net)}${playState.reason?'\n停止原因：'+playState.reason:''}`:'尚未開始本次統計。';
    $('bonusNote').textContent=playState?.bonusStop?'已啟用大獎策略，亦監看手動購買免費；依原生門檻分類，倍數分母是基本注額，RTP分母是實際購買費用。':(rights().bonus_stop?'可先勾選大獎與降速倍率，再手動購買免費；無需啟動助手旋轉。':'大獎降速／停轉需進階版；已核對的手動購買免費仍會納入RTP。');
    if(rights().bonus_stop&&!playState?.bonusStop&&['stopMega','stopUltra','stopLegendary'].some(id=>$(id).checked))$('bonusNote').textContent=playState?.note||'等待原生大獎門檻載入，尚未啟用。';
    const check=playState?.lastRtpCheck;
    $('rtpDecision').textContent=check?'最近RTP判斷：累計 '+(typeof check.rtp==='number'?check.rtp.toFixed(6)+'%':'資料不足')+' '+({ge:'≥',le:'≤',gt:'>',lt:'<',eq:'='}[check.op])+' '+check.threshold+'%｜已結算 '+check.settled+' / 最低 '+check.minimum+' 次｜'+(!check.minimumMet?'未達最低次數，尚不套用停轉':check.matched?'門檻命中':'門檻未命中'):'RTP停轉以本次累計、已結算金額判斷；一般及自然免費合併，不使用提前預覽金額。';
    $('sessionNote').textContent=(playState?.note||'等待原生結算入口。')+' RTP＝本次已結算派彩÷本次已結算下注×100%；不是房間今日RTP，也不是下一轉機率。連消及自然免費不重複計次或扣注。';
    $('pendingOutcome').textContent=(playState?.pendingResults||[]).map(x=>'已收到結果／尚未結算：局號 '+x.id+'，派彩 '+money(x.payout)+'，試算淨損益 '+money(x.net)+'；尚未納入RTP。').join('\n');
    applyTierUI();
    for(const id of ['boardAdd','boardCascades','boardFree','boardJoin'])$(id).disabled=busy||!rights().strategy;
    for(const row of ruleRows){for(const input of [row.symbol,row.op,row.count,row.action])input.disabled=busy;for(const child of Array.from(row.row.children))if(child.tagName==='BUTTON'||child.tag==='button')child.disabled=busy;}
  }

  const symbolNames={1:'眼睛',2:'蛇',3:'弓箭',4:'彎刀',5:'黃寶石',6:'紅寶石',7:'紫寶石',8:'藍寶石',9:'綠寶石',10:'綠倍數',11:'藍倍數',12:'紫倍數',13:'紅倍數',14:'JP',15:'甲蟲',16:'金色甲蟲',17:'男性圖騰',18:'女性圖騰'},ruleRows=[];
  function disarmBoardEdit(){savePreferences();if(boardState?.enabled){command('boardConfigure',{enabled:false});$('boardRuleError').textContent='條件已變更，規則已解除；請重新套用。';}}
  function addBoardRule(){
    if(ruleRows.length>=rights().max_symbol_rules){$('boardRuleError').textContent='此版本最多 '+rights().max_symbol_rules+' 條規則。';return;}
    disarmBoardEdit();
    const row=document.createElement('div');row.className='boardRule';
    const symbol=document.createElement('select'),op=document.createElement('select'),count=document.createElement('input'),action=document.createElement('select'),remove=document.createElement('button');
    symbol.setAttribute('aria-label','指定符號');op.setAttribute('aria-label','比較方式');count.setAttribute('aria-label','符號數量門檻');action.setAttribute('aria-label','命中動作');
    for(const [id,name] of Object.entries(symbolNames)){const option=document.createElement('option');option.value=id;option.textContent=name+'（'+id+'）';symbol.appendChild(option);}symbol.value='15';
    for(const [value,label] of [['ge','大於等於 ≥'],['le','小於等於 ≤'],['gt','大於 >'],['lt','小於 <'],['eq','等於 =']]){const option=document.createElement('option');option.value=value;option.textContent=label;op.appendChild(option);}
    count.type='number';count.min='0';count.max='30';count.step='1';count.placeholder='0–30 個';count.value='';
    for(const [value,label] of [['stop','停止自動旋轉']]){const option=document.createElement('option');option.value=value;option.textContent=label;action.appendChild(option);}
    action.hidden=true;remove.textContent='刪除';remove.type='button';const entry={row,symbol,op,count,action};
    for(const field of [symbol,op,action])field.onchange=disarmBoardEdit;count.oninput=disarmBoardEdit;
    remove.onclick=()=>{disarmBoardEdit();const index=ruleRows.indexOf(entry);if(index>=0)ruleRows.splice(index,1);row.remove();savePreferences();};
    row.appendChild(symbol);row.appendChild(op);row.appendChild(count);row.appendChild(action);row.appendChild(remove);$('boardRuleList').appendChild(row);ruleRows.push(entry);savePreferences();
  }
  function paintBoard(){
    if(document.hidden||root.querySelector('section').hidden||mainPanel!=='board')return;
    const state=boardState,last=previewFrozen?boardPreview:state?.last;
    const cells=Array.isArray(last?.cells)&&last.cells.length===30&&last.cells.every(x=>Number.isSafeInteger(x)&&x>=1&&x<=18)?last.cells:null;
    $('boardGrid').replaceChildren();
    for(let index=0;index<30;index++){
      const id=cells?cells[index]:null,cell=document.createElement('div'),position=document.createElement('small'),label=document.createElement('span'),code=document.createElement('b');
      cell.className='boardTile'+(id?' symbol-'+id:' unknown');position.textContent=String(index+1);label.textContent=id?symbolNames[id]:'—';code.textContent=id?'#'+id:'待讀取';
      cell.setAttribute('aria-label','第'+(Math.floor(index/6)+1)+'列第'+(index%6+1)+'欄：'+(id?symbolNames[id]+'，代碼'+id:'尚無資料'));cell.title='位置 '+(index+1);
      cell.appendChild(position);cell.appendChild(label);cell.appendChild(code);$('boardGrid').appendChild(cell);
    }
    $('boardFreeze').textContent=previewFrozen?'繼續更新':'凍結預覽';$('boardFreeze').disabled=!cells&&!previewFrozen;$('boardPreviewCopy').disabled=!cells;
    $('previewMode').textContent=previewFrozen?'已凍結 · 僅固定顯示':'即時更新';
    $('previewNotice').textContent=previewFrozen?'這是凍結快照；已啟用規則仍依最新盤面判斷。繼續更新後才可套用新規則。':'由左上第1格逐列排列至右下第30格。預覽不啟用規則；凍結只固定顯示，不會停止遊戲。';
    $('boardStatus').textContent=state?.note||'等待原生盤面與符號表；預設不啟用。';
    $('boardApply').disabled=!rights().strategy||state?.ready!==true||previewFrozen||playState?.busy===true;$('boardOff').disabled=state?.enabled!==true||playState?.busy===true;
    $('boardBadge').textContent=state?.enabled?'規則啟用中':cells?'已讀取盤面':'等待盤面';
    $('boardCounts').replaceChildren();
    for(const [id,name] of Object.entries(symbolNames)){const cell=document.createElement('div');cell.className='symbolCell';const label=document.createElement('span'),number=document.createElement('b');label.textContent=name;number.textContent=last&&Number.isSafeInteger(last.counts?.[id])?String(last.counts[id]):'—';cell.appendChild(label);cell.appendChild(number);$('boardCounts').appendChild(cell);}
    $('boardSource').textContent=last?`${previewFrozen?'凍結':last.source==='snapshot'?'遊戲保留':'即時'}原生30格盤面｜讀取 ${last.receivedAt?new Date(last.receivedAt).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'待核對'}｜局號 ${last.spinId??'待核對'}｜盤面序號 ${last.index??'待核對'}｜${last.action==='spin'?'一般遊戲':last.action==='freeSpin'?'免費遊戲':last.action==='superSpin'?'超級主遊戲':'流程待核對'}\n${last.source==='snapshot'?'可能是最近一次保留盤面。':'動畫可能稍後顯示此盤面。'}`:'尚未取得完整的 30 格盤面。';
    $('boardHit').hidden=!state?.lastHit;
    if(state?.lastHit){const hit=state.lastHit;$('boardHit').textContent='自訂條件命中（'+(hit.join==='all'?'並且':'或')+'）：'+hit.matched.map(x=>x.name+' '+({ge:'≥',le:'≤',gt:'>',lt:'<',eq:'='}[x.op])+' '+x.count+'（本盤 '+x.actual+'）').join('、')+'\n'+hit.stop+'\n'+hit.messages.join('\n')+'\n規則已解除，需手動重新啟用。';}
    $('boardHistory').textContent=(state?.history||[]).map(hit=>hit.time+'｜'+hit.matched.map(x=>x.name+({ge:'≥',le:'≤',gt:'>',lt:'<',eq:'='}[x.op])+x.count+'，實際'+x.actual).join('、')+'｜'+hit.stop).join('\n')||'尚無命中紀錄。';
  }
  $('boardFreeze').onclick=()=>{
    if(previewFrozen){previewFrozen=false;boardPreview=null;}
    else{const last=boardState?.last;if(!Array.isArray(last?.cells)||last.cells.length!==30)return;boardPreview={...last,cells:[...last.cells],counts:{...last.counts}};previewFrozen=true;}
    paintBoard();
  };
  $('boardPreviewCopy').onclick=async()=>{
    const last=previewFrozen?boardPreview:boardState?.last;if(!Array.isArray(last?.cells)||last.cells.length!==30)return;
    const data={版本:'1.19.7',來源:'賽特 II 原生解析盤面，動畫可能稍晚呈現',預覽已凍結:previewFrozen,讀取時間:last.receivedAt,局號:last.spinId,盤面索引:last.index,流程:last.action,排列:'6欄5列；由左上逐列排列',符號表:symbolNames,盤面:Array.from({length:5},(_,row)=>last.cells.slice(row*6,row*6+6)),符號數量:last.counts};
    $('boardPreviewText').value=JSON.stringify(data,null,2);$('boardPreviewExport').open=true;
    try{await navigator.clipboard.writeText($('boardPreviewText').value);$('previewNotice').textContent='已複製盤面，可貼回對話核對。';}catch(_){$('boardPreviewText').focus();$('boardPreviewText').select();$('previewNotice').textContent='請長按下方盤面資料，全選並複製。';}
  };
  $('boardAdd').onclick=addBoardRule;
  $('boardApply').onclick=()=>{
    const rules=[];
    for(const row of ruleRows){const raw=row.count.value.trim(),count=Number(raw);if(raw===''||!Number.isSafeInteger(count)||count<0||count>30){$('boardRuleError').textContent='每條數量請填0至30的整數；空白不會當成0。';return;}rules.push({symbol:Number(row.symbol.value),op:row.op.value,count,action:row.action.value});}
    if(!rules.length){$('boardRuleError').textContent='請先新增至少一條規則。';return;}
    $('boardRuleError').textContent='';command('boardConfigure',{enabled:true,join:$('boardJoin').value,includeCascades:$('boardCascades').checked,includeFree:$('boardFree').checked,rules});
  };
  $('boardOff').onclick=()=>command('boardConfigure',{enabled:false});
  $('boardDetect').onclick=()=>command('boardDetect');
  $('boardJoin').onchange=disarmBoardEdit;
  $('boardCascades').onchange=disarmBoardEdit;$('boardFree').onchange=disarmBoardEdit;
  addBoardRule();paintBoard();

  const n=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const key=v=>typeof v==='string'&&/^\d+$/.test(v)?v:null;
  function cleanScoreFields(raw){const result={};if(!raw||typeof raw!=='object')return result;for(const key of ['c0','c1','c2','rtp','bet','rtp30','rtp_30','bet30','bet_30','todayWin','todayBet']){if(!own(raw,key))continue;const v=raw[key];result[key]=(v===null||typeof v==='number'||(typeof v==='string'&&v.length<=80))?v:null;}return result;}
  const number=v=>n(v)===null?'—':v.toLocaleString('zh-TW',{maximumFractionDigits:2});
  const periodRate=v=>n(v)===null?'—':v.toFixed(2)+'%';
  const roomNumber=v=>n(v)===null?'—':String(v);
  const stateText=v=>({Empty:'空房',Full:'使用中',Locked:'已鎖定',Close:'已關閉',Open:'開放中'}[v]||'未知狀態');
  const roomStateText=r=>r?.entryFailure?(r.entryFailure.status===304?'伺服器拒絕入座（304）':'進房遭拒 · 待重新核對'):stateText(r?.status);
  function cleanEntryFailure(v){return v&&typeof v==='object'?{time:typeof v.time==='string'?v.time.slice(0,40):null,status:n(v.status),message:typeof v.message==='string'?v.message.slice(0,160):''}:null;}
  const dateText=v=>v?new Date(v).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'尚未收到';
  function cardPart(tag,css,text){const el=document.createElement(tag);el.className=css;el.textContent=text;return el;}

  const labels=['目前未開','前一','前二','前三','前四','前五','前六','前七','前八','前九','前十'];
  function history(raw){return labels.slice(0,rights().history_count).map((label,index)=>({index,label,turns:Array.isArray(raw)?n(raw[index]):null,verification:index<=2?'二代原生畫面程式對照':'二代索引含義待實機核對'}));}

  const pct=(w,b)=>n(w)!==null&&n(b)!==null&&b>0?(w/b*100).toFixed(2)+'%':'—';
  function command(kind,data){
    if(licenseControl?.isAuthorized?.()!==true&&!['autoSpinStop','scanPause','stop'].includes(kind))return false;
    const e=rights();let error='';
    if(kind==='animationSpeed'&&(!Number.isSafeInteger(data?.factor)||data.factor<1||data.factor>e.max_speed))error='此版本動畫上限為 '+e.max_speed+'×。';
    if(kind==='playStart'){
      if(data?.mode==='strategy'&&!e.strategy)error='一般版可使用指定轉數；策略模式需加強版或進階版。';
      if(data?.mode==='count'&&e.max_batch!==null&&data.count>e.max_batch)error='一般版每批最多 '+e.max_batch+' 次。';
      if(data?.rtpRule&&!e.rtp_stop)error='RTP停止策略需進階版。';
      if(data?.bonusStop&&!e.bonus_stop)error='免費大獎降速／停轉需進階版。';
      if(data?.symbols?.rules?.length>e.max_symbol_rules)error='此版本最多 '+e.max_symbol_rules+' 條盤面規則。';
    }
    if(kind==='bonusConfigure'&&data&&(!e.bonus_stop||!Number.isSafeInteger(data.speed)||data.speed<1||data.speed>e.max_speed))error='此版本未開放這組大獎降速設定。';
    if(kind==='boardConfigure'&&data?.enabled&&(!e.strategy||data.rules?.length>e.max_symbol_rules))error='此版本不支援這組盤面策略。';
    if(error){$('playError').textContent=error;$('boardRuleError').textContent=error;return false;}
    if(['scanStart','scanContinue','scanResume','priorityRoom'].includes(kind)){
      const scope={...(rooms.size?{roomIds:[...eligibleRoomIds()]}:{}),roomLimit:e.daily_rooms??5000};
      if(kind==='priorityRoom'&&rooms.size&&!eligibleRoomIds().has(data?.roomId)){$('roomActionNote').textContent='此房間未納入今日版本額度。';return false;}
      window.postMessage({tag:TAG,from:'ui',kind:'editionScope',data:scope},location.origin);
      if(kind==='scanStart'||kind==='scanContinue')data={...data,...scope};
    }
    window.postMessage({tag:TAG,from:'ui',kind,data},location.origin);return true;
  }
  function mount(){const p=document.fullscreenElement||document.documentElement;if(p&&host.parentNode!==p)p.appendChild(host);}
  mount();let mountTimer=setInterval(mount,1500);
  $('domain').textContent=location.hostname+(window.top===window?' · 頂層頁面':' · 內嵌框架');
  function updateRoomScore(roomId){
    const r=rooms.get(roomId);if(!r)return null;
    const analysis=cloudRoomAnalysis(r);
    r.score_combo=analysis.score_combo;r.score_boom=analysis.score_boom;r.score_return=analysis.score_return;
    r.score_status=analysis.status;r.score_missing=analysis.missing.slice();r.score_inputs=analysis.inputs;
    return analysis;
  }
  function analyses(){
    const map=new Map([...rooms.keys()].map(id=>[id,updateRoomScore(id)]));
    const comparison=buildRoomComparisons(map);
    return {cohort:[...map.values()].filter(x=>x.score_combo!==null).length,map,comparison};
  }
  // BEGIN SAMPLE COMPARISON
  function buildRoomComparisons(analysisMap){
    const valid=[...analysisMap.entries()].filter(([,value])=>value?.status==='規則評分'&&value.game==='seth2'&&Number.isInteger(value.score_combo)&&value.score_combo>=0&&value.score_combo<=1000);
    const groups=new Map();for(const [,value] of valid)groups.set(value.score_combo,(groups.get(value.score_combo)||0)+1);
    const total=valid.length,byScore=new Map();let lower=0;
    for(const score of [...groups.keys()].sort((a,b)=>a-b)){
      const tied=groups.get(score),higher=total-lower-tied;
      byScore.set(score,{total,lower,tied,rank:higher+1,percent:total>=2?lower/total*100:null,focus:higher===0&&lower>0});
      lower+=tied;
    }
    const byRoom=new Map(valid.map(([id,value])=>[id,byScore.get(value.score_combo)]));
    return {total,byRoom};
  }
  function roomComparisonCard(comparison,total,status){
    const available=comparison?.percent!==null&&comparison?.percent!==undefined;
    const card=cardPart('div','roomCompare'+(available?'':' is-pending')+(comparison?.focus?' is-focus':''),'');
    card.appendChild(cardPart('div','roomCompareTitle',comparison?.focus?'✦ 本次焦點房間':'✦ 房間數據比較'));
    card.appendChild(cardPart('span','roomCompareLabel','數據領先度'));
    card.appendChild(cardPart('strong','roomCompareValue',available?comparison.percent.toFixed(1)+'%':'等待比較'));
    if(available){
      const track=cardPart('div','roomCompareTrack',''),fill=cardPart('span','','');fill.style.width=comparison.percent+'%';track.appendChild(fill);card.appendChild(track);
      card.appendChild(cardPart('div','roomCompareMeta','本次比較 '+comparison.total+' 間，領先其中 '+comparison.lower+' 間'));
      card.appendChild(cardPart('div','roomCompareRank','綜合分排名 '+comparison.rank+'／'+comparison.total+(comparison.tied>1?' · 同分 '+comparison.tied+' 間':'')));
    }else{
      card.appendChild(cardPart('div','roomCompareMeta',comparison?'有效樣本僅 '+total+' 間，等待更多房間比較':(status||'資料不足')+'，本房尚未納入比較'));
      card.appendChild(cardPart('div','roomCompareRank','本次有效樣本 '+total+' 間'));
    }
    card.appendChild(cardPart('small','roomCompareScope','依本次有效樣本的綜合規則分比較'));
    card.title='領先度＝綜合規則分低於本房的有效房間數÷有效房間總數；同分不計入領先，排名採並列名次。不是中獎機率。';
    card.setAttribute('aria-label',available?'數據領先度 '+comparison.percent.toFixed(1)+'%，本次比較 '+comparison.total+' 間，領先 '+comparison.lower+' 間，綜合分排名 '+comparison.rank:'數據領先度等待比較');
    return card;
  }
  // END SAMPLE COMPARISON

  function roomHistoryCard(room){
    const d=details.get(room.roomId),raw=d?.mgCounts,age=d?Date.now()-Date.parse(d.receivedAt):null;
    const stale=!!d&&(!Number.isFinite(age)||age>options.maxAge*1000);
    const wrap=cardPart('div','roomHistory'+(stale?' staleHistory':''),'');
    wrap.setAttribute('aria-label',roomNumber(room.number)+'號房目前未開與前'+(rights().history_count-1)+'次紀錄；索引含義待核對');
    wrap.dataset.state=!d?'pending':stale?'stale':'ready';
    for(const item of history(raw)){
      const cell=cardPart('div','roomHistoryCell','');cell.appendChild(cardPart('span','',item.label));
      cell.appendChild(cardPart('b','',Number.isSafeInteger(item.turns)&&item.turns>=0?String(item.turns):'—'));wrap.appendChild(cell);
    }
    if(!d||stale)wrap.appendChild(cardPart('small','roomHistoryNote',!d?'明細待補；未取得的次數顯示 —':'舊快照 · 等待更新'));
    return wrap;
  }

  function paint(){
    applyTierUI();paintDock();
    if(document.hidden||root.querySelector('section').hidden||mainPanel!=='rank'){
      $('status').textContent=status;$('status').title=status;
      $('liveState').textContent=autoHold?'異常暫停':controlState?.active?'監聽中 · 旋轉中':connected?'自動監聽':'等待遊戲';
      $('scanNote').textContent=scanState.note+'｜明細 '+scanState.done+'/'+scanState.total+'｜待查 '+scanState.remaining;
      return;
    }
    const eligible=eligibleRoomIds();
    const result=analyses(),map=result.map;
    $('totalStat').textContent=[...eligible].filter(id=>rooms.has(id)).length.toLocaleString('zh-TW');$('detailStat').textContent=[...eligible].filter(id=>details.has(id)).length.toLocaleString('zh-TW');$('validStat').textContent=result.cohort.toLocaleString('zh-TW');
    for(const name of ['combined','boom','returns','waiting','all'])$(name).setAttribute('aria-selected',String(name===tab));$('list').className='list '+(layout==='cards'?'':layout);
    const names={combined:'綜合公式榜',boom:'爆分公式榜',returns:'回分公式榜',waiting:'目前未開榜',all:'全部房間'};
    $('status').textContent=status;$('status').title=status;
    const current=options.gameSelection==='auto'?gameId(detectedGame):gameId(options.gameSelection);
    const roomGame=map.get(selected)?.game;
    $('gameLabel').textContent=(current||roomGame)?GAME_LABELS[current||roomGame]+' · 規則評分':'不支援此遊戲';
    $('dataNotice').firstChild.textContent=cloudError?'本機評分暫不可用：'+cloudError:result.cohort?`本機規則評分 · 已有 ${result.cohort} 間資料完整。`:'房間資料正在本機評分；缺少欄位時顯示資料不足。';
    $('dataNotice').hidden=result.cohort>0&&!cloudError;
    $('liveState').textContent=autoHold?'異常暫停':controlState?.active?'監聽中 · 旋轉中':connected?'自動監聽':'等待遊戲';
    $('lastUpdated').textContent=refreshNote;
    $('scanStrip').hidden=!scanState.total&&!scanState.pagesTotal&&!scanState.queryPending;
    $('scanBrief').textContent=`${scanState.scope==='all'?'全部房間':'空房優先'}｜清單 ${scanState.pagesDone}/${scanState.pagesTotal||'待回覆'} 頁 · 明細 ${scanState.done}/${scanState.total} · ${scanState.running?'查詢中':(scanState.pending||scanState.queryPending)?'等待回覆':'已暫停／完成'}`;
    $('scanProgress').max=Math.max(1,scanState.phase==='pages'?scanState.pagesTotal:scanState.total);$('scanProgress').value=scanState.phase==='pages'?scanState.pagesDone:scanState.done;
    $('scanNote').textContent=`${scanState.note}｜清單 ${scanState.pagesDone}/${scanState.pagesTotal||'待回覆'} 頁｜預期房間 ${scanState.expectedRooms??'待回覆'}｜明細完成 ${scanState.done}/${scanState.total}｜待查 ${scanState.remaining}｜略過新鮮資料 ${scanState.skipped}｜異常 ${scanState.failed}`;
    $('retryScan').hidden=false;$('retryScan').disabled=false;paintRoomActions();
    $('count').textContent=`${names[tab]}｜房間 ${rooms.size}｜詳情 ${details.size}｜有效比較群 ${result.cohort}｜${refreshNote}`;
    const query=$('search').value.toLowerCase();
    let candidates=[...rooms.values()].filter(r=>eligible.has(r.roomId)&&(!$('empty').checked||(r.status==='Empty'&&!r.entryFailure))&&
      `${r.number??''} ${r.roomId} ${roomStateText(r)}`.toLowerCase().includes(query));
    const validCount=candidates.filter(r=>map.get(r.roomId).score!==null).length;
    if(tab==='waiting')candidates=candidates.filter(r=>map.get(r.roomId).freshWait);
    const byNumber=(a,b)=>(a.number??Infinity)-(b.number??Infinity);
    const valueOf=(r)=>{const x=map.get(r.roomId);return ({score_combo:x.score_combo,score_boom:x.score_boom,score_return:x.score_return,today:x.today,wait:x.freshWait?x.wait:null,profit:n(r.todayBet)!==null&&n(r.todayWin)!==null?r.todayWin-r.todayBet:null,number:r.number,status:({Empty:0,Full:1,Locked:2,Close:3}[r.status]??4)})[sortBy];};
    candidates.sort((a,b)=>{const x=valueOf(a),y=valueOf(b);if(x===null||x===undefined)return y===null||y===undefined?byNumber(a,b):1;if(y===null||y===undefined)return -1;return (sortDir==='asc'?x-y:y-x)||byNumber(a,b);});
    const pages=Math.max(1,Math.ceil(candidates.length/pageSize));page=Math.max(0,Math.min(page,pages-1));
    $('list').replaceChildren();
    const visible=candidates.slice(page*pageSize,page*pageSize+pageSize);
    for(const [index,r] of visible.entries()){
      const x=map.get(r.roomId),rank=page*pageSize+index+1;
      const row=cardPart('article','row'+(selected===r.roomId?' active':''),'');
      row.appendChild(cardPart('span','medal '+(rank===1?'first':rank===2?'second':rank===3?'third':''),String(rank)));
      const info=cardPart('div','roominfo',''),line=cardPart('div','roomline','');
      line.appendChild(cardPart('small','','房號'));line.appendChild(cardPart('span','roomtitle',roomNumber(r.number)));info.appendChild(line);
      const returns=cardPart('div','roomsub','今日得分率 ');returns.appendChild(cardPart('b','',x.today===null?'—':x.today.toFixed(2)+'%'));info.appendChild(returns);
      if(rights().long_stats){
        const longReturn=cardPart('div','roomsub','近30日得分率 ');
        longReturn.appendChild(cardPart('b','',periodRate(x.rtp30)));info.appendChild(longReturn);
        const longBet=cardPart('div','roomsub','近30日下注 ');
        longBet.appendChild(cardPart('b','',number(x.inputs?.bet30)));info.appendChild(longBet);
      }
      const profit=n(r.todayWin)!==null&&n(r.todayBet)!==null?r.todayWin-r.todayBet:null;
      const profitLine=cardPart('div','roomsub','今日盈虧 ');profitLine.appendChild(cardPart('b',profit===null?'':profit>=0?'positive':'negative',profit===null?'—':(profit>0?'+':'')+number(profit)));info.appendChild(profitLine);
      const hint=cardPart('div','roomhint','');hint.appendChild(cardPart('span','badge '+(r.status==='Locked'?'locked':r.status==='Full'?'full':''),roomStateText(r)));
      hint.appendChild(cardPart('span','',(r.cached?' · 瀏覽器快照':'')+' · '+(x.freshWait?'未開 '+number(x.wait)+' 轉':'明細待補／過期')));info.appendChild(hint);row.appendChild(info);
      const focus=cardPart('div','scorebox','');
      const focusLabel=tab==='boom'?'爆分規則分':tab==='returns'?'回分規則分':tab==='waiting'?'目前未開':'綜合規則分';
      const focusValue=tab==='boom'?x.score_boom:tab==='returns'?x.score_return:tab==='waiting'?(x.freshWait?x.wait:null):x.score;
      focus.appendChild(cardPart('span','',focusLabel));
      focus.appendChild(cardPart('b',focusValue===null?'pending':'',focusValue===null?x.status:tab==='waiting'?number(focusValue):String(focusValue)));
      focus.appendChild(cardPart('small','',tab==='waiting'?'轉 · 原生未開欄位':'滿分 1000'));row.appendChild(focus);
      const actions=cardPart('div','actions',''),detailButton=cardPart('button','','詳情 ›'),selectButton=cardPart('button','gold',selected===r.roomId?'已選定':'選定房號');
      detailButton.setAttribute('aria-label','查看 '+roomNumber(r.number)+' 號房明細');
      detailButton.onclick=()=>{chooseRoom(r.roomId);$('selectedPanel').open=true;paint();$('selectedPanel').scrollIntoView?.({block:'nearest',behavior:'smooth'});};
      selectButton.onclick=()=>chooseRoom(r.roomId);actions.appendChild(selectButton);if(rights().long_stats)actions.appendChild(detailButton);row.appendChild(actions);
      if(rights().sample_compare)row.appendChild(roomComparisonCard(result.comparison.byRoom.get(r.roomId),result.comparison.total,x.status));
      const triplet=cardPart('div','scoretriplet','');for(const [label,field] of (rights().all_scores?[['綜合','score_combo'],['爆分','score_boom'],['回分','score_return']]:[['綜合','score_combo']])){const cell=cardPart('span','',label+' ');cell.appendChild(cardPart('b','',x[field]===null?'—':String(x[field])));triplet.appendChild(cell);}row.appendChild(triplet);row.appendChild(roomHistoryCard(r));$('list').appendChild(row);
    }
    if(!candidates.length){$('list').appendChild(cardPart('div','emptybox',rooms.size?'目前篩選沒有結果。可取消只看空房，或切換全房表。':'正在背景取得賽特 II 的分頁清單，不必開啟遊戲選房介面。'));}
    $('page').textContent=`共 ${candidates.length} 間 · 第 ${page+1}/${pages} 頁 · 可評分 ${validCount}`;
    $('prev').disabled=page===0;$('next').disabled=page>=pages-1;
    const r=rooms.get(selected),d=details.get(selected),x=map.get(selected);
    const historyTitle=rights().history_count===4?'未開與前三':'未開與前十';
    $('selectedSummary').textContent=r?`${roomNumber(r.number)} 號房 · ${historyTitle}`:'選定房間 · '+historyTitle;
    $('selectedPeriod').textContent=rights().long_stats&&r
      ?`近30日得分率 ${periodRate(x?.rtp30)}　近30日下注 ${number(x?.inputs?.bet30)}`
      :'';
    let text=`選定房號：${r?roomNumber(r.number):'—'}｜識別碼：${selected??'—'}\n`;
    if(x){text+=`狀態：${roomStateText(r)}｜${x.empty&&!r.entryFailure?'符合空房篩選':'入座狀態待核對，僅供觀察'}\n綜合規則評分：${x.score_combo===null?x.status:x.score_combo+'/1000'}\n爆分規則評分：${x.score_boom===null?x.status:x.score_boom+'/1000'}\n回分規則評分：${x.score_return===null?x.status:x.score_return+'/1000'}\n`+
      x.reasons.join('\n')+'\n評分來源：本機；未驗證預測效果\n';
      text+='遊戲：'+(x.game?GAME_LABELS[x.game]:'不支援此遊戲')+'\n必要欄位與來源：\n'+SCORE_KEYS.map(k=>k+'：'+(x.inputs?.[k]??'資料不足')+'（'+(x.fieldSources[k]||'未取得')+'）').join('\n')+'\n';
    }
    if(r)text+=`列表派彩／投注：${number(r.win)} / ${number(r.bet)} → ${pct(r.win,r.bet)}\n今日盈虧（派彩−投注）：${n(r.todayBet)!==null&&n(r.todayWin)!==null?(r.todayWin-r.todayBet).toFixed(2):'—'}\n列表收到：${dateText(r.receivedAt)}\n`;
    if(d){for(const [label,w,b] of [['時段統計',d.hourWin,d.hourBet],['今日統計',d.todayWin,d.todayBet],['近30天統計',d.dayWin,d.dayBet]])text+=`${label}：${number(w)} / ${number(b)} → ${pct(w,b)}\n`;
      text+='\n歷史間隔對照（部分含義待核對）：\n'+history(d.mgCounts).map(row=>row.label+'：'+number(row.turns)+'（'+row.verification+'）').join('\n')+
      '\n原始歷史陣列：'+JSON.stringify(d.mgCounts)+'\n詳情收到：'+dateText(d.receivedAt)+'\n數字是最後收到的快照，不會自行累加。';}
    else text+='明細將在背景依序補齊，不必點擊此房間。';
    if(!rights().all_scores)text=(r?roomNumber(r.number)+' 號房\n':'')+'綜合規則分：'+(x?.score_combo??x?.status??'資料不足')+'\n今日得分率：'+(x?.today==null?'資料不足':x.today.toFixed(2)+'%')+'\n'+history(d?.mgCounts).map(row=>row.label+'：'+number(row.turns)).join('\n');
    $('detail').textContent=text;$('historyCards').replaceChildren();
    for(const row of history(d?.mgCounts)){const cell=cardPart('div','historycell','');cell.appendChild(cardPart('span','',row.label));cell.appendChild(cardPart('b','',number(row.turns)));cell.appendChild(cardPart('small','',row.index<=2?'原生畫面程式對照':'含義待核對'));$('historyCards').appendChild(cell);}

  }
  const ROOM_CACHE_KEY='room-assistant:seth2:room-cache:v1';
  let cacheSaveTimer=null,cacheSeedSent=false,cacheDirty=false;
  const cacheId=v=>typeof v==='string'&&/^\d{1,15}$/.test(v)?v:null;
  const cacheDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+300000?v:null;
  function cachedRoom(r){
    if(!r||!cacheId(r.roomId)||!cacheDate(r.receivedAt))return null;
    const row={roomId:r.roomId,number:n(r.number),status:typeof r.status==='string'?r.status.slice(0,30):'未知',receivedAt:r.receivedAt,gameRaw:typeof r.gameRaw==='string'?r.gameRaw.slice(0,80):null,scoreFields:cleanScoreFields(r.scoreFields)};
    for(const k of ['win','bet','todayWin','todayBet'])row[k]=n(r[k]);
    row.entryFailure=cleanEntryFailure(r.entryFailure);
    for(const k of ['statsReceivedAt','statusAt'])if(cacheDate(r[k]))row[k]=r[k];
    return row;
  }
  function cachedDetail(r){
    if(!r||!cacheId(r.roomId)||!cacheDate(r.receivedAt))return null;
    const row={roomId:r.roomId,receivedAt:r.receivedAt,gameRaw:typeof r.gameRaw==='string'?r.gameRaw.slice(0,80):null,scoreFields:cleanScoreFields(r.scoreFields),day30Profile:r.day30Profile==='g1005-user-verified'?'g1005-user-verified':null};
    for(const k of ['hourWin','hourBet','todayWin','todayBet','dayWin','dayBet'])row[k]=n(r[k]);
    row.mgCounts=Array.isArray(r.mgCounts)?r.mgCounts.slice(0,64).map(v=>Number.isSafeInteger(v)&&v>=0?v:null):null;
    return row;
  }
  function flushRoomCache(){
    clearTimeout(cacheSaveTimer);cacheSaveTimer=null;
    if(!cacheDirty||(!rooms.size&&!scanState.pagesComplete))return;
    try{
      const savedAt=new Date().toISOString(),data={schema:1,game:'g1005',savedAt,selected,rooms:[...rooms.values()].slice(0,5000).map(cachedRoom).filter(Boolean),details:[...details.values()].slice(0,5000).map(cachedDetail).filter(Boolean)};
      const raw=JSON.stringify(data);if(raw.length>3000000)throw Error('size');window.localStorage.setItem(ROOM_CACHE_KEY,raw);cacheDirty=false;
      $('roomCacheNote').textContent='房間快照已存入此瀏覽器 · '+dateText(savedAt);
    }catch(_){$('roomCacheNote').textContent='房間快照無法儲存；保留本頁資料，舊快照不會因此覆寫。';}
  }
  function scheduleRoomCache(){cacheDirty=true;if(cacheSaveTimer===null)cacheSaveTimer=setTimeout(flushRoomCache,lowPower?15000:10000);}
  function restoreRoomCache(){
    try{
      const raw=window.localStorage.getItem(ROOM_CACHE_KEY);if(!raw){$('roomCacheNote').textContent='房間資料將自動儲存在此瀏覽器。';return;}
      if(raw.length>3000000)throw Error('size');const data=JSON.parse(raw);
      if(data?.schema!==1||data.game!=='g1005'||!Array.isArray(data.rooms)||!Array.isArray(data.details))throw Error('format');
      for(const r of data.rooms.slice(0,5000)){const row=cachedRoom(r);if(row)rooms.set(row.roomId,{...row,cached:true});}
      for(const r of data.details.slice(0,5000)){const row=cachedDetail(r);if(row&&rooms.has(row.roomId))details.set(row.roomId,{...row,cached:true});}
      selected=rooms.has(data.selected)?data.selected:rooms.keys().next().value??null;
      refreshNote='瀏覽器快照 · '+dateText(data.savedAt);$('roomCacheNote').textContent='已先載入 '+rooms.size+' 間快照；保留原取得時間，進場後更新。';
    }catch(_){$('roomCacheNote').textContent='快照無法讀取，將重新取得房間資料。';}
  }
  function seedReaderCache(){
    if(cacheSeedSent||!connected)return;cacheSeedSent=true;
    command('roomSeed',{selected,rooms:[...rooms.values()].slice(0,5000).map(r=>({roomId:r.roomId,number:r.number,status:r.status,entryFailure:cleanEntryFailure(r.entryFailure),receivedAt:r.receivedAt})),details:[...details.values()].slice(0,5000).filter(d=>Array.isArray(d.mgCounts)&&d.mgCounts.length>=11&&d.mgCounts.slice(0,11).every(v=>Number.isSafeInteger(v)&&v>=0)).map(d=>({roomId:d.roomId,receivedAt:d.receivedAt}))});
  }
  function chooseRoom(roomId){selected=roomId;savePreferences();scheduleRoomCache();command('priorityRoom',{roomId,interval:queryInterval,scope:queryScope,maxAge:options.maxAge});paint();}

  function refresh(){if(!timer)timer=setTimeout(()=>{timer=null;paint();},lowPower?1200:400);}
  window.addEventListener('message',e=>{
    if(e.source!==window||e.origin!==location.origin)return;
    const m=e.data;if(!m||m.tag!==TAG||m.from!=='reader')return;
    try{
      const data=m.data,now=new Date().toISOString(),changed=new Set();
      if(m.kind==='scanRestarted'){autoHold=false;scanState.failed=0;return;}
      if(m.kind==='priorityNote'){$('roomActionNote').textContent=String(data||'');return;}
      if(m.kind==='roomSwitchDiagnostic'){
        switchState={...switchState,diagnostic:data};
        $('switchProblem').hidden=data?.status===200;
        const cause={authorization:'登入／權限遭拒',throttled:'查詢頻率受限','list-conflict':'清單空房，但伺服器拒絕入座；根因尚未確認','native-rejection':'伺服器拒絕入座','server-error':'伺服器錯誤',unconfirmed:'結果尚未確認'}[data?.classification]||'結果尚未確認';
        $('switchProblem').textContent='切房未完成｜'+cause+'\n房號：'+(data?.number??'未核對')+'｜狀態：'+(data?.status??'未取得')+'｜代碼：'+(data?.code??'未提供')+'\n伺服器訊息：'+(data?.message||'未提供')+'\n請求與選定房：'+(data?.matchesTarget===true?'一致':data?.matchesTarget===false?'不一致':'原生操作')+(data?.comparison?'\n'+data.comparison:'')+(data?.classification==='list-conflict'?'\n核對方式：請用遊戲原生選房嘗試同一房；若也被拒，入座限制須由平台確認。':'');return;
      }
      if(m.kind==='roomEntry'&&data&&key(data.roomId)!==null){roomRevision++;const r=rooms.get(data.roomId);if(r){r.entryFailure=cleanEntryFailure(data.failure);scheduleRoomCache();refresh();}paintRoomActions();return;}
      if(m.kind==='roomSwitch'){switchState=data;$('roomActionNote').textContent=String(data?.note||'');paintRoomActions();return;}
      if(m.kind==='queuedControl'&&data){queuedState=data;$('playError').textContent=String(data.note||'');paintSession();paintControls();paintDock();if(!data.waiting)scheduleAuto();return;}
      if(m.kind==='earlyOutcome'&&data&&typeof data==='object'){earlyState=data;paintEarly();paintDock();return;}
      if(m.kind==='session'&&data&&typeof data==='object'){playState=data;paintSession();paintControls();paintBoard();paintRoomActions();return;}
      if(m.kind==='board'&&data&&typeof data==='object'){boardState=data;paintBoard();paintDock();return;}
      if(m.kind==='controls'&&data&&typeof data==='object'){controlState=data;paintRoomActions();controlReceivedAt=Date.now();paintControls();if(!speedPreferenceApplied&&data.speedAvailable===true&&data.detected?.bundle==='g1005'){speedPreferenceApplied=true;if(preferredSpeed>1)command('animationSpeed',{factor:preferredSpeed});}if(data.active!==true)scheduleAuto();return;}
      if(m.kind==='game'&&data&&typeof data.value==='string'){detectedGame=data.value.slice(0,80);for(const id of rooms.keys())changed.add(id);}
      if(m.kind==='scan'&&data){
        scanState={running:data.running===true,done:n(data.done)??0,total:n(data.total)??0,skipped:n(data.skipped)??0,failed:n(data.failed)??0,remaining:n(data.remaining)??0,pending:key(data.pending),queryPending:data.queryPending===true,pendingPage:n(data.pendingPage),phase:data.phase==='pages'?'pages':'details',pagesDone:n(data.pagesDone)??0,pagesTotal:n(data.pagesTotal)??0,pagesComplete:data.pagesComplete===true,expectedRooms:n(data.expectedRooms),compressedDecoded:n(data.compressedDecoded)??0,priority:key(data.priority),continueRequested:data.continueRequested===true,interval:n(data.interval)??0,scope:data.scope==='all'?'all':'empty',nativeQueries:n(data.nativeQueries)??0,lastError:data.lastError??null,note:String(data.note||'').slice(0,200)};
      }
      if(m.kind==='scan'&&scanState.failed>0)autoHold=true;
      if(m.kind==='status'&&data){readerReady=true;connected=(n(data.connections)??0)>0;pending=false;status=String(data.note||'').slice(0,160)+`｜連線 ${n(data.connections)??0}｜事件 ${n(data.received)??0}｜錯誤 ${n(data.errors)??0}`;}
      if(m.kind==='status'&&connected){seedReaderCache();scheduleAuto();}
      if(m.kind==='rooms'&&Array.isArray(data)){
        for(const r of data.slice(0,5000)){
          if(!r||key(r.roomId)===null)continue;
          rooms.set(r.roomId,{roomId:r.roomId,gameRaw:typeof r.gameRaw==='string'?r.gameRaw.slice(0,80):null,scoreFields:cleanScoreFields(r.scoreFields),number:n(r.number),status:typeof r.status==='string'?r.status.slice(0,30):'未知',entryFailure:cleanEntryFailure(r.entryFailure??rooms.get(r.roomId)?.entryFailure),win:n(r.win),bet:n(r.bet),todayWin:n(r.todayWin),todayBet:n(r.todayBet),receivedAt:now});
          changed.add(r.roomId);
          if(rooms.size>5000)rooms.delete(rooms.keys().next().value);
        }
        if(selected===null)selected=rooms.keys().next().value??null;refreshNote='列表更新 '+dateText(now);scheduleAuto();
      }
      if(m.kind==='roomSet'&&Array.isArray(data)){const keep=new Set(data.filter(x=>key(x)!==null));for(const id of rooms.keys())if(!keep.has(id)){rooms.delete(id);details.delete(id);}if(!rooms.has(selected))selected=rooms.keys().next().value??null;}
      if(m.kind==='updates'&&Array.isArray(data))for(const r of data.slice(0,5000)){if(r&&key(r.roomId)!==null&&typeof r.status==='string'){const old=rooms.get(r.roomId);if(old){old.status=r.status.slice(0,30);old.statusAt=now;changed.add(r.roomId);}}}
      if(m.kind==='detail'&&data&&key(data.roomId)!==null){
        const d={roomId:data.roomId,gameRaw:typeof data.gameRaw==='string'?data.gameRaw.slice(0,80):null,scoreFields:cleanScoreFields(data.scoreFields),day30Profile:data.day30Profile==='g1005-user-verified'?'g1005-user-verified':null,receivedAt:now};for(const k of ['hourWin','hourBet','todayWin','todayBet','dayWin','dayBet'])d[k]=n(data[k]);
        d.mgCounts=Array.isArray(data.mgCounts)?data.mgCounts.slice(0,64).map(n):null;details.set(d.roomId,d);if(selected===null)selected=d.roomId;
        if(!rooms.has(d.roomId))rooms.set(d.roomId,{roomId:d.roomId,number:null,status:'未知',scoreFields:{},receivedAt:now});
        changed.add(d.roomId);const r=rooms.get(d.roomId);if(r&&d.todayWin!==null&&d.todayBet!==null){r.todayWin=d.todayWin;r.todayBet=d.todayBet;r.statsReceivedAt=now;}
        if(details.size>5000)details.delete(details.keys().next().value);
      }
      if(changed.size||m.kind==='roomSet')roomRevision++;
      for(const id of changed)updateRoomScore(id);if(['rooms','detail','updates','roomSet'].includes(m.kind))scheduleRoomCache();refresh();
    }catch(_){status='收到資料但介面解析失敗';refresh();}
  });
  function request(kind){
    if(licenseControl?.isAuthorized?.()!==true)return;
    connected=false;pending=true;lastReaderProbe=Date.now();status='介面正常，正在建立／連接讀取端…';paint();injectReader();command('performanceMode',{enabled:lowPower});command(kind);syncBonusSettings();
    setTimeout(()=>{if(pending&&!connected){pending=false;status='Userscripts 介面正常，但 Safari 頁面讀取端未回應。請確認遊戲網站權限並重新載入；也可能是頁面執行限制，這不代表房間數為零。';paint();}},3500);
  }
  function launchScan(){
    if(scanState.lastError?.timeout||!connected||document.hidden||controlState?.active===true||playState?.busy===true||queuedState?.waiting===true||autoHold)return;
    command('scanStart',{mode:'all',scope:queryScope,interval:queryInterval,maxAge:options.maxAge});
  }
  function scheduleAuto(){
    if(licenseControl?.isAuthorized?.()!==true)return;
    if(!autoEnabled||autoHold||scanState.lastError?.timeout||document.hidden||controlState?.active===true||playState?.busy===true||queuedState?.waiting===true||scanState.running||(scanState.pending||scanState.queryPending)||!connected||autoQueueTimer!==null)return;
    const pausedForPlayback=scanState.remaining&&/背景|自動旋轉|連線|通道尚未就緒|控制操作|選房|原生查詢/.test(scanState.note);
    if(scanState.remaining&&!pausedForPlayback)return;
    const eligible=eligibleRoomIds();
    const needs=!scanState.pagesComplete||[...rooms.keys()].filter(id=>eligible.has(id)).filter(id=>queryScope==='all'||rooms.get(id)?.status==='Empty').some(id=>{const d=details.get(id);return !d||!Array.isArray(d.mgCounts)||d.mgCounts.length<11||Date.now()-Date.parse(d.receivedAt)>options.maxAge*1000;});
    if(!pausedForPlayback&&!needs)return;
    autoQueueTimer=setTimeout(()=>{
      autoQueueTimer=null;
      if(autoHold||scanState.lastError?.timeout||document.hidden||controlState?.active===true||playState?.busy===true||queuedState?.waiting===true||scanState.running||(scanState.pending||scanState.queryPending)||!connected)return;
      autoLaunched=true;
      if(scanState.remaining&&/背景|自動旋轉|連線|通道尚未就緒|控制操作|選房|原生查詢/.test(scanState.note))command('scanResume');
      else if(!scanState.remaining)launchScan();
    },1500);
  }
  function continueDetails(){autoHold=false;command('scanContinue',{scope:queryScope,interval:queryInterval,maxAge:options.maxAge});$('roomActionNote').textContent='已要求接續；若有在途請求，會先等回覆。';}
  $('retryScan').onclick=continueDetails;$('resumeDetails').onclick=continueDetails;
  $('refreshSelected').onclick=()=>{if(selected)chooseRoom(selected);};
  $('recheckSelected').onclick=()=>{if(selected)command('checkRoom',{roomId:selected});};
  $('switchSelected').onclick=()=>{if(!selected||playState?.busy||controlState?.active||switchState?.pending)return;flushRoomCache();command('changeRoom',{roomId:selected});$('roomActionNote').textContent='已要求原生切換選定房間；不會自動投注。';};
  function paintRoomActions(){
    const row=rooms.get(selected),busy=playState?.busy===true||controlState?.active===true||queuedState?.waiting===true||switchState?.pending===true;
    $('refreshSelected').disabled=!row;$('recheckSelected').disabled=!row||row.cached===true||busy||!connected;
    $('switchSelected').disabled=!row||row.cached===true||!!row.entryFailure||row.status!=='Empty'||busy||!connected;
    $('switchSelected').textContent=row?'切換 '+roomNumber(row.number)+' 號房':'切換選定房間';
  $('resumeDetails').textContent=scanState.continueRequested?'等待回覆後接續':'繼續查詢明細';
  }
  $('pageSize').onchange=()=>{pageSize=Number($('pageSize').value);page=0;paint();};
  $('controlDetect').onclick=()=>{injectReader();command('controlDetect');};
  $('playMode').onchange=()=>{paintSession();paintControls();};
  $('goBoard').onclick=()=>showMain('board');
  $('spinStart').onclick=()=>{
    if((!controlState?.ready&&!/在途.*回覆/.test(String(controlState?.reason||'')))||!playState?.ready||playState.busy||queuedState?.waiting)return;
    const mode=$('playMode').value,options={mode};$('playError').textContent='';
    if(mode==='strategy'){
      options.useSymbols=$('useSymbolStop').checked;
      if(options.useSymbols){
        const rules=[];for(const row of ruleRows){const raw=row.count.value.trim(),count=Number(raw);if(raw===''||!Number.isSafeInteger(count)||count<0||count>30){$('playError').textContent='請先設定盤面數量門檻，或取消盤面條件並改用RTP停止。';return;}rules.push({symbol:Number(row.symbol.value),op:row.op.value,count,action:'stop'});}
        if(!rules.length){$('playError').textContent='請先新增盤面停止條件。';return;}options.symbols={rules,join:$('boardJoin').value,includeCascades:$('boardCascades').checked,includeFree:$('boardFree').checked};
      }
      if($('useRtpStop').checked){const raw=$('rtpStopValue').value.trim(),value=Number(raw),min=Number($('rtpMin').value);if(!raw||!Number.isFinite(value)||value<0||!Number.isSafeInteger(min)||min<1){$('playError').textContent='請填有效的RTP百分比門檻與最低結算次數。';return;}options.rtpRule={op:$('rtpStopOp').value,value,min};}
      if(!options.useSymbols&&!options.rtpRule&&!$('useProfitStop').checked&&!$('useLossStop').checked&&!$('stopMega').checked&&!$('stopUltra').checked&&!$('stopLegendary').checked){$('playError').textContent='請至少設定一種停止條件。';return;}
    }else{options.count=Number($('spinCount').value);if(!Number.isSafeInteger(options.count)||options.count<=0){$('playError').textContent='轉數請輸入正整數。';return;}}
    const limitValues={unit:'percent',takeProfit:null,stopLoss:null};
    for(const [toggle,input,key] of [['useProfitStop','profitTarget','takeProfit'],['useLossStop','lossTarget','stopLoss']])if($(toggle).checked){const raw=$(input).value.trim(),v=Number(raw);if(!raw||!Number.isFinite(v)||v<=0){$('playError').textContent='已啟用的止盈／止損請填大於0的百分比。';return;}if(key==='stopLoss'&&v>100){$('playError').textContent='止損百分比不能超過100%。';return;}limitValues[key]=v;}
    if(limitValues.takeProfit!==null||limitValues.stopLoss!==null)options.limits=limitValues;
    if($('stopMega').checked||$('stopUltra').checked||$('stopLegendary').checked){const speed=Number($('bonusSpeed').value);if(!Number.isSafeInteger(speed)||speed<1||speed>100){$('playError').textContent='大獎降速請填1至100整數。';return;}options.bonusStop={mega:$('stopMega').checked,ultra:$('stopUltra').checked,legendary:$('stopLegendary').checked,speed};}
    clearTimeout(autoQueueTimer);autoQueueTimer=null;if(command('playStart',options))$('spinStart').disabled=true;
  };
  $('betApply').onclick=()=>{if((controlState?.ready||/在途.*回覆/.test(String(controlState?.reason||'')))&&controlState?.betSettings?.available){command('betApply',{key:$('betChoice').value});$('betApply').disabled=true;}};
  $('spinStop').onclick=()=>command('autoSpinStop');
  $('speedApply').onclick=()=>{const value=Number($('speedInput').value);if(!Number.isSafeInteger(value)||value<1||value>rights().max_speed){$('playError').textContent='此版本倍速請輸入1至'+rights().max_speed+'的整數。';return;}if(command('animationSpeed',{factor:value})){preferredSpeed=value;speedPreferenceApplied=true;savePreferences();}};
  function syncBonusSettings(){
    if(!rights().bonus_stop||!['stopMega','stopUltra','stopLegendary'].some(id=>$(id).checked)){command('bonusConfigure',null);return;}
    const speed=Number($('bonusSpeed').value);
    if(!Number.isSafeInteger(speed)||speed<1||speed>rights().max_speed){command('bonusConfigure',null);$('playError').textContent='請填寫此版本允許的大獎降速倍率。';return;}
    command('bonusConfigure',{mega:$('stopMega').checked,ultra:$('stopUltra').checked,legendary:$('stopLegendary').checked,speed});
  }
  for(const id of ['stopMega','stopUltra','stopLegendary'])$(id).onchange=syncBonusSettings;
  $('bonusSpeed').oninput=syncBonusSettings;
  $('lowPower').checked=lowPower;
  function applyPowerMode(){
    lowPower=$('lowPower').checked;queryInterval=lowPower?1500:500;
    $('powerNote').textContent=lowPower?'省電中：查房間隔1.5秒、減少畫面及儲存更新；動畫實際最多10×，高倍速會受保護。':'標準模式：查房間隔0.5秒；高倍速較耗電，發熱時建議開啟省電保護。';
    command('performanceMode',{enabled:lowPower});
  }
  $('lowPower').onchange=()=>{applyPowerMode();savePreferences();};
  $('speedReset').onclick=()=>{$('speedInput').value='1';preferredSpeed=1;speedPreferenceApplied=true;command('animationSpeed',{factor:1});savePreferences();};
  $('minimize').onclick=()=>{root.querySelector('section').hidden=true;syncControlFocus();paintDock();};
  $('repaint').onclick=()=>paint();
  $('toggle').onclick=()=>{const p=root.querySelector('section');p.hidden=!p.hidden;syncControlFocus();paintDock();paint();if(!p.hidden&&mainPanel==='board')paintBoard();};
  $('search').oninput=()=>{page=0;paint();};
  $('copy').onclick=async()=>{
    $('text').value=JSON.stringify({version:'1.19.7',gameControls:controlState,roomSwitch:switchState,roomCache:{note:$('roomCacheNote').textContent},roomsReceived:rooms.size,scan:scanState,detailsReceived:details.size,selectedRoom:rooms.get(selected)??null,selectedDetail:details.get(selected)??null,historyByIndex:history(details.get(selected)?.mgCounts),customRules:options,detectedGame,scoring:{source:'授權本機分析',busy:cloudRunning,pending:cloudDirty.size,error:cloudError},boardPreview:{frozen:previewFrozen,snapshot:previewFrozen?boardPreview:boardState?.last??null},symbolRules:boardState,playSession:playState,earlyOutcome:earlyState,interface:{panel:mainPanel,collapsed:root.querySelector('section').hidden,preferenceStorage:$('storageNote').textContent},automatic:{enabled:autoEnabled,launched:autoLaunched,errorPaused:autoHold,scope:queryScope,game:'seth2'},analysis:analyses().map.get(selected)??null},null,2);$('export').open=true;
    try{await navigator.clipboard.writeText($('text').value);status='已複製，可以貼到對話。';}catch(_){$('text').focus();$('text').select();status='請長按資料框，全選並複製。';}paint();
  };
  for(const name of ['combined','boom','returns','waiting','all'])$(name).onclick=()=>{tab=name;page=0;sortBy=({combined:'score_combo',boom:'score_boom',returns:'score_return',waiting:'wait',all:'number'})[name];sortDir=name==='all'?'asc':'desc';$('sort').value=sortBy;$('direction').value=sortDir;paint();};
  $('sort').onchange=()=>{sortBy=$('sort').value;page=0;paint();};$('direction').onchange=()=>{sortDir=$('direction').value;page=0;paint();};$('layout').onchange=()=>{layout=$('layout').value;paint();};
  $('empty').onchange=()=>{page=0;paint();};$('prev').onclick=()=>{page--;paint();};$('next').onclick=()=>{page++;paint();};
  $('fieldJump').onclick=()=>{showMain('settings');$('fieldSettings').open=true;$('fieldSettings').scrollIntoView?.({block:'nearest',behavior:'smooth'});};
  $('apply').onclick=()=>{
    const vals=[$('minBet').value,$('maxAge').value], [b,a]=vals.map(Number);
    if(vals.some(v=>!String(v).trim())||![b,a].every(Number.isFinite)||b<0||a<30){status='設定無效：投注下限≥0、有效期至少30秒。';paint();return;}
    options={...options,minBet:b,maxAge:a};page=0;status='已套用資料有效期；已核對通道可由dayWin/dayBet補上30日欄位。';paint();
  };
  // Only a bounded preference allowlist is stored in this browser and site origin.
  const PREF_KEY='room-assistant:seth2:preferences:v1';
  function storageNotice(text){$('storageNote').textContent=text;}
  function savePreferences(){
    if(restoringPreferences)return;
    const values={};
    for(const id of ['playMode','rtpStopOp','rtpStopValue','rtpMin','boardJoin','profitTarget','lossTarget','bonusSpeed'])values[id]=String($(id).value).slice(0,80);
    for(const id of ['useSymbolStop','useRtpStop','boardCascades','boardFree','empty','useProfitStop','useLossStop','stopMega','stopUltra','stopLegendary'])values[id]=$(id).checked===true;
    const data={schema:1,riskUnit:'percent',lowPower,layout,pageSize,collapsed:root.querySelector('section').hidden,queryInterval,queryScope,options:{minBet:options.minBet,maxAge:options.maxAge},values,
      rules:ruleRows.slice(0,8).map(r=>({symbol:Number(r.symbol.value),op:r.op.value,count:String(r.count.value).slice(0,3)})),betChoice:preferredBet,spinCount:preferredCount,speed:preferredSpeed};
    try{window.localStorage.setItem(PREF_KEY,JSON.stringify(data));storageNotice('設定已儲存於此瀏覽器；重新載入會恢復。');}
    catch(_){storageNotice('此瀏覽器目前無法保存設定；本次仍可操作，重新載入後不保證保留。');}
  }
  function restorePreferences(){
    try{
      const raw=window.localStorage.getItem(PREF_KEY);
      if(!raw){storageNotice('調整設定後會自動儲存在此瀏覽器。');return;}
      if(raw.length>20000)throw Error('oversize');const p=JSON.parse(raw);
      if(!p||p.schema!==1||typeof p!=='object')throw Error('schema');
      const pick=(v,allowed,fallback)=>allowed.includes(v)?v:fallback;
      if(typeof p.lowPower==='boolean'){lowPower=p.lowPower;$('lowPower').checked=lowPower;}
      layout=pick(p.layout,['cards','grid','compact'],layout);pageSize=pick(p.pageSize,[10,25,50],pageSize);
      queryInterval=500;queryScope=pick(p.queryScope,['empty','all'],queryScope);
      if(typeof p.options?.minBet==='number'&&Number.isFinite(p.options.minBet)&&p.options.minBet>=0)options.minBet=p.options.minBet;
      if(typeof p.options?.maxAge==='number'&&Number.isFinite(p.options.maxAge)&&p.options.maxAge>=30&&p.options.maxAge<=86400)options.maxAge=p.options.maxAge;
      for(const [id,allowed] of [['playMode',['strategy','count']],['rtpStopOp',['ge','le','gt','lt','eq']],['boardJoin',['any','all']]])$(id).value=pick(p.values?.[id],allowed,$(id).value);
      for(const id of ['rtpStopValue','rtpMin','profitTarget','lossTarget','bonusSpeed']){const v=p.values?.[id];if(typeof v==='string'&&v.length<=80&&(v===''||Number.isFinite(Number(v))&&Number(v)>=0))$(id).value=v;}
      for(const id of ['useSymbolStop','useRtpStop','boardCascades','boardFree','empty','useProfitStop','useLossStop','stopMega','stopUltra','stopLegendary'])if(typeof p.values?.[id]==='boolean')$(id).checked=p.values[id];
      if(p.riskUnit!=='percent'){for(const id of ['useProfitStop','useLossStop','stopMega','stopUltra','stopLegendary'])$(id).checked=false;for(const id of ['profitTarget','lossTarget','bonusSpeed'])$(id).value='';}
      const rules=Array.isArray(p.rules)?p.rules.slice(0,8).filter(r=>r&&Number.isSafeInteger(r.symbol)&&r.symbol>=1&&r.symbol<=18&&['ge','le','gt','lt','eq'].includes(r.op)&&typeof r.count==='string'&&(r.count===''||/^\d{1,2}$/.test(r.count)&&Number(r.count)<=30)):null;
      if(rules){for(const r of ruleRows)r.row.remove();ruleRows.length=0;for(const r of rules){addBoardRule();const row=ruleRows.at(-1);row.symbol.value=String(r.symbol);row.op.value=r.op;row.count.value=r.count;}}
      preferredBet=typeof p.betChoice==='string'&&/^\d{1,4}:\d{1,4}$/.test(p.betChoice)?p.betChoice:null;
      preferredCount=Number.isSafeInteger(p.spinCount)&&p.spinCount>0?p.spinCount:null;
      preferredSpeed=Number.isSafeInteger(p.speed)&&p.speed>=1&&p.speed<=100?p.speed:1;$('speedInput').value=String(preferredSpeed);if(preferredCount!==null)$('spinCount').value=String(preferredCount);
      for(const [id,value] of [['layout',layout],['pageSize',pageSize],['queryScope',queryScope],['queryInterval',queryInterval],['minBet',options.minBet],['maxAge',options.maxAge]])$(id).value=String(value);
      root.querySelector('section').hidden=p.collapsed!==false;
      storageNotice('已恢復此瀏覽器的設定；旋轉與盤面監看請自行按開始／套用。');
    }catch(_){storageNotice('無法讀取先前設定，本次使用預設值。');}
    finally{restoringPreferences=false;}
  }
  function bindPreferenceStorage(){
    const wrap=(id,event,extra)=>{const el=$(id),original=el[event];el[event]=function(...args){const result=original?.apply(this,args);extra?.();savePreferences();return result;};};
    for(const [id,event] of [['playMode','onchange'],['useSymbolStop','onchange'],['useRtpStop','onchange'],['rtpStopOp','onchange'],['rtpStopValue','oninput'],['rtpMin','oninput'],['useProfitStop','onchange'],['profitTarget','oninput'],['useLossStop','onchange'],['lossTarget','oninput'],['stopMega','onchange'],['stopUltra','onchange'],['stopLegendary','onchange'],['bonusSpeed','oninput'],['boardJoin','onchange'],['boardCascades','onchange'],['boardFree','onchange'],['queryScope','onchange'],['queryInterval','onchange'],['pageSize','onchange'],['layout','onchange'],['empty','onchange'],['apply','onclick'],['toggle','onclick'],['minimize','onclick']])wrap(id,event);
    wrap('betChoice','onchange',()=>{preferredBet=$('betChoice').value;});wrap('spinCount','oninput',()=>{preferredCount=Number($('spinCount').value);});

  }

  restorePreferences();$('sort').value=sortBy;$('direction').value=sortDir;applyPowerMode();restoringPreferences=false;bindPreferenceStorage();restoreRoomCache();
  let freshnessTimer=null,autoConnectTimer=null;
  function startInterfaceTimers(){
    mount();
    if(mountTimer===null)mountTimer=setInterval(mount,1500);
    if(freshnessTimer===null)freshnessTimer=setInterval(()=>{if(!root.querySelector('section').hidden){paint();paintControls();}},10000);
    if(autoConnectTimer===null)autoConnectTimer=setInterval(()=>{
      if(autoEnabled&&!document.hidden){if(!connected&&!pending){autoAttempts++;request('start');}else if(connected){if(Date.now()-lastReaderProbe>=(lowPower?15000:3000)){lastReaderProbe=Date.now();command('start');}scheduleAuto();}}
    },3000);
  }
  // Delay UI timers until the next event-loop turn to avoid startup spikes.
  setTimeout(startInterfaceTimers,800);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)flushRoomCache();
    if(!document.hidden&&cloudDirty.size)queueCloud(cloudDirty.values().next().value);
    if(!document.hidden&&autoEnabled){
      if(!connected&&!pending)request('start');scheduleAuto();
    }
  });
  window.addEventListener('pagehide',()=>{
    flushRoomCache();clearInterval(mountTimer);clearInterval(freshnessTimer);clearInterval(autoConnectTimer);clearTimeout(autoQueueTimer);
    mountTimer=null;freshnessTimer=null;autoConnectTimer=null;connected=false;command('stop');
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    autoAttempts=0;startInterfaceTimers();
    if(autoEnabled){autoQueueTimer=null;request('start');scheduleAuto();}
  });
  for(const id of ['mainSettings','panelSettings','copy','export','earlyCopy','earlyExport','boardPreviewCopy','boardPreviewExport','fieldJump'])$(id).hidden=true;
  applyTierUI();
  $('licenseInfo').hidden=true;
  paintEarly();paintSession();paintControls();paint();setTimeout(()=>{if(autoEnabled&&!document.hidden)request('start');},2500);
  }
  startAuthorizedAssistant();

  }
})();
