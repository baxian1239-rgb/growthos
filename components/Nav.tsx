type NavProps = {
  ctaLabel?: string;
};

export default function Nav({ ctaLabel = "开始评测" }: NavProps) {
  return (
    <div className="container nav">
      <a className="brand" href="/">
        企业10倍增长评测
      </a>
      <a href="/assessment/company" className="btn secondary">
        {ctaLabel}
      </a>
    </div>
  );
}
