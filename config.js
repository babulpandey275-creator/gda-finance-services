// ==========================================================
// 🚀 GDA FINANCE - SHARED CONFIG
// Yeh values pehle har page mein alag-alag hardcoded thi.
// Ab ek hi jagah se aati hain, taaki future mein update karna ho
// (jaise password badalna) to sirf yahi ek file badalni pade.
// Behavior bilkul same hai, sirf duplication hataya gaya hai.
// ==========================================================

export const ADMIN_PASSWORD = "GDA@2026";
export const IMGBB_API_KEY = "5230b9fc28c784e9c389bcf09cb56dd2";

// 💰 OVERDUE RATE — Plan khatam hone ke baad Daily EMI ka %
// 60 din plan -> 10%/din, 80 din -> 20%/din, usse zyada -> 30%/din
export function getOverdueRate(planDur) {
  if (planDur <= 60) return 0.10;
  if (planDur <= 80) return 0.20;
  return 0.30;
}
