export function numberToWords(num: number): string {
    num = Math.floor(num);
    if (num === 0) return "Zero";
  
    const belowTwenty: string[] = [
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
    const tensWords: string[] = [
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
  
    const match = ("000000000" + num)
      .slice(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  
    if (!match) return "";

    const [_, c2, l2, t2, h1, u2] = match as RegExpMatchArray;

    const twoDigitsToWords = (pair: string): string => {
      const n = Number(pair);
      if (n === 0) return "";
      if (n < 20) return belowTwenty[n];
      const tensIndex = Number(pair[0]);
      const onesIndex = Number(pair[1]);
      const tens = tensWords[tensIndex];
      const ones = belowTwenty[onesIndex];
      return ones ? `${tens} ${ones}` : tens;
    };

    let result = "";
    const crore = twoDigitsToWords(c2);
    if (crore) result += `${crore} Crore `;

    const lakh = twoDigitsToWords(l2);
    if (lakh) result += `${lakh} Lakh `;

    const thousand = twoDigitsToWords(t2);
    if (thousand) result += `${thousand} Thousand `;

    if (h1 !== "0") {
      const hundredWord = belowTwenty[Number(h1)];
      if (hundredWord) result += `${hundredWord} Hundred `;
    }

    const units = twoDigitsToWords(u2);
    if (units) result += (result ? "and " : "") + units;
  
    return result.trim();
  }
  