/**
 * Converts a numeric amount (e.g. 154250.50) into standard Indian Currency words:
 * "Rupees One Lakh Fifty-Four Thousand Two Hundred Fifty and Fifty Paise Only"
 */
export function numberToWordsInIndianRupees(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) {
    return "Rupees Zero Only";
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return units[n];
    const t = tens[Math.floor(n / 10)];
    const u = units[n % 10];
    return u ? `${t} ${u}` : t;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) {
      res += `${units[hundred]} Hundred`;
    }
    if (rest > 0) {
      res += (res ? " " : "") + convertTwoDigits(rest);
    }
    return res;
  }

  function convertNumber(n: number): string {
    if (n === 0) return "Zero";

    const parts: string[] = [];

    // Crores (10,000,000)
    const crores = Math.floor(n / 10000000);
    let rem = n % 10000000;

    if (crores > 0) {
      parts.push(`${convertNumber(crores)} Crore`);
    }

    // Lakhs (100,000)
    const lakhs = Math.floor(rem / 100000);
    rem = rem % 100000;

    if (lakhs > 0) {
      parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    }

    // Thousands (1,000)
    const thousands = Math.floor(rem / 1000);
    rem = rem % 1000;

    if (thousands > 0) {
      parts.push(`${convertTwoDigits(thousands)} Thousand`);
    }

    // Hundreds & remaining
    if (rem > 0) {
      parts.push(convertThreeDigits(rem));
    }

    return parts.filter(Boolean).join(" ");
  }

  const rupeeText = convertNumber(rupees);
  let words = `Rupees ${rupeeText}`;

  if (paise > 0) {
    const paiseText = convertTwoDigits(paise);
    words += ` and ${paiseText} Paise`;
  }

  words += " Only";
  return words.trim();
}
