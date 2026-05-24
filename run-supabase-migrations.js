#!/usr/bin/env node
const https = require('https')
const fs = require('fs')
const path = require('path')

// SQL dosyalarını tek tek parçalayıp çalıştırmalıyız
const SUPABASE_URL = 'https://mdyecmjlxswprbpdtohg.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWVjbWpseHN3cHJicGR0b2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3OTMxMTksImV4cCI6MjA1MDM2OTExOX0.Ih8BYqdFQoB-YXN9A2kJZYjgVsWoqBsIAmPIVK8qXLE'

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql })
    
    const options = {
      hostname: 'mdyecmjlxswprbpdtohg.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Length': data.length
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Başarılı!')
          resolve(body)
        } else {
          console.error(`❌ HTTP ${res.statusCode}: ${body}`)
          reject(new Error(body))
        }
      })
    })

    req.on('error', (e) => {
      console.error(`❌ İstek hatası: ${e.message}`)
      reject(e)
    })

    req.write(data)
    req.end()
  })
}

async function runSQL(sqlContent, description) {
  console.log(`\n🔄 ${description}...`)
  try {
    await executeSQL(sqlContent)
    return true
  } catch (err) {
    console.error(`❌ Hata: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Supabase Migration Çalıştırılıyor...\n')
  
  // 1. Address Limit Migration
  const addressMigration = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/20260128000001_address_limit_and_improvements.sql'),
    'utf8'
  )
  
  await runSQL(addressMigration, 'Address Limit & Improvements Migration')
  
  // 2. Search Fix
  const searchFix = fs.readFileSync(
    path.join(__dirname, 'supabase/fix_search_products_approval.sql'),
    'utf8'
  )
  
  await runSQL(searchFix, 'Search Products Approval Fix')
  
  console.log('\n✨ Tüm migration\'lar tamamlandı!')
}

main().catch(console.error)
