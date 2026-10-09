import { MockAdministratorRepository } from "../repositories/mock-administrator.repository"
import type { AdministratorRepository } from "../repositories/administrator.repository"

export const administratorsService: AdministratorRepository =
  new MockAdministratorRepository()
