import { SignUpFormPage } from "../SignupForm"
import { registrationsOpen } from "@/lib/auth/registration-gate"

export default async function AgentSignUpPage() {
    return <SignUpFormPage fixedRole="agent" registrationsOpen={await registrationsOpen()} />
}
