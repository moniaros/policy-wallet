/** Guard-probe fixture: a component INSIDE a subdirectory. The first
 *  collector used a non-recursive readdir, so the day components/landing
 *  grew a subdirectory, everything in it silently left the guard's universe.
 *  This file keeps that day red. */
export default function ProbeDeep() {
    return null
}
