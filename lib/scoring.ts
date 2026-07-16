import {questions} from '@/data/questions';
export function calculate(answers:Record<number,number>){
 const engines:Record<string,number>={};
 for(const q of questions){engines[q.engine]=(engines[q.engine]||0)+(answers[q.id]||0)}
 const total=Object.values(engines).reduce((a,b)=>a+b,0);
 const index=Math.round((total/140)*100);
 const level=index<40?'基础建设型企业':index<60?'瓶颈突破型企业':index<80?'稳健成长型企业':'增长引擎型企业';
 const ranked=Object.entries(engines).sort((a,b)=>b[1]-a[1]);
 const strengths=ranked.slice(0,3).map(x=>x[0]);
 const bottlenecks=ranked.slice(-3).reverse().map(x=>x[0]);
 const advice=bottlenecks.map(name=>({
  '战略引擎':'聚焦下一阶段唯一核心增长目标，并形成季度执行与复盘机制。',
  '获客引擎':'优先建立可追踪的精准获客渠道组合，明确每个渠道的成本与转化。',
  '成交引擎':'沉淀标准化成交SOP，并围绕流失原因持续训练与复盘。',
  '产品引擎':'完善产品分层、交付标准与复购升级路径。',
  '组织引擎':'减少对老板和少数骨干的依赖，明确岗位、流程和人才培养机制。',
  '数据引擎':'建立经营数据看板，统一追踪获客、成交、交付和复购指标。',
  '创始人引擎':'将创始人时间从救火转向战略、系统建设与关键人才培养。'
 }[name]||'优先建设该增长引擎。'));
 return {engines,total,index,level,strengths,bottlenecks,advice};
}
