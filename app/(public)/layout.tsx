import "./presentation.css"

/** Public typography and composition stay outside the signed-in app. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return <div className="pw-public">{children}</div>
}
