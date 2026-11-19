const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const root = path.resolve(__dirname, '../src')
const paths = {
  uyelik_sozlesmesi: 'app/(main)/sozlesmeler/uyelik-sozlesmesi/page.tsx',
  kvkk_aydinlatma: 'app/kvkk/page.tsx',
  acik_riza: 'app/(main)/sozlesmeler/acik-riza-metni/page.tsx',
  cerez_politikasi: 'app/cerez-politikasi/page.tsx',
  gizlilik_politikasi: 'app/gizlilik-politikasi/page.tsx',
  pazaryeri_satici_sozlesmesi: 'app/(main)/sozlesmeler/pazaryeri-satici-sozlesmesi/page.tsx',
}
const company = require('node:vm').runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'lib/company-info.ts'), 'utf8'), {compilerOptions: { module: ts.ModuleKind.CommonJS }}).outputText + '; exports.COMPANY_INFO', {exports:{}})
function extract(file) {
 const src = ts.createSourceFile(file, fs.readFileSync(path.join(root,file),'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
 const texts=[], links=[]
 function jsx(node) {
  if (ts.isJsxText(node)) { texts.push(node.text); return }
  if (ts.isJsxExpression(node)) {
   const e=node.expression
   if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))) texts.push(e.text)
   if (e && ts.isPropertyAccessExpression(e) && e.expression.getText(src)==='COMPANY_INFO') texts.push(company[e.name.text] || '')
   if (e && e.getText(src)==='MARKETING_TEXT') texts.push('Novagross kampanya, fırsat ve yenilikleri hakkında e-posta ile ticari elektronik ileti almak istiyorum. Bu seçim isteğe bağlıdır; iznimi hesap ayarlarından veya iletilerdeki abonelikten çıkma bağlantısından geri alabilirim.')
   if (e && e.getText(src)==='MARKETING_VERSION') texts.push('2026-11-18')
   return
  }
  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
   if (ts.isJsxElement(node)) for (const attr of node.openingElement.attributes.properties) if (ts.isJsxAttribute(attr) && attr.name.getText(src)==='href' && attr.initializer && ts.isStringLiteral(attr.initializer)) links.push(attr.initializer.text)
   node.children.forEach(jsx)
  }
 }
 function visit(node) {
  if (ts.isReturnStatement(node) && node.expression) { let e=node.expression; while (ts.isParenthesizedExpression(e)) e=e.expression; jsx(e) }
  ts.forEachChild(node, visit)
 }
 visit(src)
 const text=texts.join(' ').replace(/\s+/g,' ').replace(/&apos;/g,"'").replace(/&quot;/g,'"').trim()
 if (!text) throw Error(`Empty legal text: ${file}`)
 const content={text,links:[...new Set(links)]}
 return {...content,hash:crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')}
}
const result=Object.fromEntries(Object.entries(paths).map(([type,file])=>[type,extract(file)]))
const target=path.join(root,'lib/agreements/document-snapshots.json')
const output=JSON.stringify(result,null,2)+'\n'
if(process.argv.includes('--check')) {
 if(!fs.existsSync(target) || fs.readFileSync(target,'utf8')!==output) { console.error('Legal document snapshots are stale. Run node scripts/legal-snapshots.cjs'); process.exit(1) }
 console.log('Legal document snapshots match the published source.')
} else fs.writeFileSync(target,output)
