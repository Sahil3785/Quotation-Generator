"use client";

import { useEffect, useState } from "react";
import { fetchAirtableData, createAirtableRecord, updateAirtableRecord, getNextQuotationId } from "@/lib/airtable";
import ProductTable from "@/components/ProductTable";
import { generateQuotationPDF, downloadPdf, sharePdf } from "@/lib/pdf";
import { uploadPdfToFirebase } from "@/lib/firebase";

type TeamOption = { id: string; name: string };

export default function QuotationPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [preview, setPreview] = useState(false);
  const [creatorOptions, setCreatorOptions] = useState<TeamOption[]>([]);
  const [createdBy, setCreatedBy] = useState<string>(""); // stores Team record ID

  const [quotationNo, setQuotationNo] = useState("Q-00001");
  const [quotationDate, setQuotationDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [subtotal, setSubtotal] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalWords, setTotalWords] = useState("Zero Rupees Only");
  const [lines, setLines] = useState<{ productId: string; qty: number; rate: number }[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [shareMsgVisible, setShareMsgVisible] = useState(false);
  // Custom fields (Add More Fields)
  const [customFields, setCustomFields] = useState<{ id: string; name: string; value: string }[]>([]);
  // Add New Client Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);

  // Ship To editable address fields
  const [shipToAddress, setShipToAddress] = useState("");
  const [shipToCity, setShipToCity] = useState("");
  const [shipToState, setShipToState] = useState("");
  const [shipToZip, setShipToZip] = useState("");

  useEffect(() => {
    async function loadData() {
      // set dates
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dd = new Date(today); dd.setDate(today.getDate() + 2);
      const dueStr = dd.toISOString().split('T')[0];
      setQuotationDate(todayStr);
      setDueDate(dueStr);

      // sequential quotation id
      try {
        const nextId = await getNextQuotationId(process.env.NEXT_PUBLIC_AIRTABLE_QUOTATIONS_TABLE!);
        setQuotationNo(nextId);
      } catch {}

      const clientsData = await fetchAirtableData(process.env.NEXT_PUBLIC_AIRTABLE_CLIENTS_TABLE!);
      const productsData = await fetchAirtableData(process.env.NEXT_PUBLIC_AIRTABLE_PRODUCTS_TABLE!);
      // Load employee names strictly from Team table (use record IDs)
      try {
        const team = await fetchAirtableData('Team');
        const opts: TeamOption[] = (team || []).map((r: any) => {
          const nm = r?.fields?.['Name'] || r?.fields?.['Employee Name'] || r?.fields?.['Full Name'] || '';
          return nm ? { id: r.id, name: nm } : null;
        }).filter(Boolean) as TeamOption[];
        if (opts.length) setCreatorOptions(opts);
      } catch {}

      const formattedProducts = productsData.map((p: any) => ({
        id: p.id,
        name: p.fields["Product Name"],
        rate: p.fields["Current Market Price (India)"] || 0,
      }));

      setClients(clientsData);
      setProducts(formattedProducts);
    }
    loadData();
  }, []);

  // Prefill shipping address from selected client if available
  useEffect(() => {
    const client = clients.find((cl) => cl.id === selectedClient);
    const existing: string = (client?.fields?.["Shipping Address"] || "").toString();
    if (existing) {
      const parts = existing.split(',').map((p: string) => p.trim()).filter(Boolean);
      setShipToAddress(parts[0] || "");
      setShipToCity(parts[1] || "");
      setShipToState(parts[2] || "");
      setShipToZip(parts[3] || "");
    } else {
      setShipToAddress("");
      setShipToCity("");
      setShipToState("");
      setShipToZip("");
    }
  }, [selectedClient, clients]);

  const handleGenerateAndSave = async () => {
    // Require Created By selection before proceeding
    if (!createdBy) {
      alert('Please select "Created By" before generating the quotation.');
      const el = document.getElementById('created-by') as HTMLSelectElement | null;
      if (el) el.focus();
      return;
    }
    try {
      setIsGenerating(true);
      // 1) Save record first (text only)
      const productRecordIds = Array.from(new Set(lines.map(l => l.productId).filter(Boolean)));
      const termsBase = (document.getElementById('terms-conditions')?.textContent || '').trim();
      const customFieldsNote = customFields.length
        ? "\n\n--- Custom Fields ---\n" + customFields.map(cf => `${cf.name || 'Field'}: ${cf.value || ''}`).join('\n')
        : '';
      const terms = `${termsBase}${customFieldsNote}`.trim();

      const fields: Record<string, any> = {
        "Quotation ID": quotationNo,
        "Quotation Date": quotationDate,
        "Expiry Date": dueDate,
        "Total Cost": grandTotal,
        "GST": cgst + sgst,
        // Created By must be an array of Team record IDs
        "Created By": createdBy ? [createdBy] : undefined,
        "Status": "Draft",
      };
      if (selectedClient) fields["Client"] = [selectedClient];
      if (productRecordIds.length) fields["Product"] = productRecordIds;
      if (terms) fields["Notes"] = terms;
      const created = await createAirtableRecord(process.env.NEXT_PUBLIC_AIRTABLE_QUOTATIONS_TABLE!, fields);
      const recordId = created?.id as string;
      if (!recordId) throw new Error('Airtable did not return a record id. Verify table name and field schema.');

      // Update selected client's Shipping Address (non-blocking)
      try {
        if (selectedClient) {
          const parts = [shipToAddress, shipToCity, shipToState, shipToZip]
            .map(s => (s || '').trim()).filter(Boolean);
          const shippingAddress = parts.join(', ');
          await updateAirtableRecord(process.env.NEXT_PUBLIC_AIRTABLE_CLIENTS_TABLE!, selectedClient, {
            "Shipping Address": shippingAddress,
          });
        }
      } catch (e) {
        console.warn('Failed to update client Shipping Address:', e);
      }

      // 2) Toggle preview for clean PDF
      setPreview(true);

      // 3) Generate + upload PDF
      const blob = await generateQuotationPDF("quotation-content");
      const filename = `${quotationNo.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
      const url = await uploadPdfToFirebase(blob, filename);
      console.log('[PDF] Uploaded to Firebase:', { filename, url });

      // 4) Patch Airtable with attachment
      try {
        await updateAirtableRecord(process.env.NEXT_PUBLIC_AIRTABLE_QUOTATIONS_TABLE!, recordId, {
          "Quotation": [{ url, filename }],
        });
        // verify attachment by refetching record
        try {
          const verify = await fetch(`/api/airtable-verify?id=${encodeURIComponent(recordId)}`).catch(() => null);
          if (verify && verify.ok) {
            const data = await verify.json();
            console.log('[Airtable] Verify attachment:', data);
          }
        } catch {}
      } catch (e) {
        console.error('Airtable attachment update failed:', e);
        const msg = e instanceof Error ? e.message : 'Failed to attach PDF in Airtable.';
        alert(msg);
        throw e;
      }
      alert(`Quotation saved and PDF attached successfully!\nRecord: ${recordId}\nURL: ${url}`);
    } catch (err) {
      console.error('Generate & Save failed:', err);
      const message = err instanceof Error ? err.message : 'Error generating or saving quotation.';
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const blob = await generateQuotationPDF("quotation-content");
    const filename = `Quotation-${(document.getElementById('quotation-no') as HTMLInputElement)?.value || 'Untitled'}.pdf`;
    const ok = await sharePdf(blob, filename);
    setShareMsgVisible(true);
    setTimeout(() => setShareMsgVisible(false), 3000);
  };

  return (
    <main id="main-container" className={`container mx-auto max-w-7xl p-4 sm:p-8 ${preview ? 'preview' : ''}`}>
      <div id="quotation-content" className="bg-white rounded-xl shadow-2xl p-6 sm:p-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center w-48 mx-auto">Quotation</h1>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="flex-shrink-0">
              <img src="/suprans-logo.png" alt="Suprans Logo" className="w-48 h-auto" />
            </div>
            <div className="w-full sm:w-auto sm:max-w-md">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2" id="invoice-details">
                <label className="font-semibold text-gray-600">Quotation No*</label>
                <input type="text" id="quotation-no" className="inline-editable text-gray-800" value={quotationNo} readOnly />
                <label className="font-semibold text-gray-600">Quotation Date*</label>
                <input type="date" id="quotation-date" className="inline-editable text-gray-800" value={quotationDate} readOnly />
                <label className="font-semibold text-gray-600">Due Date</label>
                <input type="date" id="due-date" className="inline-editable text-gray-800" value={dueDate} readOnly />
              </div>
              <div id="custom-fields-container" className="mt-2">
                {customFields.map((cf) => (
                  <div key={cf.id} className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    <input className="inline-editable text-gray-600" value={cf.name} onChange={(e) => setCustomFields(prev => prev.map(x => x.id === cf.id ? { ...x, name: e.target.value } : x))} />
                    <div className="flex items-center">
                      <input className="inline-editable text-gray-800 w-full" value={cf.value} onChange={(e) => setCustomFields(prev => prev.map(x => x.id === cf.id ? { ...x, value: e.target.value } : x))} />
                      <button className="text-red-500 hover:text-red-700 ml-2 opacity-50 hover:opacity-100" onClick={() => setCustomFields(prev => prev.filter(x => x.id !== cf.id))}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <button id="add-custom-field-btn" className="input-mode mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium" onClick={() => setCustomFields(prev => [...prev, { id: Math.random().toString(36).slice(2), name: 'Field Name', value: 'Value' }])}>
                Add More Fields
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Billed By</h3>
            <div id="billed-by-details" className="space-y-2 text-gray-700">
              <p className="font-semibold text-lg">STARTUP SQUAD PRIVATE LIMITED</p>
              <p>4319, NEAR HARYANA ACHAAR FACTORY, Shukarpura</p>
              <p>Rewari, Haryana, 123401</p>
              <p>Email: imports@suprans.in</p>
              <p>GSTIN: 06ABPCS1109K1Z6 </p>
            </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Billed To</h3>
            <select id="client-select" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">Select a Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fields["Client Name"]}
                </option>
              ))}
            </select>
            <button id="add-new-client-btn" className="input-mode w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md shadow hover:bg-blue-700 transition duration-200" onClick={() => setClientModalOpen(true)}>+ Add New Client</button>
            <div id="client-details-display" className={`mt-4 space-y-1 text-gray-700 ${selectedClient ? '' : 'hidden'}`}>
              {selectedClient && (() => {
                const c = clients.find((cl) => cl.id === selectedClient);
                return c ? (
                  <>
                    <p className="font-semibold text-lg">{c.fields["Client Name"] || ''}</p>
                    <p>{c.fields["Contact Details"] || ''}</p>
                    <p>{c.fields["City"] || ''}</p>
                    <p><strong>Type:</strong> {c.fields["Client Type"] || ''}</p>
                    <p><strong>GSTIN:</strong> {c.fields["GST Number"] || ''}</p>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        </section>

        <section id="shipping-details-section" className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <h4 className="text-md font-bold text-gray-800 mb-4">Shipped From</h4>
            <div id="shipped-from-details" className="space-y-3">
              <p className="table-input bg-gray-100">STARTUP SQUAD PRIVATE LIMITED</p>
              <p className="table-input bg-gray-100">4319, NEAR HARYANA ACHAAR FACTORY, Shukarpura</p>
              <p className="table-input bg-gray-100">Rewari, Haryana</p>
              <p className="table-input bg-gray-100">123401</p>
            </div>
          </div>
          <div>
            <h4 className="text-md font-bold text-gray-800 mb-4">Shipped To</h4>
            <div className="space-y-3">
              <input
                type="text"
                id="ship-to-name"
                readOnly
                value={(selectedClient ? (clients.find(c => c.id === selectedClient)?.fields["Client Name"] || '') : '')}
                placeholder="Client's business name"
                className="table-input bg-gray-100"
              />
              <input
                type="text"
                id="ship-to-address"
                placeholder="Address (optional)"
                className="table-input"
                value={shipToAddress}
                onChange={(e) => setShipToAddress(e.target.value)}
              />
              <input
                type="text"
                id="ship-to-city"
                placeholder="City (optional)"
                className="table-input"
                value={shipToCity}
                onChange={(e) => setShipToCity(e.target.value)}
              />
              <input
                type="text"
                id="ship-to-state"
                placeholder="State (optional)"
                className="table-input"
                value={shipToState}
                onChange={(e) => setShipToState(e.target.value)}
              />
              <input
                type="text"
                id="ship-to-zip"
                placeholder="Postal Code / ZIP Code"
                className="table-input"
                value={shipToZip}
                onChange={(e) => setShipToZip(e.target.value)}
              />
            </div>
          </div>
        </section>

        <ProductTable
          products={products}
          discountPercent={discountPercent}
          onTotals={(d) => {
            setSubtotal(d.subtotal);
            setDiscountAmount(d.discountAmount);
            setTaxableAmount(d.taxable);
            setCgst(d.cgst);
            setSgst(d.sgst);
            setGrandTotal(d.total);
            setTotalWords(d.totalInWords);
          }}
          onLinesChange={(rows) => setLines(rows)}
        />

        <section className="flex justify-end mb-8">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span id="summary-subtotal" className="font-semibold text-gray-800">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <label htmlFor="discount-percent" className="text-gray-600">Discount (%)</label>
              <input type="number" id="discount-percent" className="table-input w-24 text-right" value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Discount Amount</span>
              <span id="summary-discount-amount" className="font-semibold text-red-600">-₹{Math.abs(discountAmount).toFixed(2)}</span>
            </div>
            <hr className="my-1 border-t border-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Taxable Amount</span>
              <span id="summary-taxable-amount" className="font-semibold text-gray-800">₹{taxableAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">SGST (9%)</span>
              <span id="summary-sgst" className="font-semibold text-gray-800">₹{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">CGST (9%)</span>
              <span id="summary-cgst" className="font-semibold text-gray-800">₹{cgst.toFixed(2)}</span>
            </div>
            <hr className="my-2 border-t-2 border-gray-300" />
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold text-gray-900">Total (INR)</span>
              <span id="summary-total" className="font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="text-right text-gray-600 text-sm font-medium mt-1">
              <span id="summary-total-words">{totalWords}</span>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 pt-6">
          <div className="space-y-6">
            <div className="space-y-2 avoid-page-break">
              <h4 className="text-md font-bold text-gray-800 mb-2">Terms & Conditions</h4>
              <div id="terms-conditions" className="text-sm text-gray-600 space-y-1">
                <p>Payment Terms: 50% advance, 50% on completion.</p>
                <p>Warranty: All services are provided "as-is" without warranty.</p>
                <p>Delivery: Project completion date is an estimate.</p>
                <p>Cancellation: Client may cancel within 3 days for a full refund of the advance.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t force-page-break-before">
              <div className="space-y-3 avoid-page-break">
                <h4 className="text-md font-bold text-gray-800 mb-2">UPI / QR Code</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-600">UPI ID</label>
                  <p id="payment-upi-id" className="table-input bg-gray-100">your-upi-id@okhdfcbank</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Upload UPI QR Code</label>
                  <img id="qr-code-preview" src="https://placehold.co/128x128/e2e8f0/e2e8f0?text=QR" alt="QR Code Preview" className="mt-2 w-32 h-32 object-cover rounded-md border border-gray-300" />
                </div>
              </div>
              <div className="space-y-3 avoid-page-break">
                <h4 className="text-md font-bold text-gray-800 mb-2">Bank Account Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Account Name</label>
                  <p id="payment-bank-name" className="table-input bg-gray-100">Your Company Name</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Account Number</label>
                  <p id="payment-bank-acc" className="table-input bg-gray-100">1234567890</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Bank Name</label>
                  <p id="payment-bank-bank" className="table-input bg-gray-100">HDFC Bank</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">IFSC Code</label>
                  <p id="payment-bank-ifsc" className="table-input bg-gray-100">HDFC0000123</p>
                </div>
              </div>

              {/* Created By selector (at the end) */}
            </div>
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Created By<span className="text-red-500">*</span></label>
              <select id="created-by" required className="table-input w-full max-w-sm" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}>
                <option value="">Select Employee</option>
                {creatorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Add New Client Modal */}
      {clientModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setClientModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Client</h3>
              <button aria-label="Close" className="text-gray-500 hover:text-gray-800" onClick={() => setClientModalOpen(false)}>✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget as HTMLFormElement);
                const fields: Record<string, any> = {
                  "Client ID": `CL-${Date.now()}`,
                  "Client Name": form.get('clientName') || '',
                  "Contact Details": form.get('contactDetails') || '',
                  "City": form.get('city') || '',
                  "Client Type": form.get('clientType') || '',
                  "GST Number": form.get('gstNumber') || '',
                };
                try {
                  const rec = await createAirtableRecord(process.env.NEXT_PUBLIC_AIRTABLE_CLIENTS_TABLE!, fields);
                  const newClient = { id: rec.id, fields } as any;
                  setClients(prev => {
                    const next = [newClient, ...prev];
                    return next;
                  });
                  setSelectedClient(rec.id);
                  setClientModalOpen(false);
                } catch (err) {
                  console.error('Add client failed:', err);
                  alert(err instanceof Error ? err.message : 'Failed to add client');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Name</label>
                <input name="clientName" required placeholder="Acme Corp" className="table-input mt-1" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Details</label>
                <input name="contactDetails" placeholder="John Doe, +1 555-555-5555, john@acme.com" className="table-input mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input name="city" placeholder="San Francisco" className="table-input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GST Number</label>
                  <input name="gstNumber" placeholder="GSTIN" className="table-input mt-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Type</label>
                <select name="clientType" className="table-input mt-1">
                  <option value="Retail">Retail</option>
                  <option value="Reseller">Reseller</option>
                  <option value="Bulk">Bulk</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setClientModalOpen(false)}>Cancel</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-6 rounded-md shadow hover:bg-blue-700 transition duration-200">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer id="action-footer" className="mt-12 text-center">
        {!preview ? (
          <button
            id="generate-quotation-btn"
            className="bg-green-600 text-white py-3 px-10 rounded-lg shadow-lg hover:bg-green-700 transition duration-200 text-lg font-semibold"
            onClick={handleGenerateAndSave}
            disabled={isGenerating}
          >
            {isGenerating ? "Saving..." : "Generate & Save Quotation"}
          </button>
        ) : (
          <>
            <button id="edit-quotation-btn" className="bg-gray-600 text-white py-3 px-10 rounded-lg shadow-lg hover:bg-gray-700 transition duration-200 text-lg font-semibold" onClick={() => { setPreview(false); setIsGenerating(false); }}>
              Edit Quotation
            </button>
            <button
              id="download-pdf-btn"
              className="bg-blue-600 text-white py-3 px-10 rounded-lg shadow-lg hover:bg-blue-700 transition duration-200 text-lg font-semibold ml-4"
              onClick={async () => {
                const blob = await generateQuotationPDF("quotation-content");
                const filename = `Quotation-${(document.getElementById('quotation-no') as HTMLInputElement)?.value || 'Untitled'}.pdf`;
                downloadPdf(blob, filename);
              }}
            >
              Download PDF
            </button>
            <button id="share-quotation-btn" className="bg-gray-500 text-white py-3 px-10 rounded-lg shadow-lg hover:bg-gray-600 transition duration-200 text-lg font-semibold ml-4" onClick={handleShare}>
              Share Quotation
            </button>
            <span id="share-success-msg" className={`ml-4 text-green-600 ${shareMsgVisible ? '' : 'hidden'}`}>Link Copied!</span>
            <button
              id="create-new-quotation-btn"
              className="bg-green-600 text-white py-3 px-10 rounded-lg shadow-lg hover:bg-green-700 transition duration-200 text-lg font-semibold ml-4"
              onClick={() => {
                // Reload the page to reset all component state and start a fresh quotation
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            >
              Create New Quotation
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
