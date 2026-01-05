export default function DashboardPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Agent Dashboard</h1>
            <p className="text-stone-600">Overview of your activity and opportunities.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <h3 className="text-sm font-medium text-stone-500">Total Customers</h3>
                    <p className="text-3xl font-bold text-teal-600 mt-2">12</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <h3 className="text-sm font-medium text-stone-500">Open Opportunities</h3>
                    <p className="text-3xl font-bold text-amber-500 mt-2">5</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <h3 className="text-sm font-medium text-stone-500">Expiring Policies</h3>
                    <p className="text-3xl font-bold text-red-500 mt-2">3</p>
                </div>
            </div>
        </div>
    )
}
