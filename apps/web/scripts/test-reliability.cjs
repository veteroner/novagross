const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), crypto = require('node:crypto'), ts = require('typescript')
const root = path.resolve(__dirname, '..'), src = path.join(root, 'src'), nativeRequire = Module.createRequire(path.join(root, 'package.json'))
function loader(overrides = {}) {
 const cache = new Map()
 function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'))
  const m = {exports:{}}; cache.set(file,m)
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true}}).outputText
  function req(id) {
   if (Object.prototype.hasOwnProperty.call(overrides,id)) return overrides[id]
   let resolved
   if (id.startsWith('@/')) resolved=path.join(src,id.slice(2))
   else if(id==='@novagross/cargo/address') resolved=path.resolve(root,'../../packages/cargo/src/address-format')
   else if(id==='@novagross/utils') return {generateOrderNumber:()=> 'QA-ORDER'}
   else if(id.startsWith('.')) resolved=path.resolve(path.dirname(file),id)
   else return nativeRequire(id)
   for(const candidate of [resolved,resolved+'.ts',resolved+'.tsx',resolved+'.json',path.join(resolved,'index.ts')]) if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile()) return load(candidate)
   throw Error(`Cannot load ${id}`)
  }
  new Function('require','module','exports',code)(req,m,m.exports)
  return m.exports
 }
 return file=>load(path.join(src,file))
}
const storage=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),clear:()=>values.clear()}}
async function main(){
 const load=loader(), consent=load('lib/privacy/consent.ts')
 const now=Date.now(), valid={...consent.NECESSARY_CONSENT, analytics:true, version:consent.CONSENT_VERSION,savedAt:new Date(now).toISOString()}
 for(const raw of [null,'bad','{}',JSON.stringify({...valid,version:'old'}),JSON.stringify({...valid,savedAt:new Date(now-consent.CONSENT_MAX_AGE-1).toISOString()}),JSON.stringify({...valid,savedAt:new Date(now+10000).toISOString()}),JSON.stringify({...valid,analytics:'true'})]) assert.equal(consent.parseConsent(raw,now),null)
 assert.equal(consent.parseConsent(JSON.stringify(valid),now).analytics,true)
 global.localStorage=storage();global.sessionStorage=storage();let reloads=0
 global.location={protocol:'https:',hostname:'novagross.com',reload:()=>reloads++};global.window={dispatchEvent:()=>{}};global.document={cookie:''}
 assert.equal(consent.hasConsent('analytics'),false)
 assert.equal(consent.saveConsent({...consent.NECESSARY_CONSENT,analytics:true}),true)
 sessionStorage.setItem('analytics_session_id','qa'); assert.equal(consent.hasConsent('analytics'),true)
 consent.saveConsent(consent.NECESSARY_CONSENT);assert.equal(reloads,1);assert.equal(sessionStorage.getItem('analytics_session_id'),null)
 localStorage.setItem('cookie-consent','broken');assert.equal(consent.hasConsent('analytics'),false)
 delete global.window
 process.env.SUPABASE_SERVICE_ROLE_KEY='qa-only-'+crypto.randomBytes(32).toString('hex')
 const tokens=load('lib/privacy/signed-token.ts');const token=tokens.signToken('qa',{id:'one'})
 assert.deepEqual(tokens.verifyToken(token,'qa'),{id:'one'});assert.equal(tokens.verifyToken(token,'other'),null);assert.equal(tokens.verifyToken(token+'x','qa'),null);const handoff=tokens.encryptCheckoutHandoff({accessToken:'qa-jwt',checkout:{items:[1]}});assert.deepEqual(tokens.decryptCheckoutHandoff(handoff).checkout,{items:[1]});assert.equal(tokens.decryptCheckoutHandoff(handoff+'x'),null);assert.equal(tokens.verifyToken(tokens.signToken('qa',{},-1),'qa'),null)
 const {NextRequest}=nativeRequire('next/server')
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',email_confirmed_at:'2026-11-18'}
 let calls=[], failProof=false, productPrice=100, anonymous=false, sellerMissing=false
 function query(table){let action='select',payload;const q={}
  for(const method of ['select','eq','in','gte','lte','order','limit','contains','not','is','maybeSingle','single','range']) q[method]=()=>q
  for(const method of ['insert','update','upsert','delete']) q[method]=(value)=>{action=method;payload=value;calls.push({table,action,payload});return q}
  q.then=(resolve,reject)=>{
   let data=null,error=null
   if(table==='products') data=[{id:'22222222-2222-4222-8222-222222222222',name:'QA product',price:productPrice,store_id:'33333333-3333-4333-8333-333333333333',sku:'QA',stores:{iyzico_sub_merchant_key:'QA-MERCHANT',commission_rate:10,kdv_rate:20,free_shipping_threshold:500}}]
   if(table==='stores')data=[{id:'33333333-3333-4333-8333-333333333333',company_name:'QA Seller',store_name:'QA',address:'QA street',city:'Ankara',district:'Sincan',email:'seller@example.invalid',phone:sellerMissing?'':'05000000000',tax_number:'0000000000',tax_office:'QA'}]
   if(table==='commission_campaign_products')data=[]
   if(table==='orders'&&action==='insert')data={id:'44444444-4444-4444-8444-444444444444'}
   if(table==='user_agreements'&&action==='insert'&&failProof)error={message:'QA evidence failure'}
   return Promise.resolve({data,error}).then(resolve,reject)
  };return q
 }
 const db={from:query,rpc:async(name,params)=>{calls.push({rpc:name,params});return{data:[],error:null}},auth:{getUser:async()=>({data:{user:anonymous?null:user}})}}
 const overrides={'@/lib/supabase/server':{createClient:async()=>db},'@/lib/csrf':{csrfProtection:()=>null},'@/lib/supabase/bearer':{getBearerToken:headers=>headers.get('authorization')?.replace('Bearer ','') || null,createBearerClient:()=>db},'@supabase/supabase-js':{createClient:()=>db}}
 const api=loader(overrides)('app/api/payment/initialize/route.ts')
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://qa.example.invalid',IYZICO_API_KEY:'qa',IYZICO_SECRET_KEY:'qa',IYZICO_BASE_URL:'https://qa.example.invalid',PAYMENT_MOCK_MODE:'true'})
 const payload={items:[{productId:'22222222-2222-4222-8222-222222222222',name:'Untrusted name',price:1,quantity:1}],customer:{firstName:'QA',lastName:'User',phone:'05000000000',email:'spoofed@example.invalid'},shippingAddress:{address:'QA street',city:'Ankara',district:'Sincan',postalCode:'06000'},totalPrice:100,shippingCost:29.99}
 const request=body=>new NextRequest('https://novagross.com/api/payment/initialize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 let response=await api.POST(request(payload));assert.equal(response.status,400);assert.equal(calls.length,0)
 response=await api.POST(request({...payload,prepareOnly:true}));assert.equal(response.status,200);const prepared=await response.json();assert.equal(prepared.document.items[0].price,100);assert.equal(prepared.document.buyer.email,user.email);assert.equal(prepared.document.total,129.99);assert.equal(calls.length,0,'Preparing documents must not reserve stock or write profiles/orders')
 const agreements={mesafeli_satis:true,on_bilgilendirme:true,version:prepared.document.version,documentToken:prepared.documentToken}
 productPrice=101;response=await api.POST(request({...payload,agreements}));assert.equal(response.status,409);assert.equal(calls.length,0,'Stale document must not mutate stock')
 productPrice=100;sellerMissing=true;response=await api.POST(request({...payload,prepareOnly:true}));assert.equal(response.status,409);assert.equal(calls.length,0);sellerMissing=false
 failProof=true;response=await api.POST(request({...payload,agreements}));assert.equal(response.status,503);assert.equal(calls.filter(c=>c.rpc==='reserve_stock_atomic').length,1);assert.equal(calls.filter(c=>c.rpc==='release_stock_atomic').length,1);assert.ok(calls.some(c=>c.table==='orders'&&c.action==='update'&&c.payload.status==='cancelled'))
 calls=[];failProof=false;response=await api.POST(request({...payload,agreements}));assert.equal(response.status,200);assert.ok((await response.json()).mockMode);const proof=calls.find(c=>c.table==='user_agreements'&&c.action==='insert');assert.equal(proof.payload.length,2);assert.equal(proof.payload[0].metadata.document_hash,prepared.documentHash);assert.equal(calls.filter(c=>c.rpc==='reserve_stock_atomic').length,1);assert.equal(calls.filter(c=>c.rpc==='release_stock_atomic').length,0)
 calls=[];anonymous=true;response=await api.POST(request({...payload,prepareOnly:true}));assert.equal(response.status,401);assert.equal(calls.length,0)
 console.log('PASS: consent validation/expiry/revocation, token purpose/tampering/expiry, read-only checkout preparation, authoritative prices, document refresh, seller completeness, evidence failure rollback, payment gating and immutable snapshots.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
