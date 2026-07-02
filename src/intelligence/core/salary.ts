import { SalaryResult } from "../types/results";

export function estimateSalary(
  careerIQ: number
): SalaryResult {

  const salary =
    350000 +
    careerIQ * 12000;

  return {
    salary,
    currency: "INR",
  };
}