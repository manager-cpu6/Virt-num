import type {NextConfig} from "next";

const nextConfig:NextConfig={
  reactStrictMode:true,
  async headers(){
    return [{
      source:"/:path*",
      headers:[
        {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"},
        {key:"X-Content-Type-Options",value:"nosniff"},
        {key:"X-Frame-Options",value:"DENY"},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
        {key:"Permissions-Policy",value:"camera=(), geolocation=(), microphone=(self)"}
      ]
    },{
      source:"/api/v1/:path*",
      headers:[
        {key:"Access-Control-Allow-Origin",value:"*"},
        {key:"Access-Control-Allow-Methods",value:"GET,POST,DELETE,OPTIONS"},
        {key:"Access-Control-Allow-Headers",value:"Authorization,Content-Type,X-API-Key,X-Numelixa-Device-Token"},
        {key:"Access-Control-Max-Age",value:"86400"},
        {key:"Cache-Control",value:"no-store"}
      ]
    }];
  }
};

export default nextConfig;
