"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnterpriseInfo } from "@/types";

interface EnterpriseFormProps {
  data: EnterpriseInfo;
  onChange: (data: EnterpriseInfo) => void;
  errors: Partial<Record<keyof EnterpriseInfo, string>>;
}

const INDUSTRIES = [
  "互联网/科技",
  "制造业",
  "零售/电商",
  "金融服务",
  "教育培训",
  "医疗健康",
  "房地产",
  "其他",
];

const EMPLOYEE_COUNTS = [
  "1-50人",
  "51-200人",
  "201-500人",
  "501-1000人",
  "1000人以上",
];

export function EnterpriseForm({ data, onChange, errors }: EnterpriseFormProps) {
  const update = (field: keyof EnterpriseInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm md:p-10"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
          企业信息
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          请填写基本信息，帮助我们生成更精准的增长诊断报告。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="companyName">公司名称 *</Label>
          <Input
            id="companyName"
            placeholder="请输入公司名称"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
          {errors.companyName && (
            <p className="text-xs text-red-500">{errors.companyName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">所属行业 *</Label>
          <select
            id="industry"
            value={data.industry}
            onChange={(e) => update("industry", e.target.value)}
            className="flex h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3]"
          >
            <option value="">请选择行业</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="text-xs text-red-500">{errors.industry}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeCount">员工规模 *</Label>
          <select
            id="employeeCount"
            value={data.employeeCount}
            onChange={(e) => update("employeeCount", e.target.value)}
            className="flex h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3]"
          >
            <option value="">请选择规模</option>
            {EMPLOYEE_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          {errors.employeeCount && (
            <p className="text-xs text-red-500">{errors.employeeCount}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">联系人姓名 *</Label>
          <Input
            id="contactName"
            placeholder="请输入联系人姓名"
            value={data.contactName}
            onChange={(e) => update("contactName", e.target.value)}
          />
          {errors.contactName && (
            <p className="text-xs text-red-500">{errors.contactName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">联系电话 *</Label>
          <Input
            id="contactPhone"
            placeholder="请输入联系电话"
            value={data.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
          />
          {errors.contactPhone && (
            <p className="text-xs text-red-500">{errors.contactPhone}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contactEmail">联系邮箱</Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="请输入联系邮箱（选填）"
            value={data.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
          />
        </div>
      </div>
    </motion.div>
  );
}
