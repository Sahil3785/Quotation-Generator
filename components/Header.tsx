"use client";

import { useState } from "react";

export default function Header() {
  const [quotationNumber, setQuotationNumber] = useState("QTN-2025-001");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <header className="flex flex-col md:flex-row justify-between items-center border-b border-gray-300 pb-6 mb-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-800">Quotation Generator</h1>
        <p className="text-sm text-gray-500">Next.js + TypeScript version</p>
      </div>

      <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
        <div className="flex items-center gap-2">
          <label className="text-gray-600 font-medium">Quotation #:</label>
          <input
            type="text"
            value={quotationNumber}
            onChange={(e) => setQuotationNumber(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-gray-600 font-medium">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </header>
  );
}
