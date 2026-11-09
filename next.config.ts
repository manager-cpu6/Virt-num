import type {NextConfig} from "next";

const nextConfig:NextConfig={
  reactStrictMode:true,
  async headers(){
    return [
      {
        source:"/:path*",
        headers:[
          {key:"X-Content-Type-Options",value:"nosniff"},
          {key:"X-Frame-Options",value:"DENY"},
          {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
          {key:"X-Permitted-Cross-Domain-Policies",value:"none"},
          {key:"Strict-Transport-Security",value:"max-age=31536000"},
          {key:"Permissions-Policy",value:"camera=(), microphone=(self), geolocation=()"}
        ]
      },
      {
        source:"/api/v1/:path*",
        headers:[
          {key:"Access-Control-Allow-Origin",value:"*"},
          {key:"Access-Control-Allow-Methods",value:"GET,POST,DELETE,OPTIONS"},
          {key:"Access-Control-Allow-Headers",value:"Authorization,Content-Type,X-API-Key"},
          {key:"Access-Control-Max-Age",value:"86400"},
          {key:"Cache-Control",value:"no-store"}
        ]
      }
    ];
  }
};

export default nextConfig;
