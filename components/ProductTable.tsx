"use client";

import { useState, useEffect } from "react";
import { numberToWords } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  rate: number;
}

interface ProductLine {
  productId: string;
  qty: number;
  rate: number;
}

interface Props {
  products: Product[];
  discountPercent: number;
  onTotals: (data: {
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    taxable: number;
    cgst: number;
    sgst: number;
    total: number;
    totalInWords: string;
  }) => void;
  onLinesChange?: (rows: ProductLine[]) => void;
}

export default function ProductTable({ products, discountPercent, onTotals, onLinesChange }: Props) {
  const [lines, setLines] = useState<ProductLine[]>([]);

  useEffect(() => {
    if (lines.length === 0) addLine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, { productId: "", qty: 1, rate: 0 }]);
  };

  const removeLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    setLines(updated);
    recalculateTotals(updated, discountPercent);
  };

  const updateLine = (index: number, field: keyof ProductLine, value: string | number) => {
    const updated = [...lines];
    if (field === "productId") {
      const selectedProduct = products.find((p) => p.id === value);
      updated[index].productId = value as string;
      updated[index].rate = selectedProduct?.rate || 0;
    } else {
      updated[index][field] = Number(value);
    }
    setLines(updated);
    recalculateTotals(updated, discountPercent);
    onLinesChange?.(updated);
  };

  const recalculateTotals = (rows: ProductLine[], discountPercent: number) => {
    let subtotal = 0;

    rows.forEach((r) => {
      subtotal += (Number(r.qty) || 0) * (Number(r.rate) || 0);
    });

    const discountAmount = subtotal * (discountPercent / 100);
    const taxable = subtotal - discountAmount;
    const cgst = taxable * 0.09;
    const sgst = taxable * 0.09;
    const grandTotal = taxable + cgst + sgst;

    const inWords = (numberToWords(Math.floor(grandTotal)) || "Zero") + " Rupees Only";

    // Defer notifying parent to effects to avoid setState during render warnings
    queuedTotals = {
      subtotal,
      discountPercent,
      discountAmount,
      taxable,
      cgst,
      sgst,
      total: grandTotal,
      totalInWords: inWords,
    };
  };

  // Local queue to pass totals to parent after render
  let queuedTotals: Parameters<typeof onTotals>[0] | null = null;

  useEffect(() => {
    recalculateTotals(lines, discountPercent);
    if (queuedTotals) onTotals(queuedTotals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountPercent]);

  useEffect(() => {
    onLinesChange?.(lines);
    recalculateTotals(lines, discountPercent);
    if (queuedTotals) onTotals(queuedTotals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  return (
    <section className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
            <tr>
              <th className="p-3 w-4/12">Item</th>
              <th className="p-3 w-1/12">Qty</th>
              <th className="p-3 w-2/12">Rate</th>
              <th className="p-3 w-2/12">Amount</th>
              <th className="p-3 w-1/12">CGST (9%)</th>
              <th className="p-3 w-1/12">SGST (9%)</th>
              <th className="p-3 w-2/12">Total</th>
              <th className="p-3 w-auto input-mode"></th>
            </tr>
          </thead>
          <tbody id="product-lines-container" className="divide-y divide-gray-200">
            {lines.map((line, index) => {
              const selectedProduct = products.find((p) => p.id === line.productId);
              const qty = Number(line.qty) || 0;
              const rate = Number(line.rate) || 0;
              const amount = qty * rate;
              const cgst = amount * 0.09;
              const sgst = amount * 0.09;
              const rowTotal = amount + cgst + sgst;

              return (
                <tr className="product-row" key={index}>
                  <td className="p-2">
                    <select
                      className="table-input item-name"
                      value={line.productId}
                      onChange={(e) => updateLine(index, "productId", e.target.value)}
                    >
                      <option value="">Select a Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input type="hidden" className="item-id" value={line.productId} readOnly />
                    <input type="hidden" className="item-rate" value={rate.toFixed(2)} readOnly />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="table-input item-qty"
                      placeholder="Qty"
                      value={line.qty}
                      min={0}
                      onChange={(e) => updateLine(index, "qty", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <span className="item-rate-display block p-2 text-right">₹{rate.toFixed(2)}</span>
                  </td>
                  <td className="p-2">
                    <span className="item-amount block p-2 text-right">₹{amount.toFixed(2)}</span>
                  </td>
                  <td className="p-2">
                    <span className="item-cgst block p-2 text-right">₹{cgst.toFixed(2)}</span>
                  </td>
                  <td className="p-2">
                    <span className="item-sgst block p-2 text-right">₹{sgst.toFixed(2)}</span>
                  </td>
                  <td className="p-2">
                    <span className="item-total block p-2 text-right">₹{rowTotal.toFixed(2)}</span>
                  </td>
                  <td className="p-2 text-center input-mode">
                    <button
                      className="remove-product-line-btn text-red-500 hover:text-red-700 opacity-50 hover:opacity-100"
                      onClick={() => removeLine(index)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    <button
        id="add-product-line-btn"
        className="input-mode mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        onClick={addLine}
      >
        + Add New Line
      </button>
    </section>
  );
}
