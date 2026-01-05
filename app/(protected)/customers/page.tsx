export default function CustomersPage() {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Customers</h1>
                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700">
                    Invite Customer
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
                <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Policies</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Last Active</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-stone-200">
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                                        MP
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-stone-900">Maria Papadopoulou</div>
                                        <div className="text-sm text-stone-500">maria@example.com</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                2
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                Today
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <a href="#" className="text-teal-600 hover:text-teal-900">View</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
