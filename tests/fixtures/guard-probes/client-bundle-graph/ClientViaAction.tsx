"use client"

/**
 * Guard-probe fixture (control): reaches the db only THROUGH the server
 * action. Must NOT be reported.
 */
import { probeAction } from "./action"

export default function ProbeActionCaller() {
    void probeAction
    return null
}
