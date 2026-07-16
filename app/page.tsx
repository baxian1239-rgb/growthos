import Nav from "@/components/Nav";

const trustTags = [
  "28项增长指标",
  "7大增长能力分析",
  "AI生成专属报告",
  "90天增长路径规划",
];

const values = [
  {
    title: "识别增长瓶颈",
    description: "从战略、获客、成交、产品、组织、数据与创始人七个维度定位企业当前的关键卡点。",
  },
  {
    title: "生成增长指数",
    description: "通过 28 项评测形成量化得分，帮助管理层快速理解企业增长成熟度。",
  },
  {
    title: "规划 90 天路径",
    description: "围绕优先级最高的问题，沉淀下一阶段可执行、可复盘的增长行动方向。",
  },
];

export default function Home() {
  return (
    <>
      <Nav ctaLabel="开始增长" />
      <main>
        <section className="hero">
          <div className="container hero-inner">
            <h1>企业10倍增长评测</h1>
            <p>发现企业增长瓶颈，规划未来90天增长路径</p>
            <div className="hero-actions">
              <a className="btn" href="/assessment/company">
                开始增长
              </a>
            </div>

            <div className="trust-panel" aria-label="评测能力说明">
              <h2>已帮助企业发现增长机会</h2>
              <div className="trust-tags">
                {trustTags.map((tag) => (
                  <span className="trust-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">产品介绍</span>
              <h2>为企业经营者设计的增长体检</h2>
              <p className="muted">
                用咨询顾问的结构化视角，将复杂的增长问题拆解为可回答、可评分、可行动的评测流程。
              </p>
            </div>
            <div className="grid">
              {values.map((item) => (
                <article className="card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-quiet">
          <div className="container split">
            <div>
              <span className="eyebrow">评测价值</span>
              <h2>从感觉判断，进入系统诊断</h2>
            </div>
            <p className="muted">
              评测结果会帮助你看清企业当前增长阶段、优势引擎和瓶颈引擎，为后续 AI 诊断报告与 90 天增长方案打好数据基础。
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
