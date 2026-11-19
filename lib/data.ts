// Shared compile-time shapes only. Runtime catalog, stock, orders and prices must come from the live API.
export type Service={id:string;name:string;icon:string;available:number};
export type Country={code:string;name:string;flag:string;available:number;price:number};
