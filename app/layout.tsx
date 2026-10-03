import "./globals.css";
import "./numelixa-polish.css";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
export const metadata: Metadata = { title:"Numelixa — Live Virtual Numbers", description:"Modern virtual number and SMS verification platform.", manifest:"/manifest.webmanifest" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><div className="app-shell"><main className="page-shell">{children}</main><BottomNav/></div></body></html>}