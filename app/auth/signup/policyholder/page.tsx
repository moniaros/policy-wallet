import { SignUpFormPage } from "../SignupForm"
import { registrationsOpen } from "@/lib/auth/registration-gate"

export default async function PolicyholderSignUpPage() {
    return <SignUpFormPage fixedRole="policyholder" registrationsOpen={await registrationsOpen()} />
}
