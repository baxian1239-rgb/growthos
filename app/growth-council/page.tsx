import Nav from "@/components/Nav";
import { growthCouncilAgents } from "@/lib/ai/growth-council";
import "./growth-council.css";

const operatingSteps = [
  "企业诊断",
  "AI委员会分析",
  "90天增长计划",
  "每周复盘",
  "持续优化",
];

export default function GrowthCouncilPage() {
  return (
    <>
      <Nav ctaLabel="开始诊断" />
      <main className="council-page">
        <section className="council-hero">
          <div className="container council-hero-inner">
            <div>
              <span className="eyebrow">GrowthOS 2.0</span>
              <h1>AI增长委员会</h1>
              <p>
                为企业老板组建一支7位AI增长顾问团队，从战略、获客、成交、产品、运营、财务和执行七个角度，持续分析企业增长瓶颈并推进落地。
              </p>
              <div className="council-actions">
                <a className="btn" href="/assessment/company">启动企业诊断</a>
                <a className="btn secondary" href="/report">查看增长报告</a>
              </div>
            </div>
            <div className="council-panel" aria-label="AI增长委员会工作流">
              {operatingSteps.map((step, index) => (
                <div className="council-step" key={step}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">7位AI顾问</span>
              <h2>从一次性报告升级为增长团队</h2>
              <p className="muted">
                每位顾问负责一个关键增长视角：先诊断，再给优先级，最后拆成可执行动作。
              </p>
            </div>
            <div className="council-grid">
              {growthCouncilAgents.map((agent) => (
                <article className="council-card" key={agent.id}>
                  <span>{agent.role}</span>
                  <h3>{agent.name}</h3>
                  <p>{agent.mission}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section council-band">
          <div className="container council-split">
            <div>
              <span className="eyebrow">产品化路径</span>
              <h2>诊断 - 决策 - 执行 - 复盘</h2>
            </div>
            <div className="council-list">
              <p><strong>诊断：</strong>读取企业信息、28项测评和增长指数。</p>
              <p><strong>决策：</strong>7位AI顾问分别输出瓶颈判断和优先级。</p>
              <p><strong>执行：</strong>自动生成90天增长作战计划。</p>
              <p><strong>复盘：</strong>后续沉淀任务、结果和企业长期记忆。</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
