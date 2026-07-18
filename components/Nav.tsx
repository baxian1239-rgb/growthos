type NavProps = {
  ctaLabel?: string;
};

export default function Nav({ ctaLabel = "开始诊断" }: NavProps) {
  return (
    <div className="container nav">
      <a className="brand" href="/">
        GrowthOS
      </a>
      <div className="nav-actions">
        <a href="/growth-council" className="nav-link">
          AI增长委员会
        </a>
        <a href="/assessment/company" className="btn secondary">
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
