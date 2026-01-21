
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function createGoogleWalletLink(policy: any, user: any) {
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const classId = `${issuerId}.policy_wallet_generic_v1`;
    const objectId = `${issuerId}.${policy.id.replace(/-/g, '_')}`;

    if (!issuerId || !privateKey) {
        throw new Error("Missing Google Wallet credentials (GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_PRIVATE_KEY)");
    }

    // 1. Define the Generic Class (In production, you usually create this once via API, 
    // but for JWT Links you can sometimes embed it or reference an existing one.
    // Here we define the Object payload assuming the Class is either auto-created or established).
    // For simplicity in a JWT link, we define the object which references a class.

    // Note: A full implementation often ensures the 'Class' exists via REST API first.
    // For this 'Production Ready' code, we will construct the Payload for the JWT 
    // which effectively upserts the object.

    const newObject = {
        id: objectId,
        classId: classId,
        genericType: "GENERIC_TYPE_UNSPECIFIED",
        hexBackgroundColor: "#4285f4",
        logo: {
            sourceUri: {
                uri: "https://policywallet.app/logo-google-wallet.png"
            }
        },
        cardTitle: {
            defaultValue: {
                language: "en",
                value: "Insurance Policy"
            }
        },
        header: {
            defaultValue: {
                language: "en",
                value: policy.insurerName
            }
        },
        subheader: {
            defaultValue: {
                language: "en",
                value: `${policy.lineOfBusiness} Protection`
            }
        },
        textModulesData: [
            {
                header: "Policy Number",
                body: policy.policyNumber,
                id: "policy_number"
            },
            {
                header: "Holder",
                body: user.name,
                id: "holder_name"
            },
            {
                header: "Status",
                body: "Active",
                id: "status"
            }
        ],
        barcode: {
            type: "QR_CODE",
            value: policy.policyNumber,
            alternateText: policy.policyNumber
        }
    };

    if (policy.acordData?.vehicle?.plateNumber) {
        newObject.textModulesData.push({
            header: "Plate Number",
            body: policy.acordData.vehicle.plateNumber,
            id: "plate_number"
        });
    }

    // 2. Construct the JWT Payload
    const claims = {
        iss: process.env.GOOGLE_WALLET_CLIENT_EMAIL, // Service account email
        aud: "google",
        origins: ["http://localhost:3000", "https://policywallet.app"],
        typ: "savetowallet",
        payload: {
            genericObjects: [newObject]
        }
    };

    // 3. Sign the JWT
    const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });

    console.log("Generated Google Wallet JWT Link");

    return `https://pay.google.com/gp/v/save/${token}`;
}
