"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Client {
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
}

export default function BilledTo() {
  const [clients] = useState<Client[]>([
    {
      name: "Acme Corporation",
      email: "client@acme.com",
      phone: "+91 90000 12345",
      address: "45 MG Road, Bengaluru, KA 560001",
      gstin: "29ABCDE1234F1Z5",
    },
    {
      name: "Nova Tech",
      email: "contact@novatech.in",
      phone: "+91 91234 56789",
      address: "88 Park Street, Kolkata, WB 700016",
      gstin: "19ABCDE1234F1Z6",
    },
  ]);

  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <section className="bg-gray-50 rounded-xl p-6 mb-6 relative">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        Billed To
      </h2>

      {/* Client Selector */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-sm">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex justify-between items-center border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 hover:ring-2 hover:ring-blue-500"
          >
            <span>{selectedClient.name}</span>
            <ChevronDown size={18} />
          </button>

          {dropdownOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {clients.map((client, index) => (
                <li
                  key={index}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    setSelectedClient(client);
                    setDropdownOpen(false);
                  }}
                >
                  {client.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => alert("Add Client Modal Coming Soon")}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Client
        </button>
      </div>

      {/* Client Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Client Name
          </label>
          <input
            type="text"
            value={selectedClient.name}
            onChange={(e) =>
              setSelectedClient({ ...selectedClient, name: e.target.value })
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
            value={selectedClient.gstin}
            onChange={(e) =>
              setSelectedClient({ ...selectedClient, gstin: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Email
          </label>
          <input
            type="email"
            value={selectedClient.email}
            onChange={(e) =>
              setSelectedClient({ ...selectedClient, email: e.target.value })
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
            value={selectedClient.phone}
            onChange={(e) =>
              setSelectedClient({ ...selectedClient, phone: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Address
          </label>
          <textarea
            value={selectedClient.address}
            onChange={(e) =>
              setSelectedClient({ ...selectedClient, address: e.target.value })
            }
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </section>
  );
}
