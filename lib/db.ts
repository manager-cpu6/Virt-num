import crypto from "crypto";import {Pool,PoolClient} from "pg";
const g=globalThis as unknown as {__numelixaPool?:Pool};
export const pool=g.__numelixaPool ?? new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false},max:5});
if(process.env.NODE_ENV!=="production")g.__numelixaPool=pool;
let ready:Promise<void>|null=null;
export async function db<T=any>(text:string,values:any[]=[]):Promise<{rows:T[]}>{
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured");
 await ensureSchema(); const result = await pool.query(text, values); return { rows: result.rows as T[] };
}
export async function tx<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured");
 await ensureSchema(); const c=await pool.connect(); try{await c.query("BEGIN");const v=await fn(c);await c.query("COMMIT");return v}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
async function ensureSchema(){
 if(ready)return ready;
 ready=(async()=>{await pool.query(`
CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',coins NUMERIC(18,2) NOT NULL DEFAULT 0,verified_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS email_tokens(token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS orders(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,provider_order_id TEXT UNIQUE,service TEXT NOT NULL,country TEXT NOT NULL,country_code TEXT,phone_number TEXT,provider_cost_usd NUMERIC(12,4),price_coins NUMERIC(18,2) NOT NULL,status TEXT NOT NULL DEFAULT 'waiting',code TEXT,full_sms TEXT,expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS coin_transactions(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT NOT NULL,amount NUMERIC(18,2) NOT NULL,balance_after NUMERIC(18,2) NOT NULL,reference TEXT,description TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payments(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,provider TEXT NOT NULL,provider_id TEXT UNIQUE,order_id TEXT UNIQUE NOT NULL,amount_usd NUMERIC(18,6) NOT NULL,coins NUMERIC(18,2) NOT NULL,status TEXT NOT NULL DEFAULT 'pending',txid TEXT,raw JSONB,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),paid_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS pricing_rules(id UUID PRIMARY KEY,service TEXT,country_code TEXT,markup_percent NUMERIC(8,2),fixed_coins NUMERIC(18,2),enabled BOOLEAN DEFAULT TRUE,updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS coin_tx_user_idx ON coin_transactions(user_id,created_at DESC);
`);
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const bcrypt=await import("bcryptjs");const h=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);await pool.query(`INSERT INTO users(id,email,name,password_hash,role,verified_at) VALUES($1,$2,'Administrator',$3,'admin',NOW()) ON CONFLICT(email) DO UPDATE SET role='admin'`,[crypto.randomUUID(),process.env.ADMIN_EMAIL.toLowerCase(),h])}
})().catch(e=>{ready=null;throw e});return ready}
