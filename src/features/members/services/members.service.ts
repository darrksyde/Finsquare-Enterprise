import { env } from "@/app/config/env"
import { ApiMemberRepository } from "./api-members.repository"
import { MockMemberRepository } from "./mock-members.repository"

export const membersService = env.VITE_ENABLE_MOCKS
  ? new MockMemberRepository()
  : new ApiMemberRepository()
