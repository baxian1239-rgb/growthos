"use client";

import { motion } from "framer-motion";
import { Question } from "@/types";
import { OptionButton } from "./OptionButton";
import { OptionValue } from "@/types";

interface QuestionCardProps {
  question: Question;
  index: number;
  selected?: OptionValue;
  onSelect: (value: OptionValue) => void;
}

const OPTIONS: OptionValue[] = ["A", "B", "C", "D", "E"];

export function QuestionCard({ question, index, selected, onSelect }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="mb-6">
        <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
          {question.category}
        </span>
        <p className="mt-4 text-base font-medium leading-relaxed text-neutral-900 md:text-lg">
          <span className="mr-2 text-neutral-400">Q{question.id}.</span>
          {question.text}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <OptionButton
            key={option}
            option={option}
            selected={selected === option}
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    </motion.div>
  );
}
