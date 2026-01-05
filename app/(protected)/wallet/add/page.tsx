"use client"

import { createPolicy } from "../actions"
import { useFormStatus } from "react-dom"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
        >
            {pending ? "Saving..." : "Add Policy"}
        </button>
    )
}

export default function AddPolicyPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Add Policy Manually</h1>

            <form action={createPolicy} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Insurer Name</label>
                    <input
                        name="insurerName"
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. Allianz, Interamerican"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Policy Number</label>
                    <input
                        name="policyNumber"
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Insurance Type</label>
                    <select
                        name="lineOfBusiness"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="motor">Motor (Αυτοκίνητο)</option>
                        <option value="health">Health (Υγεία)</option>
                        <option value="home">Home (Κατοικία)</option>
                        <option value="life">Life (Ζωή)</option>
                        <option value="travel">Travel (Ταξιδιωτική)</option>
                        <option value="liability">Liability (Αστική Ευθύνη)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
                        <input
                            name="startDate"
                            type="date"
                            required
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">End Date</label>
                        <input
                            name="endDate"
                            type="date"
                            required
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Premium Amount (€)</label>
                    <input
                        name="premiumAmount"
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                <SubmitButton />
            </form>
        </div>
    )
}
