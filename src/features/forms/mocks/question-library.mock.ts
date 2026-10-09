import type { FormField, QuestionLibraryItem } from "../types/form.types"

type Row = [category: string, label: string, type: FormField["type"], required: boolean, options?: string[], description?: string]

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

const ROWS: Row[] = [
  ["Business Information", "Business name", "short_text", true], ["Business Information", "Business address", "address", true],
  ["Business Information", "Years in business", "number", true, undefined, "Whole years of operation."], ["Business Information", "Average monthly revenue", "currency", true],
  ["Business Information", "What type of business do you operate?", "radio", true, ["Retail", "Agriculture", "Services", "Manufacturing", "Other"]],
  ["Employment", "Employer name", "short_text", true], ["Employment", "Job title", "short_text", true], ["Employment", "Monthly salary", "currency", true], ["Employment", "Years employed", "number", false],
  ["Financial Information", "Monthly income", "currency", true], ["Financial Information", "Monthly expenses", "currency", true], ["Financial Information", "Do you have existing loans?", "yes_no", true],
  ["Agriculture", "Farm location", "address", true], ["Agriculture", "Farm size (hectares)", "number", true], ["Agriculture", "Crop type", "dropdown", true, ["Rice", "Maize", "Cassava", "Poultry", "Vegetables"]], ["Agriculture", "Estimated annual yield", "currency", false],
  ["Member Information", "Occupation", "short_text", true], ["Member Information", "Marital status", "dropdown", false, ["Single", "Married", "Other"]],
  ["Member Information", "Next of kin full name", "short_text", true], ["Member Information", "Next of kin phone", "phone", true],
  ["Member Information", "How did you hear about us?", "dropdown", false, ["A friend or family", "A group meeting", "Social media", "Radio or TV", "Other"]],
]

/** One shared library: a question saved by any form builder is available to every other one. */
export function createQuestionLibrary(): QuestionLibraryItem[] {
  return ROWS.map(([category, label, type, required, options, description], i) => ({
    id: `ql-${category.slice(0, 3).toLowerCase()}-${i}`, label, type, category, required, description, createdAt: daysAgo(120 - i * 4), archived: false,
    options: options?.map((o) => ({ id: `${label}-${o}`, label: o })),
  }))
}
