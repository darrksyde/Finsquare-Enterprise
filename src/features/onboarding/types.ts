export interface AdminAccount {
  name: string
  email: string
  phone: string
}

export interface CorporateAccountDetails {
  businessName: string
  registrationNumber: string
  businessAddress: string
  accountHolder: string
  repName: string
  repRole: string
  repPhone: string
  repEmail: string
  repIdType: string
  repIdNumber: string
  bankName: string
  accountNumber: string
  accountName: string
  documents: string[]
}

export const REQUIRED_CORPORATE_DOCUMENTS = [
  "Certificate of registration",
  "Proof of business address",
  "Representative ID",
  "Board or executive resolution",
] as const

export const ID_TYPES = ["National ID (NIN)", "International passport", "Driver's licence", "Voter's card"]

export const emptyCorporateDetails: CorporateAccountDetails = {
  businessName: "", registrationNumber: "", businessAddress: "", accountHolder: "",
  repName: "", repRole: "", repPhone: "", repEmail: "", repIdType: ID_TYPES[0], repIdNumber: "",
  bankName: "9PSB", accountNumber: "", accountName: "", documents: [],
}
