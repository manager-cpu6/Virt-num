import {cookies} from "next/headers";import crypto from "crypto";import bcrypt from "bcryptjs";import {db} from "./db";
const COOKIE="numelixa_session";
function hash(v:string){return crypto.createHash("sha256").update(v).digest("hex")}
export async function createSession(userId:string){const raw=crypto.randomBytes(32).toString("hex");await db("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[hash(raw),userId]);(await cookies()).set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});}
export async function getUser(){const raw=(await cookies()).get(COOKIE)?.value;if(!raw)return null;const r=await db<any>("SELECT u.id,u.email,u.name,u.role,u.coins,u.verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",[hash(raw)]);return r.rows[0]||null}
export async function requireUser(){const u=await getUser();if(!u)throw new Error("AUTH_REQUIRED");return u}
export async function requireAdmin(){const u=await requireUser();if(u.role!=="admin")throw new Error("ADMIN_REQUIRED");return u}
export async function logout(){const raw=(await cookies()).get(COOKIE)?.value;if(raw)await db("DELETE FROM sessions WHERE token_hash=$1",[hash(raw)]);(await cookies()).delete(COOKIE)}
export async function passwordHash(p:string){return bcrypt.hash(p,12)}
export async function passwordCheck(p:string,h:string){return bcrypt.compare(p,h)}
export function tokenHash(v:string){return hash(v)}
