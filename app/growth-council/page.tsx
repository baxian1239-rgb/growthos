import Nav from "@/components/Nav";
import { growthCouncilAgents } from "@/lib/ai/growth-council";
import { agentSkillMappings, externalSkillIntegrations, gstackOperatingPipeline } from "@/lib/ai/skill-integrations";
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
                把 dbskill 的商业诊断能力、gstack 的执行协作思想和 GrowthOS 企业增长方法论融合为一个可持续运转的企业增长顾问系统。
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
                  <small>能力来源：{agent.source}</small>
                  <div className="skill-map">
                    <strong>Skill接入</strong>
                    <small>
                      dbskill：{agentSkillMappings.find((item) => item.agentId === agent.id)?.dbskillEntrypoints.join(" / ")}
                    </small>
                    <small>
                      gstack：{agentSkillMappings.find((item) => item.agentId === agent.id)?.gstackEntrypoints.join(" / ")}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section council-band">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">gstack执行链路</span>
              <h2>把建议变成可复盘的交付流程</h2>
              <p className="muted">
                GrowthOS 2.0 不只生成报告，还把增长工作按 Think、Plan、Build、Review、Test、Ship、Reflect 的节奏推进。
              </p>
            </div>
            <div className="pipeline-grid">
              {gstackOperatingPipeline.map((item) => (
                <article className="pipeline-card" key={item.phase}>
                  <span>{item.phase}</span>
                  <h3>{item.skill}</h3>
                  <p>{item.output}</p>
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

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">外部Skill接入状态</span>
              <h2>明确能力来源和使用边界</h2>
            </div>
            <div className="integration-grid">
              {externalSkillIntegrations.map((item) => (
                <article className="integration-card" key={item.project}>
                  <h3>{item.project}</h3>
                  <p>{item.repository}</p>
                  <small>License：{item.license}</small>
                  <small>接入模式：{item.integrationMode}</small>
                  <small>商业使用：{item.commercialUse}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
