import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV26ToV27 } from "./transformers/v26-to-v27";

export class V26toV27Migration extends StorageMigration {
	from = 26;
	to = 27;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV26ToV27({ project });
	}
}
