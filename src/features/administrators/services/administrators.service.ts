import { env } from "@/app/config/env"
import { ApiAdministratorRepository } from "../repositories/api-administrator.repository"
import { MockAdministratorRepository } from "../repositories/mock-administrator.repository"
import type { AdministratorRepository } from "../repositories/administrator.repository"

export const administratorsService: AdministratorRepository = env.VITE_ENABLE_MOCKS
  ? new MockAdministratorRepository()
  : new ApiAdministratorRepository()
