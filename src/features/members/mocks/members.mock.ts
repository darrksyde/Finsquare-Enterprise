import type { Member, MemberDTO } from "@/types"

export const memberDTOs: MemberDTO[] = [
  {
    member_id: "LFC-002481",
    full_name: "Adewale Johnson",
    phone_number: "+234 803 214 7780",
    email_address: "adewale.j@example.demo",
    primary_group: "Ikeja Farmers",
    branch_id: "branch-ikeja",
    branch_name: "Ikeja",
    membership_status: "Active",
    account_status: "Created",
    joined_at: "12 Jan 2023",
  },
  {
    member_id: "LFC-002479",
    full_name: "Chinedu Okafor",
    phone_number: "+234 806 412 0951",
    primary_group: "Rice Farmers",
    branch_id: "branch-ikeja",
    branch_name: "Ikeja",
    membership_status: "Active",
    account_status: "Activated",
    joined_at: "10 Jan 2023",
  },
  {
    member_id: "LFC-002462",
    full_name: "Fatima Bello",
    phone_number: "+234 702 831 2044",
    primary_group: "Maize Farmers",
    branch_id: "branch-epe",
    branch_name: "Epe",
    membership_status: "Pending",
    account_status: "Created",
    joined_at: "08 Jan 2023",
  },
  {
    member_id: "LFC-002451",
    full_name: "Grace Williams",
    phone_number: "+234 814 550 3198",
    primary_group: "Cassava Farmers",
    branch_id: "branch-ikorodu",
    branch_name: "Ikorodu",
    membership_status: "Active",
    account_status: "Not created",
    joined_at: "06 Jan 2023",
  },
  {
    member_id: "LFC-002438",
    full_name: "Ibrahim Musa",
    phone_number: "+234 809 118 7250",
    primary_group: "Livestock Farmers",
    branch_id: "branch-ogun",
    branch_name: "Badagry",
    membership_status: "Suspended",
    account_status: "Created",
    joined_at: "04 Jan 2023",
  },
  {
    member_id: "LFC-002426",
    full_name: "Bisi Adebayo",
    phone_number: "+234 802 019 4481",
    primary_group: "Epe Farmers",
    branch_id: "branch-epe",
    branch_name: "Epe",
    membership_status: "Inactive",
    account_status: "Activated",
    joined_at: "22 Dec 2022",
  },
]

export const membersMock: Member[] = memberDTOs.map((member) => ({
  id: member.member_id,
  name: member.full_name,
  phone: member.phone_number,
  email: member.email_address,
  group: member.primary_group,
  branchId: member.branch_id,
  branchName: member.branch_name,
  status: member.membership_status as Member["status"],
  accountStatus: member.account_status as Member["accountStatus"],
  joinedAt: member.joined_at,
  initials: member.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join(""),
}))
