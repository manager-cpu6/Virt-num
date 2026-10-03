import TopBar from "@/components/TopBar";

export default function Loading(){
  return <div className="account-loading">
    <TopBar title="Account"/>
    <div className="account-skeleton">
      <div className="skeleton-avatar"/>
      <div className="skeleton-lines"><span/><span/></div>
    </div>
    <div className="skeleton-card"/>
    <div className="skeleton-card"/>
  </div>;
}
