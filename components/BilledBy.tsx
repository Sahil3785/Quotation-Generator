"use client";

import { useState } from "react";

export default function BilledBy() {
  const [company, setCompany] = useState({
    name: "Tech Solutions Pvt. Ltd.",
    address: "123 Business Street, Mumbai, MH 400001",
    gstin: "27ABCDE1234F1Z5",
    email: "info@techsolutions.com",
    phone: "+91 98765 43210",
  });

  return (
    <section className="bg-gray-50 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        Billed By
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={company.name}
            onChange={(e) =>
              setCompany({ ...company, name: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            GSTIN
          </label>
          <input
            type="text"
            value={company.gstin}
            onChange={(e) =>
              setCompany({ ...company, gstin: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Address
          </label>
          <textarea
            value={company.address}
            onChange={(e) =>
              setCompany({ ...company, address: e.target.value })
            }
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Email
          </label>
          <input
            type="email"
            value={company.email}
            onChange={(e) =>
              setCompany({ ...company, email: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Phone
          </label>
          <input
            type="text"
            value={company.phone}
            onChange={(e) =>
              setCompany({ ...company, phone: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </section>
  );
}