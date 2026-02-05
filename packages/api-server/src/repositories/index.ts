// Kysely-based repositories for type-safe database queries
// Each repository encapsulates queries for a specific domain

export { db } from "../config/kysely.js";
export { withKyselyOrgContext } from "../config/kyselyContext.js";

// Implemented repositories
export { AuthRepository, authRepository } from "./AuthRepository.js";

// Pending repositories (uncomment as migrated):
// export { FileRepository } from "./FileRepository.js";
// export { SessionRepository } from "./SessionRepository.js";
// export { ClusterRepository } from "./ClusterRepository.js";
// export { IframeRepository } from "./IframeRepository.js";
// export { MemberRepository } from "./MemberRepository.js";
// export { CredentialDelegationRepository } from "./CredentialDelegationRepository.js";
// export { InvitationRepository } from "./InvitationRepository.js";
// export { DataSourceRepository } from "./DataSourceRepository.js";
