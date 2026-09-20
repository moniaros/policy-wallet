// Synthetic probes only. Assemble envelopes so this source is not itself a key file.
export const sentinel = 'SYNTHETIC_NOT_A_CREDENTIAL_NEVER_PRINT_THIS'
export function privateKeyProbe(label = 'RSA PRIVATE KEY') {
    return ['-----' + 'BEGIN ' + label + '-----', sentinel, '-----' + 'END ' + label + '-----'].join('\n')
}
export function serviceAccountProbe() {
    return JSON.stringify({ type: 'service_' + 'account', private_key: sentinel })
}
export function pemProbe() {
    return ['-----' + 'BEGIN CERTIFICATE-----', sentinel, '-----' + 'END CERTIFICATE-----'].join('\n')
}
